"""Earnings Intelligence 서비스 — GitHub raw URL fetch + 인메모리 캐시."""

import logging
import os
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

EARNINGS_DATA_URL = os.environ.get("EARNINGS_DATA_URL", "")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")

CACHE_TTL = 300  # 5분 — earnings는 하루 2회 갱신, push 후 빠른 반영을 위해 단축
_cache: dict[str, Any] = {"data": None, "ts": 0.0}

# P0-6 consumer guard: quarterly revenue USD billions above this is almost certainly a unit bug
_MAX_REVENUE_B = 300.0


def _auth_headers() -> dict:
    if SENTIMENT_DATA_TOKEN:
        return {"Authorization": f"token {SENTIMENT_DATA_TOKEN}"}
    return {}


def _sanitize_revenue_estimate_b(value: Any, symbol: str = "") -> Any:
    """Drop absurd revenue_estimate_b so UI/AI residue from TWD-as-USD bugs cannot display."""
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
            value,
            symbol or "?",
            _MAX_REVENUE_B,
        )
        return None
    return round(v, 2)


def _sanitize_earnings_payload(data: dict) -> dict:
    """Defensive copy: clamp/null bad revenue fields on upcoming_earnings."""
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
    return {**data, "upcoming_earnings": cleaned}


def fetch_earnings() -> dict:
    """earnings/latest.json 반환. 5분 TTL 인메모리 캐시. P0-6: revenue 이상치 제거."""
    now = time.monotonic()
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    if not EARNINGS_DATA_URL:
        return {"available": False, "error": "EARNINGS_DATA_URL 환경변수가 설정되지 않았습니다."}

    try:
        headers = {**_auth_headers(), "Cache-Control": "no-cache", "Pragma": "no-cache"}
        resp = requests.get(EARNINGS_DATA_URL, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(f"earnings fetch 실패: {e}")
        return {"available": False, "error": f"GitHub raw fetch 실패: {e}"}

    if data.get("generated_at") is None:
        return {"available": False, "error": "Earnings 데이터가 아직 생성되지 않았습니다."}

    data = _sanitize_earnings_payload(data)
    result = {"available": True, "data": data}
    _cache["data"] = result
    _cache["ts"] = now
    return result
