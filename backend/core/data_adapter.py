"""data_adapter.py — yfinance DataFrame MultiIndex 정규화 전담 모듈 (TDD skeleton)

이 모듈의 목적:
- yfinance 1.x/1.3+ 에서 발생하는 컬럼 구조 변이 (단일/멀티, group_by='ticker' 유무)를
  한 곳에서 robust 하게 처리.
- 기존 data_service.py 의 ad-hoc 분기 로직을 점진적으로 대체하기 위한 기반.

Public API (현재 단계):
- normalize_yf_dataframe(df) -> pd.DataFrame
- get_daily(symbol, period="2y") -> Optional[pd.DataFrame]
"""
import pandas as pd
import yfinance as yf
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def normalize_yf_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """yfinance download 결과 DF 의 MultiIndex 컬럼을 일관된 flat lowercase 로 정규화.

    처리 규칙 (TDD 요구사항 충족하는 최소 구현):
    1. MultiIndex 인 경우 → get_level_values(-1) 로 price field 레벨만 추출
       (ticker 가 level 0 에 있는 group_by 스타일과 single-wrapped 스타일 모두 커버)
    2. 'Adj Close' / 'adj_close' 는 제거 (daily 에서는 보통 불필요)
    3. 표준 5개 컬럼(open/high/low/close/volume) 만 유지, 소문자 rename
    4. dropna() 적용 (기존 서비스와 동일)
    5. 빈 DF / None 은 그대로 반환

    이 함수가 올바르면 data_service.py 의 기존 버그 (get_level_values(0) 로 ticker 명이
    컬럼 전체를 덮는 현상, levels[0] KeyError 등)가 제거된다.
    """
    if df is None or df.empty:
        return df

    result = df.copy()

    # === MultiIndex 정규화 (핵심) ===
    if isinstance(result.columns, pd.MultiIndex):
        # price 필드는 거의 항상 마지막 레벨(-1). level 0 이 ticker 인 경우를 안전하게 처리
        result.columns = result.columns.get_level_values(-1)

    # 대소문자 무관 rename 매핑 (실제 yf 출력 + lower 대비)
    rename_map = {
        "Open": "open", "High": "high", "Low": "low",
        "Close": "close", "Volume": "volume",
        "Adj Close": "adj_close",
        "adj close": "adj_close",
    }
    result = result.rename(columns=rename_map)

    # Adj Close 제거 (있으면)
    if "adj_close" in result.columns:
        result = result.drop(columns=["adj_close"], errors="ignore")

    # 표준 컬럼만 선택 (존재하는 것만)
    keep_cols = [c for c in ["open", "high", "low", "close", "volume"] if c in result.columns]
    if keep_cols:
        result = result[keep_cols]

    # 기존 서비스와 동일하게 dropna
    result = result.dropna()

    return result


def get_daily(symbol: str, period: str = "2y") -> Optional[pd.DataFrame]:
    """단일 종목 일봉을 yfinance 로 가져와 정규화된 DF 로 반환하는 헬퍼.

    내부적으로 normalize_yf_dataframe 를 사용하므로 MultiIndex 변이로부터 안전.
    (향후 data_service.get_multi_daily 의 단일 종목 경로도 이걸로 교체 예정)
    """
    try:
        raw_df = yf.download(
            tickers=symbol,
            period=period,
            interval="1d",
            progress=False,
        )
        if raw_df is None or raw_df.empty:
            logger.warning(f"No data returned for symbol: {symbol}")
            return None
        return normalize_yf_dataframe(raw_df)
    except Exception as e:
        logger.error(f"Error fetching daily data for {symbol}: {e}", exc_info=True)
        return None
