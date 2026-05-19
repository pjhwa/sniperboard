from fastapi import APIRouter, HTTPException
from services.data_service import get_ohlcv
from core.signal_engine import calculate_signals
from typing import List, Dict, Any

router = APIRouter()

@router.get("/ohlcv")
async def get_ohlcv_endpoint(symbol: str, tf: str = "5m"):
    raw_df = get_ohlcv(symbol, tf)
    if raw_df is None or raw_df.empty:
        raise HTTPException(status_code=404, detail="No data found")

    # processed_df rows align 1-to-1 with signals arrays
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
