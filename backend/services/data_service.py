import yfinance as yf
import pandas as pd
from typing import Optional

def get_ohlcv(symbol: str, timeframe: str = "5m", period: str = "5d") -> Optional[pd.DataFrame]:
    """
    yfinance를 사용해 OHLCV 데이터를 가져옵니다.
    timeframe: '1m', '5m', '15m' 등
    """
    try:
        df = yf.download(
            tickers=symbol,
            period=period,
            interval=timeframe,
            progress=False
        )
        if df.empty:
            return None

        # MultiIndex 컬럼 처리
        df.columns = df.columns.get_level_values(0)
        df = df.rename(columns={
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume"
        })
        df = df.dropna()
        return df
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None


def get_multi_daily(symbols: list, period: str = "2y") -> dict:
    """Batch-download daily OHLCV for multiple symbols."""
    try:
        data = yf.download(
            tickers=symbols,
            period=period,
            interval="1d",
            group_by="ticker",
            progress=False,
        )
        result = {}
        for sym in symbols:
            try:
                if len(symbols) == 1:
                    df = data.copy()
                    df.columns = df.columns.get_level_values(0)
                else:
                    df = data[sym].copy()
                df = df.rename(columns={
                    "Open": "open", "High": "high", "Low": "low",
                    "Close": "close", "Adj Close": "adj_close", "Volume": "volume",
                })
                keep = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
                df = df[keep].dropna()
                result[sym] = df if not df.empty else None
            except Exception as e:
                print(f"Error processing {sym}: {e}")
                result[sym] = None
        return result
    except Exception as e:
        print(f"Error in get_multi_daily: {e}")
        return {}
