"""Regression guard against look-ahead bias in trailing-window computations.

gs-quant's own smooth_outliers (gs_quant/timeseries/analysis.py) uses a *centered*
rolling median (center=True), which reads future bars — fine for their plotting use
case, but would corrupt every downstream indicator if ported as-is into a live/backtest
pipeline. assert_causal() operationalizes the check: a function is causal iff computing
it on data truncated at day i gives the same value as computing it on the full series
and reading day i. The centered-median test below is a negative control that proves
assert_causal actually catches this bug, before trusting it on production code.
"""
import numpy as np
import pandas as pd
import pytest

from core.quant_stats import trailing_median_outlier_mask
from core.signal_engine import gaussian_channel


def _centered_median(x: pd.Series, window: int = 30) -> pd.Series:
    """Non-causal core of gs-quant's smooth_outliers detector (center=True median).
    Negative control only — never used in production code.

    Compared directly as floats (not thresholded into a boolean mask): a boolean
    mask can mask small look-ahead-induced differences whenever they fall on the
    same side of the threshold, which would make this negative control unreliable.
    """
    return x.astype(float).rolling(window=window, center=True, min_periods=1).median()


def assert_causal(fn, series: pd.Series, check_index: int, **kwargs):
    """Assert fn(series) at check_index is unchanged when series is truncated
    immediately after check_index — i.e. fn must not depend on future values."""
    full_result = fn(series, **kwargs)
    truncated_result = fn(series.iloc[: check_index + 1], **kwargs)
    full_value = full_result.iloc[check_index]
    trunc_value = truncated_result.iloc[-1]
    if pd.isna(full_value) and pd.isna(trunc_value):
        return
    assert full_value == trunc_value, (
        f"look-ahead bias: value at index {check_index} was {trunc_value} on the "
        f"causal (truncated) series but {full_value} once future rows were appended"
    )


def _sample_series(n=120, seed=7):
    rng = np.random.default_rng(seed)
    idx = pd.date_range("2024-01-01", periods=n, freq="D")
    prices = 100 + np.cumsum(rng.normal(0, 1, n))
    return pd.Series(prices, index=idx)


def test_centered_smoothing_fails_causality_check():
    """Negative control: proves assert_causal detects a known look-ahead bug."""
    s = _sample_series()
    with pytest.raises(AssertionError, match="look-ahead bias"):
        assert_causal(_centered_median, s, check_index=60)


def test_trailing_median_outlier_mask_is_causal():
    s = _sample_series()
    for i in (40, 60, 90):
        assert_causal(trailing_median_outlier_mask, s, check_index=i)


def test_gaussian_channel_mid_is_causal():
    idx = pd.date_range("2024-01-01", periods=150, freq="D")
    rng = np.random.default_rng(3)
    close = pd.Series(100 + np.cumsum(rng.normal(0, 1, 150)), index=idx)
    high = close + 0.5
    low = close - 0.5

    def _mid(c: pd.Series) -> pd.Series:
        mid, _, _ = gaussian_channel(c, high.loc[c.index], low.loc[c.index])
        return pd.Series(mid, index=c.index)

    # period defaults to 100 -> need at least 100 bars after truncation
    for i in (110, 130, 149):
        assert_causal(_mid, close, check_index=i)
