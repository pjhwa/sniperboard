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
                "headline_ko": "테스트 헤드라인",
                "executive_bullets_ko": ["핵심 포인트 A", "핵심 포인트 B"],
                "market_mood": {
                    "traffic_light": "green",
                    "label_ko": "강세 국면",
                    "explanation_ko": "시장 전반적으로 위험 선호 심리가 강합니다.",
                },
                "big_picture": {
                    "vix_note_ko": "VIX 14대, 공포 지수 낮음",
                    "rates_note_ko": "10년물 금리 4.3% 안정세",
                    "dollar_note_ko": "달러 약세 지속",
                    "btc_note_ko": "BTC 위험 선호 신호",
                },
                "sector_analysis": {
                    "leaders_ko": "테크, 반도체",
                    "laggards_ko": "유틸리티, 헬스케어",
                    "rotation_signal_ko": "성장주로 자금 이동 중",
                },
                "spotlight": [
                    {
                        "symbol": "NVDA",
                        "company": "NVIDIA Corp",
                        "why_ko": "AI 수요 급증으로 실적 서프라이즈 예상",
                        "watch_level_ko": "$900 돌파 시 추격 매수 고려",
                    }
                ],
                "watchlist": [
                    {
                        "symbol": "NVDA",
                        "company": "NVIDIA Corp",
                        "action": "buy",
                        "sentiment_mood": "optimistic",
                        "analysis_ko": "Stage2 완성, 피벗 근처 매집 국면",
                    }
                ],
                "today_checkpoints_ko": ["NVDA 피벗 확인", "SPY EMA200 유지 여부"],
                "earnings_alert_ko": "이번 주 실적 없음",
            },
        },
        "regime": {"total": 72.0, "regime": "CONSTRUCTIVE"},
        "watchlist": [
            {
                "symbol": "NVDA",
                "price": 875.50,
                "stage2_score": 6,
                "rs_score": 85.0,
                "conviction_score": 78.0,
                "conviction_label": "High",
                "conviction_class": "b-high",
            }
        ],
        "macro": {
            "overall": {"judgment": "RISK_ON"},
            "groups": {
                "volatility": {"signal": "GREEN", "direction": "↘", "text_ko": "VIX 낮아 안정적"},
                "breadth": {"signal": "GREEN", "direction": "↗", "text_ko": "시장 폭 양호"},
            },
            "summary_ko": "전반적으로 위험 선호 국면",
            "bullets_ko": ["VIX 낮음", "신용 스프레드 안정"],
        },
        "generated_at": "2026-06-05T07:30:00+00:00",
    }

    html = render_html(
        data=data,
        gauge_png=dummy_png,
        sparklines_png=dummy_png,
        macro_bar_png=dummy_png,
    )

    # 기존 검증
    assert "<!DOCTYPE html>" in html
    assert dummy_b64 in html, "PNG must appear as base64 inline"
    assert "NVDA" in html
    assert "CONSTRUCTIVE" in html

    # 신규 섹션 검증
    assert "강세 국면" in html, "mood_label missing"
    assert "시장 전반적으로 위험 선호" in html, "mood_explanation missing"
    assert "VIX 14대" in html, "big_picture vix_note missing"
    assert "10년물 금리" in html, "big_picture rates_note missing"
    assert "테크, 반도체" in html, "sector leaders missing"
    assert "성장주로 자금 이동" in html, "sector rotation missing"
    assert "AI 수요 급증" in html, "spotlight why missing"
    assert "Stage2 완성" in html, "morning watchlist analysis missing"
    assert "buy" in html, "action badge missing"
    assert "NVDA 피벗 확인" in html, "today_checkpoints missing"
    assert "테스트 헤드라인" in html, "headline_ko missing"


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

    smtp_class.assert_called_once_with("smtp.gmail.com", 587, timeout=30)
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
