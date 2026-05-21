import pandas as pd
import logging
from fastapi import APIRouter, HTTPException, Query
from services.data_service import get_ohlcv, get_multi_daily
from core.signal_engine import (
    calculate_signals, add_daily_indicators, calculate_stage2_analysis,
    detect_market_structure, ema, rsi
)
from api.schemas import (
    OHLCVResponse, LatestSignalResponse, DailyResponse, WatchlistResponse,
    MacroResponse, RegimeResponse, DistributionDayResponse,
)
from core.distribution_day import count_distribution_days
from core.regime_engine import compute_regime

router = APIRouter()
logger = logging.getLogger(__name__)

WATCHLIST_SYMS = ["TSLA", "AAPL", "NVDA", "META", "AMZN", "GOOGL"]


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

        return {
            "symbol": symbol.upper(),
            "candles": candles,
            "indicators": indicators,
            "vol_avg20": vol_avg20,
            "stage2": stage2,
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


@router.get("/macro", response_model=MacroResponse)
async def get_macro_endpoint():
    try:
        syms = list(MACRO_SYMBOLS.keys())
        dfs = get_multi_daily(syms, period="3mo")

        result = []
        for sym, name in MACRO_SYMBOLS.items():
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

                struct = detect_market_structure(df) if len(df) >= 15 else {'structure': 'NEUTRAL'}

                result.append({
                    "symbol": sym,
                    "name": name,
                    "price": round(latest, 4),
                    "change_pct_1d": round(chg1d, 2),
                    "change_pct_5d": round(chg5d, 2),
                    "ema8":  round(e8_val, 4) if e8_val else None,
                    "ema21": round(e21_val, 4) if e21_val else None,
                    "above_ema8":  bool(latest > e8_val) if e8_val else False,
                    "above_ema21": bool(latest > e21_val) if e21_val else False,
                    "market_structure": struct['structure'],
                    "rsi14": round(r14_val, 1) if r14_val else None,
                })
            except Exception as e:
                logger.error(f"Macro error for {sym}: {e}", exc_info=True)

        return {"macro": result}
    except Exception as e:
        logger.error(f"Error in /macro endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while building macro overview")


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
        for sym in WATCHLIST_SYMS:
            df = dfs.get(sym)
            if df is None or df.empty:
                continue
            try:
                df = add_daily_indicators(df)
                stage2 = calculate_stage2_analysis(df, spy_close, rsp_close)
                result.append({
                    "symbol": sym,
                    "price": round(float(df["close"].iloc[-1]), 2),
                    "score": stage2.get("score", 0),
                    "rs_score": stage2.get("rs_score", 50.0),
                    "pct_from_52w_high": stage2.get("pct_from_52w_high", 0.0),
                    "checks": stage2.get("checks", {}),
                    "entry": stage2.get("entry", 0.0),
                    "stop": stage2.get("stop", 0.0),
                    "target": stage2.get("target", 0.0),
                    "latest_atr": stage2.get("latest_atr", 0.0),
                    "pivot_high": stage2.get("pivot_high", 0.0),
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
