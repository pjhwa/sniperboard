import pandas as pd
from typing import Optional, Dict, List
from services.base import BaseDataService
from core.data_adapter import get_ohlcv_intraday, get_multi_daily as get_multi_daily_adapter

class YFinanceDataService(BaseDataService):
    """yfinance API를 활용한 데이터 다운로드 서비스 구현체"""

    def get_ohlcv(self, symbol: str, timeframe: str = "5m", period: str = "5d") -> Optional[pd.DataFrame]:
        # Delegate to hardened adapter (ports old logic + uses robust normalize_yf_dataframe + explicit auto_adjust=False)
        return get_ohlcv_intraday(symbol, timeframe, period)

    def get_multi_daily(self, symbols: List[str], period: str = "2y") -> Dict[str, Optional[pd.DataFrame]]:
        # Fully delegate to hardened adapter (yf.download + per-sym extraction + normalize)
        # Mirrors the get_ohlcv -> get_ohlcv_intraday delegation.
        return get_multi_daily_adapter(symbols, period)

# 하위 호환성을 위한 기본 서비스 인스턴스 및 헬퍼 함수 제공
_default_service = YFinanceDataService()

def get_ohlcv(symbol: str, timeframe: str = "5m", period: str = "5d") -> Optional[pd.DataFrame]:
    return _default_service.get_ohlcv(symbol, timeframe, period)

def get_multi_daily(symbols: List[str], period: str = "2y") -> Dict[str, Optional[pd.DataFrame]]:
    return _default_service.get_multi_daily(symbols, period)
