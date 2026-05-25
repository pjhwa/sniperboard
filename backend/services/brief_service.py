"""AI Daily Brief 서비스 — GitHub raw URL fetch + 인메모리 캐시."""

import logging
import os
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

BRIEF_DATA_URL = os.environ.get("BRIEF_DATA_URL", "")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")

CACHE_TTL = 300  # 5분 — brief는 하루 2회 갱신, push 후 빠른 반영을 위해 단축
_cache: dict[str, Any] = {"data": None, "ts": 0.0}


def _auth_headers() -> dict:
    if SENTIMENT_DATA_TOKEN:
        return {"Authorization": f"token {SENTIMENT_DATA_TOKEN}"}
    return {}


def fetch_brief() -> dict:
    """brief/latest.json 반환. 30분 TTL 인메모리 캐시."""
    now = time.monotonic()
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    if not BRIEF_DATA_URL:
        return {"available": False, "error": "BRIEF_DATA_URL 환경변수가 설정되지 않았습니다."}

    try:
        headers = {**_auth_headers(), "Cache-Control": "no-cache", "Pragma": "no-cache"}
        resp = requests.get(BRIEF_DATA_URL, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(f"brief fetch 실패: {e}")
        return {"available": False, "error": f"GitHub raw fetch 실패: {e}"}

    if data.get("generated_at") is None:
        return {"available": False, "error": "Brief 데이터가 아직 생성되지 않았습니다."}

    result = {"available": True, "data": data}
    _cache["data"] = result
    _cache["ts"] = now
    return result
