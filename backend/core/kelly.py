"""Kelly fraction and losing-streak MaxDD from win-rate + expectancy (R-multiples)."""
from __future__ import annotations

import math
from typing import Optional


def payoff_ratio_from_expectancy(win_rate: float, expectancy_r: float) -> Optional[float]:
    """b such that E = p*b - (1-p)*1. Requires 0<p<1."""
    p = float(win_rate)
    if p <= 0 or p >= 1:
        return None
    # E = p*b - (1-p)  →  b = (E + 1 - p) / p
    b = (float(expectancy_r) + 1.0 - p) / p
    if b <= 0:
        return None
    return b


def kelly_fraction(win_rate: float, expectancy_r: float) -> Optional[float]:
    """f* = p - q/b. No edge → 0. Invalid p → None."""
    p = float(win_rate)
    if p <= 0 or p >= 1:
        return None
    b = payoff_ratio_from_expectancy(p, expectancy_r)
    if b is None:
        return 0.0
    q = 1.0 - p
    f = p - q / b
    return max(0.0, f)


def half_kelly(win_rate: float, expectancy_r: float) -> Optional[float]:
    f = kelly_fraction(win_rate, expectancy_r)
    if f is None:
        return None
    return f / 2.0


def losing_streak_maxdd_r(win_rate: float, confidence: float = 0.95) -> Optional[int]:
    """95th-percentile losing streak length in R (1R per loss) as a MaxDD proxy."""
    p = float(win_rate)
    if p <= 0 or p >= 1:
        return None
    q = 1.0 - p
    # P(streak ≥ k) ≈ q^k ; solve q^k = 1-confidence
    if q <= 0:
        return 1
    k = math.log(1.0 - confidence) / math.log(q)
    return max(1, int(math.ceil(k)))
