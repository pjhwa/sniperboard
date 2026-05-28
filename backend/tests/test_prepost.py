"""Pre/after-market endpoint TDD

Run:
    cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_prepost.py -v
"""
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.endpoints import _fetch_prepost_data


def _make_ticker_info(pre=182.76, post=None, regular=181.50, state="PRE"):
    return {
        "preMarketPrice": pre,
        "postMarketPrice": post,
        "regularMarketPrice": regular,
        "marketState": state,
    }


def test_prepost_primary_path_pre_market():
    """ticker.info 가 preMarketPrice 반환하면 그것을 사용한다."""
    info = _make_ticker_info(pre=182.76, post=None, regular=181.50, state="PRE")
    mock_ticker = MagicMock()
    mock_ticker.info = info

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    assert result["market_state"] == "PRE"
    assert result["pre_market_price"] == pytest.approx(182.76)
    assert result["post_market_price"] is None
    assert result["regular_close"] == pytest.approx(181.50)
    assert result["pre_market_change_pct"] == pytest.approx((182.76 - 181.50) / 181.50 * 100, abs=0.01)


def test_prepost_primary_path_post_market():
    """ticker.info 가 postMarketPrice 반환하면 그것을 사용한다."""
    info = _make_ticker_info(pre=None, post=180.00, regular=181.50, state="POST")
    mock_ticker = MagicMock()
    mock_ticker.info = info

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    assert result["market_state"] == "POST"
    assert result["post_market_price"] == pytest.approx(180.00)
    assert result["pre_market_price"] is None
    assert result["post_market_change_pct"] == pytest.approx((180.00 - 181.50) / 181.50 * 100, abs=0.01)


def test_prepost_fallback_to_history_when_info_missing():
    """ticker.info 에 pre/post 가격이 없으면 history(prepost=True) 로 폴백한다."""
    info = _make_ticker_info(pre=None, post=None, regular=181.50, state="PRE")
    mock_ticker = MagicMock()
    mock_ticker.info = info

    # history 반환값: 마지막 캔들이 장외 시간 (04:00)
    idx = pd.date_range("2025-01-10 04:00", periods=3, freq="1min", tz="America/New_York")
    df = pd.DataFrame({"Close": [181.0, 181.5, 182.0]}, index=idx)
    mock_ticker.history.return_value = df

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    mock_ticker.history.assert_called_once_with(period="1d", interval="1m", prepost=True)
    assert result["pre_market_price"] == pytest.approx(182.0)
    assert result["pre_market_change_pct"] is not None


def test_prepost_returns_nulls_on_exception():
    """yfinance 예외 발생 시 null 필드로 graceful 응답한다."""
    mock_ticker = MagicMock()
    mock_ticker.info = {}  # marketState 없음
    mock_ticker.history.side_effect = Exception("network error")

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    assert result["pre_market_price"] is None
    assert result["post_market_price"] is None
    assert result["market_state"] in ("CLOSED", "UNKNOWN")


def test_prepost_regular_market_returns_no_prepost_prices():
    """정규장 중에는 pre/post 가격이 null이다."""
    info = _make_ticker_info(pre=None, post=None, regular=181.50, state="REGULAR")
    mock_ticker = MagicMock()
    mock_ticker.info = info

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    assert result["market_state"] == "REGULAR"
    assert result["pre_market_price"] is None
    assert result["post_market_price"] is None
