"""C4 alerts engine — pure aggregation, honest empty cases."""
from core.alerts_engine import build_alerts, earnings_alerts, signal_alerts


def test_empty_inputs():
    out = build_alerts()
    assert out["count"] == 0
    assert out["alerts"] == []
    assert "methodology_en" in out


def test_earnings_d0_critical():
    al = earnings_alerts([
        {"symbol": "TSM", "earnings_date": "2026-07-16", "days_until": 0, "risk_level": "high"},
        {"symbol": "NVDA", "earnings_date": "2026-08-01", "days_until": 20},
    ])
    assert len(al) == 1
    assert al[0]["severity"] == "critical"
    assert al[0]["type"] == "earnings_dday"
    assert al[0]["symbol"] == "TSM"


def test_earnings_d1_high():
    al = earnings_alerts([{"symbol": "AAPL", "earnings_date": "2026-07-17", "days_until": 1}])
    assert al[0]["severity"] == "high"
    assert "tomorrow" in al[0]["title_en"].lower() or "D-1" in al[0]["title_en"]


def test_signal_pending_active():
    al = signal_alerts([
        {"id": 1, "symbol": "META", "status": "PENDING", "stage2_score": 6, "entry": 100, "signal_date": "2026-07-10"},
        {"id": 2, "symbol": "AMZN", "status": "ACTIVE", "stage2_score": 5, "signal_date": "2026-07-09"},
        {"id": 3, "symbol": "X", "status": "WIN", "stage2_score": 5},
    ])
    assert len(al) == 2
    types_status = {(a["symbol"], a["status"]) for a in al}
    assert ("META", "PENDING") in types_status
    assert ("AMZN", "ACTIVE") in types_status


def test_build_combined_sort():
    out = build_alerts(
        upcoming_earnings=[{"symbol": "TSM", "earnings_date": "2026-07-16", "days_until": 1}],
        signal_entries=[{"id": 1, "symbol": "META", "status": "PENDING", "stage2_score": 6}],
        live_stats={"n_closed": 40, "health": {"status": "UNDERPERFORMING", "confidence": "MEDIUM"}},
        briefing_data={"integrity_passed": False, "integrity": {"fail_count": 2}},
    )
    assert out["count"] >= 3
    sevs = [a["severity"] for a in out["alerts"]]
    # first should be highest severity among set
    assert sevs[0] in ("critical", "high")
    assert out["counts_by_type"].get("earnings_dday") == 1
