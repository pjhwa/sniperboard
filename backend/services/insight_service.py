"""Insight Board data assembly — load MSD history + prices, run pure analytics.

Data sources (priority):
1. INSIGHT_DATA_ROOT local clone of market-sentiment-data (fast, offline)
2. GitHub raw history bases derived from existing env URLs

Caches assembled payload for CACHE_TTL seconds.
"""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import requests

from core.data_adapter import get_multi_daily
from core.insight_engine import (
    analyze_actions,
    analyze_divergence,
    analyze_macro_transitions,
    analyze_pre_post_shift,
    analyze_themes,
    build_market_composite_series,
    collect_brief_actions,
    collect_briefing_actions,
    collect_divergence_events,
    parse_iso_date,
)

logger = logging.getLogger(__name__)

CACHE_TTL = int(os.environ.get("INSIGHT_CACHE_TTL", "900"))  # 15 min
_cache: dict[str, Any] = {}

# Env
INSIGHT_DATA_ROOT = os.environ.get("INSIGHT_DATA_ROOT", "").rstrip("/")
SENTIMENT_HISTORY_BASE = os.environ.get(
    "SENTIMENT_DATA_HISTORY_BASE",
    "https://raw.githubusercontent.com/pjhwa/market-sentiment-data/main/sentiment/history",
).rstrip("/")
BRIEF_HISTORY_BASE = os.environ.get(
    "BRIEF_HISTORY_BASE",
    SENTIMENT_HISTORY_BASE.replace("/sentiment/history", "/brief/history"),
).rstrip("/")
MACRO_HISTORY_BASE = os.environ.get(
    "MACRO_HISTORY_BASE",
    SENTIMENT_HISTORY_BASE.replace("/sentiment/history", "/macro/history"),
).rstrip("/")
BRIEFING_HISTORY_BASE = os.environ.get(
    "BRIEFING_HISTORY_BASE",
    SENTIMENT_HISTORY_BASE.replace("/sentiment/history", "/briefing/history"),
).rstrip("/")
SENTIMENT_DATA_TOKEN = os.environ.get("SENTIMENT_DATA_TOKEN", "")


def _auth_headers() -> dict:
    if SENTIMENT_DATA_TOKEN:
        return {"Authorization": f"token {SENTIMENT_DATA_TOKEN}"}
    return {}


def _fetch_json(url: str) -> Optional[dict]:
    try:
        r = requests.get(url, headers=_auth_headers(), timeout=12)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.debug("insight fetch miss %s: %s", url, e)
        return None


def _load_local_jsons(subdir: str, days: int) -> list[dict]:
    root = Path(INSIGHT_DATA_ROOT) / subdir / "history"
    if not root.is_dir():
        return []
    files = sorted(root.glob("*.json"))
    # keep last ~days*2 files (pre+post) roughly
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=days + 5)
    out: list[dict] = []
    for fp in files:
        try:
            # filename date prefix
            name = fp.name
            dpart = name[:10]
            fd = parse_iso_date(dpart)
            if fd is not None and fd < cutoff:
                continue
            data = json.loads(fp.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                out.append(data)
        except Exception as e:
            logger.warning("insight local read fail %s: %s", fp, e)
    return out


def _load_remote_slot_history(base: str, days: int, slots: tuple[str, ...] = ("pre_open", "post_close")) -> list[dict]:
    out: list[dict] = []
    today = datetime.now(timezone.utc).date()
    for off in range(days + 2, -1, -1):
        d = today - timedelta(days=off)
        ds = d.isoformat()
        for slot in slots:
            data = _fetch_json(f"{base}/{ds}_{slot}.json")
            if data is None and slot == "pre_open":
                data = _fetch_json(f"{base}/{ds}.json")
            if isinstance(data, dict):
                out.append(data)
    return out


def _load_remote_daily_history(base: str, days: int) -> list[dict]:
    """briefing/history uses YYYY-MM-DD.json only."""
    out: list[dict] = []
    today = datetime.now(timezone.utc).date()
    for off in range(days + 2, -1, -1):
        d = today - timedelta(days=off)
        data = _fetch_json(f"{base}/{d.isoformat()}.json")
        if isinstance(data, dict):
            out.append(data)
    return out


def load_sentiment_history(days: int) -> list[dict]:
    if INSIGHT_DATA_ROOT:
        local = _load_local_jsons("sentiment", days)
        if local:
            return local
    return _load_remote_slot_history(SENTIMENT_HISTORY_BASE, days)


def load_brief_history(days: int) -> list[dict]:
    if INSIGHT_DATA_ROOT:
        local = _load_local_jsons("brief", days)
        if local:
            return local
    return _load_remote_slot_history(BRIEF_HISTORY_BASE, days)


def load_macro_history(days: int) -> list[dict]:
    if INSIGHT_DATA_ROOT:
        local = _load_local_jsons("macro", days)
        if local:
            return local
    return _load_remote_slot_history(MACRO_HISTORY_BASE, days)


def load_briefing_history(days: int) -> list[dict]:
    if INSIGHT_DATA_ROOT:
        local = _load_local_jsons("briefing", days)
        if local:
            return local
    return _load_remote_daily_history(BRIEFING_HISTORY_BASE, days)


def _df_to_closes(df) -> dict[date, float]:
    if df is None or df.empty or "close" not in df.columns:
        return {}
    out: dict[date, float] = {}
    for idx, row in df.iterrows():
        try:
            if hasattr(idx, "date"):
                d = idx.date()
            else:
                d = parse_iso_date(str(idx)[:10])
            if d is None:
                continue
            out[d] = float(row["close"])
        except Exception:
            continue
    return out


def load_price_closes(symbols: list[str], period: str = "6mo") -> dict[str, dict[date, float]]:
    syms = list(dict.fromkeys([s.upper() for s in symbols if s]))
    if not syms:
        return {}
    # batch
    try:
        dfs = get_multi_daily(syms, period=period)
    except Exception as e:
        logger.error("insight price fetch failed: %s", e, exc_info=True)
        return {}
    return {s: _df_to_closes(dfs.get(s)) for s in syms}


def build_insight_payload(days: int = 60, horizon: int = 5) -> dict[str, Any]:
    days = max(14, min(int(days), 120))
    horizon = max(1, min(int(horizon), 20))
    cache_key = f"insight:{days}:{horizon}"
    now = time.monotonic()
    hit = _cache.get(cache_key)
    if hit and (now - hit["ts"]) < CACHE_TTL:
        return hit["data"]

    t0 = time.monotonic()
    sentiment = load_sentiment_history(days)
    brief = load_brief_history(days)
    macro = load_macro_history(days)
    briefing = load_briefing_history(days)

    # MVP-1 events → symbols for prices
    div_events = collect_divergence_events(sentiment, slot_filter="post_close")
    brief_actions = collect_brief_actions(brief)
    briefing_actions = collect_briefing_actions(briefing)
    # Prefer post_close brief actions for primary table
    action_events = brief_actions + briefing_actions

    symbols = sorted({
        *[e["symbol"] for e in div_events],
        *[e["symbol"] for e in action_events],
        "SPY",
    })
    prices = load_price_closes(symbols, period="1y")

    divergence = analyze_divergence(div_events, prices, horizons=(3, 5, 10))
    actions_brief = analyze_actions(
        [e for e in brief_actions if (e.get("slot") or "post_close") == "post_close"] or brief_actions,
        prices,
        horizon=horizon,
        slot_prefer="post_close",
    )
    actions_briefing = analyze_actions(
        briefing_actions,
        prices,
        horizon=horizon,
        slot_prefer=None,
    )
    themes = analyze_themes(brief, market_closes=prices.get("SPY"), min_count=2, top_k=12)
    market_comp = build_market_composite_series(sentiment, slot="post_close")
    macro_tx = analyze_macro_transitions(macro, market_comp)
    pre_post = analyze_pre_post_shift(sentiment)

    # Integrity self-checks (surface to UI — not silent)
    integrity = _integrity_checks(
        divergence=divergence,
        actions_brief=actions_brief,
        themes=themes,
        macro_tx=macro_tx,
        pre_post=pre_post,
        n_sent=len(sentiment),
        n_brief=len(brief),
        n_macro=len(macro),
        n_briefing=len(briefing),
        prices=prices,
    )

    payload = {
        "available": True,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window_days": days,
        "action_horizon_days": horizon,
        "source": {
            "insight_data_root": INSIGHT_DATA_ROOT or None,
            "sentiment_snapshots": len(sentiment),
            "brief_snapshots": len(brief),
            "macro_snapshots": len(macro),
            "briefing_snapshots": len(briefing),
            "price_symbols": len([s for s, c in prices.items() if c]),
            "build_ms": int((time.monotonic() - t0) * 1000),
        },
        "disclaimer_en": (
            "Historical associations only — not trading advice. "
            "Small samples show honest_gap / INSUFFICIENT confidence. "
            "Divergence labels are social×price mechanical flags from the collector."
        ),
        "disclaimer_ko": (
            "과거 연관성 관찰이며 투자 권유가 아닙니다. "
            "소표본은 honest_gap·INSUFFICIENT로 표시됩니다. "
            "다이버전스는 수집기의 소셜×가격 기계적 라벨입니다."
        ),
        "mvp1_divergence": divergence,
        "mvp2_actions": {
            "brief": actions_brief,
            "briefing": actions_briefing,
        },
        "mvp3_themes": themes,
        "mvp4_macro": macro_tx,
        "mvp4_pre_post": pre_post,
        "integrity": integrity,
    }
    _cache[cache_key] = {"data": payload, "ts": now}
    return payload


def _integrity_checks(**kw) -> dict[str, Any]:
    issues: list[dict] = []
    divergence = kw["divergence"]
    prices = kw["prices"]
    n_sent = kw["n_sent"]

    if n_sent < 5:
        issues.append({
            "code": "I-data-thin",
            "severity": "fail",
            "message_en": f"Only {n_sent} sentiment snapshots loaded — history base may be unreachable.",
            "message_ko": f"sentiment 스냅샷 {n_sent}개만 로드됨 — history 경로/네트워크 확인.",
        })

    # Forward return sanity: bullish group avg should not equal all zeros when prices move
    n_priced = len([s for s, c in prices.items() if len(c) > 20])
    if n_priced < 3:
        issues.append({
            "code": "I-price-thin",
            "severity": "fail",
            "message_en": "Price history missing for most symbols — forward returns unreliable.",
            "message_ko": "대부분 종목 가격 히스토리 없음 — 선행수익 신뢰 불가.",
        })

    # Check look-ahead impossible values: no horizon n > event count without gap
    for g in divergence.get("groups") or []:
        for h, st in (g.get("horizons") or {}).items():
            n = st.get("n") or 0
            if n > (g.get("n_events") or 0):
                issues.append({
                    "code": "I-count-inconsistent",
                    "severity": "fail",
                    "message_en": f"{g['divergence']} h={h}: completed n={n} > events={g.get('n_events')}",
                    "message_ko": f"{g['divergence']} h={h}: 완료 n={n} > 이벤트 {g.get('n_events')}",
                })

    # Themes: empty is ok if brief missing
    if kw["n_brief"] == 0:
        issues.append({
            "code": "I-brief-empty",
            "severity": "warn",
            "message_en": "No brief history — theme / action-brief sections empty.",
            "message_ko": "brief history 없음 — 테마·brief action 섹션 비어 있음.",
        })

    fail = sum(1 for i in issues if i["severity"] == "fail")
    return {
        "passed": fail == 0,
        "fail_count": fail,
        "warn_count": sum(1 for i in issues if i["severity"] == "warn"),
        "issues": issues,
    }


def clear_insight_cache() -> None:
    _cache.clear()
