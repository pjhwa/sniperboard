"""Configurable overlay alerts — price cross, volume spike, Stage2≥5, RS≥70."""
from core.overlay_alerts import (
    evaluate_price_cross,
    evaluate_volume_spike,
    evaluate_stage2_ready,
    evaluate_rs_strong,
    evaluate_overlay_rules,
)


def test_price_cross_above_triggers_only_on_cross():
    cond = {"threshold": 100.0, "direction": "above"}
    miss = evaluate_price_cross(cond, previous=99.0, current=99.5)
    assert miss["triggered"] is False
    hit = evaluate_price_cross(cond, previous=99.0, current=100.0)
    assert hit["triggered"] is True
    already = evaluate_price_cross(cond, previous=101.0, current=102.0)
    assert already["triggered"] is False


def test_price_cross_below():
    cond = {"threshold": 50.0, "direction": "below"}
    hit = evaluate_price_cross(cond, previous=51.0, current=49.0)
    assert hit["triggered"] is True
    miss = evaluate_price_cross(cond, previous=49.0, current=48.0)
    assert miss["triggered"] is False


def test_volume_spike_multiplier():
    miss = evaluate_volume_spike({"multiplier": 2.0}, volume=150, avg_volume=100)
    assert miss["triggered"] is False
    hit = evaluate_volume_spike({"multiplier": 2.0}, volume=200, avg_volume=100)
    assert hit["triggered"] is True
    zero = evaluate_volume_spike({"multiplier": 2.0}, volume=999, avg_volume=0)
    assert zero["triggered"] is False


def test_stage2_ready_threshold():
    assert evaluate_stage2_ready(4)["triggered"] is False
    assert evaluate_stage2_ready(5)["triggered"] is True
    assert evaluate_stage2_ready(7)["triggered"] is True
    assert evaluate_stage2_ready(None)["triggered"] is False


def test_rs_strong_threshold():
    assert evaluate_rs_strong(69.9)["triggered"] is False
    assert evaluate_rs_strong(70)["triggered"] is True
    assert evaluate_rs_strong(None)["triggered"] is False


def test_evaluate_overlay_rules_collects_hits():
    rules = [
        {"id": "a", "type": "price_cross", "symbol": "TSLA", "enabled": True,
         "condition": {"threshold": 200.0, "direction": "above"}},
        {"id": "b", "type": "stage2_ready", "symbol": "NVDA", "enabled": True, "condition": {}},
        {"id": "c", "type": "rs_strong", "symbol": "META", "enabled": False, "condition": {}},
        {"id": "d", "type": "volume_spike", "symbol": "AAPL", "enabled": True,
         "condition": {"multiplier": 3.0}},
    ]
    quotes = {
        "TSLA": {"previous": 199.0, "current": 201.0, "volume": 1, "avg_volume": 1},
        "AAPL": {"previous": 10, "current": 10, "volume": 400, "avg_volume": 100},
    }
    watch = {
        "NVDA": {"stage2_score": 6, "rs_score": 80},
        "META": {"stage2_score": 6, "rs_score": 90},
    }
    hits = evaluate_overlay_rules(rules, quotes=quotes, watch=watch)
    types = {h["type"] for h in hits}
    ids = {h["rule_id"] for h in hits}
    assert "price_cross" in types
    assert "stage2_ready" in types
    assert "volume_spike" in types
    assert "c" not in ids  # disabled
    assert all("title_en" in h and "title_ko" in h for h in hits)
