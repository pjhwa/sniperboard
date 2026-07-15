"""
소셜 심리 서비스 (계층 3 소비)
GitHub raw URL에서 latest.json + 어제 history를 fetch, 캐시, 델타 계산.
Phase A3: last-good stale-on-error when live fetch fails.
"""

import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

from core.github_payload_cache import LastGoodCache, mark_stale_result

logger = logging.getLogger(__name__)

SENTIMENT_DATA_URL = os.environ.get("SENTIMENT_DATA_URL", "")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")

CACHE_TTL = 300  # 5분
_cache = LastGoodCache(ttl_seconds=CACHE_TTL)

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
    latest.json 반환. TTL 캐시 + fetch 실패 시 last-good (stale=True).
    """
    if not SENTIMENT_DATA_URL:
        if _cache.has_last_good:
            base = _cache.get_last_good()
            return mark_stale_result(
                {"available": True, **base} if isinstance(base, dict) else {"available": True, "data": base},
                reason="url_not_configured",
            )
        return {"available": False, "error": "SENTIMENT_DATA_URL 환경변수가 설정되지 않았습니다."}

    fresh = _cache.get_fresh()
    if fresh is not None:
        return {"available": True, "stale": False, "from_cache": False, **fresh}

    data = _fetch_json(SENTIMENT_DATA_URL)
    if data is None:
        if _cache.has_last_good:
            base = _cache.get_last_good()
            return mark_stale_result(
                {"available": True, **base},
                reason="fetch_failed",
            )
        return {"available": False, "error": "GitHub raw fetch 실패 — 네트워크 또는 토큰을 확인하세요."}

    if not data.get("generated_at"):
        if _cache.has_last_good:
            base = _cache.get_last_good()
            return mark_stale_result({"available": True, **base}, reason="placeholder_json")
        return {"available": False, "error": "Sentiment 데이터가 아직 생성되지 않았습니다."}

    _cache.set_success(data)
    return {"available": True, "stale": False, "from_cache": False, **data}


def fetch_today_slots(date_str: str) -> dict:
    """당일 UTC 날짜 기준으로 pre_open / post_close 슬롯 파일을 fetch."""
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
    """종목별로 어제 history 파일과 비교해 score_delta를 추가."""
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
    yesterday_scores: dict[str, float] = {}

    if yesterday_data and "symbols" in yesterday_data:
        for sym_obj in yesterday_data["symbols"]:
            sym = sym_obj.get("symbol")
            score = sym_obj.get("composite_score") if sym_obj.get("composite_score") is not None else sym_obj.get("sentiment_score")
            if sym and score is not None:
                yesterday_scores[sym] = score

    symbols = snapshot.get("symbols", [])
    enriched_symbols = []
    for sym_obj in symbols:
        sym = sym_obj.get("symbol")
        current_score = sym_obj.get("composite_score") if sym_obj.get("composite_score") is not None else sym_obj.get("sentiment_score")
        prev_score = yesterday_scores.get(sym)
        entry = dict(sym_obj)
        if current_score is not None and prev_score is not None:
            entry["score_delta"] = round(float(current_score) - float(prev_score), 3)
        else:
            entry["score_delta"] = None
        enriched_symbols.append(entry)

    out = dict(snapshot)
    out["symbols"] = enriched_symbols
    return out


_history_cache: dict[str, Any] = {}
_HISTORY_TTL = 300  # 5분


def fetch_sentiment_history(symbol: str, days: int) -> dict:
    """최근 days일치 pre_open/post_close 심리 포인트를 반환.

    symbol: 종목 코드("TSLA" 등) 또는 "MARKET"
    days: 조회할 일수
    반환: {"symbol": str, "days": int, "points": [{"time", "score", "slot", "sentiment"}]}
    """
    cache_key = f"{symbol}:{days}"
    now = time.monotonic()
    cached = _history_cache.get(cache_key)
    if cached and (now - cached["ts"]) < _HISTORY_TTL:
        return cached["data"]

    history_base = os.environ.get("SENTIMENT_DATA_HISTORY_BASE", "")
    if not history_base:
        return {"symbol": symbol, "days": days, "points": []}

    base = history_base.rstrip("/")
    points: list[dict] = []
    today = datetime.now(timezone.utc).date()

    for day_offset in range(days - 1, -1, -1):
        target_date = today - timedelta(days=day_offset)
        date_str = target_date.strftime("%Y-%m-%d")

        for slot in ("pre_open", "post_close"):
            data = _fetch_json(f"{base}/{date_str}_{slot}.json")
            if data is None and slot == "pre_open":
                data = _fetch_json(f"{base}/{date_str}.json")
            if data is None:
                continue

            if symbol == "MARKET":
                obj: dict | None = data.get("market")
            else:
                obj = next(
                    (s for s in data.get("symbols", []) if s.get("symbol") == symbol),
                    None,
                )

            if obj is None:
                continue

            score = obj.get("composite_score")
            if score is None:
                score = obj.get("sentiment_score")
            if score is None:
                continue

            try:
                score_f = round(float(score), 2)
            except (TypeError, ValueError):
                continue
            points.append({
                "time": obj.get("as_of") or data.get("generated_at", date_str),
                "score": score_f,
                "slot": data.get("slot", slot),
                "sentiment": obj.get("sentiment", "neutral"),
            })

    result = {"symbol": symbol, "days": days, "points": points}
    _history_cache[cache_key] = {"data": result, "ts": now}
    return result
