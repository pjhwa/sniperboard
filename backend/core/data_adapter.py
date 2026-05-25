"""data_adapter.py — yfinance DataFrame MultiIndex 정규화 전담 모듈

이 모듈의 목적:
- yfinance 1.x/1.3+ 에서 발생하는 컬럼 구조 변이 (단일/멀티, group_by='ticker' 유무)를
  한 곳에서 robust 하게 처리.
- 기존 data_service.py 의 ad-hoc 분기 로직을 점진적으로 대체하기 위한 기반.

Public API:
- normalize_yf_dataframe(df) -> pd.DataFrame
- get_daily(symbol, period="2y") -> Optional[pd.DataFrame]
- get_ohlcv_intraday(symbol, timeframe="5m", period="5d") -> Optional[pd.DataFrame]
- get_multi_daily(symbols, period="2y") -> Dict[str, Optional[pd.DataFrame]]
  (Task 2 completion: full delegation of multi-daily yf download + normalize path)

Phase 2 (yf accuracy): adj_close (from 'Adj Close') is now preserved in daily output frames
when present in yf response (for Stage2 long-horizon metrics on split symbols). Intraday
paths unchanged in behavior. normalize no longer drops adj_close.

Full delegation (Task 2): all yf access paths (intraday via data_service, daily direct in endpoints + multi)
now route through this adapter. Phase 5 verification exposed + fixed single-ticker intraday
(field, ticker) MultiIndex orientation (previously only (ticker, field) covered by tests).
"""
import pandas as pd
import yfinance as yf
import logging
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


def normalize_yf_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """yfinance download 결과 DF 의 MultiIndex 컬럼을 일관된 flat lowercase 로 정규화.

    처리 규칙 (TDD + yf 1.3+ live 대응):
    1. MultiIndex 인 경우 → 가격 필드(level containing 'Close'/'Open' 등)를 자동 감지하여 추출.
       - group_by="ticker" (multi_daily paths): (Ticker, Field) → Field level
       - default single (intraday/daily): (Field/Price, Ticker) names=['Price','Ticker'] → Field level
       (이전 항상 -1 방식은 intraday에서 ticker 컬럼만 남겨 'close' 누락 → 신호 계산 실패 유발)
    2. 'Adj Close' / 'adj_close' 는 adj_close 로 rename 하여 보존 (Phase 2: daily long-term
       Stage2 metrics 정확도 위해; intraday/GC/short-term은 raw close 유지)
    3. 표준 컬럼(open/high/low/close/volume + optional adj_close) 유지, 소문자 rename
    4. dropna() 적용 (기존 서비스와 동일)
    5. 빈 DF / None 은 그대로 반환

    data_adapter.py = single source of truth: 이 한 곳에서 모든 yf MultiIndex 변이 처리.
    """
    if df is None or df.empty:
        return df

    result = df.copy()

    # === MultiIndex 정규화 (핵심) — robust to yf 1.3+ single-ticker orientations ===
    # Common cases:
    # - group_by="ticker" (multi_daily): level0=Ticker, level1=Field/Price  → use level1
    # - default single ticker (intraday/get_daily): level0=Field/Price (names=['Price','Ticker']), level1=Ticker → use level0
    if isinstance(result.columns, pd.MultiIndex):
        lv0 = result.columns.get_level_values(0)
        lv1 = result.columns.get_level_values(1)
        price_keywords = {"Open", "High", "Low", "Close", "Adj Close", "Volume",
                          "open", "high", "low", "close", "adj close", "volume"}
        lv0_has_price = any(str(x) in price_keywords for x in set(lv0))
        lv1_has_price = any(str(x) in price_keywords for x in set(lv1))
        if lv0_has_price and not lv1_has_price:
            result.columns = lv0
        elif lv1_has_price and not lv0_has_price:
            result.columns = lv1
        else:
            # fallback (prefer last level which works for group_by style)
            result.columns = lv1 if lv1_has_price else lv0

    # 대소문자 무관 rename 매핑 (실제 yf 출력 + lower 대비)
    rename_map = {
        "Open": "open", "High": "high", "Low": "low",
        "Close": "close", "Volume": "volume",
        "Adj Close": "adj_close",
        "adj close": "adj_close",
    }
    result = result.rename(columns=rename_map)

    # Phase 2: adj_close 보존 (drop 제거). daily get_multi_daily/get_daily 경로에서
    # yf가 제공하는 Adj Close를 'adj_close' 컬럼으로 유지 → signal_engine Stage2가
    # split 심볼(NVDA 등)에서 adjusted prices 사용 가능. backward compat: 컬럼 없으면
    # 기존 raw close 경로 그대로.
    # intraday는 auto_adjust=False 여도 영향 최소 (short-term 신호 미사용).

    # 표준 컬럼만 선택 (존재하는 것만; adj_close optional)
    keep_cols = [c for c in ["open", "high", "low", "close", "volume", "adj_close"] if c in result.columns]
    if keep_cols:
        result = result[keep_cols]

    # 기존 서비스와 동일하게 dropna
    result = result.dropna()

    return result


def get_daily(symbol: str, period: str = "2y") -> Optional[pd.DataFrame]:
    """단일 종목 일봉을 yfinance 로 가져와 정규화된 DF 로 반환하는 헬퍼.

    내부적으로 normalize_yf_dataframe 를 사용하므로 MultiIndex 변이로부터 안전.
    (멀티 심볼 경로는 전용 get_multi_daily 가 별도 처리; get_daily 는 단일용 헬퍼)
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


def get_ohlcv_intraday(symbol: str, timeframe: str = "5m", period: str = "5d") -> Optional[pd.DataFrame]:
    """단일 종목 intraday OHLCV (e.g. 5m, 1m) 를 yfinance 로 가져와 정규화된 DF 로 반환.

    Task 2: data_service.get_ohlcv 의 기존 로직을 포팅. auto_adjust=False 명시.
    normalize_yf_dataframe 호출로 MultiIndex( yf 1.3+ ) 를 robust 하게 처리.
    """
    try:
        raw_df = yf.download(
            tickers=symbol,
            period=period,
            interval=timeframe,
            progress=False,
            auto_adjust=False,
        )
        if raw_df is None or raw_df.empty:
            logger.warning(f"No data returned for symbol: {symbol}")
            return None
        return normalize_yf_dataframe(raw_df)
    except Exception as e:
        logger.error(f"Error fetching intraday data for {symbol} ({timeframe}): {e}", exc_info=True)
        return None


def get_multi_daily(symbols: List[str], period: str = "2y") -> Dict[str, Optional[pd.DataFrame]]:
    """여러 종목의 일봉(daily) OHLCV를 yfinance로 일괄 다운로드하고,
    각 심볼을 키로 하는 dict[ sym -> normalized DF | None ] 을 반환.

    group_by='ticker' 사용. yf 1.3+ MultiIndex 변이(단일/멀티 모두)는
    normalize_yf_dataframe 로 중앙 처리.

    Task 2: data_service.get_multi_daily 의 yf.download + per-symbol 루프 로직을
    완전히 이곳으로 위임 (get_ohlcv와 동일한 수준의 delegation).
    """
    if not symbols:
        return {}

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

                # Normalize (MultiIndex handling + rename + optional adj_close preserve + dropna) 위임
                df = normalize_yf_dataframe(raw_df)
                result[sym] = df if df is not None and not df.empty else None
            except Exception as e:
                logger.error(f"Error processing Multi Daily for {sym}: {e}", exc_info=True)
                result[sym] = None
        return result
    except Exception as e:
        logger.error(f"Error in get_multi_daily: {e}", exc_info=True)
        return {}
