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
