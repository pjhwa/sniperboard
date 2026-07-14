"""Earnings Intelligence 서비스 — GitHub raw URL fetch + 인메모리 캐시.

Relative day language (days_until / AI summary phrases) is recomputed on every
serve via core.earnings_consistency so frozen collector text cannot contradict
the live calendar.
"""

import logging
import os
import time
from typing import Any

import requests

from core.earnings_consistency import refresh_upcoming_earnings

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
    """Defensive copy: clamp/null bad revenue fields + live days_until recompute."""
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
    # Absolute earnings_date is SoT; days_until / AI relative phrases recomputed live
    cleaned = refresh_upcoming_earnings(cleaned)
    return {**data, "upcoming_earnings": cleaned}


def fetch_earnings() -> dict:
    """earnings/latest.json 반환. 5분 TTL raw 캐시 + 매 요청 live days_until.

    Cache stores the raw GitHub payload. Relative-day fields are always
    recomputed at serve time so a 5-minute cache cannot freeze stale "N일 후".
    """
    now = time.monotonic()
    raw = None
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL:
        raw = _cache["data"]
    else:
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

        _cache["data"] = data
        _cache["ts"] = now
        raw = data

    if not isinstance(raw, dict) or raw.get("generated_at") is None:
        return {"available": False, "error": "Earnings 데이터가 아직 생성되지 않았습니다."}

    data = _sanitize_earnings_payload(dict(raw))
    return {"available": True, "data": data}
