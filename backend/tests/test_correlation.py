"""Cross-asset Pearson correlation on synthetic aligned series."""
import pandas as pd

from core.correlation import correlation_matrix


def test_identical_series_corr_one():
    x = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0])
    mat = correlation_matrix({"A": x, "B": x.copy()})
    assert mat["A"]["A"] == 1.0
    assert abs(mat["A"]["B"] - 1.0) < 1e-9
    assert abs(mat["B"]["A"] - 1.0) < 1e-9


def test_inverse_series_corr_minus_one():
    # Build prices from opposite daily returns so corr(returns) is -1.
    r = pd.Series([0.01, -0.02, 0.03, 0.04, -0.01, 0.02, -0.03, 0.015])
    x = 100.0 * (1.0 + r).cumprod()
    y = 100.0 * (1.0 - r).cumprod()
    x = pd.concat([pd.Series([100.0]), x], ignore_index=True)
    y = pd.concat([pd.Series([100.0]), y], ignore_index=True)
    mat = correlation_matrix({"X": x, "Y": y})
    assert abs(mat["X"]["Y"] - (-1.0)) < 1e-6


def test_missing_series_omitted_not_fabricated():
    x = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
    mat = correlation_matrix({"SPY": x, "VIX": None, "QQQ": pd.Series(dtype=float)})
    assert "SPY" in mat
    assert "VIX" not in mat
    assert "QQQ" not in mat
    assert set(mat["SPY"].keys()) == {"SPY"}
