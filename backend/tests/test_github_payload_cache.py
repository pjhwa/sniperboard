"""Phase A unit tests: last-good cache + slot coherence."""
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.github_payload_cache import (
    LastGoodCache,
    annotate_slot_mismatch,
    mark_stale_result,
    slots_compatible,
)


def test_last_good_served_after_ttl_and_fetch_failure():
    cache = LastGoodCache(ttl_seconds=0.01)
    payload = {"generated_at": "2026-07-15T00:00:00Z", "slot": "post_close", "x": 1}
    cache.set_success(payload)
    # Force TTL expiry
    cache._ts = 0.0
    assert cache.get_fresh() is None
    assert cache.get_last_good()["x"] == 1


def test_mark_stale_result_flags():
    r = mark_stale_result({"available": True, "data": {"a": 1}}, reason="fetch_failed")
    assert r["available"] is True
    assert r["stale"] is True
    assert r["from_cache"] is True
    assert "fetch_failed" in r["stale_reason"]


def test_slots_compatible():
    assert slots_compatible("pre_open", "pre_open")
    assert not slots_compatible("pre_open", "post_close")
    assert slots_compatible(None, "pre_open")  # unknown → no hard fail
    assert slots_compatible("pre_open", None)


def test_annotate_slot_mismatch():
    ok = annotate_slot_mismatch({"slot": "pre_open"}, "pre_open")
    assert ok.get("slot_mismatch") is False
    bad = annotate_slot_mismatch({"slot": "pre_open"}, "post_close")
    assert bad.get("slot_mismatch") is True
    assert bad.get("sentiment_slot_seen") == "post_close"


def test_earnings_stale_on_error_real_path():
    """Drive earnings_service.fetch_earnings with last-good then failed network."""
    import services.earnings_service as svc

    svc._cache.clear()
    good = {
        "generated_at": "2026-07-15T12:00:00Z",
        "schema_version": "2.0",
        "upcoming_earnings": [
            {"symbol": "TSM", "earnings_date": "2026-08-20", "days_until": 99, "eps_estimate": 1.0}
        ],
        "recent_results": [],
    }
    with patch.object(svc, "EARNINGS_DATA_URL", "http://fake.example/e.json"), \
         patch("services.earnings_service.requests.get") as mock_get:
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json.return_value = good
        r1 = svc.fetch_earnings()
    assert r1["available"] is True
    assert r1.get("stale") is False
    assert r1["data"]["upcoming_earnings"][0]["symbol"] == "TSM"

    # Expire TTL and fail network → last-good
    svc._cache._ts = 0.0
    with patch.object(svc, "EARNINGS_DATA_URL", "http://fake.example/e.json"), \
         patch("services.earnings_service.requests.get", side_effect=Exception("timeout")):
        r2 = svc.fetch_earnings()
    assert r2["available"] is True
    assert r2.get("stale") is True
    assert r2.get("from_cache") is True
    assert r2["data"]["upcoming_earnings"][0]["symbol"] == "TSM"


def test_brief_stale_on_error_real_path():
    import services.brief_service as svc

    svc._cache.clear()
    good = {
        "generated_at": "2026-07-15T12:00:00Z",
        "slot": "post_close",
        "market_brief": {"tone": "cautious"},
        "symbol_briefs": [],
    }
    with patch.object(svc, "BRIEF_DATA_URL", "http://fake.example/b.json"), \
         patch("services.brief_service.requests.get") as mock_get, \
         patch("services.sentiment_service.fetch_latest", return_value={"available": True, "slot": "post_close"}):
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json.return_value = good
        r1 = svc.fetch_brief()
    assert r1["available"] and r1["data"]["slot"] == "post_close"

    svc._cache._ts = 0.0
    with patch.object(svc, "BRIEF_DATA_URL", "http://fake.example/b.json"), \
         patch("services.brief_service.requests.get", side_effect=Exception("down")):
        r2 = svc.fetch_brief()
    assert r2["available"] is True
    assert r2.get("stale") is True
    assert r2["data"]["slot"] == "post_close"


def test_sentiment_stale_on_error_real_path():
    import services.sentiment_service as svc

    svc._cache.clear()
    good = {
        "generated_at": "2026-07-15T12:00:00Z",
        "slot": "pre_open",
        "market": {"composite_score": 0.5},
        "symbols": [],
    }
    with patch.object(svc, "SENTIMENT_DATA_URL", "http://fake.example/s.json"), \
         patch("services.sentiment_service.requests.get") as mock_get:
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json.return_value = good
        r1 = svc.fetch_latest()
    assert r1["available"] is True
    assert r1["slot"] == "pre_open"

    svc._cache._ts = 0.0
    with patch.object(svc, "SENTIMENT_DATA_URL", "http://fake.example/s.json"), \
         patch("services.sentiment_service.requests.get", side_effect=Exception("down")):
        r2 = svc.fetch_latest()
    assert r2["available"] is True
    assert r2.get("stale") is True
    assert r2["slot"] == "pre_open"


def test_brief_slot_guard_public():
    from services.brief_service import apply_slot_guard, slots_match
    assert slots_match("pre_open", "pre_open")
    assert not slots_match("pre_open", "post_close")
    d = apply_slot_guard({"slot": "pre_open", "x": 1}, "post_close")
    assert d["slot_mismatch"] is True
