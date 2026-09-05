"""User-configurable overlay alerts (price cross, volume spike, Stage2≥5, RS≥70).

Pure predicates. Do not invent quotes or scores — callers pass already-fetched data.
Never feeds Conviction.
"""
from __future__ import annotations

from typing import Any, Optional


def evaluate_price_cross(
    condition: dict,
    *,
    previous: float,
    current: float,
) -> dict[str, Any]:
    threshold = float(condition.get("threshold", 0))
    direction = str(condition.get("direction") or "above")
    if direction == "below":
        triggered = previous > threshold and current <= threshold
        msg = f"crossed below {threshold}"
    else:
        triggered = previous < threshold and current >= threshold
        msg = f"crossed above {threshold}"
    return {"triggered": triggered, "message": msg if triggered else ""}


def evaluate_volume_spike(
    condition: dict,
    *,
    volume: float,
    avg_volume: float,
) -> dict[str, Any]:
    if not avg_volume:
        return {"triggered": False, "message": ""}
    multiplier = float(condition.get("multiplier", 2.0))
    ratio = volume / avg_volume
    triggered = ratio >= multiplier
    return {
        "triggered": triggered,
        "message": f"volume {ratio:.1f}x avg" if triggered else "",
    }


def evaluate_stage2_ready(score: Optional[float]) -> dict[str, Any]:
    if score is None:
        return {"triggered": False, "message": ""}
    triggered = float(score) >= 5
    return {
        "triggered": triggered,
        "message": f"Stage2={int(score)}" if triggered else "",
    }


def evaluate_rs_strong(rs_score: Optional[float]) -> dict[str, Any]:
    if rs_score is None:
        return {"triggered": False, "message": ""}
    triggered = float(rs_score) >= 70
    return {
        "triggered": triggered,
        "message": f"RS={rs_score:.1f}" if triggered else "",
    }


def evaluate_overlay_rules(
    rules: list[dict],
    *,
    quotes: Optional[dict[str, dict]] = None,
    watch: Optional[dict[str, dict]] = None,
) -> list[dict]:
    quotes = quotes or {}
    watch = watch or {}
    hits: list[dict] = []
    for rule in rules or []:
        if not isinstance(rule, dict) or not rule.get("enabled", True):
            continue
        rtype = str(rule.get("type") or "")
        symbol = str(rule.get("symbol") or "").upper()
        cond = rule.get("condition") or {}
        result = {"triggered": False, "message": ""}

        if rtype == "price_cross":
            q = quotes.get(symbol) or {}
            if "previous" in q and "current" in q:
                result = evaluate_price_cross(
                    cond, previous=float(q["previous"]), current=float(q["current"])
                )
        elif rtype == "volume_spike":
            q = quotes.get(symbol) or {}
            result = evaluate_volume_spike(
                cond,
                volume=float(q.get("volume") or 0),
                avg_volume=float(q.get("avg_volume") or 0),
            )
        elif rtype == "stage2_ready":
            w = watch.get(symbol) or {}
            result = evaluate_stage2_ready(w.get("stage2_score"))
        elif rtype == "rs_strong":
            w = watch.get(symbol) or {}
            result = evaluate_rs_strong(w.get("rs_score"))
        else:
            continue

        if not result["triggered"]:
            continue
        hits.append({
            "id": f"overlay:{rule.get('id')}:{symbol}:{rtype}",
            "rule_id": rule.get("id"),
            "type": rtype,
            "severity": "medium",
            "symbol": symbol or None,
            "board": "deepdive" if symbol else "overview",
            "title_en": f"{symbol} {rtype.replace('_', ' ')}",
            "title_ko": f"{symbol} {rtype}",
            "body_en": result["message"],
            "body_ko": result["message"],
        })
    return hits
