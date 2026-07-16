import pandas as pd
import logging
import time
import yfinance as yf
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
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
    SignalLogResponse, SignalLogStats, MorningBriefingResponse, PredictionResponse,
    SymbolInfoResponse, CapLeaderboardResponse,
)
from services.sentiment_service import fetch_latest, enrich_with_delta, fetch_today_slots, fetch_sentiment_history
from services.overnight_service import get_overnight_price
from services.brief_service import fetch_brief
from services.morning_briefing_service import fetch_morning_briefing
from services.earnings_service import fetch_earnings
from services.prediction_service import fetch_prediction
from core.macro_rules import compute_macro_signals
from services.macro_insight_service import fetch_macro_insight, get_ai_meta, get_cached_signals
from core.distribution_day import count_distribution_days
from core.regime_engine import compute_regime
from core.conviction_calculator import calculate_conviction
from core.backtest_engine import run_full_backtest, load_cached_result, load_cached_sweep, run_parameter_sweep, STAGE2_THRESHOLD
from core.signal_tracker import scan_and_log, update_outcomes, get_signal_log, compute_live_stats

router = APIRouter()
logger = logging.getLogger(__name__)

# TIER1: 빅테크/대형주 — 개별 심층 분석, 백테스트 대상
TIER1_SYMS = ["TSM", "NVDA", "META", "TSLA", "PLTR", "MU", "CRWD", "AMZN", "MSFT", "AAPL", "GOOGL", "SPCX"]
# TIER2: 모멘텀/테마주 — 배치 분석, 워치리스트 포함
TIER2_SYMS = ["RKLB", "CEG", "VST", "ALAB", "OKLO", "APP", "ANET", "NVO", "QBTS", "SOFI"]
WATCHLIST_SYMS = TIER1_SYMS + TIER2_SYMS  # 전체 22종목
SYMBOL_TIER: dict = {s: 1 for s in TIER1_SYMS} | {s: 2 for s in TIER2_SYMS}


def _load_sentiment_for_conviction() -> tuple[Optional[float], dict[str, float]]:
    """Load market + per-symbol composite_score (−2..+2) for conviction.

    Returns:
        market_composite: Optional float (None → calculator uses neutral 50)
        symbol_map: symbol → composite_score (−2..+2 producer scale)

    Prefers brief.context.market_sentiment when present (correct nested path under data),
    otherwise sentiment/latest market + symbols.
    """
    market_composite: Optional[float] = None
    symbol_map: dict[str, float] = {}

    try:
        brief = fetch_brief()
        if brief.get("available"):
            data = brief.get("data") or {}
            ctx = data.get("context") or {}
            ms = (ctx.get("market_sentiment") or {}).get("composite_score")
            if ms is not None:
                market_composite = float(ms)
    except Exception as e:
        logger.debug(f"brief context sentiment unavailable: {e}")

    try:
        sent = fetch_latest()
        if sent and sent.get("available") is not False:
            if market_composite is None:
                m = (sent.get("market") or {}).get("composite_score")
                if m is not None:
                    market_composite = float(m)
            for s in sent.get("symbols") or []:
                sym_key = s.get("symbol")
                cs = s.get("composite_score")
                if sym_key is not None and cs is not None:
                    symbol_map[str(sym_key).upper()] = float(cs)
    except Exception as e:
        logger.warning(f"sentiment fetch for conviction failed: {e}")

    return market_composite, symbol_map

# symbol-info 1시간 캐시 {symbol: (data_dict, monotonic_ts)}
_symbol_info_cache: dict[str, tuple[dict, float]] = {}
_SYMBOL_INFO_TTL = 3600


def _freshness_meta(
    generated_at: Optional[str] = None,
    *,
    stale: bool = False,
    from_cache: bool = False,
    source: str = "github_raw",
) -> dict:
    """Return freshness meta for AI endpoints (fetched_at, age_minutes, source).

    Phase A3: include stale/from_cache when last-good snapshot is served after fetch failure.
    """
    now = datetime.now(timezone.utc)
    fetched_at = generated_at or now.isoformat()
    age_minutes = 0.0
    if generated_at:
        try:
            s = generated_at.replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            delta = (now - dt).total_seconds() / 60.0
            age_minutes = round(delta, 1)
        except Exception:
            age_minutes = 0.0
    src = source
    if from_cache or stale:
        src = "github_raw_last_good"
    return {
        "fetched_at": fetched_at,
        "age_minutes": age_minutes,
        "source": src,
        "stale": bool(stale or from_cache),
        "from_cache": bool(from_cache or stale),
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

        # PREPRE = Yahoo Finance's legacy label for overnight (8 PM–4 AM ET, Blue Ocean ATS).
        # In practice Yahoo Finance often returns "CLOSED" during overnight — handle both.
        if market_state in ("PREPRE", "CLOSED"):
            overnight = get_overnight_price(symbol)
            if overnight:
                result["market_state"] = "OVERNIGHT"
                ovn_price = float(overnight["price"])
                result["overnight_price"] = ovn_price
                # regularMarketPrice during PREPRE/CLOSED = last regular session close
                regular_close = info.get("regularMarketPrice")
                result["regular_close"] = regular_close
                # Recalculate change% vs last regular close (WebSocket field 12 uses a
                # different reference — previous-previous close — so it's unreliable here)
                if regular_close:
                    result["overnight_change_pct"] = round(
                        (ovn_price - float(regular_close)) / float(regular_close) * 100, 3
                    )
                else:
                    result["overnight_change_pct"] = overnight["change_pct"]
                regular_change_pct = info.get("regularMarketChangePercent")
                if regular_change_pct is not None:
                    result["regular_change_pct"] = round(float(regular_change_pct), 3)
                return result
            if market_state == "PREPRE":
                # Overnight session but WebSocket cache not yet populated → treat as CLOSED
                result["market_state"] = "CLOSED"
                result["regular_close"] = info.get("regularMarketPrice")
                return result

        result["market_state"] = market_state if market_state in ("PRE", "POST", "REGULAR", "CLOSED") else "CLOSED"

        # regularMarketPrice = last regular session close during PRE/POST/CLOSED.
        # regularMarketPreviousClose = the session before that — wrong base for change%.
        # During REGULAR hours only, regularMarketPrice = live price; use previousClose instead.
        if market_state == "REGULAR":
            regular_close = info.get("regularMarketPreviousClose") or info.get("regularMarketPrice")
        else:
            regular_close = info.get("regularMarketPrice")
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


# Stage2 needs EMA200 — add_daily_indicators dropna() wipes shorter histories
_MIN_STAGE2_BARS = 200


@router.get("/daily", response_model=DailyResponse)
async def get_daily_endpoint(symbol: str = Query(..., description="조회할 주식 심볼")):
    try:
        dfs = get_multi_daily([symbol.upper(), "SPY", "RSP"], period="2y")
        df = dfs.get(symbol.upper())
        spy_df = dfs.get("SPY")
        rsp_df = dfs.get("RSP")

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No daily data found for {symbol}")

        if len(df) < _MIN_STAGE2_BARS:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Insufficient historical data for {symbol} "
                    f"({len(df)} trading days; Stage2 needs ~{_MIN_STAGE2_BARS} for EMA200)"
                ),
            )

        df = add_daily_indicators(df)
        if df is None or df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient history after indicator warm-up for {symbol}",
            )
        df = df.iloc[-252:]  # 200EMA 워밍업 이후 1년분만 추출
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No usable daily bars for {symbol}")

        spy_close = spy_df["close"] if spy_df is not None and not spy_df.empty else None
        rsp_close = rsp_df["close"] if rsp_df is not None and not rsp_df.empty else None
        stage2 = calculate_stage2_analysis(df, spy_close, rsp_close)
        if not stage2 or "score" not in stage2:
            raise HTTPException(
                status_code=404,
                detail=f"Stage2 analysis unavailable for {symbol} (insufficient clean history)",
            )

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

        # P0-3: per-symbol composite when available (same as watchlist); market fallback
        try:
            market_cs, symbol_map = _load_sentiment_for_conviction()
            sym_key = symbol.upper()
            sym_sentiment = symbol_map.get(sym_key, market_cs)  # None → neutral inside calculator
        except Exception:
            sym_sentiment = None

        # Conviction 계산 — 에러 방어 (sentiment −2..+2 normalized inside calculator)
        try:
            conv = calculate_conviction(
                stage2_score=stage2.get("score", 0),
                sentiment_composite=sym_sentiment,
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
    # Dollar / Rates / Bonds / Commodities
    "KRW=X":    "USD/KRW",
    "DX-Y.NYB": "Dollar Index (DXY)",
    "^TNX":     "10Y Treasury (TNX)",
    "TLT":      "Long Bond ETF (TLT)",
    "CL=F":     "WTI Crude Oil",
    "GLD":      "Gold ETF (GLD)",
    "BTC-USD":  "Bitcoin (BTC)",
    # Indices
    "SPY":      "S&P 500 (SPY)",
    "QQQ":      "Nasdaq 100 (QQQ)",
    # Volatility
    "^VIX":     "VIX Volatility",
    "^VVIX":    "VIX of VIX (^VVIX)",
    "^VIX9D":   "9-Day VIX (^VIX9D)",
    # Credit Stress
    "HYG":      "High Yield ETF (HYG)",
    "JNK":      "Junk Bond ETF (JNK)",
    "LQD":      "Inv. Grade ETF (LQD)",
    "IEF":      "Mid-Term Treasury (IEF)",
    # Breadth
    "RSP":      "S&P Equal Weight (RSP)",
    "MAGS":     "Magnificent 7 (MAGS)",
    "IWM":      "Russell 2000 (IWM)",
    # Sectors
    "SMH":      "Semiconductors (SMH)",
    "XLE":      "Energy (XLE)",
    "XLY":      "Consumer Disc. (XLY)",
    "XHB":      "Homebuilders (XHB)",
    "ITA":      "Aerospace/Def. (ITA)",
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
        items = _build_macro_items(MACRO_SYMBOLS, period="1mo")
        signals = compute_macro_signals(items)

        ai_raw = fetch_macro_insight()
        ai_groups = (ai_raw or {}).get("groups", {})
        ai_overall = (ai_raw or {}).get("overall", {})

        groups = {
            key: MacroGroupInsight(
                signal=sig["signal"],
                direction=sig["direction"],
                text=ai_groups.get(key, {}).get("text") if ai_groups else None,
                text_en=ai_groups.get(key, {}).get("text_en") if ai_groups else None,
                text_ko=ai_groups.get(key, {}).get("text_ko") if ai_groups else None,
            )
            for key, sig in signals["groups"].items()
        }

        overall_sig = signals["overall"]
        overall = MacroOverallInsight(
            judgment=overall_sig["judgment"],
            green_count=overall_sig["green_count"],
            red_count=overall_sig["red_count"],
            summary=ai_overall.get("summary") if ai_overall else None,
            summary_en=ai_overall.get("summary_en") if ai_overall else None,
            summary_ko=ai_overall.get("summary_ko") if ai_overall else None,
            bullets=ai_overall.get("bullets", []) if ai_overall else [],
            bullets_en=ai_overall.get("bullets_en", []) if ai_overall else [],
            bullets_ko=ai_overall.get("bullets_ko", []) if ai_overall else [],
        )

        ai_meta_data = get_ai_meta(ai_raw) if ai_raw else None
        ai_meta = MacroAiMeta(**ai_meta_data) if ai_meta_data else None

        # text_signal_drift: live 신호와 AI 텍스트 생성 시점 신호가 다른 그룹 목록
        # collect_macro_insight.py v2가 computed_signals를 JSON에 저장하므로 비교 가능
        cached_sigs = get_cached_signals(ai_raw) if ai_raw else {}
        text_signal_drift = [
            key for key, sig in signals["groups"].items()
            if cached_sigs.get(key) and cached_sigs[key] != sig["signal"]
        ]

        return MacroInsightResponse(
            overall=overall,
            groups=groups,
            ai_meta=ai_meta,
            text_signal_drift=text_signal_drift,
        )
    except Exception as e:
        logger.error(f"Error in /macro/insight endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error in macro insight")


def build_watchlist_result() -> tuple[list[dict], str | None]:
    """
    워치리스트 계산 핵심 로직. /watchlist 엔드포인트와 스케줄러 둘 다 사용.
    반환: (result_list, regime_label)
    """
    all_syms = WATCHLIST_SYMS + ["SPY", "RSP"]
    dfs = get_multi_daily(all_syms, period="2y")
    spy_df = dfs.get("SPY")
    rsp_df = dfs.get("RSP")
    spy_close = spy_df["close"] if spy_df is not None and not spy_df.empty else None
    rsp_close = rsp_df["close"] if rsp_df is not None and not rsp_df.empty else None

    result = []

    try:
        regime_dfs = get_multi_daily(["SPY", "RSP", "HYG", "IEF", "^VIX"], period="1y")
        regime = compute_regime(regime_dfs)
        regime_total = regime.get("total", 50.0) if regime else 50.0
        regime_label = regime.get("regime") if regime else None
    except Exception:
        regime_total = 50.0
        regime_label = None

    # P0-3: brief.context lives under data; prefer per-symbol composites
    try:
        market_sentiment, symbol_sentiment_map = _load_sentiment_for_conviction()
    except Exception:
        market_sentiment = None
        symbol_sentiment_map = {}

    def _thin_history_item(sym: str, price: float, note: str) -> dict:
        return {
            "symbol": sym,
            "tier": SYMBOL_TIER.get(sym, 1),
            "price": round(price, 2),
            "score": 0,
            "rs_score": 50.0,
            "pct_from_52w_high": 0.0,
            "checks": {k: False for k in [
                "price_above_emas", "ema200_rising", "near_52w_high", "above_52w_low",
                "pullback_shallow", "rs_strong", "volume_contracting",
            ]},
            "entry": 0.0, "stop": 0.0, "target": 0.0,
            "latest_atr": 0.0, "pivot_high": 0.0,
            "conviction_score": None, "conviction_label": None,
            "conviction_reliability": "low",
            "conviction_notes": [note],
            "monthly_phase": "UNKNOWN", "monthly_uptrend_confirmed": False,
        }

    for sym in WATCHLIST_SYMS:
        df = dfs.get(sym)
        if df is None or df.empty:
            continue
        try:
            last_price = float(df["close"].iloc[-1])
        except Exception:
            continue
        # New IPO / short history — Stage2 needs ~200 bars (EMA200); avoid 500/empty dropna
        if len(df) < _MIN_STAGE2_BARS:
            result.append(_thin_history_item(
                sym, last_price,
                f"Insufficient historical data ({len(df)} days; Stage2 needs ~{_MIN_STAGE2_BARS})",
            ))
            continue
        try:
            df = add_daily_indicators(df)
            if df is None or df.empty:
                result.append(_thin_history_item(
                    sym, last_price, "Insufficient history after indicator warm-up",
                ))
                continue
            stage2 = calculate_stage2_analysis(df, spy_close, rsp_close)
            if not stage2 or "score" not in stage2:
                result.append(_thin_history_item(
                    sym, last_price, "Stage2 unavailable (insufficient clean history)",
                ))
                continue
            stage2_score = stage2.get("score", 0)

            # Producer scale −2..+2 (or None → neutral 50 after normalize)
            sym_sentiment = symbol_sentiment_map.get(sym, market_sentiment)

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
                "tier": SYMBOL_TIER.get(sym, 1),
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
                "conviction_score": c_score,
                "conviction_label": c_label,
                "conviction_reliability": c_rel,
                "conviction_notes": c_notes,
                "monthly_phase": stage2.get("monthly_phase", "UNKNOWN"),
                "monthly_uptrend_confirmed": stage2.get("monthly_uptrend_confirmed", False),
            })
        except Exception as e:
            logger.error(f"Watchlist error for {sym}: {e}", exc_info=True)

    result.sort(key=lambda x: x["score"], reverse=True)
    return result, regime_label


@router.get("/watchlist", response_model=WatchlistResponse)
async def get_watchlist_endpoint():
    try:
        result, regime_label = build_watchlist_result()

        try:
            scan_and_log(result, regime=regime_label)
        except Exception as e:
            logger.warning(f"scan_and_log failed (non-fatal): {e}")

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

        # Phase P2+: resolve top_news.source → auditable links
        try:
            from core.source_citations import enrich_sentiment_snapshot
            snapshot = enrich_sentiment_snapshot(snapshot)
        except Exception:
            pass

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_slots = fetch_today_slots(today_str)

        skip = {"available", "stale", "from_cache", "stale_reason", "warning", "error"}
        latest_data = {k: v for k, v in snapshot.items() if k not in skip}
        gen_at = latest_data.get("generated_at") if isinstance(latest_data, dict) else None
        return {
            "available": True,
            "latest": latest_data,
            "today": {
                "pre_open": today_slots["pre_open"],
                "post_close": today_slots["post_close"],
            },
            "meta": _freshness_meta(
                gen_at,
                stale=bool(snapshot.get("stale")),
                from_cache=bool(snapshot.get("from_cache")),
            ),
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
        # 캐시 오염 방지: 원본 dict를 복사한 뒤 context를 꺼냄
        context = None
        if isinstance(data, dict):
            data = dict(data)
            context = data.pop("context", None)

        return {
            "available": True,
            "data": data,
            "meta": _freshness_meta(
                gen_at,
                stale=bool(result.get("stale")),
                from_cache=bool(result.get("from_cache")),
            ),
            "context": context,
        }
    except Exception as e:
        logger.error(f"Error in /brief endpoint: {e}", exc_info=True)
        return {"available": False, "error": "Brief 데이터 처리 중 오류 발생"}


@router.get("/morning-briefing", response_model=MorningBriefingResponse)
async def get_morning_briefing_endpoint():
    """아침 브리핑 최신 스냅샷. 실패 시 available:false로 200 반환."""
    try:
        result = fetch_morning_briefing()
        if not result.get("available"):
            return {"available": False, "error": result.get("error", "데이터 없음")}
        data = result["data"]
        gen_at = data.get("generated_at") if isinstance(data, dict) else None
        return {
            "available": True,
            "data": data,
            "meta": _freshness_meta(
                gen_at,
                stale=bool(result.get("stale")),
                from_cache=bool(result.get("from_cache")),
            ),
        }
    except Exception as e:
        logger.error(f"Error in /morning-briefing endpoint: {e}", exc_info=True)
        return {"available": False, "error": "브리핑 데이터 처리 중 오류 발생"}


@router.get("/earnings", response_model=EarningsResponse)
async def get_earnings_endpoint():
    """Earnings Intelligence 최신 스냅샷. 실패 시 available:false로 200 반환."""
    try:
        result = fetch_earnings()
        if not result.get("available"):
            return {"available": False, "error": result.get("error", "데이터 없음")}
        data = result["data"]
        gen_at = data.get("generated_at") if isinstance(data, dict) else None
        return {
            "available": True,
            "data": data,
            "meta": _freshness_meta(
                gen_at,
                stale=bool(result.get("stale")),
                from_cache=bool(result.get("from_cache")),
            ),
        }
    except Exception as e:
        logger.error(f"Error in /earnings endpoint: {e}", exc_info=True)
        return {"available": False, "error": "Earnings 데이터 처리 중 오류 발생"}


@router.get("/divergence")
async def get_divergence_endpoint(
    only_divergences: bool = Query(True, description="Only bullish/bearish divergence rows"),
):
    """Phase B4: social composite vs 1d price change divergence list.

    Not an investment signal — interpretation aid. Does not feed Conviction.
    """
    try:
        from core.divergence import build_divergence_list
        from core.data_adapter import get_multi_daily

        sent = fetch_latest()
        if not sent.get("available"):
            return {"available": False, "error": sent.get("error", "sentiment unavailable"), "items": []}

        symbols = sent.get("symbols") or []
        syms = [str(s.get("symbol") or "").upper() for s in symbols if s.get("symbol")]
        price_changes: dict[str, float] = {}
        if syms:
            try:
                dfs = get_multi_daily(syms, period="5d")
                for sym, df in (dfs or {}).items():
                    if df is None or df.empty or len(df) < 2:
                        continue
                    prev = float(df["close"].iloc[-2])
                    last = float(df["close"].iloc[-1])
                    if prev:
                        price_changes[str(sym).upper()] = round((last / prev - 1) * 100, 2)
            except Exception as e:
                logger.warning(f"divergence price fetch failed: {e}")

        items = build_divergence_list(symbols, price_changes, only_divergences=only_divergences)
        return {
            "available": True,
            "items": items,
            "rule": {
                "bullish_divergence": "composite ≥ +0.5 and day change ≤ −1.5%",
                "bearish_divergence": "composite ≤ −0.5 and day change ≥ +1.5%",
            },
            "meta": _freshness_meta(sent.get("generated_at")),
        }
    except Exception as e:
        logger.error(f"Error in /divergence: {e}", exc_info=True)
        return {"available": False, "error": str(e), "items": []}


@router.get("/prediction", response_model=PredictionResponse)
async def get_prediction_endpoint():
    """FOMC prediction-market odds (Polymarket reference). Soft-fail available:false.

    usage is always reference_only — do not feed into Conviction weights.
    """
    try:
        result = fetch_prediction()
        if not result.get("available"):
            return {"available": False, "error": result.get("error", "데이터 없음")}
        data = result["data"]
        gen_at = data.get("generated_at") if isinstance(data, dict) else None
        return {"available": True, "data": data, "meta": _freshness_meta(gen_at)}
    except Exception as e:
        logger.error(f"Error in /prediction endpoint: {e}", exc_info=True)
        return {"available": False, "error": "Prediction 데이터 처리 중 오류 발생"}


@router.get("/backtest/result")
async def get_backtest_result():
    """캐시된 백테스트 결과 조회. 결과 없으면 404."""
    result = load_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="백테스트 결과가 없습니다. POST /api/backtest/run 으로 먼저 실행하세요."
        )
    return result


@router.post("/backtest/run")
async def run_backtest_endpoint(
    background_tasks: BackgroundTasks,
    symbols: Optional[List[str]] = None,
    threshold: int = Query(STAGE2_THRESHOLD, ge=1, le=7, description="Stage2 최소 점수"),
    rs_threshold: int = Query(70, ge=0, le=100, description="RS 강도 최소값 (기본 70)"),
    use_spy_filter: bool = Query(True, description="SPY > EMA200 시장 필터 적용 여부"),
):
    """
    백테스트 실행 후 결과 반환 및 캐시 저장.
    symbols 미지정 시 TIER1 종목 대상 (TIER2는 데이터 특성상 제외).
    주의: yfinance 다운로드 포함으로 수십 초 소요될 수 있습니다.
    """
    target_syms = symbols or TIER1_SYMS
    try:
        result = run_full_backtest(
            target_syms,
            threshold=threshold,
            rs_threshold=rs_threshold,
            use_spy_filter=use_spy_filter,
        )
        return {
            "status": "ok",
            "symbols": target_syms,
            "total_trades": result["aggregate"]["all"].get("n", 0),
            "generated_at": result["generated_at"],
            "summary": result["aggregate"]["all"],
        }
    except Exception as e:
        logger.error(f"Backtest run failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"백테스트 실행 중 오류: {str(e)}")


@router.get("/backtest/sweep")
async def get_backtest_sweep_result():
    """캐시된 파라미터 스윕 결과 조회. 결과 없으면 404."""
    cached = load_cached_sweep()
    if cached is None:
        raise HTTPException(
            status_code=404,
            detail="스윕 결과가 없습니다. POST /api/backtest/sweep 으로 먼저 실행하세요."
        )
    return cached


@router.post("/backtest/sweep")
async def run_backtest_sweep_endpoint(
    symbols: Optional[List[str]] = None,
):
    """
    8가지 파라미터 조합으로 백테스트 스윕 실행 후 결과 반환 및 캐시 저장.
    symbols 미지정 시 TIER1 종목 대상.
    주의: 수분 소요될 수 있습니다.
    """
    target_syms = symbols or TIER1_SYMS
    try:
        results = run_parameter_sweep(target_syms)
        return {"status": "ok", "symbols": target_syms, "results": results}
    except Exception as e:
        logger.error(f"Backtest sweep failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"스윕 실행 중 오류: {str(e)}")


@router.get("/signal-log", response_model=SignalLogResponse)
async def get_signal_log_endpoint(
    symbol: Optional[str] = Query(None, description="종목 필터 (미지정 시 전체)"),
    limit: int = Query(200, ge=1, le=500),
):
    """실거래 신호 로그 조회."""
    entries = get_signal_log(limit=limit, symbol=symbol.upper() if symbol else None)
    return {"entries": entries, "total": len(entries)}


@router.get("/alerts")
async def get_alerts_endpoint(
    max_earnings_days: int = Query(3, ge=0, le=14, description="Earnings alert horizon (days)"),
):
    """Phase C4 — actionable alerts: earnings D-day, open signals, model health, briefing integrity.

    Dashboard bell only (no push). Derived from live services; never invents trades.
    """
    from core.alerts_engine import build_alerts
    from services.earnings_service import fetch_earnings

    upcoming: list = []
    try:
        earn = fetch_earnings()
        if earn.get("available") and isinstance(earn.get("data"), dict):
            upcoming = earn["data"].get("upcoming_earnings") or []
    except Exception as e:
        logger.warning("alerts: earnings fetch failed: %s", e)

    entries: list = []
    try:
        entries = get_signal_log(limit=200)
    except Exception as e:
        logger.warning("alerts: signal log failed: %s", e)

    stats = None
    try:
        stats = compute_live_stats()
    except Exception as e:
        logger.warning("alerts: live stats failed: %s", e)

    briefing_data = None
    try:
        br = fetch_morning_briefing()
        if br.get("available"):
            briefing_data = br.get("data")
    except Exception as e:
        logger.warning("alerts: briefing fetch failed: %s", e)

    return build_alerts(
        upcoming_earnings=upcoming,
        signal_entries=entries,
        live_stats=stats,
        briefing_data=briefing_data,
        max_earnings_days=max_earnings_days,
    )


@router.get("/signal-log/stats", response_model=SignalLogStats)
async def get_signal_log_stats_endpoint():
    """라이브 성과 통계 + 백테스트 기준값 비교."""
    stats = compute_live_stats()
    return stats


@router.post("/signal-log/refresh")
async def refresh_signal_log_endpoint(background_tasks: BackgroundTasks):
    """
    PENDING/ACTIVE 신호의 결과를 최신 일봉으로 갱신.
    현재 워치리스트를 스캔하여 신규 신호도 기록.
    수십 초 소요 가능 — 백그라운드 작업으로 실행.
    """
    def _run():
        try:
            result = update_outcomes()
            logger.info(f"signal-log refresh complete: {result}")
        except Exception as e:
            logger.error(f"signal-log refresh failed: {e}", exc_info=True)

    background_tasks.add_task(_run)
    return {"status": "refresh_started", "message": "결과 갱신이 백그라운드에서 실행됩니다."}


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


# ── Email Report ────────────────────────────────────────────────────────────

from fastapi.responses import HTMLResponse as _HTMLResponse


@router.post("/email-report/send")
async def trigger_email_report(background_tasks: BackgroundTasks):
    """Manually trigger the morning email report. Runs in background thread."""
    from services.email_report_service import run_morning_report
    background_tasks.add_task(run_morning_report)
    return {"status": "queued", "message": "Morning report is being generated and sent."}


@router.get("/email-report/preview", response_class=_HTMLResponse)
async def preview_email_report():
    """Return the morning email HTML for browser preview (no email sent)."""
    import asyncio
    from services.email_report_service import (
        collect_email_data, render_html,
    )
    from services.charts import render_regime_gauge, render_watchlist_sparklines, render_macro_bar

    loop = asyncio.get_event_loop()

    def _build():
        data = collect_email_data()
        regime = data["regime"]
        gauge_png = render_regime_gauge(regime.get("total", 50.0), regime.get("regime", "UNKNOWN"))
        sparklines_png = render_watchlist_sparklines(data["sparkline_data"], data["watchlist"])
        macro_bar_png = render_macro_bar((data.get("macro") or {}).get("groups", {}))
        return render_html(data, gauge_png, sparklines_png, macro_bar_png)

    html = await loop.run_in_executor(None, _build)
    return _HTMLResponse(content=html)


# ─── /symbol-info ──────────────────────────────────────────────────────────────

def _fetch_symbol_info_data(symbol: str) -> dict:
    now = time.monotonic()
    if symbol in _symbol_info_cache:
        data, ts = _symbol_info_cache[symbol]
        if (now - ts) < _SYMBOL_INFO_TTL:
            return data
    try:
        info = yf.Ticker(symbol).info or {}
        data = {
            "symbol":      symbol,
            "market_cap":  info.get("marketCap"),
            "week52_high": info.get("fiftyTwoWeekHigh"),
            "week52_low":  info.get("fiftyTwoWeekLow"),
            "sector":      info.get("sector"),
            "industry":    info.get("industry"),
        }
    except Exception as exc:
        logger.warning("symbol-info fetch failed for %s: %s", symbol, exc)
        data = {"symbol": symbol, "market_cap": None, "week52_high": None,
                "week52_low": None, "sector": None, "industry": None}
    _symbol_info_cache[symbol] = (data, now)
    return data


@router.get("/symbol-info", response_model=SymbolInfoResponse)
async def get_symbol_info(symbol: str = Query(..., min_length=1, max_length=10)):
    return _fetch_symbol_info_data(symbol.strip().upper())


# ─── /cap-leaderboard ──────────────────────────────────────────────────────────

@router.get("/cap-leaderboard", response_model=CapLeaderboardResponse)
async def get_cap_leaderboard():
    from services.cap_leaderboard_service import fetch_leaderboard
    return fetch_leaderboard()
