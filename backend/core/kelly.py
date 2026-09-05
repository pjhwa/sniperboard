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


# Match live_backtest_compare.confidence_from_n LOW band / honest_gap.
LIVE_KELLY_MIN_N = 30


def _finite_prob(wr: object, exp: object) -> Optional[tuple[float, float]]:
    if wr is None or exp is None:
        return None
    try:
        p = float(wr)
        e = float(exp)
    except (TypeError, ValueError):
        return None
    if p <= 0 or p >= 1:
        return None
    return p, e


def extract_backtest_win_expectancy(cached: Optional[dict]) -> Optional[tuple[float, float]]:
    agg = (cached or {}).get("aggregate") or {}
    all_ = agg.get("all") or {}
    return _finite_prob(all_.get("win_rate"), all_.get("expectancy_r"))


def build_kelly_payload(
    live_stats: Optional[dict],
    cached_backtest: Optional[dict],
) -> dict:
    """Prefer live win_rate/expectancy only when n is large enough and 0<p<1.

    win_rate=0.0 with n=2 is not None, but Kelly is undefined and the sample
    is in the honest_gap band — fall back to cached backtest aggregate.
    """
    live = live_stats if isinstance(live_stats, dict) else {}
    n_live = int(live.get("n_closed") or live.get("sample_n") or 0)
    live_pair = _finite_prob(live.get("win_rate"), live.get("expectancy_r"))
    use_live = n_live >= LIVE_KELLY_MIN_N and live_pair is not None

    source = "none"
    pair: Optional[tuple[float, float]] = None
    if use_live:
        pair = live_pair
        source = "live"
    else:
        pair = extract_backtest_win_expectancy(cached_backtest)
        if pair is not None:
            source = "backtest"

    wr_f = pair[0] if pair else None
    exp_f = pair[1] if pair else None
    kelly = kelly_fraction(wr_f, exp_f) if wr_f is not None and exp_f is not None else None
    return {
        "available": kelly is not None,
        "win_rate": wr_f,
        "expectancy_r": exp_f,
        "payoff_ratio": (
            payoff_ratio_from_expectancy(wr_f, exp_f)
            if wr_f is not None and exp_f is not None
            else None
        ),
        "kelly": kelly,
        "half_kelly": half_kelly(wr_f, exp_f) if wr_f is not None and exp_f is not None else None,
        "maxdd_r": losing_streak_maxdd_r(wr_f) if wr_f is not None else None,
        "n_live": n_live,
        "source": source,
        "usage": "reference_only",
    }
