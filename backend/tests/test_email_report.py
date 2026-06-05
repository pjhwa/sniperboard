"""Tests for email report service."""
import pytest
from unittest.mock import MagicMock, patch


# ── collect_email_data ─────────────────────────────────────────────────────

def test_collect_email_data_returns_required_keys():
    from services.email_report_service import collect_email_data

    fake_briefing = {
        "available": True,
        "data": {
            "generated_at": "2026-06-05T07:30:00Z",
            "headline": "Markets open higher",
            "executive_bullets": ["Bullet 1", "Bullet 2"],
            "market_mood": {"overall": "RISK_ON"},
            "today_checkpoints": ["Watch NVDA"],
            "earnings_alert": "AAPL reports Thursday",
        },
    }
    fake_regime = {"total": 72.0, "regime": "CONSTRUCTIVE"}
    fake_macro = {"overall": {"judgment": "RISK_ON"}, "groups": {}}

    with patch("services.email_report_service.fetch_morning_briefing", return_value=fake_briefing), \
         patch("services.email_report_service.fetch_macro_insight", return_value=fake_macro), \
         patch("services.email_report_service.get_multi_daily", return_value={}), \
         patch("services.email_report_service.compute_regime", return_value=fake_regime):

        result = collect_email_data()

    assert "briefing" in result
    assert "regime" in result
    assert "watchlist" in result
    assert "sparkline_data" in result
    assert "macro" in result
    assert "generated_at" in result
    assert result["regime"]["total"] == 72.0


def test_collect_email_data_handles_briefing_unavailable():
    from services.email_report_service import collect_email_data

    with patch("services.email_report_service.fetch_morning_briefing",
               return_value={"available": False}), \
         patch("services.email_report_service.fetch_macro_insight", return_value=None), \
         patch("services.email_report_service.get_multi_daily", return_value={}), \
         patch("services.email_report_service.compute_regime",
               return_value={"total": 50.0, "regime": "MIXED"}):

        result = collect_email_data()

    assert result["briefing"]["available"] is False
    assert isinstance(result["watchlist"], list)


# ── render_html ────────────────────────────────────────────────────────────

def test_render_html_returns_html_string_with_images():
    from services.email_report_service import render_html
    import base64

    dummy_png = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
    dummy_b64 = base64.b64encode(dummy_png).decode()

    data = {
        "briefing": {
            "available": True,
            "data": {
                "headline": "Test headline",
                "executive_bullets": ["Point A", "Point B"],
                "today_checkpoints": ["Check 1"],
                "earnings_alert": "None",
            },
        },
        "regime": {"total": 65.0, "regime": "CONSTRUCTIVE"},
        "watchlist": [
            {
                "symbol": "NVDA",
                "price": 120.50,
                "stage2_score": 6,
                "rs_score": 85.0,
                "conviction_score": 78.0,
                "conviction_label": "High",
                "conviction_class": "b-high",
            }
        ],
        "macro": {
            "overall": {"judgment": "RISK_ON"},
            "groups": {"volatility": {"signal": "GREEN"}},
            "summary": "Conditions favorable",
            "bullets": ["VIX low"],
        },
        "generated_at": "2026-06-05T07:30:00+00:00",
    }

    html = render_html(
        data=data,
        gauge_png=dummy_png,
        sparklines_png=dummy_png,
        macro_bar_png=dummy_png,
    )

    assert "<!DOCTYPE html>" in html
    assert dummy_b64 in html, "PNG must appear as base64 inline"
    assert "NVDA" in html
    assert "CONSTRUCTIVE" in html
    assert "Test headline" in html


# ── send_report_email ──────────────────────────────────────────────────────

def test_send_report_email_calls_smtp(monkeypatch):
    from services import email_report_service as svc

    monkeypatch.setattr(svc, "GMAIL_USER", "test@gmail.com")
    monkeypatch.setattr(svc, "GMAIL_APP_PASSWORD", "secret")
    monkeypatch.setattr(svc, "REPORT_TO", "recipient@example.com")

    smtp_instance = MagicMock()
    smtp_class = MagicMock(return_value=smtp_instance)
    smtp_instance.__enter__ = MagicMock(return_value=smtp_instance)
    smtp_instance.__exit__ = MagicMock(return_value=False)

    with patch("smtplib.SMTP", smtp_class):
        svc.send_report_email(html="<html>Test</html>", subject="Test Report")

    smtp_class.assert_called_once_with("smtp.gmail.com", 587)
    smtp_instance.starttls.assert_called_once()
    smtp_instance.login.assert_called_once_with("test@gmail.com", "secret")
    smtp_instance.send_message.assert_called_once()


def test_send_report_email_skips_when_not_configured(monkeypatch):
    from services import email_report_service as svc

    monkeypatch.setattr(svc, "GMAIL_USER", "")
    monkeypatch.setattr(svc, "GMAIL_APP_PASSWORD", "")
    monkeypatch.setattr(svc, "REPORT_TO", "")

    with patch("smtplib.SMTP") as smtp_class:
        svc.send_report_email(html="<html>Test</html>", subject="Test Report")
        smtp_class.assert_not_called()
