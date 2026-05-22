"""
소셜 심리 서비스 (계층 3 소비)
GitHub raw URL에서 latest.json + 어제 history를 fetch, 캐시, 델타 계산
"""

import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)

SENTIMENT_DATA_URL = os.environ.get("SENTIMENT_DATA_URL", "")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")

CACHE_TTL = 300  # 5분
_cache: dict[str, Any] = {"data": None, "ts": 0.0}

SCORE_MAP = {
    "very_fearful": -2,
    "fearful": -1,
    "neutral": 0,
    "optimistic": 1,
    "euphoric": 2,
}


def _auth_headers() -> dict:
    if SENTIMENT_DATA_TOKEN:
        return {"Authorization": f"token {SENTIMENT_DATA_TOKEN}"}
    return {}


def _fetch_json(url: str) -> dict | None:
    """URL에서 JSON을 가져옴. 실패 시 None."""
    try:
        resp = requests.get(url, headers=_auth_headers(), timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"fetch 실패: {url} — {e}")
        return None


def fetch_latest() -> dict:
    """
    latest.json을 반환. 5분 TTL 인메모리 캐시 적용.
    실패 시 {"available": False, "error": "..."} 반환.
    """
    now = time.monotonic()
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    if not SENTIMENT_DATA_URL:
        return {"available": False, "error": "SENTIMENT_DATA_URL 환경변수가 설정되지 않았습니다."}

    data = _fetch_json(SENTIMENT_DATA_URL)
    if data is None:
        return {"available": False, "error": "GitHub raw fetch 실패 — 네트워크 또는 토큰을 확인하세요."}

    result = {"available": True, **data}
    _cache["data"] = result
    _cache["ts"] = now
    return result


def fetch_today_slots(date_str: str) -> dict:
    """당일 UTC 날짜 기준으로 pre_open / post_close 슬롯 파일을 fetch.
    슬롯 파일이 없거나 fetch 실패 시 해당 키를 None으로 반환.
    반환: {"pre_open": dict|None, "post_close": dict|None}
    """
    result: dict = {"pre_open": None, "post_close": None}
    history_base = os.environ.get("SENTIMENT_DATA_HISTORY_BASE", "")
    if not history_base:
        return result

    base = history_base.rstrip("/")
    for slot in ("pre_open", "post_close"):
        url = f"{base}/{date_str}_{slot}.json"
        data = _fetch_json(url)
        if data is not None:
            result[slot] = data
    return result


def enrich_with_delta(snapshot: dict) -> dict:
    """
    종목별로 어제 history 파일과 비교해 score_delta를 추가.
    어제 파일이 없거나 fetch 실패 시 delta=None.
    """
    if not snapshot.get("available"):
        return snapshot

    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    history_base = os.environ.get("SENTIMENT_DATA_HISTORY_BASE", "")
    if history_base:
        base = history_base.rstrip("/")
        post_close = _fetch_json(f"{base}/{yesterday}_post_close.json")
        yesterday_data = post_close if post_close is not None else _fetch_json(f"{base}/{yesterday}.json")
    else:
        yesterday_data = None
    yesterday_scores: dict[str, int] = {}

    if yesterday_data and "symbols" in yesterday_data:
        for sym_obj in yesterday_data["symbols"]:
            sym = sym_obj.get("symbol")
            score = sym_obj.get("sentiment_score")
            if sym and score is not None:
                yesterday_scores[sym] = score

    symbols = snapshot.get("symbols", [])
    enriched_symbols = []
    for sym_obj in symbols:
        sym = sym_obj.get("symbol")
        current_score = sym_obj.get("sentiment_score")
        prev_score = yesterday_scores.get(sym)
        delta = (current_score - prev_score) if (current_score is not None and prev_score is not None) else None
        enriched_symbols.append({**sym_obj, "score_delta": delta})

    return {**snapshot, "symbols": enriched_symbols}
