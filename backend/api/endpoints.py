import pandas as pd
import logging
import yfinance as yf
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from services.data_service import get_ohlcv
from core.data_adapter import get_multi_daily
from core.signal_engine import (
    calculate_signals, add_daily_indicators, calculate_stage2_analysis,
    detect_market_structure, ema, rsi
)
from api.schemas import (
    OHLCVResponse, LatestSignalResponse, DailyResponse, WatchlistResponse,
    MacroResponse, MacroInsightResponse, MacroOverallInsight, MacroGroupInsight, MacroAiMeta,
    RegimeResponse, DistributionDayResponse, SentimentResponse,
    BriefResponse, EarningsResponse, SentimentHistoryResponse, PrePostResponse,
)
from services.sentiment_service import fetch_latest, enrich_with_delta, fetch_today_slots, fetch_sentiment_history
from services.overnight_service import get_overnight_price
from services.brief_service import fetch_brief
from services.earnings_service import fetch_earnings
from core.macro_rules import compute_macro_signals
from services.macro_insight_service import fetch_macro_insight, get_ai_meta
from core.distribution_day import count_distribution_days
from core.regime_engine import compute_regime
from core.conviction_calculator import calculate_conviction

router = APIRouter()
logger = logging.getLogger(__name__)

WATCHLIST_SYMS = ["TSLA", "AAPL", "NVDA", "META", "AMZN", "GOOGL", "PLTR"]


def _freshness_meta(generated_at: Optional[str] = None) -> dict:
    """Return freshness meta for AI endpoints (fetched_at, age_minutes, source).
    Uses generated_at from upstream payload (cron-generated) when available to compute age.
    Falls back to now with age=0. Source indicates origin (github raw cache).
    """
    now = datetime.now(timezone.utc)
    fetched_at = generated_at or now.isoformat()
    age_minutes = 0.0
    if generated_at:
        try:
            # Support 'Z' suffix and naive datetimes (assume UTC)
            s = generated_at.replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            delta = (now - dt).total_seconds() / 60.0
            age_minutes = round(delta, 1)
        except Exception:
            age_minutes = 0.0
    return {
        "fetched_at": fetched_at,
        "age_minutes": age_minutes,
        "source": "github_raw",
    }


def _fetch_prepost_data(symbol: str) -> dict:
    """Fetch pre/after-market price. Primary: ticker.info. Fallback: history(prepost=True)."""
    symbol = symbol.strip().upper()
    result = {
        "symbol": symbol,
        "market_state": "CLOSED",
        "pre_market_price": None,
        "pre_market_change_pct": None,
        "post_market_price": None,
        "post_market_change_pct": None,
        "overnight_price": None,
        "overnight_change_pct": None,
        "regular_close": None,
        "regular_change_pct": None,
    }
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}

        market_state = info.get("marketState", "CLOSED")

        # PREPRE = Yahoo Finance's label for the overnight session (8 PM–4 AM ET, Blue Ocean ATS)
        if market_state == "PREPRE":
            overnight = get_overnight_price(symbol)
            if overnight:
                result["market_state"] = "OVERNIGHT"
                result["overnight_price"] = overnight["price"]
                result["overnight_change_pct"] = overnight["change_pct"]
                # regular_close: regularMarketPrice during PREPRE = last regular session close
                regular_close = info.get("regularMarketPrice")
                result["regular_close"] = regular_close
                regular_change_pct = info.get("regularMarketChangePercent")
                if regular_change_pct is not None:
                    result["regular_change_pct"] = round(float(regular_change_pct), 3)
            else:
                # Overnight session but WebSocket cache not yet populated → treat as CLOSED
                result["market_state"] = "CLOSED"
                result["regular_close"] = info.get("regularMarketPrice")
            return result

        result["market_state"] = market_state if market_state in ("PRE", "POST", "REGULAR", "CLOSED") else "CLOSED"

        # During PRE/POST, regularMarketPrice = last regular session close (yesterday).
        # regularMarketPreviousClose = the session before that (two days ago) — wrong base.
        # During REGULAR hours, regularMarketPrice = live price; use previousClose instead.
        if market_state in ("PRE", "POST"):
            regular_close = info.get("regularMarketPrice")
        else:
            regular_close = info.get("regularMarketPreviousClose") or info.get("regularMarketPrice")
        result["regular_close"] = regular_close

        pre_price = info.get("preMarketPrice")
        post_price = info.get("postMarketPrice")

        # Fallback: history(prepost=True) when info fields are absent
        if pre_price is None and post_price is None and market_state in ("PRE", "POST"):
            try:
                hist = ticker.history(period="1d", interval="1m", prepost=True)
                if hist is not None and not hist.empty:
                    last_close = float(hist["Close"].iloc[-1])
                    if market_state == "PRE":
                        pre_price = last_close
                    else:
                        post_price = last_close
            except Exception as e:
                logger.warning(f"prepost history fallback failed for {symbol}: {e}")

        if pre_price is not None and regular_close is not None:
            result["pre_market_price"] = float(pre_price)
            result["pre_market_change_pct"] = round(
                (float(pre_price) - float(regular_close)) / float(regular_close) * 100, 3
            )

        if post_price is not None and regular_close is not None:
            result["post_market_price"] = float(post_price)
            result["post_market_change_pct"] = round(
                (float(post_price) - float(regular_close)) / float(regular_close) * 100, 3
            )

        regular_change_pct = info.get("regularMarketChangePercent")
        if regular_change_pct is not None:
            result["regular_change_pct"] = round(float(regular_change_pct), 3)

    except Exception as e:
        logger.warning(f"prepost fetch failed for {symbol}: {e}")

    return result


@router.get("/prepost", response_model=PrePostResponse)
async def get_prepost(symbol: str = Query(..., description="주식 심볼")):
    data = _fetch_prepost_data(symbol)
    return data


@router.get("/ohlcv", response_model=OHLCVResponse)
async def get_ohlcv_endpoint(
    symbol: str = Query(..., description="조회할 주식 심볼"), 
    tf: str = Query("5m", description="타임프레임 (예: 1m, 5m, 15m)")
):
    try:
        raw_df = get_ohlcv(symbol, tf)
        if raw_df is None or raw_df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol: {symbol}")

        processed_df, signals = calculate_signals(raw_df)

        candles = []
        for i in range(len(processed_df)):
            row = processed_df.iloc[i]
            candles.append({
                "time": processed_df.index[i].isoformat(),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": int(row["volume"]),
            })

        indicators = {
            "ema21": [round(float(v), 4) for v in processed_df["ema21"]],
            "ema50": [round(float(v), 4) for v in processed_df["ema50"]],
            "rsi": [round(float(v), 2) for v in processed_df["rsi"]],
            "atr": [round(float(v), 4) for v in processed_df["atr"]],
        }

        return {
            "symbol": symbol.upper(),
            "timeframe": tf,
            "candles": candles,
            "signals": signals,
            "indicators": indicators,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in /ohlcv endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while processing OHLCV data")


@router.get("/latest-signal", response_model=LatestSignalResponse)
async def get_latest_signal(
    symbol: str = Query(..., description="조회할 주식 심볼"), 
    tf: str = Query("5m", description="타임프레임 (예: 1m, 5m)")
):
    try:
        raw_df = get_ohlcv(symbol, tf)
        if raw_df is None or raw_df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol: {symbol}")

        processed_df, signals = calculate_signals(raw_df)
        
        # 가장 최근 시점의 신호 추출
        latest = {k: bool(v[-1]) for k, v in signals.items()}
        active = [k for k, v in latest.items() if v]

        return {
            "symbol": symbol.upper(),
            "timeframe": tf,
            "active_signals": active,
            "latest_price": float(processed_df["close"].iloc[-1]),
            "latest_rsi": round(float(processed_df["rsi"].iloc[-1]), 1),
            "latest_ema21": round(float(processed_df["ema21"].iloc[-1]), 2),
            "latest_ema50": round(float(processed_df["ema50"].iloc[-1]), 2),
            "latest_atr": round(float(processed_df["atr"].iloc[-1]), 4),
            "latest_signals": latest,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in /latest-signal endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while processing latest signal")


@router.get("/daily", response_model=DailyResponse)
async def get_daily_endpoint(symbol: str = Query(..., description="조회할 주식 심볼")):
    try:
        dfs = get_multi_daily([symbol.upper(), "SPY", "RSP"], period="2y")
        df = dfs.get(symbol.upper())
        spy_df = dfs.get("SPY")
        rsp_df = dfs.get("RSP")

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No daily data found for {symbol}")

        df = add_daily_indicators(df)
        df = df.iloc[-252:]  # 200EMA 워밍업 이후 1년분만 추출

        spy_close = spy_df["close"] if spy_df is not None and not spy_df.empty else None
        rsp_close = rsp_df["close"] if rsp_df is not None and not rsp_df.empty else None
        stage2 = calculate_stage2_analysis(df, spy_close, rsp_close)

        candles = []
        for i in range(len(df)):
            row = df.iloc[i]
            candles.append({
                "time": df.index[i].strftime("%Y-%m-%d"),
                "open": round(float(row["open"]), 4),
                "high": round(float(row["high"]), 4),
                "low": round(float(row["low"]), 4),
                "close": round(float(row["close"]), 4),
                "volume": int(row["volume"]),
            })

        indicators = {
            "ema8":   [round(float(v), 4) for v in df["ema8"]],
            "ema21":  [round(float(v), 4) for v in df["ema21"]],
            "ema50":  [round(float(v), 4) for v in df["ema50"]],
            "ema200": [round(float(v), 4) for v in df["ema200"]],
            "atr14":  [round(float(v), 4) for v in df["atr14"]],
            "gc_upper": [round(float(v), 4) if pd.notna(v) else None for v in df["gc_upper"]],
            "gc_mid":   [round(float(v), 4) if pd.notna(v) else None for v in df["gc_mid"]],
            "gc_lower": [round(float(v), 4) if pd.notna(v) else None for v in df["gc_lower"]],
        }

        vol_avg20 = [int(v) if pd.notna(v) else 0 for v in df["vol_avg20"]]

        # Phase 1: Conviction for this symbol (same pattern as watchlist for consistency)
        try:
            regime_dfs = get_multi_daily(["SPY", "RSP", "HYG", "IEF", "^VIX"], period="1y")
            regime = compute_regime(regime_dfs)
            regime_total = regime.get("total", 50.0) if regime else 50.0
            regime_label = regime.get("regime") if regime else None
        except Exception:
            regime_total = 50.0
            regime_label = None

        try:
            sent = fetch_latest()
            market_sentiment = sent.get("market", {}).get("composite_score", 50.0) if sent else 50.0
        except Exception:
            market_sentiment = 50.0

        # Conviction 계산 — 에러 방어
        try:
            conv = calculate_conviction(
                stage2_score=stage2.get("score", 0),
                sentiment_composite=market_sentiment,
                regime_total=regime_total,
                regime_label=regime_label,
            )
            c_score = conv["score"]
            c_label = conv["label"]
            c_rel   = conv.get("reliability", "medium")
            c_notes = conv.get("notes", [])
        except Exception as e:
            logger.warning(f"Conviction calculation failed for {symbol}: {e}")
            c_score = None
            c_label = None
            c_rel   = "low"
            c_notes = ["Conviction 계산 중 오류가 발생했습니다."]

        return {
            "symbol": symbol.upper(),
            "candles": candles,
            "indicators": indicators,
            "vol_avg20": vol_avg20,
            "stage2": stage2,
            "conviction_score": c_score,
            "conviction_label": c_label,
            "conviction_reliability": c_rel,
            "conviction_notes": c_notes,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in /daily endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while processing daily analysis")


MACRO_SYMBOLS = {
    # 달러/금리/채권/원유
    "DX-Y.NYB": "달러인덱스 (DXY)",
    "^TNX":     "10년물 금리 (TNX)",
    "TLT":      "장기채 ETF (TLT)",
    "CL=F":     "WTI 원유 (Crude)",
    "GLD":      "금 ETF (GLD)",
    # 지수
    "SPY":      "S&P 500 (SPY)",
    "QQQ":      "나스닥 100 (QQQ)",
    # 변동성 (지표 #2)
    "^VIX":     "VIX 변동성",
    "^VVIX":    "VIX의 변동성 (^VVIX)",
    "^VIX9D":   "9일 VIX (^VIX9D)",
    # 신용 스트레스 (지표 #4)
    "HYG":      "하이일드 ETF (HYG)",
    "JNK":      "정크본드 ETF (JNK)",
    "LQD":      "투자등급 ETF (LQD)",
    "IEF":      "중기국채 ETF (IEF)",
    # 폭(Breadth) (지표 #3)
    "RSP":      "S&P 동등가중 (RSP)",
    "MAGS":     "Magnificent 7 (MAGS)",
    "IWM":      "러셀2000 (IWM)",
    # 섹터
    "SMH":      "반도체 (SMH)",
    "XLE":      "에너지 (XLE)",
    "XLY":      "소비재 (XLY)",
    "XHB":      "홈빌더 (XHB)",
    "ITA":      "방산 (ITA)",
}


def _build_macro_items(syms: dict[str, str], period: str = "3mo") -> list[dict]:
    """MACRO_SYMBOLS dict를 받아 MacroItemSchema 호환 dict 리스트를 반환."""
    dfs = get_multi_daily(list(syms.keys()), period=period)
    result = []
    for sym, name in syms.items():
        df = dfs.get(sym)
        if df is None or df.empty or len(df) < 10:
            result.append({
                "symbol": sym, "name": name,
                "price": None, "change_pct_1d": None, "change_pct_5d": None,
                "ema8": None, "ema21": None, "above_ema8": False, "above_ema21": False,
                "market_structure": "NEUTRAL", "rsi14": None,
            })
            continue
        try:
            close = df["close"]
            latest = float(close.iloc[-1])
            prev1d = float(close.iloc[-2]) if len(close) >= 2 else latest
            prev5d = float(close.iloc[-6]) if len(close) >= 6 else float(close.iloc[0])
            chg1d = (latest - prev1d) / prev1d * 100 if prev1d else 0.0
            chg5d = (latest - prev5d) / prev5d * 100 if prev5d else 0.0
            e8  = ema(close, 8)
            e21 = ema(close, 21)
            r14 = rsi(close, 14)
            e8_val  = float(e8.iloc[-1])  if not e8.empty  else None
            e21_val = float(e21.iloc[-1]) if not e21.empty else None
            r14_val = float(r14.iloc[-1]) if not r14.isna().all() else None
            struct = detect_market_structure(df) if len(df) >= 15 else {"structure": "NEUTRAL"}
            result.append({
                "symbol": sym, "name": name,
                "price": round(latest, 4),
                "change_pct_1d": round(chg1d, 2),
                "change_pct_5d": round(chg5d, 2),
                "ema8":  round(e8_val, 4) if e8_val else None,
                "ema21": round(e21_val, 4) if e21_val else None,
                "above_ema8":  bool(latest > e8_val) if e8_val else False,
                "above_ema21": bool(latest > e21_val) if e21_val else False,
                "market_structure": struct["structure"],
                "rsi14": round(r14_val, 1) if r14_val else None,
            })
        except Exception as e:
            logger.error(f"Macro error for {sym}: {e}", exc_info=True)
    return result


@router.get("/macro", response_model=MacroResponse)
async def get_macro_endpoint():
    try:
        return {"macro": _build_macro_items(MACRO_SYMBOLS)}
    except Exception as e:
        logger.error(f"Error in /macro endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while building macro overview")


@router.get("/macro/insight", response_model=MacroInsightResponse)
async def get_macro_insight_endpoint():
    try:
        items = _build_macro_items(MACRO_SYMBOLS, period="5d")
        signals = compute_macro_signals(items)

        ai_raw = fetch_macro_insight()
        ai_groups = (ai_raw or {}).get("groups", {})
        ai_overall = (ai_raw or {}).get("overall", {})

        groups = {
            key: MacroGroupInsight(
                signal=sig["signal"],
                direction=sig["direction"],
                text=ai_groups.get(key, {}).get("text") if ai_groups else None,
            )
            for key, sig in signals["groups"].items()
        }

        overall_sig = signals["overall"]
        overall = MacroOverallInsight(
            judgment=overall_sig["judgment"],
            green_count=overall_sig["green_count"],
            red_count=overall_sig["red_count"],
            summary=ai_overall.get("summary") if ai_overall else None,
            bullets=ai_overall.get("bullets", []) if ai_overall else [],
        )

        ai_meta_data = get_ai_meta(ai_raw) if ai_raw else None
        ai_meta = MacroAiMeta(**ai_meta_data) if ai_meta_data else None

        return MacroInsightResponse(overall=overall, groups=groups, ai_meta=ai_meta)
    except Exception as e:
        logger.error(f"Error in /macro/insight endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error in macro insight")


@router.get("/watchlist", response_model=WatchlistResponse)
async def get_watchlist_endpoint():
    try:
        all_syms = WATCHLIST_SYMS + ["SPY", "RSP"]
        dfs = get_multi_daily(all_syms, period="2y")
        spy_df = dfs.get("SPY")
        rsp_df = dfs.get("RSP")
        spy_close = spy_df["close"] if spy_df is not None and not spy_df.empty else None
        rsp_close = rsp_df["close"] if rsp_df is not None and not rsp_df.empty else None

        result = []

        # Phase 1: Conviction을 위해 regime와 market sentiment를 한 번만 가져옴
        try:
            regime_dfs = get_multi_daily(["SPY", "RSP", "HYG", "IEF", "^VIX"], period="1y")
            regime = compute_regime(regime_dfs)
            regime_total = regime.get("total", 50.0) if regime else 50.0
            regime_label = regime.get("regime") if regime else None
        except Exception:
            regime_total = 50.0
            regime_label = None

        try:
            # Task 4: Prefer the brief's context market_sentiment (tied to when the Brief was generated)
            # for consistency between Conviction and the AI Brief.
            brief = fetch_brief()
            if brief.get("available") and brief.get("context"):
                ctx = brief.get("context", {})
                market_sentiment = ctx.get("market_sentiment", {}).get("composite_score", 50.0)
            else:
                sent = fetch_latest()
                market_sentiment = sent.get("market", {}).get("composite_score", 50.0) if sent else 50.0

            # Per-symbol sentiment still from sentiment service (more granular)
            symbol_sentiment_map = {}
            sent = fetch_latest()  # still needed for per-symbol
            for s in sent.get("symbols", []) if sent else []:
                sym_key = s.get("symbol")
                if sym_key:
                    symbol_sentiment_map[sym_key] = s.get("composite_score", market_sentiment)
        except Exception:
            market_sentiment = 50.0
            symbol_sentiment_map = {}

        for sym in WATCHLIST_SYMS:
            df = dfs.get(sym)
            if df is None or df.empty:
                continue
            try:
                df = add_daily_indicators(df)
                stage2 = calculate_stage2_analysis(df, spy_close, rsp_close)
                stage2_score = stage2.get("score", 0)

                # B: Prefer per-symbol sentiment, fallback to market
                sym_sentiment = symbol_sentiment_map.get(sym, market_sentiment)

                # Conviction 계산 — 에러가 나도 전체 watchlist가 깨지지 않도록 방어
                try:
                    conv = calculate_conviction(
                        stage2_score=stage2_score,
                        sentiment_composite=sym_sentiment,
                        regime_total=regime_total,
                        regime_label=regime_label,
                    )
                    c_score = conv["score"]
                    c_label = conv["label"]
                    c_rel   = conv.get("reliability", "medium")
                    c_notes = conv.get("notes", [])
                except Exception as e:
                    logger.warning(f"Conviction calculation failed for {sym}: {e}")
                    c_score = None
                    c_label = None
                    c_rel   = "low"
                    c_notes = ["Conviction 계산 중 오류가 발생했습니다."]

                result.append({
                    "symbol": sym,
                    "price": round(float(df["close"].iloc[-1]), 2),
                    "score": stage2_score,
                    "rs_score": stage2.get("rs_score", 50.0),
                    "pct_from_52w_high": stage2.get("pct_from_52w_high", 0.0),
                    "checks": stage2.get("checks", {}),
                    "entry": stage2.get("entry", 0.0),
                    "stop": stage2.get("stop", 0.0),
                    "target": stage2.get("target", 0.0),
                    "latest_atr": stage2.get("latest_atr", 0.0),
                    "pivot_high": stage2.get("pivot_high", 0.0),
                    # Phase 1 Conviction (에러 시에도 안전하게 반환)
                    "conviction_score": c_score,
                    "conviction_label": c_label,
                    "conviction_reliability": c_rel,
                    "conviction_notes": c_notes,
                    # 월봉 추세
                    "monthly_phase": stage2.get("monthly_phase", "UNKNOWN"),
                    "monthly_uptrend_confirmed": stage2.get("monthly_uptrend_confirmed", False),
                })
            except Exception as e:
                logger.error(f"Watchlist error for {sym}: {e}", exc_info=True)

        result.sort(key=lambda x: x["score"], reverse=True)
        return {"watchlist": result}
    except Exception as e:
        logger.error(f"Error in /watchlist endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while building watchlist")


@router.get("/regime", response_model=RegimeResponse)
async def get_regime_endpoint():
    try:
        dfs = get_multi_daily(['SPY', 'RSP', 'HYG', 'IEF', '^VIX'], period="1y")
        return compute_regime(dfs)
    except Exception as e:
        logger.error(f"Error in /regime: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Regime computation failed")


@router.get("/sentiment", response_model=SentimentResponse)
async def get_sentiment_endpoint():
    """소셜 심리 최신 스냅샷 + 당일 슬롯. 실패 시 available:false로 200 반환."""
    try:
        snapshot = fetch_latest()
        snapshot = enrich_with_delta(snapshot)

        if not snapshot.get("available"):
            return {"available": False, "error": snapshot.get("error", "데이터 없음")}

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_slots = fetch_today_slots(today_str)

        latest_data = {k: v for k, v in snapshot.items() if k != "available"}
        gen_at = latest_data.get("generated_at") if isinstance(latest_data, dict) else None
        return {
            "available": True,
            "latest": latest_data,
            "today": {
                "pre_open": today_slots["pre_open"],
                "post_close": today_slots["post_close"],
            },
            "meta": _freshness_meta(gen_at),
        }
    except Exception as e:
        logger.error(f"Error in /sentiment endpoint: {e}", exc_info=True)
        return {"available": False, "error": "심리 데이터 처리 중 오류 발생"}


@router.get("/sentiment/history", response_model=SentimentHistoryResponse)
async def get_sentiment_history_endpoint(
    symbol: str = Query(..., description="종목 코드 또는 MARKET"),
    days: int = Query(7, ge=1, le=30, description="조회 일수 (1-30)"),
):
    """N일치 심리 history 포인트 반환."""
    try:
        return fetch_sentiment_history(symbol.upper(), days)
    except Exception as e:
        logger.error(f"Error in /sentiment/history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="심리 히스토리 조회 중 오류 발생")


@router.get("/brief", response_model=BriefResponse)
async def get_brief_endpoint():
    """AI Daily Brief 최신 스냅샷. 실패 시 available:false로 200 반환."""
    try:
        result = fetch_brief()
        if not result.get("available"):
            return {"available": False, "error": result.get("error", "데이터 없음")}
        data = result["data"]
        gen_at = data.get("generated_at") if isinstance(data, dict) else None

        # Phase 1 Context Attribution: GitHub JSON의 context를 응답 최상위로 승격 (api-spec 준수)
        context = None
        if isinstance(data, dict):
            context = data.pop("context", None)

        return {
            "available": True,
            "data": data,
            "meta": _freshness_meta(gen_at),
            "context": context,
        }
    except Exception as e:
        logger.error(f"Error in /brief endpoint: {e}", exc_info=True)
        return {"available": False, "error": "Brief 데이터 처리 중 오류 발생"}


@router.get("/earnings", response_model=EarningsResponse)
async def get_earnings_endpoint():
    """Earnings Intelligence 최신 스냅샷. 실패 시 available:false로 200 반환."""
    try:
        result = fetch_earnings()
        if not result.get("available"):
            return {"available": False, "error": result.get("error", "데이터 없음")}
        data = result["data"]
        gen_at = data.get("generated_at") if isinstance(data, dict) else None
        return {"available": True, "data": data, "meta": _freshness_meta(gen_at)}
    except Exception as e:
        logger.error(f"Error in /earnings endpoint: {e}", exc_info=True)
        return {"available": False, "error": "Earnings 데이터 처리 중 오류 발생"}


@router.get("/distribution-days", response_model=DistributionDayResponse)
async def get_distribution_days_endpoint():
    try:
        dfs = get_multi_daily(['SPY', 'QQQ'], period="3mo")
        result = {}
        for sym in ['SPY', 'QQQ']:
            df = dfs.get(sym)
            dd = count_distribution_days(df) if df is not None else None
            result[sym] = dd if dd is not None else {'count': 0, 'level': 'OK', 'dates': []}
        return {'spy': result['SPY'], 'qqq': result['QQQ']}
    except Exception as e:
        logger.error(f"Error in /distribution-days: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="DD computation failed")
