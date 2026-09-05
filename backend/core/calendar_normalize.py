"""Normalize public calendar rows to US CPI / FOMC / NFP-class events."""
from __future__ import annotations

import re
from typing import Any

MACRO_PATTERNS = (
    r"\bcpi\b",
    r"consumer price",
    r"\bfomc\b",
    r"federal funds",
    r"rate decision",
    r"non[- ]?farm",
    r"\bnfp\b",
    r"payrolls",
    r"unemployment rate",
)

_MACRO_RE = re.compile("|".join(MACRO_PATTERNS), re.I)
_US = {"USD", "US", "USA", "UNITED STATES"}


def is_macro_class(title: str) -> bool:
    return bool(_MACRO_RE.search(str(title or "")))


def _impact(raw: Any) -> str:
    s = str(raw or "").strip().lower()
    if s in ("high", "3", "red"):
        return "High"
    if s in ("medium", "2", "orange"):
        return "Medium"
    if s in ("low", "1", "yellow"):
        return "Low"
    return str(raw or "") or "Unknown"


def normalize_calendar_events(raw: list[dict]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in raw or []:
        if not isinstance(row, dict):
            continue
        title = row.get("title") or row.get("event") or row.get("name")
        if not title:
            continue
        country = str(row.get("country") or row.get("currency") or "").upper()
        if country not in _US:
            continue
        if not is_macro_class(str(title)):
            continue
        date = row.get("date") or row.get("datetime")
        if not date:
            continue
        out.append({
            "date": str(date)[:10],
            "time": str(row.get("time") or ""),
            "country": "USD" if country in _US else country,
            "event": str(title),
            "impact": _impact(row.get("impact")),
            "forecast": row.get("forecast") or "",
            "previous": row.get("previous") or "",
        })
    return out
