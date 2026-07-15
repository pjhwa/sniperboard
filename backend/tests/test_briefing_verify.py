"""Phase B1 — mechanical briefing integrity (real verify entry)."""
from datetime import date

from core.briefing_verify import (
    gate_result_for_promotion,
    verify_briefing_integrity,
)


def test_good_briefing_passes():
    briefing = {
        "earnings_alert_ko": "TSM 7월 16일 실적 (3일 후 발표)",
        "watchlist": [
            {
                "symbol": "TSM",
                "sentiment_mood": "cautious",
                "analysis_ko": "$421.58에서 -1.20% 하락. Stage2 양호.",
            }
        ],
    }
    cal = [{"symbol": "TSM", "earnings_date": "2026-07-16"}]
    prices = {"TSM": 421.58}
    r = verify_briefing_integrity(
        briefing,
        upcoming_earnings=cal,
        price_table=prices,
        as_of=date(2026, 7, 13),
    )
    assert r.passed is True
    assert gate_result_for_promotion(r) is True


def test_bad_already_reported_fails():
    briefing = {
        "earnings_alert_ko": "TSM 오늘 미국 장 마감 후 실적 발표됨",
        "watchlist": [],
    }
    r = verify_briefing_integrity(
        briefing,
        upcoming_earnings=[{"symbol": "TSM", "earnings_date": "2026-07-16"}],
        as_of=date(2026, 7, 13),
    )
    assert r.passed is False
    assert any(i.code == "B1-rel-already" for i in r.issues)
    assert gate_result_for_promotion(r) is False


def test_bad_relative_day_fails():
    briefing = {
        "today_checkpoints_ko": ["TSM 1일 후 실적 주시"],  # live = 3 → off by 2
        "watchlist": [],
    }
    r = verify_briefing_integrity(
        briefing,
        upcoming_earnings=[{"symbol": "TSM", "earnings_date": "2026-07-16"}],
        as_of=date(2026, 7, 13),  # true days = 3
    )
    assert r.passed is False
    assert any(i.code == "B1-rel-day" for i in r.issues)


def test_mood_vs_drop_fails():
    briefing = {
        "watchlist": [
            {
                "symbol": "NVDA",
                "sentiment_mood": "optimistic",
                "analysis_ko": "$203.53에서 -3.52% 하락 후 관망.",
            }
        ],
    }
    r = verify_briefing_integrity(briefing, as_of=date(2026, 7, 13))
    assert r.passed is False
    assert any(i.code == "B1-mood-drop" for i in r.issues)


def test_price_binding_fails():
    briefing = {
        "watchlist": [
            {
                "symbol": "NVDA",
                "sentiment_mood": "neutral",
                "analysis_ko": "NVDA $999.00 돌파 시도",
            }
        ],
    }
    r = verify_briefing_integrity(
        briefing,
        price_table={"NVDA": 203.53},
        as_of=date(2026, 7, 13),
    )
    assert r.passed is False
    assert any(i.code == "B1-price-bind" for i in r.issues)


def test_price_binding_within_tolerance_passes():
    briefing = {
        "watchlist": [
            {
                "symbol": "NVDA",
                "sentiment_mood": "neutral",
                "analysis_ko": "NVDA $205.00 부근",
            }
        ],
    }
    r = verify_briefing_integrity(
        briefing,
        price_table={"NVDA": 203.53},
        as_of=date(2026, 7, 13),
    )
    # 205 vs 203.53 ~0.7% < 3%
    assert r.passed is True
