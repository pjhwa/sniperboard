"""Unusual options classifier. Display-only — never feeds Conviction."""
from __future__ import annotations

from typing import Any


OI_MULT = 5.0
ABS_VOLUME = 10_000
PREMIUM_USD = 100_000.0


def classify_contract(
    *,
    volume: float,
    open_interest: float,
    last_price: float,
) -> dict[str, Any]:
    vol = float(volume or 0)
    oi = float(open_interest or 0)
    px = float(last_price or 0)
    high_vs_oi = oi > 0 and vol > OI_MULT * oi
    high_abs = vol > ABS_VOLUME
    premium = px * vol * 100.0
    high_prem = premium > PREMIUM_USD
    unusual = high_vs_oi or high_abs or high_prem
    return {
        "high_volume_vs_oi": high_vs_oi,
        "high_absolute_volume": high_abs,
        "high_premium": high_prem,
        "premium": round(premium, 2),
        "unusual": unusual,
    }


def scan_unusual(contracts: list[dict]) -> list[dict]:
    hits: list[dict] = []
    for c in contracts or []:
        if not isinstance(c, dict):
            continue
        flags = classify_contract(
            volume=float(c.get("volume") or 0),
            open_interest=float(c.get("open_interest") or 0),
            last_price=float(c.get("last_price") or 0),
        )
        if not flags["unusual"]:
            continue
        hits.append({**c, **flags})
    return hits
