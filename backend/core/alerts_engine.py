"""Phase C4 — user-facing actionable alerts (earnings D-day, signals, health).

Pure aggregation over already-fetched domain data. No push vendor; API + UI bell.
Does not invent signals or earnings dates.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _sev_rank(sev: str) -> int:
    return {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}.get(sev, 9)


def earnings_alerts(
    upcoming: list[dict],
    *,
    max_days: int = 3,
) -> list[dict]:
    alerts: list[dict] = []
    for e in upcoming or []:
        if not isinstance(e, dict):
            continue
        sym = str(e.get("symbol") or "").upper()
        if not sym:
            continue
        try:
            days = int(e.get("days_until"))
        except (TypeError, ValueError):
            continue
        if days < 0 or days > max_days:
            continue
        date = e.get("earnings_date") or ""
        risk = (e.get("risk_level") or "").lower()
        if days == 0:
            sev = "critical"
            title_en = f"{sym} earnings TODAY"
            title_ko = f"{sym} 실적 오늘 발표"
        elif days == 1:
            sev = "high"
            title_en = f"{sym} earnings tomorrow (D-1)"
            title_ko = f"{sym} 실적 내일 (D-1)"
        else:
            sev = "medium" if risk == "high" else "low"
            title_en = f"{sym} earnings in {days} days"
            title_ko = f"{sym} 실적 {days}일 후"

        body_en = f"Report date {date}. days_until={days}."
        body_ko = f"발표일 {date}. D-{days}."
        if e.get("action_note_en") or e.get("action_note_ko"):
            body_en = (e.get("action_note_en") or body_en)
            body_ko = (e.get("action_note_ko") or body_ko)

        alerts.append({
            "id": f"earnings:{sym}:{date}",
            "type": "earnings_dday",
            "severity": sev,
            "symbol": sym,
            "board": "deepdive",
            "title_en": title_en,
            "title_ko": title_ko,
            "body_en": body_en,
            "body_ko": body_ko,
            "days_until": days,
            "earnings_date": date,
            "risk_level": e.get("risk_level"),
        })
    return alerts


def signal_alerts(entries: list[dict]) -> list[dict]:
    alerts: list[dict] = []
    for e in entries or []:
        if not isinstance(e, dict):
            continue
        status = str(e.get("status") or "").upper()
        if status not in ("PENDING", "ACTIVE"):
            continue
        sym = str(e.get("symbol") or "").upper()
        if not sym:
            continue
        score = e.get("stage2_score")
        sid = e.get("id") or f"{sym}:{e.get('signal_date')}"
        if status == "ACTIVE":
            sev = "high"
            title_en = f"{sym} ACTIVE signal"
            title_ko = f"{sym} 활성 신호"
            body_en = f"In trade. Stage2={score}. Track outcomes on Signal Tracker."
            body_ko = f"보유 중. Stage2={score}. 신호 트래커에서 결과 확인."
        else:
            sev = "medium"
            title_en = f"{sym} PENDING entry"
            title_ko = f"{sym} 진입 대기"
            entry = e.get("entry")
            body_en = f"Waiting for entry near {entry}. Stage2={score}."
            body_ko = f"진입가 근처 대기 (entry≈{entry}). Stage2={score}."
        alerts.append({
            "id": f"signal:{sid}:{status}",
            "type": "signal_open",
            "severity": sev,
            "symbol": sym,
            "board": "track",
            "title_en": title_en,
            "title_ko": title_ko,
            "body_en": body_en,
            "body_ko": body_ko,
            "status": status,
            "stage2_score": score,
            "signal_date": e.get("signal_date"),
        })
    return alerts


def health_alerts(stats: Optional[dict]) -> list[dict]:
    if not isinstance(stats, dict):
        return []
    health = stats.get("health") or {}
    status = str(health.get("status") or "")
    conf = str(health.get("confidence") or "")
    n = stats.get("n_closed") or stats.get("sample_n") or 0
    alerts: list[dict] = []
    if status == "UNDERPERFORMING":
        alerts.append({
            "id": f"health:under:{n}",
            "type": "model_health",
            "severity": "high",
            "symbol": None,
            "board": "track",
            "title_en": "Model UNDERPERFORMING vs backtest",
            "title_ko": "모델 성과 미달 (백테스트 대비)",
            "body_en": f"Live expectancy lagging baseline. n_closed={n}, confidence={conf}.",
            "body_ko": f"라이브 기대값이 기준선 하회. 청산 n={n}, 신뢰도={conf}.",
            "health_status": status,
            "confidence": conf,
            "n_closed": n,
        })
    elif status == "WATCH":
        alerts.append({
            "id": f"health:watch:{n}",
            "type": "model_health",
            "severity": "medium",
            "symbol": None,
            "board": "track",
            "title_en": "Model health WATCH",
            "title_ko": "모델 헬스 주의",
            "body_en": f"Live edge thinner than baseline. n_closed={n}, confidence={conf}.",
            "body_ko": f"라이브 엣지가 기준 대비 약화. 청산 n={n}, 신뢰도={conf}.",
            "health_status": status,
            "confidence": conf,
            "n_closed": n,
        })
    return alerts


def integrity_alerts(briefing_data: Optional[dict]) -> list[dict]:
    if not isinstance(briefing_data, dict):
        return []
    passed = briefing_data.get("integrity_passed")
    if passed is False:
        integ = briefing_data.get("integrity") or {}
        fail_n = integ.get("fail_count")
        return [{
            "id": f"integrity:fail:{fail_n}",
            "type": "briefing_integrity",
            "severity": "medium",
            "symbol": None,
            "board": "briefing",
            "title_en": "Morning briefing integrity checks failed",
            "title_ko": "아침 브리핑 정합성 검사 실패",
            "body_en": f"Mechanical verify reported fail_count={fail_n}. Prefer numeric anchors.",
            "body_ko": f"기계 검증 fail_count={fail_n}. 수치 앵커를 우선하세요.",
            "fail_count": fail_n,
        }]
    return []


def build_alerts(
    *,
    upcoming_earnings: Optional[list] = None,
    signal_entries: Optional[list] = None,
    live_stats: Optional[dict] = None,
    briefing_data: Optional[dict] = None,
    max_earnings_days: int = 3,
) -> dict[str, Any]:
    alerts: list[dict] = []
    alerts.extend(earnings_alerts(upcoming_earnings or [], max_days=max_earnings_days))
    alerts.extend(signal_alerts(signal_entries or []))
    alerts.extend(health_alerts(live_stats))
    alerts.extend(integrity_alerts(briefing_data))

    alerts.sort(key=lambda a: (_sev_rank(str(a.get("severity"))), str(a.get("id"))))

    by_type: dict[str, int] = {}
    by_sev: dict[str, int] = {}
    for a in alerts:
        by_type[a["type"]] = by_type.get(a["type"], 0) + 1
        by_sev[a["severity"]] = by_sev.get(a["severity"], 0) + 1

    return {
        "generated_at": _iso_now(),
        "count": len(alerts),
        "counts_by_type": by_type,
        "counts_by_severity": by_sev,
        "alerts": alerts,
        "methodology_en": (
            "Derived from live earnings calendar (serve-time days_until), open signal_log "
            "PENDING/ACTIVE rows, Track health, and morning-briefing integrity flags. "
            "No push delivery — dashboard bell only."
        ),
        "methodology_ko": (
            "실적 캘린더(serve-time days_until), signal_log PENDING/ACTIVE, "
            "Track 헬스, 아침 브리핑 integrity 플래그에서 파생. "
            "푸시 발송 없음 — 대시보드 벨만 제공."
        ),
    }
