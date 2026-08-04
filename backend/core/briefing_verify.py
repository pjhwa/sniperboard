"""Phase B1 — mechanical integrity checks for morning briefing snapshots.

Pure functions: no network. Used by unit tests, consumer annotate path, and
mirrors rules expected in market-sentiment-data verify_briefing.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from typing import Any, Optional


@dataclass
class VerifyIssue:
    code: str
    message: str
    severity: str = "fail"  # fail | warn


@dataclass
class VerifyResult:
    passed: bool
    issues: list[VerifyIssue] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "passed": self.passed,
            "issues": [asdict(i) for i in self.issues],
            "fail_count": sum(1 for i in self.issues if i.severity == "fail"),
            "warn_count": sum(1 for i in self.issues if i.severity == "warn"),
        }


def parse_iso_date(s: Any) -> Optional[date]:
    if not s:
        return None
    try:
        return datetime.strptime(str(s)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def build_calendar(upcoming: list[dict] | None) -> dict[str, date]:
    cal: dict[str, date] = {}
    for it in upcoming or []:
        if not isinstance(it, dict):
            continue
        sym = str(it.get("symbol") or "").upper()
        ed = parse_iso_date(it.get("earnings_date") or it.get("report_date"))
        if sym and ed:
            cal[sym] = ed
    return cal


_RE_KO_DAYS = re.compile(
    r"(?P<sym>[A-Z]{1,5})\s*(?:[^\n]{0,30}?)(?P<n>\d+)\s*일\s*후",
    re.I,
)
_RE_KO_ALREADY = re.compile(
    r"(?P<sym>[A-Z]{1,5})\s*[^\n]{0,40}?오늘\s*(?:미국\s*)?장\s*마감\s*후\s*실적\s*발표됨",
    re.I,
)
_RE_PRICE = re.compile(r"\$([0-9]{2,5}(?:\.[0-9]+)?)")
_RE_SESSION_PCT = re.compile(r"(?<![A-Za-z0-9])([+-]?\d+(?:\.\d+)?)\s*%")


def check_relative_earnings_vs_calendar(
    briefing: dict,
    calendar: dict[str, date],
    *,
    as_of: Optional[date] = None,
) -> list[VerifyIssue]:
    """Fail when free text claims wrong relative day or already-reported for future dates."""
    issues: list[VerifyIssue] = []
    today = as_of or date.today()
    texts: list[str] = []
    for k in ("earnings_alert_ko", "earnings_alert_en", "headline_ko", "headline_en"):
        if briefing.get(k):
            texts.append(str(briefing[k]))
    for lst_key in ("today_checkpoints_ko", "today_checkpoints_en", "executive_bullets_ko", "executive_bullets_en"):
        for item in briefing.get(lst_key) or []:
            texts.append(str(item))
    for w in briefing.get("watchlist") or []:
        if isinstance(w, dict):
            for k in ("analysis_ko", "analysis_en", "analysis"):
                if w.get(k):
                    texts.append(str(w[k]))
    blob = "\n".join(texts)

    for m in _RE_KO_ALREADY.finditer(blob):
        sym = m.group("sym").upper()
        ed = calendar.get(sym)
        if ed and ed > today:
            issues.append(VerifyIssue(
                "B1-rel-already",
                f"{sym}: text says already reported but earnings_date {ed} is still future",
            ))

    for m in _RE_KO_DAYS.finditer(blob):
        sym = m.group("sym").upper()
        claimed = int(m.group("n"))
        ed = calendar.get(sym)
        if not ed:
            continue
        live = (ed - today).days
        if live >= 0 and abs(claimed - live) > 1:
            issues.append(VerifyIssue(
                "B1-rel-day",
                f"{sym}: text says {claimed}일 후 but calendar says {live} days (date={ed})",
            ))
    return issues


def check_mood_vs_session_drop(briefing: dict, *, hard_drop: float = -3.0) -> list[VerifyIssue]:
    """Fail when sentiment_mood is optimistic/euphoric but analysis shows ≤ hard_drop %."""
    issues: list[VerifyIssue] = []
    for w in briefing.get("watchlist") or []:
        if not isinstance(w, dict):
            continue
        mood = str(w.get("sentiment_mood") or "").lower()
        if mood not in ("optimistic", "euphoric"):
            continue
        text = " ".join(str(w.get(k) or "") for k in ("analysis_ko", "analysis_en", "analysis"))
        m = _RE_SESSION_PCT.search(text)
        if not m:
            continue
        chg = float(m.group(1))
        if chg <= hard_drop:
            issues.append(VerifyIssue(
                "B1-mood-drop",
                f"{w.get('symbol')}: mood={mood} but session move {chg}% ≤ {hard_drop}%",
            ))
    return issues


def check_price_binding(
    briefing: dict,
    price_table: dict[str, float] | None,
    *,
    tol_pct: float = 0.03,
) -> list[VerifyIssue]:
    """Fail when analysis price differs from binding table by > tol_pct."""
    issues: list[VerifyIssue] = []
    if not price_table:
        return issues
    for w in briefing.get("watchlist") or []:
        if not isinstance(w, dict):
            continue
        sym = str(w.get("symbol") or "").upper()
        truth = price_table.get(sym)
        if truth is None:
            continue
        text = " ".join(str(w.get(k) or "") for k in ("analysis_ko", "analysis_en", "analysis"))
        m = _RE_PRICE.search(text)
        if not m:
            continue
        claimed = float(m.group(1))
        if truth <= 0:
            continue
        if abs(claimed - truth) / truth > tol_pct:
            issues.append(VerifyIssue(
                "B1-price-bind",
                f"{sym}: analysis price ${claimed} vs table ${truth:.2f} (>{tol_pct*100:.0f}%)",
            ))
    return issues


# ── Phase B2: cross-section consistency (no ticker/theme hardcodes) ───────
#
# First principles: the payload must not contradict itself.
# - If global_context.asymmetric_impact labels T unaffected for issue I,
#   the headline must not co-bind T's move to I's own wording.
# - Session evidence (post/pre % or session-event language in the *same*
#   snapshot) strengthens the fail; applies to every ticker/issue pair.
# Theme match uses lexical overlap with the issue's own titles/summaries only
# — never a fixed dictionary of macro topic phrases.

_RE_UNAFFECTED = re.compile(
    r"\b([A-Z]{1,5})\s*:\s*"
    r"(unaffected|not\s+affected|no\s+direct\s+impact|no\s+impact|영향\s*없음|무관|해당\s*없음)",
    re.I,
)
_RE_POST_PCT = re.compile(
    r"(?:post[- ]?market|pre[- ]?market|after[- ]?hours|개장\s*전|장\s*마감\s*후)[^\n%]{0,48}?"
    r"([+-]?\d+(?:\.\d+)?)\s*%",
    re.I,
)
# Generic session-event language (not a list of companies or macro themes).
_RE_SESSION_EVENT = re.compile(
    r"(post[- ]?earnings|earnings\s+beat|earnings\s+miss|earnings\s+surge|"
    r"실적\s*(상회|하회|호조|서프라이즈|급등|발표)|"
    r"guidance\s+(raise|cut)|가이던스\s*(상향|하향))",
    re.I,
)
_RE_SESSION_ANCHOR = re.compile(
    r"(post[- ]?market|pre[- ]?market|after[- ]?hours|earnings|closed?\s+at|"
    r"surge|selloff|rally|급등|급락|실적|종가|애프터|프리마켓|개장\s*전|"
    r"[+-]?\d+(?:\.\d+)?\s*%|\d{4}-\d{2}-\d{2})",
    re.I,
)
_RE_EVERGREEN = re.compile(
    r"\b(linger(?:s|ing)?|remain(?:s|ing)?|ongoing|persist(?:s|ing)?|"
    r"continues?\s+to|still\s+a\s+risk)\b|지속|여전|상존|리스크\s*속",
    re.I,
)

# Tokens too generic to count as "headline binds this issue".
_LEXICAL_STOP = frozenset({
    "with", "from", "that", "this", "have", "will", "into", "over", "under",
    "risk", "risks", "market", "markets", "stocks", "stock", "today", "after",
    "before", "while", "amid", "sets", "tone", "jump", "jumps", "surge", "surges",
    "still", "remain", "remains", "ongoing", "update", "report", "reports",
    "us", "china", "global", "major", "early", "latest", "shift", "shifts",
    "급등", "급락", "시장", "리스크", "오늘", "전일", "속", "중", "및", "대한",
})


def _headline_blob(briefing: dict) -> str:
    return f"{briefing.get('headline_en') or ''} {briefing.get('headline_ko') or ''}"


def _tokenize_tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z]{3,}|[가-힣]{2,}", (text or "").lower()))


def _issue_title_tokens(issue: dict) -> set[str]:
    """Title-only tokens (used for day-to-day similarity, not fixed themes)."""
    t = f"{issue.get('title_en') or ''} {issue.get('title_ko') or ''}"
    return _tokenize_tokens(t)


def _issue_content_tokens(issue: dict) -> set[str]:
    """Issue-owned wording only — never a category keyword dictionary."""
    parts: list[str] = []
    for k in (
        "title_en", "title_ko", "summary_en", "summary_ko",
        "current_state_en", "current_state_ko",
    ):
        if issue.get(k):
            parts.append(str(issue[k]))
    return _tokenize_tokens(" ".join(parts))


def parse_unaffected_tickers(*texts: str) -> set[str]:
    """Tickers explicitly labeled unaffected / 영향 없음 in asymmetric_impact text."""
    found: set[str] = set()
    for text in texts:
        if not text:
            continue
        for m in _RE_UNAFFECTED.finditer(str(text)):
            found.add(m.group(1).upper())
    return found


def _token_hits(a: set[str], b: set[str]) -> set[str]:
    """Equality or substring containment (handles 수출 ⊂ 수출통제)."""
    hits: set[str] = set()
    for x in a:
        if x in _LEXICAL_STOP:
            continue
        for y in b:
            if y in _LEXICAL_STOP:
                continue
            if x == y or (len(x) >= 2 and len(y) >= 2 and (x in y or y in x)):
                hits.add(x)
                break
    return hits


def headline_binds_issue(headline: str, issue: dict) -> bool:
    """True if the headline lexically references this issue's own content.

    Pure consistency signal: no hard-coded macro theme dictionary.
    """
    ht = _tokenize_tokens(headline)
    it = _issue_content_tokens(issue)
    if not ht or not it:
        return False
    hits = _token_hits(ht, it)
    if len(hits) >= 2:
        return True
    # Single distinctive multi-char hit (e.g. shared rare token)
    if any(len(h) >= 4 for h in hits):
        return True
    return False


def _ticker_in_headline(headline: str, sym: str) -> bool:
    return bool(re.search(rf"\b{re.escape(sym)}\b", headline, re.I))


def _session_catalyst_for_symbol(briefing: dict, sym: str) -> dict[str, Any]:
    """Detect same-snapshot session evidence for *any* symbol (not theme-specific)."""
    out: dict[str, Any] = {
        "post_pct": None,
        "has_session_event_language": False,
        "texts": [],
    }
    blobs: list[str] = []
    for block_key in ("spotlight", "watchlist"):
        for row in briefing.get(block_key) or []:
            if not isinstance(row, dict):
                continue
            if str(row.get("symbol") or "").upper() != sym:
                continue
            # Prefer structured numeric fields when present (schema-forward).
            for pk in ("post_market_pct", "pre_market_pct", "post_pct", "pre_pct"):
                if row.get(pk) is not None and out["post_pct"] is None:
                    try:
                        out["post_pct"] = float(row[pk])
                    except (TypeError, ValueError):
                        pass
            for k in (
                "why_en", "why_ko", "analysis_en", "analysis_ko", "analysis",
            ):
                if row.get(k):
                    blobs.append(str(row[k]))
    text = "\n".join(blobs)
    out["texts"] = blobs
    if out["post_pct"] is None:
        m = _RE_POST_PCT.search(text)
        if m:
            try:
                out["post_pct"] = float(m.group(1))
            except ValueError:
                pass
    if _RE_SESSION_EVENT.search(text):
        out["has_session_event_language"] = True
    # Absolute earnings alert / checkpoints naming the symbol (any date)
    alert = " ".join(
        str(briefing.get(k) or "")
        for k in (
            "earnings_alert_en", "earnings_alert_ko",
            "today_checkpoints_en", "today_checkpoints_ko",
        )
    )
    # checkpoints may be lists
    for lk in ("today_checkpoints_en", "today_checkpoints_ko"):
        for item in briefing.get(lk) or []:
            alert += " " + str(item)
    if re.search(rf"\b{re.escape(sym)}\b", alert, re.I) and re.search(
        r"earnings|실적", alert, re.I
    ):
        out["has_session_event_language"] = True
    return out


def check_false_catalyst_attribution(briefing: dict) -> list[VerifyIssue]:
    """Internal consistency: headline must not attribute ticker T to issue I when
    I.asymmetric_impact marks T unaffected (optionally reinforced by same-snapshot
    session evidence for T). Applies to every ticker/issue pair — no allowlists.
    """
    issues: list[VerifyIssue] = []
    headline = _headline_blob(briefing)
    if not headline.strip():
        return issues

    gc_issues = (briefing.get("global_context") or {}).get("issues") or []
    for iss in gc_issues:
        if not isinstance(iss, dict):
            continue
        unaff = parse_unaffected_tickers(
            str(iss.get("asymmetric_impact_en") or ""),
            str(iss.get("asymmetric_impact_ko") or ""),
        )
        if not unaff:
            continue
        if not headline_binds_issue(headline, iss):
            continue
        cat = iss.get("category") or "?"
        for sym in sorted(unaff):
            if not _ticker_in_headline(headline, sym):
                continue
            cat_ev = _session_catalyst_for_symbol(briefing, sym)
            post = cat_ev.get("post_pct")
            strong = (
                (post is not None and abs(float(post)) >= 5.0)
                or cat_ev.get("has_session_event_language")
            )
            if strong:
                issues.append(VerifyIssue(
                    "B2-false-catalyst",
                    (
                        f"{sym}: headline co-binds to global issue ({cat}) that marks "
                        f"{sym} unaffected; same snapshot has session evidence "
                        f"post/pre_pct={post} session_event={cat_ev.get('has_session_event_language')}"
                    ),
                    severity="fail",
                ))
            else:
                issues.append(VerifyIssue(
                    "B2-false-catalyst",
                    (
                        f"{sym}: headline co-binds to global issue ({cat}) while "
                        f"asymmetric_impact marks {sym} unaffected"
                    ),
                    severity="fail",
                ))
    return issues


def check_theme_recurrence(
    briefing: dict,
    history: list[dict] | None,
    *,
    min_streak: int = 5,
    jaccard: float = 0.25,
) -> list[VerifyIssue]:
    """Warn/fail on multi-day same-category themes without material direction change.

    history: prior briefings only, chronological oldest → newest (current excluded).
    """
    issues: list[VerifyIssue] = []
    if not history:
        return issues

    cur_issues = (briefing.get("global_context") or {}).get("issues") or []
    headline = _headline_blob(briefing)
    seen_codes: set[tuple[str, str]] = set()

    for iss in cur_issues:
        if not isinstance(iss, dict):
            continue
        cat = str(iss.get("category") or "")
        if not cat:
            continue
        tokens = _issue_title_tokens(iss)
        direction = str(iss.get("direction") or "")
        tier = str(iss.get("tier") or "")

        # Consecutive prior days with same category
        cat_streak = 0
        for past in reversed(history):
            past_cats = {
                str(pi.get("category") or "")
                for pi in ((past.get("global_context") or {}).get("issues") or [])
                if isinstance(pi, dict)
            }
            if cat in past_cats:
                cat_streak += 1
            else:
                break

        # Consecutive prior days with high title similarity in same category
        sim_streak = 0
        for past in reversed(history):
            matched = False
            for pi in (past.get("global_context") or {}).get("issues") or []:
                if not isinstance(pi, dict) or str(pi.get("category") or "") != cat:
                    continue
                pt = _issue_title_tokens(pi)
                if not tokens or not pt:
                    continue
                j = len(tokens & pt) / len(tokens | pt)
                if j >= jaccard:
                    matched = True
                    break
            if matched:
                sim_streak += 1
            else:
                break

        stable = direction.startswith("stable") or direction in ("", "stable_elevated", "stable_fading")
        if cat_streak >= min_streak:
            key = ("B2-theme-recurrence", cat)
            if key not in seen_codes:
                seen_codes.add(key)
                sev = "warn"
                # Escalate only when THIS issue's own wording owns the headline
                # (lexical bind — not a hard-coded theme dictionary)
                if headline_binds_issue(headline, iss) and stable and tier == "ongoing":
                    sev = "fail"
                issues.append(VerifyIssue(
                    "B2-theme-recurrence",
                    f"category={cat} present on {cat_streak}+ consecutive prior days "
                    f"(direction={direction or 'n/a'}, tier={tier or 'n/a'})",
                    severity=sev,
                ))

        if sim_streak >= min_streak and stable:
            key = ("B2-theme-stale", cat)
            if key not in seen_codes:
                seen_codes.add(key)
                issues.append(VerifyIssue(
                    "B2-theme-stale",
                    f"category={cat} near-duplicate title tokens for {sim_streak}+ prior days "
                    f"with direction={direction or 'stable'} (no material state change signal)",
                    severity="warn",
                ))
    return issues


def check_day_window_fitness(briefing: dict) -> list[VerifyIssue]:
    """Warn when headline / top narrative lacks last-session or premarket anchors."""
    issues: list[VerifyIssue] = []
    headline = _headline_blob(briefing)
    if not headline.strip():
        return issues

    session_hits = len(_RE_SESSION_ANCHOR.findall(headline))
    evergreen_hits = len(_RE_EVERGREEN.findall(headline))

    if evergreen_hits > 0 and session_hits == 0:
        issues.append(VerifyIssue(
            "B2-day-window",
            "headline reads as evergreen/ongoing risk without last-session or premarket anchor",
            severity="warn",
        ))

    # Executive bullets: flag if ALL lack session anchors and look like open-ended risk filler
    bullets = list(briefing.get("executive_bullets_en") or []) + list(
        briefing.get("executive_bullets_ko") or []
    )
    if bullets:
        with_anchor = sum(1 for b in bullets if _RE_SESSION_ANCHOR.search(str(b) or ""))
        if with_anchor == 0 and any(_RE_EVERGREEN.search(str(b) or "") for b in bullets):
            issues.append(VerifyIssue(
                "B2-day-window",
                "executive_bullets lack last-session anchors and use evergreen risk phrasing",
                severity="warn",
            ))
    return issues


def verify_briefing_integrity(
    briefing: dict,
    *,
    upcoming_earnings: list[dict] | None = None,
    price_table: dict[str, float] | None = None,
    as_of: Optional[date] = None,
    history: list[dict] | None = None,
) -> VerifyResult:
    """Run B1 + B2 mechanical checks. passed=False if any severity=fail."""
    issues: list[VerifyIssue] = []
    cal = build_calendar(upcoming_earnings)
    # Also calendar from briefing _earnings_calendar if present
    if briefing.get("_earnings_calendar"):
        cal.update(build_calendar(briefing["_earnings_calendar"]))
    issues.extend(check_relative_earnings_vs_calendar(briefing, cal, as_of=as_of))
    issues.extend(check_mood_vs_session_drop(briefing))
    issues.extend(check_price_binding(briefing, price_table))
    # Phase B2
    issues.extend(check_false_catalyst_attribution(briefing))
    issues.extend(check_theme_recurrence(briefing, history))
    issues.extend(check_day_window_fitness(briefing))
    fails = [i for i in issues if i.severity == "fail"]
    return VerifyResult(passed=len(fails) == 0, issues=issues)


def gate_result_for_promotion(result: VerifyResult) -> bool:
    """True only if snapshot may be promoted as clean."""
    return result.passed


def scan_briefing_artifacts(
    latest: dict,
    history: list[dict] | None = None,
    *,
    upcoming_earnings: list[dict] | None = None,
    price_table: dict[str, float] | None = None,
    as_of: Optional[date] = None,
) -> dict[str, Any]:
    """Machine-readable scan of one briefing (+ optional prior history). Pure entry point."""
    hist = list(history or [])
    result = verify_briefing_integrity(
        latest,
        upcoming_earnings=upcoming_earnings,
        price_table=price_table,
        as_of=as_of,
        history=hist,
    )
    codes = [i.code for i in result.issues]
    return {
        "passed": result.passed,
        "fail_count": sum(1 for i in result.issues if i.severity == "fail"),
        "warn_count": sum(1 for i in result.issues if i.severity == "warn"),
        "codes": codes,
        "issues": [asdict(i) for i in result.issues],
        "flags": {
            "false_catalyst": any(c == "B2-false-catalyst" for c in codes),
            "theme_recurrence": any(c == "B2-theme-recurrence" for c in codes),
            "theme_stale": any(c == "B2-theme-stale" for c in codes),
            "day_window": any(c == "B2-day-window" for c in codes),
        },
        "history_n": len(hist),
        "generated_at": latest.get("generated_at"),
        "headline_en": latest.get("headline_en"),
        "headline_ko": latest.get("headline_ko"),
    }
