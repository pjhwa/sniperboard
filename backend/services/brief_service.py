"""AI Daily Brief 서비스 — GitHub raw URL fetch + last-good stale-on-error."""

import logging
import os

import requests

from core.github_payload_cache import (
    LastGoodCache,
    annotate_slot_mismatch,
    mark_stale_result,
    slots_compatible,
)

logger = logging.getLogger(__name__)

BRIEF_DATA_URL = os.environ.get("BRIEF_DATA_URL", "")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")

CACHE_TTL = 300
_cache = LastGoodCache(ttl_seconds=CACHE_TTL)


def _auth_headers() -> dict:
    if SENTIMENT_DATA_TOKEN:
        return {"Authorization": f"token {SENTIMENT_DATA_TOKEN}"}
    return {}


def fetch_brief() -> dict:
    """brief/latest.json 반환. TTL 캐시 + fetch 실패 시 last-good + stale 플래그."""
    if not BRIEF_DATA_URL:
        if _cache.has_last_good:
            return mark_stale_result(
                {"available": True, "data": _cache.get_last_good()},
                reason="url_not_configured",
            )
        return {"available": False, "error": "BRIEF_DATA_URL 환경변수가 설정되지 않았습니다."}

    fresh = _cache.get_fresh()
    if fresh is not None:
        return {"available": True, "data": fresh, "stale": False, "from_cache": False}

    try:
        headers = {**_auth_headers(), "Cache-Control": "no-cache", "Pragma": "no-cache"}
        resp = requests.get(BRIEF_DATA_URL, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(f"brief fetch 실패: {e}")
        if _cache.has_last_good:
            return mark_stale_result(
                {"available": True, "data": _cache.get_last_good()},
                reason=f"fetch_failed:{e}",
            )
        return {"available": False, "error": f"GitHub raw fetch 실패: {e}"}

    if data.get("generated_at") is None:
        if _cache.has_last_good:
            return mark_stale_result(
                {"available": True, "data": _cache.get_last_good()},
                reason="placeholder_json",
            )
        return {"available": False, "error": "Brief 데이터가 아직 생성되지 않았습니다."}

    # A2: annotate slot mismatch vs live sentiment if available
    try:
        from services.sentiment_service import fetch_latest
        sent = fetch_latest()
        s_slot = None
        if sent.get("available") is not False:
            s_slot = sent.get("slot")
        data = annotate_slot_mismatch(data, s_slot)
        if data.get("slot_mismatch"):
            logger.warning("brief/sentiment slot mismatch: %s", data.get("slot_warning"))
    except Exception as e:
        logger.debug("slot check skipped: %s", e)

    _cache.set_success(data)
    return {"available": True, "data": data, "stale": False, "from_cache": False}


def apply_slot_guard(brief_data: dict, sentiment_slot: str | None) -> dict:
    """Public helper for tests — same rule as fetch path."""
    return annotate_slot_mismatch(brief_data, sentiment_slot)


def slots_match(brief_slot: str | None, sentiment_slot: str | None) -> bool:
    return slots_compatible(brief_slot, sentiment_slot)
