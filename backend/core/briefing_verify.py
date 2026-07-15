"""Phase B1 — mechanical integrity checks for morning briefing snapshots.

Pure functions: no network. Used by unit tests, consumer annotate path, and
mirrors rules expected in market-sentiment-data verify_briefing.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from typing import Any, Optional


@dataclass
class VerifyIssue:
    code: str
    message: str
    severity: str = "fail"  # fail | warn


@dataclass
class VerifyResult:
    passed: bool
    issues: list[VerifyIssue] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "passed": self.passed,
            "issues": [asdict(i) for i in self.issues],
            "fail_count": sum(1 for i in self.issues if i.severity == "fail"),
            "warn_count": sum(1 for i in self.issues if i.severity == "warn"),
        }


def parse_iso_date(s: Any) -> Optional[date]:
    if not s:
        return None
    try:
        return datetime.strptime(str(s)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def build_calendar(upcoming: list[dict] | None) -> dict[str, date]:
    cal: dict[str, date] = {}
    for it in upcoming or []:
        if not isinstance(it, dict):
            continue
        sym = str(it.get("symbol") or "").upper()
        ed = parse_iso_date(it.get("earnings_date") or it.get("report_date"))
        if sym and ed:
            cal[sym] = ed
    return cal


_RE_KO_DAYS = re.compile(
    r"(?P<sym>[A-Z]{1,5})\s*(?:[^\n]{0,30}?)(?P<n>\d+)\s*일\s*후",
    re.I,
)
_RE_KO_ALREADY = re.compile(
    r"(?P<sym>[A-Z]{1,5})\s*[^\n]{0,40}?오늘\s*(?:미국\s*)?장\s*마감\s*후\s*실적\s*발표됨",
    re.I,
)
_RE_PRICE = re.compile(r"\$([0-9]{2,5}(?:\.[0-9]+)?)")
_RE_SESSION_PCT = re.compile(r"(?<![A-Za-z0-9])([+-]?\d+(?:\.\d+)?)\s*%")


def check_relative_earnings_vs_calendar(
    briefing: dict,
    calendar: dict[str, date],
    *,
    as_of: Optional[date] = None,
) -> list[VerifyIssue]:
    """Fail when free text claims wrong relative day or already-reported for future dates."""
    issues: list[VerifyIssue] = []
    today = as_of or date.today()
    texts: list[str] = []
    for k in ("earnings_alert_ko", "earnings_alert_en", "headline_ko", "headline_en"):
        if briefing.get(k):
            texts.append(str(briefing[k]))
    for lst_key in ("today_checkpoints_ko", "today_checkpoints_en", "executive_bullets_ko", "executive_bullets_en"):
        for item in briefing.get(lst_key) or []:
            texts.append(str(item))
    for w in briefing.get("watchlist") or []:
        if isinstance(w, dict):
            for k in ("analysis_ko", "analysis_en", "analysis"):
                if w.get(k):
                    texts.append(str(w[k]))
    blob = "\n".join(texts)

    for m in _RE_KO_ALREADY.finditer(blob):
        sym = m.group("sym").upper()
        ed = calendar.get(sym)
        if ed and ed > today:
            issues.append(VerifyIssue(
                "B1-rel-already",
                f"{sym}: text says already reported but earnings_date {ed} is still future",
            ))

    for m in _RE_KO_DAYS.finditer(blob):
        sym = m.group("sym").upper()
        claimed = int(m.group("n"))
        ed = calendar.get(sym)
        if not ed:
            continue
        live = (ed - today).days
        if live >= 0 and abs(claimed - live) > 1:
            issues.append(VerifyIssue(
                "B1-rel-day",
                f"{sym}: text says {claimed}일 후 but calendar says {live} days (date={ed})",
            ))
    return issues


def check_mood_vs_session_drop(briefing: dict, *, hard_drop: float = -3.0) -> list[VerifyIssue]:
    """Fail when sentiment_mood is optimistic/euphoric but analysis shows ≤ hard_drop %."""
    issues: list[VerifyIssue] = []
    for w in briefing.get("watchlist") or []:
        if not isinstance(w, dict):
            continue
        mood = str(w.get("sentiment_mood") or "").lower()
        if mood not in ("optimistic", "euphoric"):
            continue
        text = " ".join(str(w.get(k) or "") for k in ("analysis_ko", "analysis_en", "analysis"))
        m = _RE_SESSION_PCT.search(text)
        if not m:
            continue
        chg = float(m.group(1))
        if chg <= hard_drop:
            issues.append(VerifyIssue(
                "B1-mood-drop",
                f"{w.get('symbol')}: mood={mood} but session move {chg}% ≤ {hard_drop}%",
            ))
    return issues


def check_price_binding(
    briefing: dict,
    price_table: dict[str, float] | None,
    *,
    tol_pct: float = 0.03,
) -> list[VerifyIssue]:
    """Fail when analysis price differs from binding table by > tol_pct."""
    issues: list[VerifyIssue] = []
    if not price_table:
        return issues
    for w in briefing.get("watchlist") or []:
        if not isinstance(w, dict):
            continue
        sym = str(w.get("symbol") or "").upper()
        truth = price_table.get(sym)
        if truth is None:
            continue
        text = " ".join(str(w.get(k) or "") for k in ("analysis_ko", "analysis_en", "analysis"))
        m = _RE_PRICE.search(text)
        if not m:
            continue
        claimed = float(m.group(1))
        if truth <= 0:
            continue
        if abs(claimed - truth) / truth > tol_pct:
            issues.append(VerifyIssue(
                "B1-price-bind",
                f"{sym}: analysis price ${claimed} vs table ${truth:.2f} (>{tol_pct*100:.0f}%)",
            ))
    return issues


def verify_briefing_integrity(
    briefing: dict,
    *,
    upcoming_earnings: list[dict] | None = None,
    price_table: dict[str, float] | None = None,
    as_of: Optional[date] = None,
) -> VerifyResult:
    """Run all B1 mechanical checks. passed=False if any severity=fail."""
    issues: list[VerifyIssue] = []
    cal = build_calendar(upcoming_earnings)
    # Also calendar from briefing _earnings_calendar if present
    if briefing.get("_earnings_calendar"):
        cal.update(build_calendar(briefing["_earnings_calendar"]))
    issues.extend(check_relative_earnings_vs_calendar(briefing, cal, as_of=as_of))
    issues.extend(check_mood_vs_session_drop(briefing))
    issues.extend(check_price_binding(briefing, price_table))
    fails = [i for i in issues if i.severity == "fail"]
    return VerifyResult(passed=len(fails) == 0, issues=issues)


def gate_result_for_promotion(result: VerifyResult) -> bool:
    """True only if snapshot may be promoted as clean."""
    return result.passed
