import numpy as np
import pandas as pd
import pytest

from core.quant_stats import (
    excess_return_pct,
    percentile_rank,
    rolling_beta,
    sharpe_sortino,
    trailing_median_outlier_mask,
)


def _series(values, start="2024-01-01"):
    idx = pd.date_range(start, periods=len(values), freq="D")
    return pd.Series(values, index=idx, dtype=float)


def test_excess_return_pct_matches_manual_formula():
    stock = _series([100.0] * 62 + [110.0])   # +10% over 63 bars
    spy = _series([100.0] * 62 + [105.0])     # +5% over 63 bars
    result = excess_return_pct(stock, spy, window=63)
    assert result == pytest.approx(5.0, abs=1e-9)


def test_excess_return_pct_insufficient_history_returns_none():
    stock = _series([100.0] * 30)
    spy = _series([100.0] * 30)
    assert excess_return_pct(stock, spy, window=63) is None


def test_percentile_rank_basic():
    population = [10.0, 20.0, 30.0, 40.0, 50.0]
    assert percentile_rank(30.0, population) == pytest.approx(50.0)
    assert percentile_rank(0.0, population) == pytest.approx(0.0)
    assert percentile_rank(100.0, population) == pytest.approx(100.0)


def test_percentile_rank_empty_population_returns_none():
    assert percentile_rank(5.0, []) is None


def test_rolling_beta_perfect_correlation_is_one():
    rng = np.random.default_rng(1)
    market_ret = rng.normal(0, 0.01, 200)
    market = _series(100 * np.cumprod(1 + market_ret))
    stock = _series(100 * np.cumprod(1 + market_ret))  # identical returns -> beta 1
    beta = rolling_beta(stock, market, window=63)
    assert beta == pytest.approx(1.0, abs=1e-6)


def test_rolling_beta_double_leverage_is_two():
    rng = np.random.default_rng(2)
    market_ret = rng.normal(0, 0.01, 200)
    market = _series(100 * np.cumprod(1 + market_ret))
    stock = _series(100 * np.cumprod(1 + 2 * market_ret))
    beta = rolling_beta(stock, market, window=63)
    assert beta == pytest.approx(2.0, abs=1e-2)


def test_rolling_beta_insufficient_history_returns_none():
    market = _series([100.0] * 30)
    stock = _series([100.0] * 30)
    assert rolling_beta(stock, market, window=63) is None


def test_sharpe_sortino_positive_returns_only_has_zero_sortino():
    returns = [0.05, 0.03, 0.04, 0.02]
    sharpe, sortino = sharpe_sortino(returns, periods_per_year=12)
    assert sharpe > 0
    assert sortino == 0.0  # no downside observations


def test_sharpe_sortino_mixed_returns():
    returns = [0.05, -0.02, 0.03, -0.01, 0.04]
    sharpe, sortino = sharpe_sortino(returns, periods_per_year=12)
    mean_r = np.mean(returns)
    std_r = np.std(returns, ddof=1)
    expected_sharpe = mean_r / std_r * np.sqrt(12)
    assert sharpe == pytest.approx(expected_sharpe, abs=1e-3)
    assert sortino > sharpe  # downside deviation < total deviation here


def test_sharpe_sortino_too_few_trades_returns_zero():
    assert sharpe_sortino([0.05], periods_per_year=12) == (0.0, 0.0)


def test_trailing_median_outlier_mask_flags_single_spike():
    values = [100.0] * 20 + [500.0] + [100.0] * 20  # one 5x spike
    mask = trailing_median_outlier_mask(_series(values), window=10, threshold=0.5)
    assert mask.iloc[20]  # the spike itself
    assert not mask.iloc[19]
    assert not mask.iloc[21]  # trailing-only: the bar *after* the spike isn't flagged


def test_trailing_median_outlier_mask_no_false_positives_on_normal_data():
    rng = np.random.default_rng(4)
    values = 100 + np.cumsum(rng.normal(0, 0.5, 100))
    mask = trailing_median_outlier_mask(_series(values), window=30, threshold=0.5)
    assert not mask.any()
