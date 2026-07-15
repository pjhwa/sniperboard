"""Last-good GitHub payload cache — stale-on-error for AI data consumers.

When a live fetch fails but a previous successful payload exists, serve that
payload with stale/from_cache flags instead of available:false empty UI.
"""

from __future__ import annotations

import copy
import time
from typing import Any, Callable, Optional


class LastGoodCache:
    """TTL cache that keeps the last successful payload beyond TTL for failover."""

    def __init__(self, ttl_seconds: float = 300.0):
        self.ttl = float(ttl_seconds)
        self._payload: Any = None
        self._ts: float = 0.0
        self._last_success_ts: float = 0.0

    def clear(self) -> None:
        self._payload = None
        self._ts = 0.0
        self._last_success_ts = 0.0

    def get_fresh(self) -> Any | None:
        """Return payload if within TTL, else None (caller should refetch)."""
        if self._payload is None:
            return None
        if (time.monotonic() - self._ts) < self.ttl:
            return copy.deepcopy(self._payload)
        return None

    def get_last_good(self) -> Any | None:
        """Return last successful payload even if TTL expired."""
        if self._payload is None:
            return None
        return copy.deepcopy(self._payload)

    def set_success(self, payload: Any) -> None:
        now = time.monotonic()
        self._payload = copy.deepcopy(payload)
        self._ts = now
        self._last_success_ts = now

    @property
    def has_last_good(self) -> bool:
        return self._payload is not None

    def age_seconds(self) -> Optional[float]:
        if not self._last_success_ts:
            return None
        return time.monotonic() - self._last_success_ts


def mark_stale_result(result: dict, *, reason: str = "fetch_failed") -> dict:
    """Annotate a successful-shaped result as served from last-good cache."""
    out = dict(result)
    out["available"] = True
    out["stale"] = True
    out["from_cache"] = True
    out["stale_reason"] = reason
    # Keep error as warning text for operators; do not flip available
    if reason and "error" not in out:
        out["warning"] = f"Serving last-good snapshot ({reason})"
    return out


def with_stale_on_error(
    cache: LastGoodCache,
    *,
    fetch_fn: Callable[[], Any],
    is_valid: Callable[[Any], bool],
    wrap_success: Callable[[Any], dict],
    error_result: Callable[[str], dict],
    empty_url_error: str,
    url_configured: bool,
) -> dict:
    """Shared fetch path: TTL hit → live fetch → last-good on failure.

    fetch_fn: returns raw payload or raises / returns None on failure
    is_valid: True if raw is usable
    wrap_success: raw → API result dict (must include available:True)
    error_result: message → unavailable dict
    """
    if not url_configured:
        # Prefer last-good even without URL if we ever had data (tests / restart edge)
        if cache.has_last_good:
            return mark_stale_result(wrap_success(cache.get_last_good()), reason="url_not_configured")
        return error_result(empty_url_error)

    fresh = cache.get_fresh()
    if fresh is not None:
        return wrap_success(fresh)

    try:
        raw = fetch_fn()
    except Exception as e:
        if cache.has_last_good:
            return mark_stale_result(
                wrap_success(cache.get_last_good()),
                reason=f"fetch_failed:{e}",
            )
        return error_result(f"GitHub raw fetch 실패: {e}")

    if raw is None or not is_valid(raw):
        if cache.has_last_good:
            return mark_stale_result(
                wrap_success(cache.get_last_good()),
                reason="invalid_or_empty_payload",
            )
        return error_result("데이터가 아직 생성되지 않았거나 fetch 실패했습니다.")

    cache.set_success(raw)
    return wrap_success(raw)


# ── Brief / sentiment slot coherence (A2) ───────────────────────────────────

def slots_compatible(brief_slot: Optional[str], sentiment_slot: Optional[str]) -> bool:
    """True when brief and sentiment share the same market slot (or either missing)."""
    if not brief_slot or not sentiment_slot:
        return True  # cannot judge — do not hard-fail
    return str(brief_slot).strip() == str(sentiment_slot).strip()


def annotate_slot_mismatch(brief_data: dict, sentiment_slot: Optional[str]) -> dict:
    """Attach slot_mismatch flag when brief.slot != sentiment.slot."""
    if not isinstance(brief_data, dict):
        return brief_data
    data = dict(brief_data)
    bslot = data.get("slot")
    if not slots_compatible(bslot, sentiment_slot):
        data["slot_mismatch"] = True
        data["sentiment_slot_seen"] = sentiment_slot
        data["slot_warning"] = (
            f"Brief slot '{bslot}' does not match sentiment slot '{sentiment_slot}'"
        )
    else:
        data["slot_mismatch"] = False
    return data
