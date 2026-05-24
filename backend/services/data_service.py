import yfinance as yf
import pandas as pd
from typing import Optional, Dict, List
from services.base import BaseDataService
from core.data_adapter import normalize_yf_dataframe, get_ohlcv_intraday
import logging

logger = logging.getLogger(__name__)

class YFinanceDataService(BaseDataService):
    """yfinance API를 활용한 데이터 다운로드 서비스 구현체"""

    def get_ohlcv(self, symbol: str, timeframe: str = "5m", period: str = "5d") -> Optional[pd.DataFrame]:
        # Delegate to hardened adapter (ports old logic + uses robust normalize_yf_dataframe + explicit auto_adjust=False)
        return get_ohlcv_intraday(symbol, timeframe, period)

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
                        raw_df = data.copy()
                    else:
                        # 멀티 종목 다운로드 시 key가 없을 경우 대응
                        if sym not in data.columns.levels[0]:
                            result[sym] = None
                            continue
                        raw_df = data[sym].copy()

                    # Delegate column normalization (MultiIndex handling + rename + adj drop + dropna) to adapter
                    df = normalize_yf_dataframe(raw_df)
                    result[sym] = df if df is not None and not df.empty else None
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
