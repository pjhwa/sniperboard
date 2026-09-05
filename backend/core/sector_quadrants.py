"""Sector rotation momentum × acceleration quadrants. Display-only."""
from __future__ import annotations

from typing import Any


def quadrant_label(*, momentum: float, acceleration: float) -> str:
    if momentum > 0 and acceleration >= 0:
        return "leading"
    if momentum > 0 and acceleration < 0:
        return "weakening"
    if momentum < 0 and acceleration > 0:
        return "improving"
    if momentum == 0 and acceleration > 0:
        return "improving"
    if momentum == 0 and acceleration < 0:
        return "weakening"
    return "lagging"


def label_sectors(rows: list[dict]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in rows or []:
        recent = float(r.get("ret_recent") or 0)
        prior = float(r.get("ret_prior") or 0)
        accel = recent - prior
        out.append({
            **r,
            "momentum": recent,
            "acceleration": accel,
            "quadrant": quadrant_label(momentum=recent, acceleration=accel),
        })
    return out
