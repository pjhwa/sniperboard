"""Multi-horizon RS vs SPY on synthetic series. Existing 63d formula stays in signal_engine."""
import pandas as pd

from core.rs_horizons import HORIZON_BARS, rs_horizons


def test_horizon_bar_windows():
    assert HORIZON_BARS["1m"] == 21
    assert HORIZON_BARS["3m"] == 63
    assert HORIZON_BARS["6m"] == 126
    assert HORIZON_BARS["12m"] == 252


def test_outperforming_stock_positive_excess_all_horizons():
    n = 260
    spy = pd.Series([100.0 + i * 0.1 for i in range(n)])
    stock = pd.Series([100.0 + i * 0.3 for i in range(n)])
    out = rs_horizons(stock, spy)
    for key in ("1m", "3m", "6m", "12m"):
        assert out[key] is not None, key
        assert out[key] > 0, key


def test_underperforming_stock_negative_excess():
    n = 80
    spy = pd.Series([100.0 + i * 0.4 for i in range(n)])
    stock = pd.Series([100.0 + i * 0.05 for i in range(n)])
    out = rs_horizons(stock, spy)
    assert out["1m"] < 0
    assert out["3m"] < 0
    assert out["6m"] is None  # not enough bars
    assert out["12m"] is None


def test_short_series_returns_none():
    spy = pd.Series([100.0, 101.0])
    stock = pd.Series([100.0, 102.0])
    out = rs_horizons(stock, spy)
    assert out == {"1m": None, "3m": None, "6m": None, "12m": None}
