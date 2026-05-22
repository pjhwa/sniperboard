"""
sentiment_service 단위 테스트
cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_sentiment_service.py -v
"""
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))
import services.sentiment_service as svc


def _make_resp(data: dict):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = data
    return resp


PRE_OPEN_SNAPSHOT = {
    "generated_at": "2026-05-21T13:00:00Z",
    "schema_version": "1.2",
    "slot": "pre_open",
    "market": {"sentiment_score": 0, "sentiment": "neutral",
               "trend_vs_yesterday": "stable", "extreme_flag": "none",
               "key_reason": "test", "confidence": "med", "as_of": "2026-05-21T13:00:00Z",
               "intraday_shift": None},
    "symbols": [
        {"symbol": "TSLA", "sentiment_score": -1, "sentiment": "fearful",
         "trend_vs_yesterday": "stable", "mention_volume": "normal",
         "key_reason": "test", "bot_suspected": "no", "confidence": "med",
         "source": "grok", "as_of": "2026-05-21T13:00:00Z", "intraday_shift": None},
    ],
}

POST_CLOSE_SNAPSHOT = {
    "generated_at": "2026-05-21T21:00:00Z",
    "schema_version": "1.2",
    "slot": "post_close",
    "market": {"sentiment_score": 1, "sentiment": "optimistic",
               "trend_vs_yesterday": "heating", "extreme_flag": "none",
               "key_reason": "test", "confidence": "high", "as_of": "2026-05-21T21:00:00Z",
               "intraday_shift": "heating"},
    "symbols": [
        {"symbol": "TSLA", "sentiment_score": 0, "sentiment": "neutral",
         "trend_vs_yesterday": "stable", "mention_volume": "normal",
         "key_reason": "test", "bot_suspected": "no", "confidence": "med",
         "source": "grok", "as_of": "2026-05-21T21:00:00Z", "intraday_shift": "heating"},
    ],
}


class TestFetchTodaySlots(unittest.TestCase):
    def test_returns_both_slots_when_available(self):
        def side_effect(url, headers=None, timeout=None):
            if "pre_open" in url:
                return _make_resp(PRE_OPEN_SNAPSHOT)
            if "post_close" in url:
                return _make_resp(POST_CLOSE_SNAPSHOT)
            raise ValueError(f"unexpected url: {url}")

        with patch("services.sentiment_service.requests.get", side_effect=side_effect):
            with patch.dict("os.environ", {"SENTIMENT_DATA_HISTORY_BASE": "https://example.com/history"}):
                result = svc.fetch_today_slots("2026-05-21")

        self.assertIsNotNone(result["pre_open"])
        self.assertIsNotNone(result["post_close"])
        self.assertEqual(result["pre_open"]["slot"], "pre_open")
        self.assertEqual(result["post_close"]["slot"], "post_close")

    def test_returns_none_when_slot_missing(self):
        def side_effect(url, headers=None, timeout=None):
            raise Exception("404")

        with patch("services.sentiment_service.requests.get", side_effect=side_effect):
            with patch.dict("os.environ", {"SENTIMENT_DATA_HISTORY_BASE": "https://example.com/history"}):
                result = svc.fetch_today_slots("2026-05-21")

        self.assertIsNone(result["pre_open"])
        self.assertIsNone(result["post_close"])

    def test_returns_empty_when_no_base_url(self):
        with patch.dict("os.environ", {}, clear=True):
            # Remove SENTIMENT_DATA_HISTORY_BASE if set
            import os
            env = {k: v for k, v in os.environ.items() if k != "SENTIMENT_DATA_HISTORY_BASE"}
            with patch.dict("os.environ", env, clear=True):
                result = svc.fetch_today_slots("2026-05-21")
        self.assertIsNone(result["pre_open"])
        self.assertIsNone(result["post_close"])


class TestEnrichWithDeltaNewSlot(unittest.TestCase):
    def test_uses_post_close_for_delta(self):
        """어제 post_close 파일로 delta 계산."""
        snapshot = {
            "available": True,
            "symbols": [{"symbol": "TSLA", "sentiment_score": 1}],
        }
        yesterday_post_close = {
            "slot": "post_close",
            "symbols": [{"symbol": "TSLA", "sentiment_score": -1}],
        }

        def side_effect(url, headers=None, timeout=None):
            if "post_close" in url:
                return _make_resp(yesterday_post_close)
            raise Exception("404")

        with patch("services.sentiment_service.requests.get", side_effect=side_effect):
            with patch.dict("os.environ", {"SENTIMENT_DATA_HISTORY_BASE": "https://example.com/history"}):
                result = svc.enrich_with_delta(snapshot)

        tsla = next(s for s in result["symbols"] if s["symbol"] == "TSLA")
        self.assertEqual(tsla["score_delta"], 2)  # 1 - (-1) = 2

    def test_falls_back_to_legacy_when_post_close_missing(self):
        """post_close 없을 때 구형 YYYY-MM-DD.json 폴백."""
        snapshot = {
            "available": True,
            "symbols": [{"symbol": "TSLA", "sentiment_score": 1}],
        }
        legacy_data = {
            "symbols": [{"symbol": "TSLA", "sentiment_score": 0}],
        }

        def side_effect(url, headers=None, timeout=None):
            if "post_close" in url:
                raise Exception("404")
            # Legacy URL (no slot suffix)
            return _make_resp(legacy_data)

        with patch("services.sentiment_service.requests.get", side_effect=side_effect):
            with patch.dict("os.environ", {"SENTIMENT_DATA_HISTORY_BASE": "https://example.com/history"}):
                result = svc.enrich_with_delta(snapshot)

        tsla = next(s for s in result["symbols"] if s["symbol"] == "TSLA")
        self.assertEqual(tsla["score_delta"], 1)  # 1 - 0 = 1


if __name__ == "__main__":
    unittest.main()
