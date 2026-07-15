"""brief_service 단위 테스트
cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_brief_service.py -v
"""
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))
import services.brief_service as svc


SAMPLE_BRIEF = {
    "generated_at": "2026-05-24T13:00:00Z",
    "schema_version": "1.0",
    "slot": "pre_open",
    "market_brief": {
        "summary": "SPY EMA200 위 유지, DD 경고권",
        "tone": "cautious",
        "key_themes": ["Fed 동결 기대"],
        "watch_points": "QQQ DD 증가 주시",
    },
    "symbol_briefs": [
        {
            "symbol": "NVDA",
            "setup_quality": "A+",
            "brief": "VCP 패턴 형성 중",
            "key_risk": "어닝 근접",
            "key_opportunity": "돌파 시 +18%",
            "action_bias": "watch",
        }
    ],
}


def _make_resp(data: dict):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = data
    return resp


class TestFetchBrief(unittest.TestCase):
    def setUp(self):
        svc._cache.clear()

    def test_returns_unavailable_when_no_url(self):
        with patch.object(svc, "BRIEF_DATA_URL", ""):
            result = svc.fetch_brief()
        self.assertFalse(result["available"])
        self.assertIn("BRIEF_DATA_URL", result["error"])

    def test_returns_data_on_success(self):
        with patch.object(svc, "BRIEF_DATA_URL", "http://fake.url"), \
             patch("requests.get", return_value=_make_resp(SAMPLE_BRIEF)), \
             patch("services.sentiment_service.fetch_latest", return_value={"available": True, "slot": "pre_open"}):
            result = svc.fetch_brief()
        self.assertTrue(result["available"])
        self.assertEqual(result["data"]["slot"], "pre_open")
        self.assertEqual(result["data"]["market_brief"]["tone"], "cautious")

    def test_returns_unavailable_on_request_error(self):
        with patch.object(svc, "BRIEF_DATA_URL", "http://fake.url"), \
             patch("requests.get", side_effect=Exception("network error")):
            result = svc.fetch_brief()
        self.assertFalse(result["available"])
        self.assertIn("fetch 실패", result["error"])

    def test_cache_hit_skips_request(self):
        svc._cache.set_success(SAMPLE_BRIEF)
        with patch("requests.get") as mock_get:
            result = svc.fetch_brief()
        mock_get.assert_not_called()
        self.assertTrue(result["available"])

    def test_returns_unavailable_for_placeholder_json(self):
        placeholder = {"generated_at": None, "schema_version": "1.0", "slot": None,
                       "market_brief": None, "symbol_briefs": []}
        with patch.object(svc, "BRIEF_DATA_URL", "http://fake.url"), \
             patch("requests.get", return_value=_make_resp(placeholder)):
            result = svc.fetch_brief()
        self.assertFalse(result["available"])


if __name__ == "__main__":
    unittest.main()
