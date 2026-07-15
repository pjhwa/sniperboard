"""earnings_service 단위 테스트
cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_earnings_service.py -v
"""
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))
import services.earnings_service as svc


SAMPLE_EARNINGS = {
    "generated_at": "2026-07-10T13:00:00Z",
    "schema_version": "1.0",
    "upcoming_earnings": [
        {
            "symbol": "NVDA",
            "earnings_date": "2026-08-20",
            "days_until": 4,
            "eps_estimate": 0.89,
            "revenue_estimate_b": 43.1,
            "historical_beat_rate": 0.92,
            "ai_summary": "8분기 연속 beat",
            "risk_level": "high",
            "action_note": "신규 진입 자제",
        }
    ],
    "recent_results": [
        {
            "symbol": "AAPL",
            "report_date": "2026-05-02",
            "eps_actual": 1.65,
            "eps_estimate": 1.62,
            "surprise_pct": 1.85,
            "ai_reaction": "소폭 beat, 가이던스 보수적",
        }
    ],
}


def _make_resp(data: dict):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = data
    return resp


class TestFetchEarnings(unittest.TestCase):
    def setUp(self):
        svc._cache.clear()

    def test_returns_unavailable_when_no_url(self):
        with patch.object(svc, "EARNINGS_DATA_URL", ""):
            result = svc.fetch_earnings()
        self.assertFalse(result["available"])

    def test_returns_data_on_success(self):
        with patch.object(svc, "EARNINGS_DATA_URL", "http://fake.url"), \
             patch("requests.get", return_value=_make_resp(SAMPLE_EARNINGS)):
            result = svc.fetch_earnings()
        self.assertTrue(result["available"])
        self.assertEqual(result["data"]["upcoming_earnings"][0]["symbol"], "NVDA")
        self.assertEqual(result["data"]["upcoming_earnings"][0]["risk_level"], "high")

    def test_returns_unavailable_on_request_error(self):
        with patch.object(svc, "EARNINGS_DATA_URL", "http://fake.url"), \
             patch("requests.get", side_effect=Exception("timeout")):
            result = svc.fetch_earnings()
        self.assertFalse(result["available"])

    def test_cache_hit_skips_request(self):
        svc._cache.set_success(SAMPLE_EARNINGS)
        with patch("requests.get") as mock_get:
            result = svc.fetch_earnings()
        mock_get.assert_not_called()
        self.assertTrue(result["available"])

    def test_returns_unavailable_for_placeholder_json(self):
        placeholder = {"generated_at": None, "schema_version": "1.0",
                       "upcoming_earnings": [], "recent_results": []}
        with patch.object(svc, "EARNINGS_DATA_URL", "http://fake.url"), \
             patch("requests.get", return_value=_make_resp(placeholder)):
            result = svc.fetch_earnings()
        self.assertFalse(result["available"])

    def test_days_until_recomputed_live(self):
        from datetime import date
        payload = {
            **SAMPLE_EARNINGS,
            "upcoming_earnings": [
                {
                    "symbol": "NVDA",
                    "earnings_date": "2026-05-28",
                    "days_until": 99,
                    "eps_estimate": 0.89,
                    "revenue_estimate_b": 43.1,
                    "risk_level": "high",
                }
            ],
        }
        svc._cache.clear()
        with patch.object(svc, "EARNINGS_DATA_URL", "http://fake.url"), \
             patch("requests.get", return_value=_make_resp(payload)), \
             patch("core.earnings_consistency.today_in_tz", return_value=date(2026, 5, 24)):
            result = svc.fetch_earnings()
        self.assertTrue(result["available"])
        row = result["data"]["upcoming_earnings"][0]
        self.assertEqual(row["days_until"], 4)


if __name__ == "__main__":
    unittest.main()
