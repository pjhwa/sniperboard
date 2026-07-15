"""Phase B4 — social sentiment vs session price divergence.

Mechanical rules (no AI): compare composite_score sign/magnitude to day change %.
"""

from __future__ import annotations

from typing import Any, Optional


def classify_divergence(
    composite: Optional[float],
    change_pct: Optional[float],
    *,
    score_bull: float = 0.5,
    score_bear: float = -0.5,
    move_up: float = 1.5,
    move_down: float = -1.5,
) -> Optional[str]:
    """Return divergence label or None if aligned/neutral.

    Labels:
      bullish_divergence — price down hard but social still optimistic
      bearish_divergence — price up hard but social fearful
      aligned_bull / aligned_bear — same direction
    """
    if composite is None or change_pct is None:
        return None
    try:
        c = float(composite)
        p = float(change_pct)
    except (TypeError, ValueError):
        return None

    if c >= score_bull and p <= move_down:
        return "bullish_divergence"
    if c <= score_bear and p >= move_up:
        return "bearish_divergence"
    if c >= score_bull and p >= move_up:
        return "aligned_bull"
    if c <= score_bear and p <= move_down:
        return "aligned_bear"
    return None


def build_divergence_list(
    symbols: list[dict],
    price_changes: dict[str, float],
    *,
    only_divergences: bool = True,
) -> list[dict[str, Any]]:
    """Merge sentiment symbols with price day-change map into ranked list."""
    out: list[dict[str, Any]] = []
    for s in symbols or []:
        if not isinstance(s, dict):
            continue
        sym = str(s.get("symbol") or "").upper()
        if not sym:
            continue
        comp = s.get("composite_score")
        if comp is None:
            comp = s.get("sentiment_score")
        chg = price_changes.get(sym)
        label = classify_divergence(
            float(comp) if comp is not None else None,
            chg,
        )
        if only_divergences and label not in ("bullish_divergence", "bearish_divergence"):
            continue
        if label is None:
            continue
        out.append({
            "symbol": sym,
            "composite_score": float(comp) if comp is not None else None,
            "change_pct": chg,
            "divergence": label,
            "sentiment": s.get("sentiment") or s.get("sentiment_mood"),
            "key_reason_en": s.get("key_reason_en") or s.get("key_reason"),
            "key_reason_ko": s.get("key_reason_ko"),
        })
    # Rank: bullish first (contrarian interest), then bearish
    order = {"bullish_divergence": 0, "bearish_divergence": 1, "aligned_bull": 2, "aligned_bear": 3}
    out.sort(key=lambda r: (order.get(r["divergence"], 9), abs(r.get("change_pct") or 0) * -1))
    return out
