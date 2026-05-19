import pandas as pd
from fastapi import APIRouter, HTTPException
from services.data_service import get_ohlcv, get_multi_daily
from core.signal_engine import calculate_signals, add_daily_indicators, calculate_stage2_analysis

router = APIRouter()

WATCHLIST_SYMS = ["TSLA", "AAPL", "NVDA", "META", "AMZN", "GOOGL"]


@router.get("/ohlcv")
async def get_ohlcv_endpoint(symbol: str, tf: str = "5m"):
    raw_df = get_ohlcv(symbol, tf)
    if raw_df is None or raw_df.empty:
        raise HTTPException(status_code=404, detail="No data found")

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


@router.get("/latest-signal")
async def get_latest_signal(symbol: str, tf: str = "5m"):
    raw_df = get_ohlcv(symbol, tf)
    if raw_df is None or raw_df.empty:
        raise HTTPException(status_code=404, detail="No data found")

    processed_df, signals = calculate_signals(raw_df)
    latest = {k: v[-1] for k, v in signals.items()}
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


@router.get("/daily")
async def get_daily_endpoint(symbol: str):
    """1-year daily OHLCV with EMA21/50/200, ATR, volume avg, and Stage 2 analysis."""
    dfs = get_multi_daily([symbol.upper(), "SPY"], period="2y")
    df = dfs.get(symbol.upper())
    spy_df = dfs.get("SPY")

    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No daily data found for {symbol}")

    df = add_daily_indicators(df)
    df = df.iloc[-252:]  # Show last ~1 year after EMA200 warmup

    spy_close = spy_df["close"] if spy_df is not None and not spy_df.empty else None
    stage2 = calculate_stage2_analysis(df, spy_close)

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
        "ema21": [round(float(v), 4) for v in df["ema21"]],
        "ema50": [round(float(v), 4) for v in df["ema50"]],
        "ema200": [round(float(v), 4) for v in df["ema200"]],
        "atr14": [round(float(v), 4) for v in df["atr14"]],
    }

    vol_avg20 = [int(v) if pd.notna(v) else 0 for v in df["vol_avg20"]]

    return {
        "symbol": symbol.upper(),
        "candles": candles,
        "indicators": indicators,
        "vol_avg20": vol_avg20,
        "stage2": stage2,
    }


@router.get("/watchlist")
async def get_watchlist_endpoint():
    """Stage 2 analysis for all watchlist symbols, ranked by score."""
    all_syms = WATCHLIST_SYMS + ["SPY"]
    dfs = get_multi_daily(all_syms, period="2y")
    spy_df = dfs.get("SPY")
    spy_close = spy_df["close"] if spy_df is not None and not spy_df.empty else None

    result = []
    for sym in WATCHLIST_SYMS:
        df = dfs.get(sym)
        if df is None or df.empty:
            continue
        try:
            df = add_daily_indicators(df)
            stage2 = calculate_stage2_analysis(df, spy_close)
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
            })
        except Exception as e:
            print(f"Watchlist error for {sym}: {e}")

    result.sort(key=lambda x: x["score"], reverse=True)
    return {"watchlist": result}
