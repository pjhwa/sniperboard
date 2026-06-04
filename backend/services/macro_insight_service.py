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


_STALE_THRESHOLD_MINUTES = 720  # 12시간 — 이 이상이면 AI 텍스트가 현재 신호와 다를 가능성 높음


def get_ai_meta(raw: dict) -> Optional[dict]:
    """raw 데이터에서 generated_at, age_minutes, stale 추출."""
    generated_at = raw.get("generated_at")
    if not generated_at:
        return None
    try:
        gen = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
        age_minutes = int((datetime.now(timezone.utc) - gen).total_seconds() / 60)
        return {
            "generated_at": generated_at,
            "age_minutes": age_minutes,
            "stale": age_minutes > _STALE_THRESHOLD_MINUTES,
        }
    except Exception:
        return None


def get_cached_signals(raw: dict) -> dict[str, str]:
    """JSON에 저장된 computed_signals를 {group: signal} dict로 반환.

    collect_macro_insight.py v2가 저장한 computed_signals 필드를 읽는다.
    없으면 빈 dict 반환 (구버전 JSON 대응).
    """
    computed = raw.get("computed_signals", {})
    return {k: v.get("signal", "") for k, v in computed.items() if isinstance(v, dict)}
