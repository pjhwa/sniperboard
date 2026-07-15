"""Phase C1/C2 pure comparison helpers — real modules, honest empty-n."""
from core.live_backtest_compare import (
    compare_live_to_backtest,
    confidence_from_n,
    extract_backtest_baseline,
    health_from_expectancy,
)


def test_empty_live_honest_nulls():
    cmp_ = compare_live_to_backtest(
        {"n_closed": 0, "expectancy_r": None, "win_rate": None, "profit_factor": None},
        {"expectancy_r": 0.46, "win_rate": 0.386, "profit_factor": 1.9, "n": 145},
    )
    assert cmp_["sample_n"] == 0
    assert cmp_["confidence"] == "LOW"
    assert cmp_["health_status"] == "INSUFFICIENT_DATA"
    assert cmp_["live"]["expectancy_r"] is None
    assert cmp_["honest_gap_en"] is not None
    assert "n=0" in cmp_["honest_gap_en"] or "n=0" in (cmp_["honest_gap_ko"] or "")


def test_low_n_confidence():
    assert confidence_from_n(0) == "LOW"
    assert confidence_from_n(29) == "LOW"
    assert confidence_from_n(30) == "MEDIUM"
    assert confidence_from_n(80) == "HIGH"


def test_health_on_track():
    assert health_from_expectancy(50, 0.40, 0.46) == "ON_TRACK"
    assert health_from_expectancy(50, 0.10, 0.46) == "WATCH"
    assert health_from_expectancy(50, -0.1, 0.46) == "UNDERPERFORMING"
    assert health_from_expectancy(5, 1.0, 0.46) == "INSUFFICIENT_DATA"


def test_extract_backtest_baseline_from_cache_shape():
    payload = {
        "generated_at": "2026-06-01T00:00:00Z",
        "config": {"stage2_threshold": 5, "rs_threshold": 70, "use_spy_filter": True},
        "aggregate": {
            "all": {"n": 145, "expectancy_r": 0.46, "win_rate": 0.386, "profit_factor": 1.9},
            "out_of_sample": {"n": 67, "expectancy_r": 0.511},
        },
    }
    b = extract_backtest_baseline(payload)
    assert b is not None
    assert b["n"] == 145
    assert b["expectancy_r"] == 0.46
    assert b["oos_expectancy_r"] == 0.511
    assert b["config"]["stage2_threshold"] == 5


def test_extract_none_on_empty():
    assert extract_backtest_baseline(None) is None
    assert extract_backtest_baseline({}) is None


def test_delta_computation():
    cmp_ = compare_live_to_backtest(
        {"n_closed": 40, "expectancy_r": 0.50, "win_rate": 0.40, "profit_factor": 2.0},
        {"expectancy_r": 0.46, "win_rate": 0.386, "profit_factor": 1.9, "n": 145},
    )
    assert cmp_["delta"]["expectancy_r"] == 0.04
    assert cmp_["confidence"] == "MEDIUM"
    assert cmp_["honest_gap_en"] is None


def test_compute_live_stats_includes_methodology_and_comparison():
    """Drive shipped compute_live_stats entry (real DB path)."""
    from core.signal_tracker import compute_live_stats, init_db

    init_db()
    stats = compute_live_stats()
    assert "methodology" in stats
    assert stats["methodology"]["stage2_threshold"] == 5
    assert "sample_n" in stats
    assert stats["sample_n"] == stats["n_closed"]
    assert "comparison" in stats
    assert stats["comparison"]["sample_n"] == stats["n_closed"]
    # empty closed is honest
    if stats["n_closed"] == 0:
        assert stats["expectancy_r"] is None
        assert stats["health"]["status"] == "INSUFFICIENT_DATA"
        assert stats["health"]["confidence"] == "LOW"
