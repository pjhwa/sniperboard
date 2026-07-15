"""Tests for live earnings calendar consistency (relative-day SoT)."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

import pytest

from core.earnings_consistency import (
    days_until,
    format_relative,
    refresh_upcoming_earnings,
    rebuild_earnings_alert,
    sanitize_briefing_payload,
    sanitize_free_text,
    prepare_email_sections,
    dedupe_strings,
    text_overlaps,
)

ET = ZoneInfo("America/New_York")
# Fixed "today" in ET: 2026-07-13
AS_OF = datetime(2026, 7, 13, 12, 0, 0, tzinfo=ET)


def test_days_until_recomputed_from_absolute_date():
    assert days_until("2026-07-16", as_of=AS_OF) == 3
    assert days_until("2026-07-13", as_of=AS_OF) == 0
    assert days_until("2026-07-12", as_of=AS_OF) == -1


def test_refresh_overwrites_stale_days_until_and_drops_past():
    items = [
        {
            "symbol": "TSM",
            "earnings_date": "2026-07-16",
            "days_until": 2,  # stale wrong value
            "ai_summary_ko": "TSM 2일 후 실적 주목",
            "ai_summary_en": "TSM earnings in 2 days",
        },
        {
            "symbol": "OLD",
            "earnings_date": "2026-06-01",
            "days_until": 0,
        },
    ]
    out = refresh_upcoming_earnings(items, as_of=AS_OF)
    assert len(out) == 1
    assert out[0]["symbol"] == "TSM"
    assert out[0]["days_until"] == 3
    assert "3일 후" in out[0]["ai_summary_ko"]
    assert "in 3 days" in out[0]["ai_summary_en"].lower()


def test_sanitize_false_already_reported_claim():
    cal = {"TSM": date(2026, 7, 16)}
    text = "TSM 오늘 미국 장 마감 후 실적 발표됨; EPS 일정 확인 필요"
    cleaned = sanitize_free_text(text, cal, as_of=AS_OF, locale="ko")
    assert "발표됨" not in cleaned or "예정" in cleaned
    assert "7월 16일" in cleaned or "3일" in cleaned


def test_rebuild_earnings_alert_mechanical():
    items = refresh_upcoming_earnings(
        [{"symbol": "TSM", "earnings_date": "2026-07-16", "eps_estimate": 2.1}],
        as_of=AS_OF,
    )
    alert = rebuild_earnings_alert(items, as_of=AS_OF, locale="ko")
    assert "TSM" in alert
    assert "3일 후" in alert
    assert "발표됨" not in alert


def test_sanitize_briefing_unifies_tsm_relative_days():
    briefing = {
        "headline_ko": "TSM 2일 후 실적 앞두고 관망",
        "earnings_alert_ko": "TSM 오늘 미국 장 마감 후 실적 발표됨",
        "today_checkpoints_ko": [
            "TSM 7월 16일 실적(2일 후)",
            "TSM 3일 후 실적 발표를 앞두고 있으며 변동성 주의",
            "VIX 레벨 확인",
        ],
        "executive_bullets_ko": ["시장 혼조", "TSM 2일 후 실적"],
        "watchlist": [
            {
                "symbol": "TSM",
                "analysis_ko": "TSM이 3일 후 실적 발표를 앞두고 있으며 포지션 축소 권고",
            }
        ],
        "spotlight": [],
    }
    upcoming = [
        {"symbol": "TSM", "earnings_date": "2026-07-16", "days_until": 99, "eps_estimate": 2.0}
    ]
    out = sanitize_briefing_payload(briefing, upcoming, as_of=AS_OF, locale="ko")
    # Mechanical alert uses live days
    assert "3일 후" in out["earnings_alert_ko"]
    assert "발표됨" not in out["earnings_alert_ko"]
    # Watchlist analysis rewritten
    assert "2일 후" not in (out["watchlist"][0].get("analysis_ko") or "")
    assert "3일 후" in (out["watchlist"][0].get("analysis_ko") or "")
    # Pure restatement checkpoint dropped or rewritten
    joined = " ".join(out.get("today_checkpoints_ko") or [])
    assert "발표됨" not in joined


def test_prepare_email_drops_alert_when_calendar_present():
    briefing = {
        "headline_ko": "혼조 개장",
        "earnings_alert_ko": "TSM 2일 후",
        "today_checkpoints_ko": ["TSM 실적 2일 후", "연준 발언 주시"],
        "executive_bullets_ko": ["연준 발언 주시", "연준 발언 주시"],  # dup
        "watchlist": [],
        "spotlight": [],
    }
    upcoming = [{"symbol": "TSM", "earnings_date": "2026-07-16", "eps_estimate": 2.0}]
    out = prepare_email_sections(briefing, upcoming, as_of=AS_OF, locale="ko")
    assert out.get("earnings_alert_ko") == ""
    assert out.get("_earnings_calendar")
    assert out["_earnings_calendar"][0]["days_until"] == 3
    # executive deduped
    assert len(out["executive_bullets_ko"]) == 1


def test_dedupe_strings_containment():
    items = [
        "TSM 실적 발표 전 변동성 확대 주의",
        "TSM 실적 발표 전 변동성 확대 주의 권고",  # contains first
        "VIX 확인",
    ]
    out = dedupe_strings(items)
    assert len(out) == 2
    assert "VIX" in out[1]


def test_text_overlaps():
    a = "TSM earnings volatility ahead of report next week caution"
    b = "TSM earnings volatility ahead of report next week caution noted"
    assert text_overlaps(a, b)
    assert not text_overlaps("apple earnings beat", "tesla delivery miss")


def test_format_relative_ko():
    assert format_relative(3, "ko") == "3일 후 발표"
    assert format_relative(0, "ko") == "오늘 발표"
    assert format_relative(-2, "ko") == "2일 전 발표"


def test_reconcile_sentiment_mood_downgrades_on_hard_drop():
    from core.earnings_consistency import reconcile_sentiment_mood_with_session

    item = {
        "symbol": "NVDA",
        "sentiment_mood": "optimistic",
        "analysis_ko": "$203.53에서 -3.52% 하락 후 개장 전 보합.",
        "action": "avoid",
    }
    out = reconcile_sentiment_mood_with_session(item)
    assert out["sentiment_mood"] == "cautious"
    assert out.get("sentiment_mood_adjusted") is True
    assert out.get("sentiment_mood_prev") == "optimistic"

    mild = {
        "symbol": "AAPL",
        "sentiment_mood": "optimistic",
        "analysis_en": "closed -1.2% on light volume",
    }
    out2 = reconcile_sentiment_mood_with_session(mild)
    assert out2["sentiment_mood"] == "optimistic"

    crash = {
        "symbol": "APP",
        "sentiment_mood": "euphoric",
        "analysis_ko": "세션 -12.65% 급락",
    }
    out3 = reconcile_sentiment_mood_with_session(crash)
    assert out3["sentiment_mood"] == "fearful"
