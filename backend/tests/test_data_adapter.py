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

from core.data_adapter import normalize_yf_dataframe, get_daily, get_ohlcv_intraday, get_multi_daily


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
    # 정확한 5개 컬럼 (이 mock에는 Adj Close 없음 → adj_close 컬럼도 없음)
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
    Phase 2: 'Adj Close' 는 'adj_close' 로 rename+보존 (Stage2 adjusted support).
    """
    bad_df = _make_group_by_ticker_multindex_df("AAPL", n=4)
    original_close = bad_df[("AAPL", "Close")].copy()

    result = normalize_yf_dataframe(bad_df)

    # 6 cols: 5 OHLCV + adj_close (mock에 Adj Close 있음)
    expected_cols = ["open", "high", "low", "close", "volume", "adj_close"]
    assert list(result.columns) == expected_cols
    pd.testing.assert_series_equal(
        result["close"], original_close, check_names=False
    )
    assert "adj_close" in result.columns
    # 원본 대소문자 Adj Close 키는 normalize 후 존재하지 않음 (rename됨)
    assert "Adj Close" not in result.columns
    assert "adj close" not in result.columns


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

        # 결과는 정규화된 깨끗한 DF (이 mock에 Adj 없음 → 5 cols)
        assert result is not None
        assert list(result.columns) == ["open", "high", "low", "close", "volume"]
        assert len(result) == 3
        assert isinstance(result.index, pd.DatetimeIndex)


def test_get_ohlcv_intraday_uses_normalize_and_explicit_auto_adjust():
    """get_ohlcv_intraday 는 intraday 데이터 로드 + normalize + auto_adjust=False 를 명시적으로 사용해야 함.
    (Task 2: data_service 위임 대상)
    """
    symbol = "TSLA"
    fake_raw = _make_single_ticker_multindex_df(symbol, n=4)

    with patch("core.data_adapter.yf.download", return_value=fake_raw) as mock_download:
        result = get_ohlcv_intraday(symbol, timeframe="5m", period="5d")

        mock_download.assert_called_once()
        call_kwargs = mock_download.call_args.kwargs
        assert symbol in str(call_kwargs.get("tickers", "")) or symbol == call_kwargs.get("tickers")
        assert call_kwargs.get("interval") == "5m"
        assert call_kwargs.get("period") == "5d"
        assert call_kwargs.get("auto_adjust") is False   # 핵심: 명시적 False

        # normalize 결과 검증 (MultiIndex -> flat ohlcv; intraday mock에 Adj Close 없음)
        assert result is not None
        assert list(result.columns) == ["open", "high", "low", "close", "volume"]
        assert len(result) == 4
        assert isinstance(result.index, pd.DatetimeIndex)


# =============================================================================
# get_multi_daily coverage (added per Code Quality Reviewer feedback)
# =============================================================================

def _make_multi_ticker_group_by_df(symbols: list[str], n: int = 5) -> pd.DataFrame:
    """group_by='ticker' 로 다운로드한 multi-symbol 결과 모방.
    columns: MultiIndex(level0=symbol, level1=Field) — get_multi_daily의 levels[0] 체크에 사용.
    """
    dates = pd.date_range("2025-03-01", periods=n, freq="D")
    data = {}
    for i, sym in enumerate(symbols):
        base = np.linspace(120 + i * 10, 125 + i * 10, n)
        data[(sym, "Open")] = base + np.random.uniform(-1, 1, n)
        data[(sym, "High")] = base + np.random.uniform(0.5, 2, n)
        data[(sym, "Low")] = base + np.random.uniform(-2, -0.5, n)
        data[(sym, "Close")] = base + np.random.uniform(-0.5, 0.5, n)
        data[(sym, "Adj Close")] = base + np.random.uniform(-0.5, 0.5, n)
        data[(sym, "Volume")] = np.random.randint(10_000_000, 50_000_000, n)
    df = pd.DataFrame(data, index=dates)
    df.columns = pd.MultiIndex.from_tuples(df.columns.tolist())
    df.columns.names = [None, None]
    return df


def test_get_multi_daily_empty_symbols_returns_empty_dict():
    """빈 symbols 리스트 → {} 반환 (early return 커버)."""
    result = get_multi_daily([])
    assert result == {}


def test_get_multi_daily_happy_path_multiple_symbols():
    """Happy path (multi-symbol): group_by MultiIndex → dict[sym -> normalized DF]."""
    symbols = ["TSLA", "AAPL"]
    fake_raw = _make_multi_ticker_group_by_df(symbols, n=7)

    with patch("core.data_adapter.yf.download", return_value=fake_raw) as mock_download:
        result = get_multi_daily(symbols, period="2y")

        mock_download.assert_called_once()
        kwargs = mock_download.call_args.kwargs
        assert kwargs.get("group_by") == "ticker"
        assert kwargs.get("interval") == "1d"
        assert kwargs.get("period") == "2y"
        tickers_arg = kwargs.get("tickers")
        assert tickers_arg == symbols or set(symbols).issubset(
            set(tickers_arg) if isinstance(tickers_arg, (list, tuple)) else [tickers_arg]
        )

        assert isinstance(result, dict)
        assert set(result.keys()) == set(symbols)
        for sym in symbols:
            df = result[sym]
            assert df is not None
            assert not df.empty
            # multi mock에 Adj Close 포함 → Phase2: adj_close 보존 (6 cols)
            assert list(df.columns) == ["open", "high", "low", "close", "volume", "adj_close"]
            assert len(df) == 7
            assert isinstance(df.index, pd.DatetimeIndex)


def test_get_multi_daily_single_symbol_case():
    """len(symbols)==1 분기: data.copy() 경로 + normalize (single-wrapped MultiIndex 대응)."""
    symbols = ["NVDA"]
    fake_raw = _make_single_ticker_multindex_df("NVDA", n=3)

    with patch("core.data_adapter.yf.download", return_value=fake_raw) as mock_download:
        result = get_multi_daily(symbols)

        assert list(result.keys()) == ["NVDA"]
        df = result["NVDA"]
        assert df is not None
        # single mock no Adj Close → 5 cols (backward)
        assert list(df.columns) == ["open", "high", "low", "close", "volume"]
        assert len(df) == 3


def test_get_multi_daily_missing_symbol_and_overall_error_handling():
    """멀티 경로: levels[0] 미존재 sym → None, per-sym except → None.
    전체 download 예외 → {} 반환."""
    symbols = ["MISSING", "PRESENT"]
    # PRESENT만 포함된 DF → MISSING은 'not in levels[0]' 로 None 처리
    fake_raw = _make_multi_ticker_group_by_df(["PRESENT"], n=4)

    with patch("core.data_adapter.yf.download", return_value=fake_raw) as mock_download:
        result = get_multi_daily(symbols, period="5d")
        assert result["MISSING"] is None
        assert result["PRESENT"] is not None
        # PRESENT mock (multi group_by style) has Adj Close → 6 cols with adj_close preserved
        assert list(result["PRESENT"].columns) == ["open", "high", "low", "close", "volume", "adj_close"]

    # download 자체 실패 (outer except)
    with patch("core.data_adapter.yf.download", side_effect=Exception("network timeout")):
        result = get_multi_daily(["ANY"])
        assert result == {}


# =============================================================================
# Phase 5 verification fix: cover yf 1.3+ single-ticker intraday (Price, Ticker) orientation
# (names=["Price", "Ticker"], level0=fields) — previously caused 'close' KeyError in signals.
# =============================================================================

def _make_intraday_single_ticker_price_first_multindex(symbol: str = "AAPL", n: int = 4) -> pd.DataFrame:
    """Real yf 1.3+ intraday single-ticker (no group_by) raw structure.
    columns: MultiIndex(level0=Price/Field e.g. 'Close', level1=Ticker) names=['Price','Ticker']
    This was not covered by prior (ticker,field) mocks; normalize now robustly detects.
    """
    dates = pd.date_range("2025-04-01", periods=n, freq="5min")
    base = np.linspace(200, 205, n)
    data = {
        ("Adj Close", symbol): base + 0.1,
        ("Close", symbol): base,
        ("High", symbol): base + 1,
        ("Low", symbol): base - 1,
        ("Open", symbol): base + 0.2,
        ("Volume", symbol): [1000000 + i*100 for i in range(n)],
    }
    df = pd.DataFrame(data, index=dates)
    df.columns = pd.MultiIndex.from_tuples(df.columns.tolist())
    df.columns.names = ["Price", "Ticker"]
    return df


def test_normalize_yf_dataframe_intraday_price_first_multindex():
    """(field, ticker) orientation from live intraday yf.download must yield clean ohlcv + adj_close optional."""
    bad_df = _make_intraday_single_ticker_price_first_multindex("AAPL", n=4)
    result = normalize_yf_dataframe(bad_df)

    assert isinstance(result, pd.DataFrame)
    assert not result.empty
    expected = ["open", "high", "low", "close", "volume", "adj_close"]
    assert list(result.columns) == expected
    assert "close" in result.columns
    # value preservation spot
    assert abs(float(result["close"].iloc[0]) - 200.0) < 0.5
    assert isinstance(result.index, pd.DatetimeIndex)
