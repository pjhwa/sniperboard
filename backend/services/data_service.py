import yfinance as yf
import pandas as pd
from typing import Optional, Dict, List
from services.base import BaseDataService
import logging

logger = logging.getLogger(__name__)

class YFinanceDataService(BaseDataService):
    """yfinance API를 활용한 데이터 다운로드 서비스 구현체"""

    def get_ohlcv(self, symbol: str, timeframe: str = "5m", period: str = "5d") -> Optional[pd.DataFrame]:
        try:
            df = yf.download(
                tickers=symbol,
                period=period,
                interval=timeframe,
                progress=False
            )
            if df.empty:
                logger.warning(f"No data returned for symbol: {symbol}")
                return None

            # MultiIndex 컬럼 대응 및 평탄화
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            df = df.rename(columns={
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Volume": "volume"
            })
            
            # 필요한 컬럼만 추출
            required_cols = ["open", "high", "low", "close", "volume"]
            df = df[required_cols].dropna()
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {symbol} ({timeframe}): {e}", exc_info=True)
            return None

    def get_multi_daily(self, symbols: List[str], period: str = "2y") -> Dict[str, Optional[pd.DataFrame]]:
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
                    # 단일 종목 다운로드 시 data 구조 대응
                    if len(symbols) == 1:
                        df = data.copy()
                        if isinstance(df.columns, pd.MultiIndex):
                            df.columns = df.columns.get_level_values(0)
                    else:
                        # 멀티 종목 다운로드 시 key가 없을 경우 대응
                        if sym not in data.columns.levels[0]:
                            result[sym] = None
                            continue
                        df = data[sym].copy()

                    df = df.rename(columns={
                        "Open": "open", 
                        "High": "high", 
                        "Low": "low",
                        "Close": "close", 
                        "Adj Close": "adj_close", 
                        "Volume": "volume",
                    })
                    
                    keep = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
                    df = df[keep].dropna()
                    result[sym] = df if not df.empty else None
                except Exception as e:
                    logger.error(f"Error processing Multi Daily for {sym}: {e}", exc_info=True)
                    result[sym] = None
            return result
        except Exception as e:
            logger.error(f"Error in get_multi_daily: {e}", exc_info=True)
            return {}

# 하위 호환성을 위한 기본 서비스 인스턴스 및 헬퍼 함수 제공
_default_service = YFinanceDataService()

def get_ohlcv(symbol: str, timeframe: str = "5m", period: str = "5d") -> Optional[pd.DataFrame]:
    return _default_service.get_ohlcv(symbol, timeframe, period)

def get_multi_daily(symbols: List[str], period: str = "2y") -> Dict[str, Optional[pd.DataFrame]]:
    return _default_service.get_multi_daily(symbols, period)
