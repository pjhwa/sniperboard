"""아침 브리핑 서비스 — GitHub raw URL fetch + 인메모리 캐시.

Free-text relative earnings language is sanitized against the live earnings
calendar (core.earnings_consistency) so dashboard and email never disagree.
"""

import logging
import os
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

MORNING_BRIEFING_URL = os.environ.get("MORNING_BRIEFING_URL", "")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")

CACHE_TTL = 600  # 10분 — 하루 1회 갱신, 빠른 반영을 위해 짧게 유지
_cache: dict[str, Any] = {"data": None, "ts": 0.0}


def _auth_headers() -> dict:
    if SENTIMENT_DATA_TOKEN:
        return {"Authorization": f"token {SENTIMENT_DATA_TOKEN}"}
    return {}


def _apply_earnings_consistency(data: dict) -> dict:
    """Recompute relative-day language against live earnings calendar."""
    try:
        from core.earnings_consistency import sanitize_briefing_payload
        from services.earnings_service import fetch_earnings

        earn = fetch_earnings()
        upcoming = []
        if earn.get("available") and isinstance(earn.get("data"), dict):
            upcoming = earn["data"].get("upcoming_earnings") or []
        return sanitize_briefing_payload(data, upcoming, locale="ko")
    except Exception as e:
        logger.warning(f"morning briefing earnings consistency skipped: {e}")
        return data


def fetch_morning_briefing() -> dict:
    """briefing/latest.json 반환. raw 캐시 + 매 요청 live earnings sanitize."""
    now = time.monotonic()
    raw = None
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL:
        raw = _cache["data"]
    else:
        if not MORNING_BRIEFING_URL:
            return {"available": False, "error": "MORNING_BRIEFING_URL 환경변수가 설정되지 않았습니다."}

        try:
            headers = {**_auth_headers(), "Cache-Control": "no-cache", "Pragma": "no-cache"}
            resp = requests.get(MORNING_BRIEFING_URL, headers=headers, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning(f"morning briefing fetch 실패: {e}")
            return {"available": False, "error": f"GitHub raw fetch 실패: {e}"}

        if data.get("generated_at") is None:
            return {"available": False, "error": "브리핑 데이터가 아직 생성되지 않았습니다."}

        _cache["data"] = data
        _cache["ts"] = now
        raw = data

    if not isinstance(raw, dict) or raw.get("generated_at") is None:
        return {"available": False, "error": "브리핑 데이터가 아직 생성되지 않았습니다."}

    sanitized = _apply_earnings_consistency(dict(raw))
    return {"available": True, "data": sanitized}
