"""Prediction market service — GitHub raw fetch + in-memory cache.

Consumes market-sentiment-data prediction/latest.json (Polymarket reference odds by default).
Does NOT feed Conviction weights — reference-only macro overlay.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

PREDICTION_DATA_URL = os.environ.get("PREDICTION_DATA_URL", "")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")

CACHE_TTL = 300  # 5 min
_cache: dict[str, Any] = {"data": None, "ts": 0.0}


def _auth_headers() -> dict:
    if SENTIMENT_DATA_TOKEN:
        return {"Authorization": f"token {SENTIMENT_DATA_TOKEN}"}
    return {}


def fetch_prediction() -> dict:
    """Return prediction snapshot. Soft-fail with available:false."""
    now = time.monotonic()
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    if not PREDICTION_DATA_URL:
        return {
            "available": False,
            "error": "PREDICTION_DATA_URL 환경변수가 설정되지 않았습니다.",
        }

    try:
        headers = {**_auth_headers(), "Cache-Control": "no-cache", "Pragma": "no-cache"}
        resp = requests.get(PREDICTION_DATA_URL, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(f"prediction fetch 실패: {e}")
        return {"available": False, "error": f"GitHub raw fetch 실패: {e}"}

    if not isinstance(data, dict) or data.get("generated_at") is None:
        return {"available": False, "error": "Prediction 데이터가 아직 생성되지 않았습니다."}

    # Normalize usage flag for consumers
    if not data.get("usage"):
        data = {**data, "usage": "reference_only"}

    result = {"available": True, "data": data}
    _cache["data"] = result
    _cache["ts"] = now
    return result
