"""Shared quantitative helpers used by signal_engine, backtest_engine, and data_adapter.

Extracted so the RS-return math and risk stats are defined exactly once — previously
signal_engine.py and backtest_engine.py each reimplemented the excess-return formula
with different unit scales (percent vs fraction), which is easy to let drift apart.
All functions here are pure (no I/O) so they can be tested against synthetic data
independent of yfinance.
"""
from typing import Optional, Sequence, Tuple

import numpy as np
import pandas as pd


def excess_return_pct(price: pd.Series, market_price: pd.Series, window: int = 63) -> Optional[float]:
    """(stock window-return - market window-return), both in percent.

    Positional alignment: mirrors the existing signal_engine/backtest_engine convention
    of assuming price and market_price already share the same trading-day index — callers
    must pre-align (or accept the small risk of holiday-calendar drift, as the existing
    rs_score formula already does).
    """
    if price is None or market_price is None:
        return None
    if len(price) < window or len(market_price) < window:
        return None
    try:
        base_price = float(price.iloc[-window])
        base_market = float(market_price.iloc[-window])
        if base_price == 0 or base_market == 0:
            return None
        stock_ret = (float(price.iloc[-1]) - base_price) / base_price * 100
        mkt_ret = (float(market_price.iloc[-1]) - base_market) / base_market * 100
        return stock_ret - mkt_ret
    except (IndexError, ValueError):
        return None


def percentile_rank(value: float, population: Sequence[Optional[float]]) -> Optional[float]:
    """Mid-rank percentile (0-100) of value within population. None if population is empty.

    Mid-rank (ties split evenly) avoids the population's own extremes always reading
    as exactly 0 or 100 when there are duplicate values.
    """
    pop = [p for p in population if p is not None and not (isinstance(p, float) and np.isnan(p))]
    if not pop:
        return None
    below = sum(1 for p in pop if p < value)
    equal = sum(1 for p in pop if p == value)
    return round((below + 0.5 * equal) / len(pop) * 100, 2)


def rolling_beta(stock_price: pd.Series, market_price: pd.Series, window: int = 63) -> Optional[float]:
    """Beta of stock daily returns vs market daily returns over the trailing `window` days.

    Aligns on the shared DatetimeIndex (inner join) rather than positional slicing —
    positional iloc alignment silently breaks when the two series have different
    holiday-calendar gaps (a bug we deliberately do not propagate from the older
    rs_score code).
    """
    if stock_price is None or market_price is None:
        return None
    aligned = pd.concat(
        [stock_price.rename('s'), market_price.rename('m')], axis=1, join='inner'
    ).dropna()
    if len(aligned) < window + 1:
        return None
    tail = aligned.iloc[-(window + 1):]
    stock_ret = tail['s'].pct_change().dropna()
    mkt_ret = tail['m'].pct_change().dropna()
    if len(mkt_ret) < 2:
        return None
    market_var = mkt_ret.var(ddof=1)
    if not market_var or np.isnan(market_var):
        return None
    covariance = stock_ret.cov(mkt_ret)
    if covariance is None or np.isnan(covariance):
        return None
    return round(float(covariance / market_var), 3)


def sharpe_sortino(returns: Sequence[float], periods_per_year: float) -> Tuple[float, float]:
    """Sharpe/Sortino ratios from a list of per-trade fractional returns (0.05 = +5%).

    Risk-free rate assumed 0 — short-swing equity trades where funding-rate drag is
    immaterial relative to trade P&L magnitude. `periods_per_year` should reflect the
    *observed* trading cadence (trade count / calendar-years spanned), not an assumed
    always-in-market exposure schedule, since SniperBoard pools trades sequentially
    across ~22 symbols rather than holding one continuous position.
    """
    arr = np.array(returns, dtype=float)
    if len(arr) < 2 or periods_per_year <= 0:
        return 0.0, 0.0
    mean_r = arr.mean()
    std_r = arr.std(ddof=1)
    sharpe = float(mean_r / std_r * np.sqrt(periods_per_year)) if std_r > 0 else 0.0
    downside = arr[arr < 0]
    downside_std = downside.std(ddof=1) if len(downside) >= 2 else 0.0
    sortino = float(mean_r / downside_std * np.sqrt(periods_per_year)) if downside_std > 0 else 0.0
    return round(sharpe, 3), round(sortino, 3)


def trailing_median_outlier_mask(x: pd.Series, window: int = 30, threshold: float = 0.5) -> pd.Series:
    """Flag points that deviate from a *trailing* (causal) rolling median by more than
    `threshold` as a fraction (0.5 = 50%).

    Deliberately trailing-only (window=N ending at each point, never center=True) — a
    centered rolling median reads future bars, which would leak look-ahead information
    into every downstream indicator computed from the smoothed series. See
    backend/tests/test_no_lookahead.py, which uses a centered version as a negative
    control to prove this distinction is actually being tested.
    """
    if len(x) < 3:
        return pd.Series(False, index=x.index)
    values = x.astype(float)
    trailing_median = values.rolling(window=window, min_periods=1).median()
    safe_median = trailing_median.replace(0, np.nan)
    pct_dev = ((values - safe_median) / safe_median).abs()
    return (pct_dev > threshold).fillna(False)
