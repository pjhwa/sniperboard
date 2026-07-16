"""아침 브리핑 서비스 — GitHub raw URL fetch + last-good + earnings consistency."""

import logging
import os
from typing import Any

import requests

from core.github_payload_cache import LastGoodCache, mark_stale_result

logger = logging.getLogger(__name__)

MORNING_BRIEFING_URL = os.environ.get("MORNING_BRIEFING_URL", "")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")

CACHE_TTL = 600
_cache = LastGoodCache(ttl_seconds=CACHE_TTL)


def _auth_headers() -> dict:
    if SENTIMENT_DATA_TOKEN:
        return {"Authorization": f"token {SENTIMENT_DATA_TOKEN}"}
    return {}


def _apply_earnings_consistency(data: dict) -> dict:
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


def _price_table_for_verify(data: dict) -> dict[str, float]:
    """Build symbol→last close table for B1 price-binding checks.

    Prefer structured watchlist.price when present; fill gaps with live daily closes
    so production integrity_passed can fail on $ analysis vs market table mismatches.
    """
    prices: dict[str, float] = {}
    syms: list[str] = []
    for w in data.get("watchlist") or []:
        if not isinstance(w, dict):
            continue
        sym = str(w.get("symbol") or "").upper()
        if not sym:
            continue
        syms.append(sym)
        p = w.get("price")
        if p is not None:
            try:
                prices[sym] = float(p)
            except (TypeError, ValueError):
                pass
    missing = [s for s in syms if s not in prices]
    if missing:
        try:
            from core.data_adapter import get_multi_daily
            dfs = get_multi_daily(missing, period="5d")
            for sym, df in (dfs or {}).items():
                if df is None or df.empty:
                    continue
                prices[str(sym).upper()] = float(df["close"].iloc[-1])
        except Exception as e:
            logger.debug("price_table live fetch partial: %s", e)
    return prices


def _attach_integrity_verify(data: dict) -> dict:
    """Phase B1: run mechanical verify; attach report (promotion gate metadata)."""
    try:
        from core.briefing_verify import verify_briefing_integrity

        upcoming = data.get("_earnings_calendar") or []
        price_table = _price_table_for_verify(data)
        result = verify_briefing_integrity(
            data,
            upcoming_earnings=upcoming,
            price_table=price_table or None,
        )
        data = dict(data)
        rep = result.as_dict()
        # Underscore keys may be stripped by some serializers; expose public aliases too
        data["_integrity"] = rep
        data["_integrity_passed"] = result.passed
        data["integrity"] = rep
        data["integrity_passed"] = result.passed
        data["_price_table_size"] = len(price_table)
        if not result.passed:
            logger.warning(
                "briefing integrity FAIL fail=%s issues=%s",
                rep.get("fail_count"),
                [i["code"] for i in rep.get("issues", [])],
            )
        return data
    except Exception as e:
        logger.warning(f"briefing integrity verify skipped: {e}")
        return data


def _attach_source_citations(data: dict) -> dict:
    """Phase P2+: resolve source_hint → auditable search/profile links (no fake articles)."""
    try:
        from core.source_citations import enrich_briefing_citations
        return enrich_briefing_citations(data)
    except Exception as e:
        logger.warning(f"briefing source citations skipped: {e}")
        return data


def _success(raw: dict, *, stale: bool = False, reason: str = "") -> dict:
    sanitized = _apply_earnings_consistency(dict(raw))
    sanitized = _attach_integrity_verify(sanitized)
    sanitized = _attach_source_citations(sanitized)
    out: dict[str, Any] = {
        "available": True,
        "data": sanitized,
        "stale": stale,
        "from_cache": stale,
    }
    if stale:
        out = mark_stale_result(out, reason=reason or "fetch_failed")
        out["data"] = sanitized
    return out


def fetch_morning_briefing() -> dict:
    """briefing/latest.json — last-good on error + live earnings sanitize."""
    if not MORNING_BRIEFING_URL:
        if _cache.has_last_good:
            return _success(_cache.get_last_good(), stale=True, reason="url_not_configured")
        return {"available": False, "error": "MORNING_BRIEFING_URL 환경변수가 설정되지 않았습니다."}

    fresh = _cache.get_fresh()
    if fresh is not None:
        return _success(fresh, stale=False)

    try:
        headers = {**_auth_headers(), "Cache-Control": "no-cache", "Pragma": "no-cache"}
        resp = requests.get(MORNING_BRIEFING_URL, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(f"morning briefing fetch 실패: {e}")
        if _cache.has_last_good:
            return _success(_cache.get_last_good(), stale=True, reason=f"fetch_failed:{e}")
        return {"available": False, "error": f"GitHub raw fetch 실패: {e}"}

    if data.get("generated_at") is None:
        if _cache.has_last_good:
            return _success(_cache.get_last_good(), stale=True, reason="placeholder_json")
        return {"available": False, "error": "브리핑 데이터가 아직 생성되지 않았습니다."}

    _cache.set_success(data)
    return _success(data, stale=False)
