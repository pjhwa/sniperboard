"""Phase P2+ — resolve AI source_hint / top_news.source into auditable links.

Never invent article URLs that may 404. Prefer:
  - pass-through of explicit http(s) URLs
  - X/Twitter profile links for @handles
  - outlet search deep-links (Google News / publisher search) from outlet name + keywords

Pure functions; no I/O.
"""

from __future__ import annotations

import re
from typing import Any, Optional
from urllib.parse import quote_plus

# Outlet name (lowercase substring) → search URL prefix (query appended)
_OUTLET_SEARCH: list[tuple[str, str, str]] = [
    # (match token, display label, search base ending so we can append quote_plus(q))
    ("reuters", "Reuters", "https://www.reuters.com/site-search/?query="),
    ("bloomberg", "Bloomberg", "https://www.bloomberg.com/search?query="),
    ("wall street journal", "WSJ", "https://www.wsj.com/search?query="),
    ("wsj", "WSJ", "https://www.wsj.com/search?query="),
    ("financial times", "FT", "https://www.ft.com/search?q="),
    ("ft.com", "FT", "https://www.ft.com/search?q="),
    ("associated press", "AP", "https://apnews.com/search?q="),
    ("ap news", "AP", "https://apnews.com/search?q="),
    ("cnbc", "CNBC", "https://www.cnbc.com/search/?query="),
    ("bbc", "BBC", "https://www.bbc.co.uk/search?q="),
    ("nikkei", "Nikkei", "https://www.google.com/search?q=site%3Anikkei.com+"),
    ("bis ", "BIS", "https://www.google.com/search?q=site%3Abis.org+"),
    ("federal reserve", "Fed", "https://www.federalreserve.gov/search.htm?SearchTerms="),
    ("white house", "White House", "https://www.google.com/search?q=site%3Awhitehouse.gov+"),
    ("sec ", "SEC", "https://www.sec.gov/search-filings?q="),
]

_URL_RE = re.compile(r"https?://[^\s\]\)\"'<>]+", re.I)
_HANDLE_RE = re.compile(r"(?<![A-Za-z0-9_])@([A-Za-z0-9_]{1,30})")
_DATE_RE = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")


def extract_urls(text: str) -> list[str]:
    if not text:
        return []
    out: list[str] = []
    for m in _URL_RE.finditer(text):
        u = m.group(0).rstrip(".,;:)")
        if u not in out:
            out.append(u)
    return out


def extract_handles(text: str) -> list[str]:
    if not text:
        return []
    seen: list[str] = []
    for m in _HANDLE_RE.finditer(text):
        h = m.group(1)
        if h not in seen:
            seen.append(h)
    return seen


def _outlet_match(text_l: str) -> Optional[tuple[str, str]]:
    for token, label, base in _OUTLET_SEARCH:
        if token in text_l:
            return label, base
    return None


def resolve_source_hint(source_hint: Optional[str], *, title: str = "") -> dict[str, Any]:
    """Turn a free-text source_hint into display + urls + kind.

    kind: url | x_handle | outlet_search | plain | empty
    """
    raw = (source_hint or "").strip()
    if not raw:
        return {
            "display": None,
            "urls": [],
            "kind": "empty",
            "outlet": None,
            "query": None,
            "note_en": "No source citation provided by the model.",
            "note_ko": "모델이 출처를 제공하지 않았습니다.",
        }

    urls = extract_urls(raw)
    if urls:
        return {
            "display": raw,
            "urls": urls,
            "kind": "url",
            "outlet": None,
            "query": None,
            "note_en": "Direct link from source field (not verified).",
            "note_ko": "출처 필드 직접 링크 (기사 진위 미검증).",
        }

    handles = extract_handles(raw)
    if handles:
        x_urls = [f"https://x.com/{h}" for h in handles]
        return {
            "display": raw,
            "urls": x_urls,
            "kind": "x_handle",
            "outlet": "X",
            "query": None,
            "note_en": "Social handle link — primary source may be a post, not a wire article.",
            "note_ko": "소셜 핸들 링크 — 1차 출처가 포스트일 수 있음.",
        }

    text_l = raw.lower()
    outlet = _outlet_match(text_l)
    # Build searchable query from outlet strip + title keywords
    query_parts = [raw]
    if title:
        query_parts.append(title[:120])
    query = " ".join(query_parts)
    # Prefer outlet-specific search; always also offer Google News as second audit path
    urls_out: list[str] = []
    outlet_label = None
    if outlet:
        outlet_label, base = outlet
        urls_out.append(base + quote_plus(query[:180]))
    # Google News always as auditable fallback (honest: search, not claim of article)
    gnews = "https://news.google.com/search?q=" + quote_plus(query[:180])
    if gnews not in urls_out:
        urls_out.append(gnews)

    return {
        "display": raw,
        "urls": urls_out,
        "kind": "outlet_search" if outlet else "plain",
        "outlet": outlet_label,
        "query": query[:180],
        "note_en": (
            "Search deep-link for verification — not a single-article permalink. "
            "Cross-check before treating as primary source."
        ),
        "note_ko": (
            "검증용 검색 딥링크입니다 — 단일 기사 퍼머링크가 아닙니다. "
            "1차 근거로 쓰기 전 교차확인하세요."
        ),
    }


def resolve_news_source(source: Optional[str]) -> dict[str, Any]:
    """Resolve top_news.source (often @handles or outlet names)."""
    return resolve_source_hint(source, title="")


def enrich_global_issue(issue: dict) -> dict:
    """Attach source_urls + source_resolved without inventing fake article IDs."""
    if not isinstance(issue, dict):
        return issue
    out = dict(issue)
    # Keep collector-provided URLs if already present
    existing = out.get("source_urls")
    if isinstance(existing, list) and any(isinstance(u, str) and u.startswith("http") for u in existing):
        urls = [u for u in existing if isinstance(u, str) and u.startswith("http")]
        out["source_urls"] = urls
        out["source_resolved"] = {
            "display": out.get("source_hint"),
            "urls": urls,
            "kind": "url",
            "outlet": None,
            "query": None,
            "note_en": "URLs provided by collector payload.",
            "note_ko": "수집기 페이로드에 포함된 URL.",
        }
        return out

    title = out.get("title_en") or out.get("title_ko") or ""
    resolved = resolve_source_hint(out.get("source_hint"), title=str(title))
    out["source_urls"] = list(resolved.get("urls") or [])
    out["source_resolved"] = resolved
    return out


def enrich_briefing_citations(data: dict) -> dict:
    """Walk morning briefing global_context.issues and attach citation links."""
    if not isinstance(data, dict):
        return data
    out = dict(data)
    gc = out.get("global_context")
    if not isinstance(gc, dict):
        return out
    gc2 = dict(gc)
    issues = gc2.get("issues")
    if isinstance(issues, list):
        gc2["issues"] = [enrich_global_issue(i) if isinstance(i, dict) else i for i in issues]
    out["global_context"] = gc2
    return out


def enrich_top_news(top_news: Optional[dict]) -> Optional[dict]:
    if not isinstance(top_news, dict):
        return top_news
    out = dict(top_news)
    resolved = resolve_news_source(out.get("source"))
    out["source_urls"] = list(resolved.get("urls") or [])
    out["source_resolved"] = resolved
    return out


def enrich_sentiment_snapshot(snapshot: dict) -> dict:
    """Attach source_urls on market + per-symbol top_news."""
    if not isinstance(snapshot, dict):
        return snapshot
    out = dict(snapshot)
    # shape: available + latest-like nested, or flat market/symbols
    for key in ("market",):
        m = out.get(key)
        if isinstance(m, dict) and m.get("top_news"):
            m2 = dict(m)
            m2["top_news"] = enrich_top_news(m2.get("top_news"))
            out[key] = m2
    syms = out.get("symbols")
    if isinstance(syms, list):
        new_syms = []
        for s in syms:
            if not isinstance(s, dict):
                new_syms.append(s)
                continue
            s2 = dict(s)
            if s2.get("top_news"):
                s2["top_news"] = enrich_top_news(s2.get("top_news"))
            new_syms.append(s2)
        out["symbols"] = new_syms
    return out
