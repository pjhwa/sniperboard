"""data_adapter 단위 테스트 — yfinance MultiIndex 컬럼 정규화 TDD

TDD Step 1-1: 이 테스트들은 현재 ad-hoc MultiIndex 처리(data_service.py)의
실패 모드를 재현한다. normalize_yf_dataframe 가 robust 해야 통과.

실행:
cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_data_adapter.py -v
"""
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np

# backend/ 를 path 에 추가 (다른 테스트들과 동일 패턴)
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.data_adapter import normalize_yf_dataframe, get_daily


def _make_single_ticker_multindex_df(symbol: str = "TSLA", n: int = 5) -> pd.DataFrame:
    """yfinance 1.3+ single-ticker download 가 반환하는 ticker-wrapped MultiIndex 모방.
    이 형태에서 .get_level_values(0) 을 쓰면 모든 컬럼이 symbol 로 오염되는 버그 발생.
    """
    dates = pd.date_range("2025-01-01", periods=n, freq="D")
    base = np.linspace(100, 105, n)
    data = {
        (symbol, "Open"): base + np.random.uniform(-1, 1, n),
        (symbol, "High"): base + np.random.uniform(0.5, 2, n),
        (symbol, "Low"): base + np.random.uniform(-2, -0.5, n),
        (symbol, "Close"): base + np.random.uniform(-0.5, 0.5, n),
        (symbol, "Volume"): np.random.randint(10_000_000, 50_000_000, n),
    }
    df = pd.DataFrame(data, index=dates)
    df.columns = pd.MultiIndex.from_tuples(df.columns.tolist())
    df.columns.names = [None, None]
    return df


def _make_group_by_ticker_multindex_df(symbol: str = "AAPL", n: int = 5) -> pd.DataFrame:
    """group_by='ticker' 로 다운로드한 결과에서 단일 심볼 슬라이스 모방.
    columns: MultiIndex(level0=symbol, level1=Field)
    """
    dates = pd.date_range("2025-02-01", periods=n, freq="D")
    base = np.linspace(180, 185, n)
    data = {
        (symbol, "Open"): base + np.random.uniform(-1, 1, n),
        (symbol, "High"): base + np.random.uniform(0.5, 2, n),
        (symbol, "Low"): base + np.random.uniform(-2, -0.5, n),
        (symbol, "Close"): base + np.random.uniform(-0.5, 0.5, n),
        (symbol, "Adj Close"): base + np.random.uniform(-0.5, 0.5, n),
        (symbol, "Volume"): np.random.randint(10_000_000, 50_000_000, n),
    }
    df = pd.DataFrame(data, index=dates)
    df.columns = pd.MultiIndex.from_tuples(df.columns.tolist())
    return df


def test_normalize_yf_dataframe_single_ticker_multindex():
    """Single ticker MultiIndex 입력을 올바르게 평탄화 + lowercase rename 해야 함.
    기존 get_level_values(0) 방식으로는 이 테스트가 실패한다 (컬럼이 전부 'TSLA'가 됨).
    """
    bad_df = _make_single_ticker_multindex_df("TSLA", n=5)
    original_close = bad_df[("TSLA", "Close")].copy()

    result = normalize_yf_dataframe(bad_df)

    assert isinstance(result, pd.DataFrame)
    assert not result.empty
    # 정확한 5개 컬럼만 존재 (Adj Close 드롭)
    expected_cols = ["open", "high", "low", "close", "volume"]
    assert list(result.columns) == expected_cols
    # 데이터 값 보존 (특히 close)
    pd.testing.assert_series_equal(
        result["close"], original_close, check_names=False, check_index=True
    )
    # 인덱스는 DatetimeIndex 유지
    assert isinstance(result.index, pd.DatetimeIndex)
    assert len(result) == 5


def test_normalize_yf_dataframe_group_by_ticker_multindex():
    """group_by='ticker' 스타일 MultiIndex (ticker, Field) 를 올바르게 처리.
    'Adj Close' 는 제거하고, 필드명은 소문자로 정규화.
    """
    bad_df = _make_group_by_ticker_multindex_df("AAPL", n=4)
    original_close = bad_df[("AAPL", "Close")].copy()

    result = normalize_yf_dataframe(bad_df)

    expected_cols = ["open", "high", "low", "close", "volume"]
    assert list(result.columns) == expected_cols
    pd.testing.assert_series_equal(
        result["close"], original_close, check_names=False
    )
    assert "adj close" not in result.columns
    assert "Adj Close" not in result.columns


def test_get_daily_uses_normalize_and_returns_clean_df():
    """get_daily 는 내부적으로 yf.download 후 normalize_yf_dataframe 를 호출해야 함.
    patch 로 MultiIndex 를 반환하는 yf 를 모의하여 정규화 경로를 검증.
    """
    symbol = "NVDA"
    fake_raw = _make_single_ticker_multindex_df(symbol, n=3)

    with patch("core.data_adapter.yf.download", return_value=fake_raw) as mock_download:
        result = get_daily(symbol, period="5d")

        mock_download.assert_called_once()
        # 호출 인자 검증 (최소한 tickers/symbol 과 interval=1d 포함)
        call_kwargs = mock_download.call_args.kwargs
        assert symbol in str(call_kwargs.get("tickers", "")) or symbol == call_kwargs.get("tickers")
        assert call_kwargs.get("interval") == "1d"

        # 결과는 정규화된 깨끗한 DF
        assert result is not None
        assert list(result.columns) == ["open", "high", "low", "close", "volume"]
        assert len(result) == 3
        assert isinstance(result.index, pd.DatetimeIndex)
