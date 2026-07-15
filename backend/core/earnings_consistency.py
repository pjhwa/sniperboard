"""Earnings calendar consistency — single source of truth for relative day language.

Problem:
  Collectors freeze phrases like "3일 후" / "earnings in 2 days" into AI text at
  generation time. Email/dashboard then mix briefing (KST) + earnings JSON (stale
  days_until) + wall-clock, producing contradictory TSM/TSLA/etc. statements.

Solution:
  1. Absolute earnings_date is authoritative.
  2. days_until is always recomputed at serve/display time (US/Eastern calendar day
     for US equity event timing; matches when the report typically drops).
  3. AI free-text is scrubbed of conflicting relative-day phrases and rewritten
     to the live relative form + absolute date.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any, Iterable, Optional
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
KST = ZoneInfo("Asia/Seoul")

# US mega-cap earnings almost never more than ~90d out for our watchlist window
_MAX_UPCOMING_DAYS = 45
_MAX_RECENT_PAST_DAYS = 14

_OUTCOME_LABELS = {
    "no_change": ("동결", "No change"),
    "cut_25bps": ("25bp 인하", "Cut 25bp"),
    "cut_50bps": ("50bp+ 인하", "Cut 50bp+"),
    "hike_25bps": ("25bp 인상", "Hike 25bp"),
    "hike_50bps": ("50bp+ 인상", "Hike 50bp+"),
}


def parse_iso_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    s = str(value).strip()[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


def today_in_tz(tz: ZoneInfo = ET, as_of: Optional[datetime] = None) -> date:
    if as_of is None:
        as_of = datetime.now(tz)
    elif as_of.tzinfo is None:
        as_of = as_of.replace(tzinfo=timezone_utc())
    return as_of.astimezone(tz).date()


def timezone_utc() -> ZoneInfo:
    return ZoneInfo("UTC")


def days_until(earnings_date: Any, *, as_of: Optional[datetime] = None, tz: ZoneInfo = ET) -> Optional[int]:
    """Calendar days from 'today' in tz to earnings_date. Negative = already past."""
    ed = parse_iso_date(earnings_date)
    if ed is None:
        return None
    return (ed - today_in_tz(tz, as_of)).days


def relevance_tier(days: Optional[int]) -> Optional[str]:
    if days is None or days < 0:
        return None
    if days <= 7:
        return "imminent"
    if days <= 21:
        return "approaching"
    if days <= 30:
        return "watching"
    return None


def format_relative(days: Optional[int], locale: str = "ko") -> str:
    if days is None:
        return ""
    if locale == "ko":
        if days < 0:
            return f"{abs(days)}일 전 발표"
        if days == 0:
            return "오늘 발표"
        if days == 1:
            return "내일 발표"
        return f"{days}일 후 발표"
    if days < 0:
        return f"reported {abs(days)}d ago"
    if days == 0:
        return "reports today"
    if days == 1:
        return "reports tomorrow"
    return f"in {days} days"


def format_absolute(earnings_date: Any, locale: str = "ko") -> str:
    ed = parse_iso_date(earnings_date)
    if ed is None:
        return ""
    if locale == "ko":
        return f"{ed.month}월 {ed.day}일"
    return ed.strftime("%b %d")


def build_calendar(items: Iterable[dict], *, as_of: Optional[datetime] = None) -> dict[str, date]:
    """symbol → absolute earnings_date from structured upcoming list."""
    cal: dict[str, date] = {}
    for it in items or []:
        if not isinstance(it, dict):
            continue
        sym = str(it.get("symbol") or "").upper().strip()
        ed = parse_iso_date(it.get("earnings_date") or it.get("report_date"))
        if sym and ed:
            cal[sym] = ed
    return cal


def refresh_upcoming_earnings(
    items: list[dict] | None,
    *,
    as_of: Optional[datetime] = None,
    tz: ZoneInfo = ET,
    max_days: int = _MAX_UPCOMING_DAYS,
) -> list[dict]:
    """Return a new list with live days_until / relevance_tier; drop far-past events."""
    out: list[dict] = []
    for it in items or []:
        if not isinstance(it, dict):
            continue
        row = dict(it)
        ed = parse_iso_date(row.get("earnings_date"))
        d = days_until(ed, as_of=as_of, tz=tz) if ed else None
        if d is None:
            out.append(row)
            continue
        # "Upcoming" is future-only — past events belong in recent_results
        if d < 0:
            continue
        if d > max_days:
            continue
        row["days_until"] = d
        tier = relevance_tier(d)
        if tier:
            row["relevance_tier"] = tier
        # Rewrite AI summary relative phrases for this symbol
        for k in ("ai_summary_en", "ai_summary_ko", "ai_summary", "action_note_en", "action_note_ko", "action_note"):
            if row.get(k):
                row[k] = sanitize_text_for_symbol(
                    str(row[k]),
                    symbol=str(row.get("symbol") or ""),
                    earnings_date=ed,
                    days=d,
                    locale="ko" if k.endswith("_ko") or (k == "ai_summary" and _looks_korean(str(row[k]))) else "en",
                )
        out.append(row)
    out.sort(key=lambda r: (r.get("days_until") is None, r.get("days_until") if r.get("days_until") is not None else 999))
    return out


def _looks_korean(text: str) -> bool:
    return bool(re.search(r"[\uac00-\ud7a3]", text or ""))


# Patterns that freeze relative earnings timing in free text
_RE_KO_IN_DAYS = re.compile(
    r"(?P<prefix>(?:실적|어닝|earnings)?\s*)"
    r"(?P<n>\d+)\s*일\s*후"
    r"(?P<suffix>\s*(?:실적|발표|어닝)?)",
    re.IGNORECASE,
)
_RE_KO_IN_DAYS_ALT = re.compile(r"(?P<n>\d+)\s*일\s*뒤\s*(?:실적|발표)?")
_RE_EN_IN_DAYS = re.compile(
    r"(?:earnings\s+in\s+|in\s+)(?P<n>\d+)\s*days?(?:\s+with\s+earnings)?",
    re.IGNORECASE,
)
_RE_KO_TODAY_REPORTED = re.compile(
    r"(?:오늘\s*)?(?:미국\s*)?장\s*마감\s*후\s*실적\s*발표(?:됨|됩니다|예정)?",
)
_RE_EN_ALREADY = re.compile(
    r"already\s+reported(?:\s+after\s+(?:the\s+)?US\s+close)?",
    re.IGNORECASE,
)
_RE_KO_TODAY_EARN = re.compile(r"오늘\s*(?:실적|어닝)\s*(?:발표)?(?:\s*예정)?")
_RE_EN_TODAY_EARN = re.compile(r"earnings\s+today|reports?\s+today", re.IGNORECASE)
_RE_KO_TOMORROW = re.compile(r"내일\s*(?:실적|어닝|발표)")
_RE_EN_TOMORROW = re.compile(r"earnings\s+tomorrow|reports?\s+tomorrow", re.IGNORECASE)


def sanitize_text_for_symbol(
    text: str,
    *,
    symbol: str,
    earnings_date: Any,
    days: Optional[int],
    locale: str = "ko",
) -> str:
    """Fix relative-day language for one symbol given live days_until."""
    if not text:
        return text
    ed = parse_iso_date(earnings_date)
    abs_s = format_absolute(ed, locale) if ed else ""
    rel = format_relative(days, locale)

    # If text doesn't mention this symbol or earnings, still fix generic "N일 후 실적" when alone
    out = text

    if days is not None and days > 0:
        # Remove false "already reported today" claims
        out = _RE_KO_TODAY_REPORTED.sub(f"{abs_s} 실적 예정({rel})", out)
        out = _RE_EN_ALREADY.sub(f"earnings scheduled {abs_s} ({rel})", out)
        out = _RE_KO_TODAY_EARN.sub(f"{abs_s} 실적({rel})", out)
        out = _RE_EN_TODAY_EARN.sub(f"earnings {abs_s} ({rel})", out)

        def _ko_sub(m: re.Match) -> str:
            return f"{m.group('prefix') or ''}{days}일 후{m.group('suffix') or ''}"

        out = _RE_KO_IN_DAYS.sub(_ko_sub, out)
        out = _RE_KO_IN_DAYS_ALT.sub(f"{days}일 후", out)
        out = _RE_EN_IN_DAYS.sub(f"in {days} days", out)
        if days != 1:
            out = _RE_KO_TOMORROW.sub(f"{abs_s} 실적({rel})", out)
            out = _RE_EN_TOMORROW.sub(f"earnings {abs_s} ({rel})", out)
    elif days is not None and days == 0:
        out = _RE_KO_IN_DAYS.sub("오늘 실적 발표", out)
        out = _RE_EN_IN_DAYS.sub("earnings today", out)
    elif days is not None and days < 0:
        # Past: force reported language, kill "N days later"
        out = _RE_KO_IN_DAYS.sub("이미 발표된 실적", out)
        out = _RE_EN_IN_DAYS.sub("already reported", out)
        if locale == "ko" and not _RE_KO_TODAY_REPORTED.search(out) and "발표" in out:
            pass

    # Prefer absolute date when we have it and text mentions relative-only without date
    if ed and abs_s and symbol and symbol.upper() in out.upper():
        # Ensure absolute date appears near earnings mention for this symbol
        if abs_s not in out and re.search(r"실적|earnings|발표", out, re.I):
            if locale == "ko":
                out = re.sub(
                    rf"({re.escape(symbol)})",
                    rf"\1({abs_s})",
                    out,
                    count=1,
                    flags=re.I,
                )

    return out


def sanitize_free_text(
    text: str,
    calendar: dict[str, date],
    *,
    as_of: Optional[datetime] = None,
    locale: str = "ko",
) -> str:
    """Sanitize multi-symbol free text (checkpoints, alerts, bullets)."""
    if not text:
        return text
    out = text
    # Symbol-scoped replacements first
    for sym, ed in calendar.items():
        d = days_until(ed, as_of=as_of)
        # Patterns like "TSM 7월 16일 실적(2일 후)" or "TSM ... 3일 후"
        if locale == "ko":
            # (N일 후) near symbol
            out = re.sub(
                rf"({re.escape(sym)})([^。.\n]{{0,40}}?)\((\d+)\s*일\s*후\)",
                lambda m, _d=d, _ed=ed: f"{m.group(1)}{m.group(2)}({format_relative(_d, 'ko').replace(' 발표','')})",
                out,
                flags=re.I,
            )
            out = re.sub(
                rf"({re.escape(sym)})([^。.\n]{{0,60}}?)(\d+)\s*일\s*후\s*실적",
                lambda m, _d=d: f"{m.group(1)}{m.group(2)}{format_relative(_d, 'ko').replace(' 발표',' 실적') if _d is not None else m.group(0)}",
                out,
                flags=re.I,
            )
            # False already-reported for future dates
            if d is not None and d > 0:
                out = re.sub(
                    rf"{re.escape(sym)}\s*오늘\s*미국\s*장\s*마감\s*후\s*실적\s*발표됨"
                    rf"[^;。\n]*",
                    f"{sym} {format_absolute(ed, 'ko')} 실적 예정({format_relative(d, 'ko')}"
                    + (f", EPS 일정 확인" if "EPS" in text else "")
                    + ")",
                    out,
                    flags=re.I,
                )
        else:
            out = re.sub(
                rf"({re.escape(sym)})([^.\n]{{0,40}}?)in\s+(\d+)\s*days?",
                lambda m, _d=d: f"{m.group(1)}{m.group(2)}in {_d} days" if _d is not None else m.group(0),
                out,
                flags=re.I,
            )
        out = sanitize_text_for_symbol(out, symbol=sym, earnings_date=ed, days=d, locale=locale)
    return out


def rebuild_earnings_alert(
    calendar_items: list[dict],
    *,
    as_of: Optional[datetime] = None,
    locale: str = "ko",
    max_items: int = 8,
) -> str:
    """Mechanical earnings alert from live calendar — replaces AI-stale earnings_alert."""
    parts: list[str] = []
    for it in calendar_items:
        if not isinstance(it, dict):
            continue
        sym = it.get("symbol")
        ed = it.get("earnings_date")
        d = it.get("days_until")
        if d is None:
            d = days_until(ed, as_of=as_of)
        if d is None or d > 14:
            continue
        eps = it.get("eps_estimate")
        abs_s = format_absolute(ed, locale)
        rel = format_relative(d, locale)
        if locale == "ko":
            if d < 0:
                seg = f"{sym} {abs_s} 실적 발표됨"
            elif d == 0:
                seg = f"{sym} 오늘({abs_s}) 실적 발표"
            else:
                seg = f"{sym} {abs_s} 실적 ({rel})"
            if eps is not None:
                seg += f" · EPS 추정 ${eps}"
        else:
            if d < 0:
                seg = f"{sym} reported {abs_s}"
            elif d == 0:
                seg = f"{sym} reports today ({abs_s})"
            else:
                seg = f"{sym} {abs_s} ({rel})"
            if eps is not None:
                seg += f" · EPS est ${eps}"
        parts.append(seg)
        if len(parts) >= max_items:
            break
    return "; ".join(parts)


def sanitize_checkpoint_list(
    items: list[str] | None,
    calendar: dict[str, date],
    *,
    as_of: Optional[datetime] = None,
    locale: str = "ko",
) -> list[str]:
    out = []
    for raw in items or []:
        if not raw:
            continue
        cleaned = sanitize_free_text(str(raw), calendar, as_of=as_of, locale=locale)
        # Drop checkpoints that only restate earnings we already show in calendar
        if _is_pure_earnings_restatement(cleaned, calendar):
            continue
        out.append(cleaned)
    return out


def _is_pure_earnings_restatement(text: str, calendar: dict[str, date]) -> bool:
    """True if bullet is mostly just 'SYM earnings in N days' with no extra actionable content."""
    t = text.strip()
    if len(t) > 80:
        return False
    for sym in calendar:
        if re.fullmatch(
            rf"{re.escape(sym)}\s*.{{0,20}}(실적|earnings).{{0,40}}",
            t,
            flags=re.I,
        ):
            return True
    return False


def dedupe_strings(items: list[str] | None, *, min_len: int = 12) -> list[str]:
    """Drop near-duplicate strings (prefix/containment)."""
    cleaned: list[str] = []
    norms: list[str] = []
    for raw in items or []:
        s = " ".join(str(raw).split())
        if not s:
            continue
        n = re.sub(r"\s+", "", s.lower())
        n = re.sub(r"[^\w\uac00-\ud7a3]", "", n)
        dup = False
        for prev in norms:
            if n == prev:
                dup = True
                break
            if len(n) >= min_len and len(prev) >= min_len:
                if n in prev or prev in n:
                    dup = True
                    break
                # high character overlap
                inter = len(set(n) & set(prev))
                if inter / max(len(set(n)), 1) > 0.85 and abs(len(n) - len(prev)) < 20:
                    dup = True
                    break
        if not dup:
            cleaned.append(s)
            norms.append(n)
    return cleaned


def sanitize_briefing_payload(
    briefing_data: dict,
    earnings_upcoming: list[dict] | None,
    *,
    as_of: Optional[datetime] = None,
    locale: str = "ko",
) -> dict:
    """Return a deep-copied briefing dict with live-consistent earnings language."""
    import copy

    data = copy.deepcopy(briefing_data) if briefing_data else {}
    refreshed = refresh_upcoming_earnings(earnings_upcoming or [], as_of=as_of)
    calendar = build_calendar(refreshed, as_of=as_of)

    # Rebuild mechanical earnings alert (authoritative)
    alert = rebuild_earnings_alert(refreshed, as_of=as_of, locale=locale)
    if locale == "ko":
        data["earnings_alert_ko"] = alert
        # Keep en in sync if present
        data["earnings_alert_en"] = rebuild_earnings_alert(refreshed, as_of=as_of, locale="en")
    else:
        data["earnings_alert_en"] = alert

    for key_ko, key_en in (
        ("today_checkpoints_ko", "today_checkpoints_en"),
        ("executive_bullets_ko", "executive_bullets_en"),
    ):
        if data.get(key_ko):
            data[key_ko] = dedupe_strings(
                sanitize_checkpoint_list(data.get(key_ko), calendar, as_of=as_of, locale="ko")
            )
        if data.get(key_en):
            data[key_en] = dedupe_strings(
                sanitize_checkpoint_list(data.get(key_en), calendar, as_of=as_of, locale="en")
            )

    for field in ("headline_ko", "headline_en"):
        if data.get(field):
            loc = "ko" if field.endswith("_ko") else "en"
            data[field] = sanitize_free_text(str(data[field]), calendar, as_of=as_of, locale=loc)

    # Watchlist + spotlight analyses
    for w in data.get("watchlist") or []:
        if not isinstance(w, dict):
            continue
        sym = str(w.get("symbol") or "").upper()
        ed = calendar.get(sym)
        d = days_until(ed, as_of=as_of) if ed else None
        for k in ("analysis_ko", "analysis_en", "analysis"):
            if w.get(k):
                loc = "ko" if k.endswith("_ko") or (k == "analysis" and _looks_korean(str(w[k]))) else "en"
                if ed:
                    w[k] = sanitize_text_for_symbol(str(w[k]), symbol=sym, earnings_date=ed, days=d, locale=loc)
                else:
                    # No earnings in calendar within window — strip false earnings timing claims
                    w[k] = _strip_unscheduled_earnings_claims(str(w[k]), sym)
        reconcile_sentiment_mood_with_session(w)

    for s in data.get("spotlight") or []:
        if not isinstance(s, dict):
            continue
        sym = str(s.get("symbol") or "").upper()
        ed = calendar.get(sym)
        d = days_until(ed, as_of=as_of) if ed else None
        for k in ("why_ko", "why_en", "watch_level_ko", "watch_level_en"):
            if s.get(k):
                loc = "ko" if k.endswith("_ko") else "en"
                if ed:
                    s[k] = sanitize_text_for_symbol(str(s[k]), symbol=sym, earnings_date=ed, days=d, locale=loc)
        reconcile_sentiment_mood_with_session(s)

    # Attach live calendar for consumers that want structured data
    data["_earnings_calendar"] = refreshed
    return data


def _parse_session_change_pct(text: str) -> Optional[float]:
    """Extract first signed session % move from analysis prose (e.g. -3.52%)."""
    if not text:
        return None
    m = re.search(r"(?<![A-Za-z0-9])([+-]?\d+(?:\.\d+)?)\s*%", text)
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def reconcile_sentiment_mood_with_session(item: dict, *, hard_drop: float = -3.0) -> dict:
    """Downgrade bullish social mood labels when the same text reports a sharp session decline.

    Does NOT feed price direction into Grok (post-hoc display coherence only).
    Reliability audit 2026-07-14: 8 names showed optimistic mood with ≤−3% day.
    """
    if not isinstance(item, dict):
        return item
    mood = str(item.get("sentiment_mood") or "").lower().strip()
    if mood not in ("optimistic", "euphoric"):
        return item
    blob = " ".join(
        str(item.get(k) or "")
        for k in ("analysis_ko", "analysis_en", "analysis", "why_ko", "why_en")
    )
    chg = _parse_session_change_pct(blob)
    if chg is None or chg > hard_drop:
        return item
    # Sharp down day: social residue must not read as risk-on
    new_mood = "fearful" if chg <= -8.0 else "cautious"
    item["sentiment_mood"] = new_mood
    item["sentiment_mood_adjusted"] = True
    item["sentiment_mood_prev"] = mood
    return item


def _strip_unscheduled_earnings_claims(text: str, symbol: str) -> str:
    if not text:
        return text
    # Remove sentences that claim imminent earnings without calendar entry
    parts = re.split(r"(?<=[.。!!?])\s+", text)
    kept = []
    for p in parts:
        if re.search(r"실적|earnings|어닝", p, re.I) and re.search(
            r"\d+\s*일\s*후|in\s+\d+\s*days|오늘.*발표|tomorrow|today", p, re.I
        ):
            continue
        kept.append(p)
    return " ".join(kept).strip() or text


def _norm_key(s: str) -> str:
    n = re.sub(r"\s+", "", (s or "").lower())
    return re.sub(r"[^\w\uac00-\ud7a3]", "", n)


def text_overlaps(a: str, b: str, *, min_len: int = 24, ratio: float = 0.72) -> bool:
    """True if a and b are near-duplicates (containment or high char overlap)."""
    na, nb = _norm_key(a), _norm_key(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    if len(na) >= min_len and len(nb) >= min_len:
        if na in nb or nb in na:
            return True
        sa, sb = set(na), set(nb)
        inter = len(sa & sb)
        if inter / max(len(sa), 1) >= ratio and abs(len(na) - len(nb)) < max(40, len(na) // 3):
            return True
    return False


def dedupe_against_corpus(items: list[str] | None, corpus: list[str] | None) -> list[str]:
    """Drop items that substantially restate anything already in corpus."""
    out: list[str] = []
    corp = [c for c in (corpus or []) if c]
    for raw in items or []:
        s = " ".join(str(raw).split())
        if not s:
            continue
        if any(text_overlaps(s, c) for c in corp):
            continue
        if any(text_overlaps(s, prev) for prev in out):
            continue
        out.append(s)
    return out


def prepare_email_sections(
    briefing_data: dict,
    upcoming_earnings: list[dict] | None,
    *,
    as_of: Optional[datetime] = None,
    locale: str = "ko",
) -> dict:
    """Sanitize briefing + cross-section dedupe for morning email.

    Priority of unique content (later sections drop restatements of earlier):
      1. Structured upcoming_earnings (mechanical SoT for dates)
      2. headline / executive_bullets
      3. today_checkpoints (earnings-only bullets dropped)
      4. earnings_alert — omitted when structured calendar is present
      5. spotlight / morning watchlist analyses (sanitized, not dropped for length)
    """
    refreshed = refresh_upcoming_earnings(upcoming_earnings or [], as_of=as_of)
    cleaned = sanitize_briefing_payload(
        briefing_data or {}, refreshed, as_of=as_of, locale=locale
    )

    # Prefer structured calendar: drop free-text alert when we have rows
    if refreshed:
        cleaned["earnings_alert_ko"] = ""
        cleaned["earnings_alert_en"] = ""
        cleaned["earnings_alert"] = ""

    # Build corpus of already-covered phrases (earnings mechanical lines + headline)
    corpus: list[str] = []
    for it in refreshed:
        sym = it.get("symbol", "")
        ed = it.get("earnings_date")
        d = it.get("days_until")
        if sym:
            corpus.append(f"{sym} {format_absolute(ed, 'ko')} {format_relative(d, 'ko')}")
            corpus.append(f"{sym} {format_absolute(ed, 'en')} {format_relative(d, 'en')}")
        for k in ("ai_summary_ko", "ai_summary_en", "action_note_ko", "action_note_en"):
            if it.get(k):
                corpus.append(str(it[k]))

    headline = cleaned.get("headline_ko") or cleaned.get("headline_en") or ""
    if headline:
        corpus.append(str(headline))

    for key in ("executive_bullets_ko", "executive_bullets_en"):
        if cleaned.get(key):
            cleaned[key] = dedupe_strings(list(cleaned[key]))
            corpus.extend(cleaned[key])

    for key in ("today_checkpoints_ko", "today_checkpoints_en"):
        if cleaned.get(key):
            # Drop pure earnings restatements + anything already in exec bullets/calendar
            cleaned[key] = dedupe_against_corpus(cleaned[key], corpus)
            corpus.extend(cleaned[key])

    # Spotlight: if same symbol appears in watchlist with near-identical why/analysis, keep spotlight why only once
    wl_by_sym: dict[str, str] = {}
    for w in cleaned.get("watchlist") or []:
        if isinstance(w, dict) and w.get("symbol"):
            text = w.get("analysis_ko") or w.get("analysis_en") or w.get("analysis") or ""
            wl_by_sym[str(w["symbol"]).upper()] = str(text)

    for s in cleaned.get("spotlight") or []:
        if not isinstance(s, dict):
            continue
        sym = str(s.get("symbol") or "").upper()
        wl_text = wl_by_sym.get(sym, "")
        for k in ("why_ko", "why_en"):
            if s.get(k) and wl_text and text_overlaps(str(s[k]), wl_text, min_len=40):
                # Keep spotlight short — strip if it's just a restatement of watchlist analysis
                if len(str(s[k])) > 40 and _norm_key(str(s[k])) in _norm_key(wl_text):
                    s[k] = ""

    cleaned["_earnings_calendar"] = refreshed
    return cleaned
