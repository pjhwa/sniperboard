from abc import ABC, abstractmethod
import pandas as pd
from typing import Optional, Dict, List

class BaseDataService(ABC):
    @abstractmethod
    def get_ohlcv(self, symbol: str, timeframe: str = "5m", period: str = "5d") -> Optional[pd.DataFrame]:
        """
        주어진 종목(symbol)의 OHLCV 데이터를 pandas DataFrame 형태로 가져옵니다.
        DataFrame의 인덱스는 DatetimeIndex여야 하며, 컬럼명은 ['open', 'high', 'low', 'close', 'volume'] 이어야 합니다.
        """
        pass

    @abstractmethod
    def get_multi_daily(self, symbols: List[str], period: str = "2y") -> Dict[str, Optional[pd.DataFrame]]:
        """
        여러 종목의 일봉(daily) OHLCV 데이터를 일괄 다운로드하여 종목명을 키로 하는 딕셔너리로 반환합니다.
        각 DataFrame의 컬럼명은 ['open', 'high', 'low', 'close', 'volume'] 이어야 합니다.
        """
        pass
