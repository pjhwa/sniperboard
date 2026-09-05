"""Kelly / MaxDD from given win-rate and expectancy (R-multiple system)."""
from core.kelly import (
    payoff_ratio_from_expectancy,
    kelly_fraction,
    half_kelly,
    losing_streak_maxdd_r,
)


def test_payoff_from_expectancy_round_trip():
    # p=0.4, b=2 → E[R] = 0.4*2 - 0.6*1 = 0.2
    b = payoff_ratio_from_expectancy(0.4, 0.2)
    assert b is not None
    assert abs(b - 2.0) < 1e-9


def test_kelly_classic_example():
    # p=0.6, even money b=1 → f* = 0.2
    f = kelly_fraction(0.6, 0.2)  # E = 0.6*1 - 0.4 = 0.2
    assert f is not None
    assert abs(f - 0.2) < 1e-9
    assert abs(half_kelly(0.6, 0.2) - 0.1) < 1e-9


def test_kelly_rejects_no_edge():
    assert kelly_fraction(0.4, -0.1) == 0.0
    assert kelly_fraction(0.0, 1.0) is None
    assert kelly_fraction(1.0, 1.0) is None


def test_losing_streak_maxdd_grows_as_win_rate_falls():
    high = losing_streak_maxdd_r(0.7)
    low = losing_streak_maxdd_r(0.3)
    assert high is not None and low is not None
    assert low > high
    assert high >= 1
