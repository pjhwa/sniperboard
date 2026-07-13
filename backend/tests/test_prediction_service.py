"""prediction_service unit tests."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))

import services.prediction_service as svc


SAMPLE = {
    "generated_at": "2026-07-13T22:00:00Z",
    "schema_version": "1.1",
    "slot": "post_close",
    "source": "polymarket",
    "usage": "reference_only",
    "disclaimer_en": "reference only",
    "disclaimer_ko": "참고용",
    "next_fomc": {
        "event_ticker": "fed-decision-in-july-181",
        "meeting_date": "2026-07-29",
        "probabilities": {"no_change": 0.625, "hike_25bps": 0.353},
        "dominant_outcome": "no_change",
        "dominant_probability": 0.625,
        "volume_usd": 50_000_000,
    },
}


def setup_function():
    svc._cache["data"] = None
    svc._cache["ts"] = 0.0


def test_fetch_missing_url(monkeypatch):
    monkeypatch.setattr(svc, "PREDICTION_DATA_URL", "")
    r = svc.fetch_prediction()
    assert r["available"] is False
    assert "PREDICTION_DATA_URL" in r["error"]


def test_fetch_success(monkeypatch):
    monkeypatch.setattr(svc, "PREDICTION_DATA_URL", "https://example.com/prediction.json")
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = SAMPLE
    with patch("services.prediction_service.requests.get", return_value=mock_resp):
        r = svc.fetch_prediction()
    assert r["available"] is True
    assert r["data"]["source"] == "polymarket"
    assert r["data"]["usage"] == "reference_only"
    assert r["data"]["next_fomc"]["dominant_outcome"] == "no_change"


def test_fetch_network_error(monkeypatch):
    monkeypatch.setattr(svc, "PREDICTION_DATA_URL", "https://example.com/x.json")
    with patch("services.prediction_service.requests.get", side_effect=Exception("boom")):
        r = svc.fetch_prediction()
    assert r["available"] is False
