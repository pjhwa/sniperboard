"""Earnings Intelligence 서비스 — GitHub raw URL fetch + last-good + live days_until."""

import logging
import os
from typing import Any

import requests

from core.earnings_consistency import refresh_upcoming_earnings
from core.github_payload_cache import LastGoodCache, mark_stale_result

logger = logging.getLogger(__name__)

EARNINGS_DATA_URL = os.environ.get("EARNINGS_DATA_URL", "")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")

CACHE_TTL = 300
_cache = LastGoodCache(ttl_seconds=CACHE_TTL)

_MAX_REVENUE_B = 300.0


def _auth_headers() -> dict:
    if SENTIMENT_DATA_TOKEN:
        return {"Authorization": f"token {SENTIMENT_DATA_TOKEN}"}
    return {}


def _sanitize_revenue_estimate_b(value: Any, symbol: str = "") -> Any:
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v != v:
        return None
    if abs(v) > _MAX_REVENUE_B:
        logger.warning(
            "Dropping absurd revenue_estimate_b=%s for %s (max=%s) — unit/currency bug",
            value, symbol or "?", _MAX_REVENUE_B,
        )
        return None
    return round(v, 2)


def _sanitize_earnings_payload(data: dict) -> dict:
    if not isinstance(data, dict):
        return data
    upcoming = data.get("upcoming_earnings")
    if not isinstance(upcoming, list):
        return data
    cleaned = []
    for item in upcoming:
        if not isinstance(item, dict):
            cleaned.append(item)
            continue
        row = dict(item)
        row["revenue_estimate_b"] = _sanitize_revenue_estimate_b(
            row.get("revenue_estimate_b"),
            str(row.get("symbol") or ""),
        )
        cleaned.append(row)
    cleaned = refresh_upcoming_earnings(cleaned)
    return {**data, "upcoming_earnings": cleaned}


def _attach_estimate_provenance(data: dict) -> dict:
    """Phase B3: null-safe consensus provenance for UI (as_of / provider)."""
    if not isinstance(data, dict):
        return data
    out = dict(data)
    as_of = out.get("generated_at") or out.get("as_of")
    provider = out.get("estimate_provider") or "consensus_snapshot"
    for key in ("upcoming_earnings", "recent_results"):
        rows = out.get(key)
        if not isinstance(rows, list):
            continue
        cleaned = []
        for row in rows:
            if not isinstance(row, dict):
                cleaned.append(row)
                continue
            r = dict(row)
            if r.get("estimate_as_of") is None and as_of:
                r["estimate_as_of"] = as_of
            if r.get("estimate_provider") is None:
                # Only label when an estimate exists; otherwise leave null (UI hides)
                if r.get("eps_estimate") is not None or r.get("revenue_estimate_b") is not None:
                    r["estimate_provider"] = provider
            cleaned.append(r)
        out[key] = cleaned
    if out.get("estimate_as_of") is None and as_of:
        out["estimate_as_of"] = as_of
    if out.get("estimate_provider") is None:
        out["estimate_provider"] = provider
    return out


def _success(raw: dict, *, stale: bool = False, reason: str = "") -> dict:
    data = _sanitize_earnings_payload(dict(raw))
    data = _attach_estimate_provenance(data)
    out: dict[str, Any] = {
        "available": True,
        "data": data,
        "stale": stale,
        "from_cache": stale,
    }
    if stale:
        out = mark_stale_result(out, reason=reason or "fetch_failed")
        out["data"] = data
    return out


def fetch_earnings() -> dict:
    """earnings/latest.json — last-good on fetch error; days_until always live."""
    if not EARNINGS_DATA_URL:
        if _cache.has_last_good:
            return _success(_cache.get_last_good(), stale=True, reason="url_not_configured")
        return {"available": False, "error": "EARNINGS_DATA_URL 환경변수가 설정되지 않았습니다."}

    fresh = _cache.get_fresh()
    if fresh is not None:
        return _success(fresh, stale=False)

    try:
        headers = {**_auth_headers(), "Cache-Control": "no-cache", "Pragma": "no-cache"}
        resp = requests.get(EARNINGS_DATA_URL, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(f"earnings fetch 실패: {e}")
        if _cache.has_last_good:
            return _success(_cache.get_last_good(), stale=True, reason=f"fetch_failed:{e}")
        return {"available": False, "error": f"GitHub raw fetch 실패: {e}"}

    if data.get("generated_at") is None:
        if _cache.has_last_good:
            return _success(_cache.get_last_good(), stale=True, reason="placeholder_json")
        return {"available": False, "error": "Earnings 데이터가 아직 생성되지 않았습니다."}

    _cache.set_success(data)
    return _success(data, stale=False)
