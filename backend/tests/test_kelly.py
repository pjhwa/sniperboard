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


def test_payload_falls_back_when_live_n_is_tiny_even_if_win_rate_is_zero():
    """Live n=2 with win_rate=0.0 is not None — must still use cached backtest."""
    from core.kelly import build_kelly_payload

    live = {"n_closed": 2, "sample_n": 2, "win_rate": 0.0, "expectancy_r": -1.0}
    cached = {"aggregate": {"all": {"win_rate": 0.3867, "expectancy_r": 0.362, "n": 406}}}
    out = build_kelly_payload(live, cached)
    assert out["source"] == "backtest"
    assert out["available"] is True
    assert abs(out["win_rate"] - 0.3867) < 1e-9
    assert abs(out["expectancy_r"] - 0.362) < 1e-9
    assert out["kelly"] is not None and out["kelly"] > 0
    assert out["half_kelly"] is not None
    assert out["maxdd_r"] is not None
    assert out["n_live"] == 2


def test_payload_uses_live_when_sample_is_large_enough():
    from core.kelly import build_kelly_payload

    live = {"n_closed": 80, "win_rate": 0.4, "expectancy_r": 0.2}
    cached = {"aggregate": {"all": {"win_rate": 0.3867, "expectancy_r": 0.362}}}
    out = build_kelly_payload(live, cached)
    assert out["source"] == "live"
    assert abs(out["win_rate"] - 0.4) < 1e-9
    assert abs(out["kelly"] - kelly_fraction(0.4, 0.2)) < 1e-12


def test_payload_unavailable_without_live_or_backtest():
    from core.kelly import build_kelly_payload

    out = build_kelly_payload({"n_closed": 2, "win_rate": 0.0}, None)
    assert out["available"] is False
    assert out["kelly"] is None
    assert out["source"] == "none"


def test_payload_uses_on_disk_backtest_cache_when_live_is_thin():
    from core.backtest_engine import load_cached_result
    from core.kelly import build_kelly_payload

    cached = load_cached_result()
    assert cached is not None, "backend/data/backtest_result.json must exist for this path"
    live = {"n_closed": 2, "sample_n": 2, "win_rate": 0.0, "expectancy_r": -1.0}
    out = build_kelly_payload(live, cached)
    agg = cached["aggregate"]["all"]
    assert out["source"] == "backtest"
    assert out["available"] is True
    assert abs(out["win_rate"] - agg["win_rate"]) < 1e-9
    assert abs(out["expectancy_r"] - agg["expectancy_r"]) < 1e-9
    assert out["kelly"] is not None and out["kelly"] > 0
