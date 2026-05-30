"""매크로 인사이트 서비스 — GitHub raw URL fetch + 인메모리 캐시."""

import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

import requests

logger = logging.getLogger(__name__)

MACRO_INSIGHT_URL = os.environ.get("MACRO_INSIGHT_URL", "")
CACHE_TTL = 1800  # 30분 — macro insights update ~2x daily via cron

_cache: dict = {"data": None, "fetched_at": 0.0}


def fetch_macro_insight() -> Optional[dict]:
    """macro/latest.json 반환. 30분 TTL 인메모리 캐시."""
    if not MACRO_INSIGHT_URL:
        return None
    now = time.time()
    if _cache["data"] is not None and now - _cache["fetched_at"] < CACHE_TTL:
        return _cache["data"]
    try:
        resp = requests.get(MACRO_INSIGHT_URL, timeout=10, headers={"Cache-Control": "no-cache"})
        resp.raise_for_status()
        _cache["data"] = resp.json()
        _cache["fetched_at"] = now
        return _cache["data"]
    except Exception as e:
        logger.warning(f"Macro insight fetch failed: {e} — using stale cache")
        return _cache["data"]


def get_ai_meta(raw: dict) -> Optional[dict]:
    """raw 데이터에서 generated_at와 age_minutes 추출."""
    generated_at = raw.get("generated_at")
    if not generated_at:
        return None
    try:
        gen = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
        age_minutes = int((datetime.now(timezone.utc) - gen).total_seconds() / 60)
        return {"generated_at": generated_at, "age_minutes": age_minutes}
    except Exception:
        return None
