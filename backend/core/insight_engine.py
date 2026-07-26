"""Insight Board pure analytics (MVP-1..4).

All user-facing timing is absolute (YYYY-MM-DD). days_until / horizon bars are
internal only. Sample-size honesty mirrors Track board (n thresholds).

MVP-1 Divergence → forward returns
MVP-2 AI action (brief / briefing) hit-rate
MVP-3 Theme persistence streaks
MVP-4 Macro judgment transitions × market composite + pre→post shift
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from statistics import mean, median
from typing import Any, Iterable, Optional, Sequence

# ── Sample honesty (same spirit as live_backtest_compare) ────────────────────
N_LOW = 10
N_MED = 30


def confidence_label(n: int) -> str:
    if n < N_LOW:
        return "INSUFFICIENT"
    if n < N_MED:
        return "LOW"
    if n < 80:
        return "MEDIUM"
    return "HIGH"


def honest_gap(n: int, locale: str = "en") -> Optional[str]:
    if n >= N_MED:
        return None
    if locale == "ko":
        return f"표본 n={n} — n≥{N_MED} 이전에는 해석을 보수적으로 하세요."
    return f"Sample n={n} — treat expectancy conservatively until n≥{N_MED}."


def parse_iso_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    s = str(value).strip()
    if not s:
        return None
    # "2026-07-25T20:30:01Z" or "2026-07-25"
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return datetime.strptime(s[:10], "%Y-%m-%d").date()
        except ValueError:
            return None


def normalize_divergence(raw: Any) -> Optional[str]:
    """Map free-form divergence labels to bullish / bearish / none / aligned."""
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if not s or s in ("none", "null", "n/a", "na"):
        return "none"
    if "bull" in s:
        return "bullish_divergence"
    if "bear" in s:
        return "bearish_divergence"
    if "align" in s:
        return "aligned"
    return s


def normalize_action(raw: Any) -> Optional[str]:
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if s in ("buy", "hold", "watch", "avoid"):
        return s
    return None


def normalize_theme(raw: Any) -> str:
    s = " ".join(str(raw or "").lower().split())
    # Truncate long AI theme sentences to a stable fingerprint head
    if len(s) > 80:
        s = s[:80].rstrip()
    return s


def trading_day_index(closes: dict[date, float], on: date) -> Optional[int]:
    """Index of on or last trading day ≤ on in sorted close map keys."""
    keys = sorted(closes.keys())
    if not keys:
        return None
    # exact
    if on in closes:
        return keys.index(on)
    # previous trading day
    prev = [k for k in keys if k <= on]
    if not prev:
        return None
    return keys.index(prev[-1])


def forward_return(
    closes: dict[date, float],
    signal_date: date,
    horizon: int,
) -> Optional[float]:
    """close[T+horizon] / close[T] - 1 using trading days in closes map.

    Signal is end-of-day T (post_close). No look-ahead: entry is close[T].
    """
    if horizon <= 0 or not closes:
        return None
    keys = sorted(closes.keys())
    idx = trading_day_index(closes, signal_date)
    if idx is None:
        return None
    j = idx + horizon
    if j >= len(keys):
        return None
    c0 = closes[keys[idx]]
    c1 = closes[keys[j]]
    if c0 is None or c1 is None or c0 == 0:
        return None
    return (c1 / c0) - 1.0


def summarize_returns(returns: Sequence[float]) -> dict[str, Any]:
    n = len(returns)
    if n == 0:
        return {
            "n": 0,
            "avg_return": None,
            "median_return": None,
            "hit_rate": None,
            "confidence": "INSUFFICIENT",
            "honest_gap_en": honest_gap(0, "en"),
            "honest_gap_ko": honest_gap(0, "ko"),
        }
    avg = mean(returns)
    med = median(returns)
    hits = sum(1 for r in returns if r > 0)
    return {
        "n": n,
        "avg_return": round(avg, 5),
        "median_return": round(med, 5),
        "hit_rate": round(hits / n, 4),
        "confidence": confidence_label(n),
        "honest_gap_en": honest_gap(n, "en"),
        "honest_gap_ko": honest_gap(n, "ko"),
    }


# ── MVP-1 ────────────────────────────────────────────────────────────────────

DIVERGENCE_LABELS = ("bullish_divergence", "bearish_divergence", "aligned", "none")
DEFAULT_HORIZONS = (3, 5, 10)


def collect_divergence_events(
    snapshots: Iterable[dict],
    *,
    slot_filter: str = "post_close",
) -> list[dict]:
    """Extract per-symbol divergence events from sentiment history snapshots."""
    events: list[dict] = []
    for snap in snapshots:
        slot = snap.get("slot") or ""
        if slot_filter and slot != slot_filter:
            continue
        signal_date = parse_iso_date(snap.get("generated_at") or snap.get("as_of"))
        if signal_date is None:
            # try filename-like date in generated_at already handled
            continue
        for sym_obj in snap.get("symbols") or []:
            if not isinstance(sym_obj, dict):
                continue
            sym = str(sym_obj.get("symbol") or "").upper().strip()
            if not sym:
                continue
            div = normalize_divergence(sym_obj.get("divergence"))
            if div is None:
                continue
            score = sym_obj.get("composite_score")
            if score is None:
                score = sym_obj.get("sentiment_score")
            try:
                score_f = float(score) if score is not None else None
            except (TypeError, ValueError):
                score_f = None
            events.append({
                "symbol": sym,
                "signal_date": signal_date.isoformat(),
                "slot": slot,
                "divergence": div,
                "composite_score": score_f,
                "sentiment": sym_obj.get("sentiment"),
            })
    return events


def analyze_divergence(
    events: list[dict],
    price_closes: dict[str, dict[date, float]],
    horizons: Sequence[int] = DEFAULT_HORIZONS,
) -> dict[str, Any]:
    """Group events by divergence type; compute forward returns per horizon."""
    by_div: dict[str, list[dict]] = defaultdict(list)
    for ev in events:
        by_div[ev["divergence"]].append(ev)

    groups: list[dict] = []
    for label in DIVERGENCE_LABELS:
        evs = by_div.get(label, [])
        horizon_stats: dict[str, Any] = {}
        for h in horizons:
            rets: list[float] = []
            for ev in evs:
                closes = price_closes.get(ev["symbol"]) or {}
                sd = parse_iso_date(ev["signal_date"])
                if sd is None:
                    continue
                r = forward_return(closes, sd, h)
                if r is not None:
                    rets.append(r)
            horizon_stats[str(h)] = summarize_returns(rets)
        groups.append({
            "divergence": label,
            "n_events": len(evs),
            "horizons": horizon_stats,
            "interpretation_en": _div_interpretation(label, horizon_stats, "en"),
            "interpretation_ko": _div_interpretation(label, horizon_stats, "ko"),
        })

    # control contrast: bullish vs none at h=5
    contrast = _contrast(groups, "bullish_divergence", "none", "5")
    return {
        "methodology_en": (
            "Signal = post_close social divergence label. Entry = close on signal date T. "
            f"Forward return = close[T+N]/close[T]-1 for N in {list(horizons)} trading days. "
            "No look-ahead. Small n → honest_gap warning."
        ),
        "methodology_ko": (
            "신호 = post_close 소셜 다이버전스 라벨. 진입 = 신호일 T 종가. "
            f"선행수익 = close[T+N]/close[T]-1 (N={list(horizons)} 거래일). "
            "룩어헤드 없음. 소표본 시 honest_gap 경고."
        ),
        "horizons": list(horizons),
        "groups": groups,
        "contrast_bullish_vs_none_5d": contrast,
        "n_total_events": len(events),
    }


def _div_interpretation(label: str, horizon_stats: dict, locale: str) -> str:
    h5 = (horizon_stats.get("5") or {})
    n = h5.get("n") or 0
    avg = h5.get("avg_return")
    conf = h5.get("confidence")
    if n == 0 or avg is None:
        return "데이터 부족" if locale == "ko" else "No completed forward windows yet"
    sign = "↑" if avg > 0 else "↓" if avg < 0 else "→"
    pct = f"{avg * 100:+.2f}%"
    if locale == "ko":
        return f"5일 평균 {pct} {sign} (n={n}, {conf})"
    return f"5d avg {pct} {sign} (n={n}, {conf})"


def _contrast(groups: list[dict], a: str, b: str, h: str) -> dict[str, Any]:
    ga = next((g for g in groups if g["divergence"] == a), None)
    gb = next((g for g in groups if g["divergence"] == b), None)
    sa = (ga or {}).get("horizons", {}).get(h) or {}
    sb = (gb or {}).get("horizons", {}).get(h) or {}
    avg_a, avg_b = sa.get("avg_return"), sb.get("avg_return")
    delta = None
    if avg_a is not None and avg_b is not None:
        delta = round(avg_a - avg_b, 5)
    return {
        "horizon": int(h),
        "a": a,
        "b": b,
        "avg_a": avg_a,
        "avg_b": avg_b,
        "delta_a_minus_b": delta,
        "n_a": sa.get("n") or 0,
        "n_b": sb.get("n") or 0,
        "note_en": (
            "Positive delta means bullish_divergence beat 'none' control on avg 5d return. "
            "Not a trading recommendation."
        ),
        "note_ko": (
            "delta > 0 이면 bullish_divergence가 'none' 통제군 대비 5일 평균수익이 우세. "
            "매매 권유가 아닙니다."
        ),
    }


# ── MVP-2 ────────────────────────────────────────────────────────────────────

ACTION_EXPECT = {
    # expected_sign for hit: +1 want positive return, -1 want negative, 0 neutral (not scored as hit)
    "buy": 1,
    "avoid": -1,
    "hold": 0,
    "watch": 0,
}


def collect_brief_actions(brief_snapshots: Iterable[dict]) -> list[dict]:
    events: list[dict] = []
    for snap in brief_snapshots:
        slot = snap.get("slot") or ""
        if slot and slot != "post_close":
            # prefer post_close for end-of-day actions; still allow missing slot
            if slot != "pre_open":
                pass
        # use post_close when available; include both but tag slot
        sd = parse_iso_date(snap.get("generated_at"))
        if sd is None:
            continue
        for sb in snap.get("symbol_briefs") or []:
            if not isinstance(sb, dict):
                continue
            sym = str(sb.get("symbol") or "").upper().strip()
            action = normalize_action(sb.get("action_bias") or sb.get("action"))
            if not sym or not action:
                continue
            events.append({
                "source": "brief",
                "symbol": sym,
                "signal_date": sd.isoformat(),
                "slot": slot or None,
                "action": action,
                "setup_quality": sb.get("setup_quality"),
            })
    return events


def collect_briefing_actions(briefing_snapshots: Iterable[dict]) -> list[dict]:
    events: list[dict] = []
    for snap in briefing_snapshots:
        sd = parse_iso_date(snap.get("generated_at"))
        if sd is None:
            continue
        for w in snap.get("watchlist") or []:
            if not isinstance(w, dict):
                continue
            sym = str(w.get("symbol") or "").upper().strip()
            action = normalize_action(w.get("action"))
            if not sym or not action:
                continue
            events.append({
                "source": "briefing",
                "symbol": sym,
                "signal_date": sd.isoformat(),
                "slot": snap.get("slot"),
                "action": action,
                "setup_quality": None,
            })
    return events


def analyze_actions(
    events: list[dict],
    price_closes: dict[str, dict[date, float]],
    horizon: int = 5,
    *,
    slot_prefer: Optional[str] = "post_close",
) -> dict[str, Any]:
    """Hit-rate of action_bias vs forward returns.

    buy hit = forward return > 0
    avoid hit = forward return < 0
    hold/watch reported as observational avg only (not directional hit)
    """
    # Prefer one slot per symbol-date to avoid double counting pre+post
    if slot_prefer:
        filtered = [e for e in events if (e.get("slot") or slot_prefer) == slot_prefer]
        if filtered:
            events = filtered

    by_action: dict[str, list[float]] = defaultdict(list)
    by_action_hits: dict[str, list[bool]] = defaultdict(list)

    for ev in events:
        closes = price_closes.get(ev["symbol"]) or {}
        sd = parse_iso_date(ev["signal_date"])
        if sd is None:
            continue
        r = forward_return(closes, sd, horizon)
        if r is None:
            continue
        action = ev["action"]
        by_action[action].append(r)
        expect = ACTION_EXPECT.get(action, 0)
        if expect == 1:
            by_action_hits[action].append(r > 0)
        elif expect == -1:
            by_action_hits[action].append(r < 0)

    rows = []
    for action in ("buy", "hold", "watch", "avoid"):
        rets = by_action.get(action, [])
        stats = summarize_returns(rets)
        hits = by_action_hits.get(action, [])
        directional_hit = round(sum(hits) / len(hits), 4) if hits else None
        rows.append({
            "action": action,
            "n": stats["n"],
            "avg_return": stats["avg_return"],
            "median_return": stats["median_return"],
            "positive_rate": stats["hit_rate"],  # share of r>0
            "directional_hit_rate": directional_hit,
            "confidence": stats["confidence"],
            "honest_gap_en": stats["honest_gap_en"],
            "honest_gap_ko": stats["honest_gap_ko"],
            "scored_directionally": action in ("buy", "avoid"),
        })

    return {
        "horizon_days": horizon,
        "methodology_en": (
            f"Action from AI brief/briefing on date T. Forward return close[T+{horizon}]/close[T]-1. "
            "buy hit = return>0; avoid hit = return<0; hold/watch observational only. "
            "Not advice — historical association only."
        ),
        "methodology_ko": (
            f"T일 AI action. 선행수익 close[T+{horizon}]/close[T]-1. "
            "buy 적중=수익>0, avoid 적중=수익<0. hold/watch는 관찰용. 투자 권유 아님."
        ),
        "by_action": rows,
        "n_events": sum(r["n"] for r in rows),
    }


# ── MVP-3 ────────────────────────────────────────────────────────────────────

def analyze_themes(
    brief_snapshots: Iterable[dict],
    market_closes: Optional[dict[date, float]] = None,
    *,
    min_count: int = 2,
    top_k: int = 15,
) -> dict[str, Any]:
    """Theme frequency + max consecutive calendar-day streak + optional SPY co-move."""
    # date -> list of themes
    by_date: dict[date, list[str]] = {}
    theme_dates: dict[str, list[date]] = defaultdict(list)
    theme_display: dict[str, str] = {}

    for snap in brief_snapshots:
        sd = parse_iso_date(snap.get("generated_at"))
        if sd is None:
            continue
        mb = snap.get("market_brief") or {}
        themes = mb.get("key_themes_en") or mb.get("key_themes") or []
        if not isinstance(themes, list):
            continue
        norms: list[str] = []
        for t in themes:
            raw = str(t).strip()
            if not raw:
                continue
            key = normalize_theme(raw)
            if not key:
                continue
            norms.append(key)
            theme_display.setdefault(key, raw[:120])
            theme_dates[key].append(sd)
        if norms:
            by_date[sd] = norms

    rows = []
    for key, dates in theme_dates.items():
        uniq = sorted(set(dates))
        if len(uniq) < min_count:
            continue
        streak = _max_streak(uniq)
        # SPY avg return on days theme present (same-day close-to-close from prev)
        spy_rets: list[float] = []
        if market_closes:
            keys = sorted(market_closes.keys())
            for d in uniq:
                idx = trading_day_index(market_closes, d)
                if idx is None or idx == 0:
                    continue
                c0 = market_closes[keys[idx - 1]]
                c1 = market_closes[keys[idx]]
                if c0:
                    spy_rets.append((c1 / c0) - 1.0)
        spy_stats = summarize_returns(spy_rets) if spy_rets else None
        rows.append({
            "theme_key": key,
            "theme": theme_display.get(key, key),
            "count_days": len(uniq),
            "max_streak_days": streak,
            "first_date": uniq[0].isoformat(),
            "last_date": uniq[-1].isoformat(),
            "spy_same_day_stats": spy_stats,
        })

    rows.sort(key=lambda r: (-r["count_days"], -r["max_streak_days"]))
    rows = rows[:top_k]

    return {
        "methodology_en": (
            "Themes from brief market_brief.key_themes_en. count_days = distinct dates. "
            "max_streak_days = longest consecutive calendar-day run. "
            "spy_same_day_stats = SPY day-return on theme days (observational)."
        ),
        "methodology_ko": (
            "brief key_themes 출현일 수·최장 연속일. "
            "SPY 동행 수익은 관찰용 상관(인과 아님)."
        ),
        "n_theme_days": len(by_date),
        "themes": rows,
    }


def _max_streak(sorted_dates: list[date]) -> int:
    if not sorted_dates:
        return 0
    best = cur = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            cur += 1
            best = max(best, cur)
        else:
            cur = 1
    return best


# ── MVP-4 ────────────────────────────────────────────────────────────────────

def extract_macro_judgment(snap: dict) -> Optional[str]:
    oj = snap.get("overall_judgment") or snap.get("overall")
    if isinstance(oj, dict):
        j = oj.get("judgment") or oj.get("label") or oj.get("status")
        return str(j).upper() if j else None
    if isinstance(oj, str) and oj.strip():
        return oj.strip().upper()
    cs = snap.get("computed_signals") or {}
    if isinstance(cs, dict):
        overall = cs.get("overall") or {}
        if isinstance(overall, dict) and overall.get("judgment"):
            return str(overall["judgment"]).upper()
    return None


def analyze_macro_transitions(
    macro_snapshots: Iterable[dict],
    market_composite_by_date: dict[date, float],
) -> dict[str, Any]:
    """Detect judgment changes; report composite at transition and next-day delta."""
    series: list[tuple[date, str]] = []
    for snap in macro_snapshots:
        sd = parse_iso_date(snap.get("generated_at"))
        j = extract_macro_judgment(snap)
        if sd is None or not j:
            continue
        series.append((sd, j))
    series.sort(key=lambda x: x[0])

    # collapse same-day (keep last)
    by_day: dict[date, str] = {}
    for d, j in series:
        by_day[d] = j
    ordered = sorted(by_day.items(), key=lambda x: x[0])

    transitions: list[dict] = []
    for i in range(1, len(ordered)):
        d0, j0 = ordered[i - 1]
        d1, j1 = ordered[i]
        if j0 == j1:
            continue
        comp = market_composite_by_date.get(d1)
        # composite change d1 vs previous available
        prev_dates = [d for d in sorted(market_composite_by_date.keys()) if d < d1]
        comp_prev = market_composite_by_date.get(prev_dates[-1]) if prev_dates else None
        comp_delta = None
        if comp is not None and comp_prev is not None:
            comp_delta = round(comp - comp_prev, 3)
        transitions.append({
            "date": d1.isoformat(),
            "from": j0,
            "to": j1,
            "market_composite": comp,
            "composite_delta_vs_prev": comp_delta,
        })

    # current judgment
    current = ordered[-1][1] if ordered else None
    # dwell times
    dwell = Counter()
    for _, j in ordered:
        dwell[j] += 1

    return {
        "methodology_en": (
            "Macro overall_judgment time series. Transition = judgment change day. "
            "market_composite from same-day sentiment MARKET score (if available)."
        ),
        "methodology_ko": (
            "매크로 overall_judgment 전환일. 당일 시장 composite(소셜) 병기."
        ),
        "current_judgment": current,
        "n_days": len(ordered),
        "dwell_days": dict(dwell),
        "transitions": transitions[-20:],  # latest 20
        "n_transitions": len(transitions),
    }


def analyze_pre_post_shift(
    sentiment_snapshots: Iterable[dict],
) -> dict[str, Any]:
    """Same-calendar-day pre_open → post_close market composite shift stats."""
    by_date: dict[date, dict[str, float]] = defaultdict(dict)
    for snap in sentiment_snapshots:
        sd = parse_iso_date(snap.get("generated_at"))
        slot = snap.get("slot")
        if sd is None or slot not in ("pre_open", "post_close"):
            continue
        m = snap.get("market") or {}
        score = m.get("composite_score")
        if score is None:
            score = m.get("sentiment_score")
        try:
            by_date[sd][slot] = float(score)
        except (TypeError, ValueError):
            continue

    shifts: list[float] = []
    samples: list[dict] = []
    for d, slots in sorted(by_date.items()):
        if "pre_open" in slots and "post_close" in slots:
            delta = slots["post_close"] - slots["pre_open"]
            shifts.append(delta)
            samples.append({
                "date": d.isoformat(),
                "pre": slots["pre_open"],
                "post": slots["post_close"],
                "delta": round(delta, 3),
            })

    stats = summarize_returns(shifts) if shifts else summarize_returns([])
    # re-label: hit_rate here means share of positive shifts (mood improved)
    return {
        "methodology_en": (
            "Same-day market composite: post_close − pre_open. "
            "Positive delta = social mood improved into the close."
        ),
        "methodology_ko": (
            "당일 시장 composite: post_close − pre_open. "
            "양수면 장중 소셜 심리 개선."
        ),
        "n_days": len(shifts),
        "avg_delta": stats["avg_return"],
        "median_delta": stats["median_return"],
        "improved_rate": stats["hit_rate"],
        "confidence": stats["confidence"],
        "honest_gap_en": stats["honest_gap_en"],
        "honest_gap_ko": stats["honest_gap_ko"],
        "recent": samples[-14:],
    }


def build_market_composite_series(sentiment_snapshots: Iterable[dict], slot: str = "post_close") -> dict[date, float]:
    out: dict[date, float] = {}
    for snap in sentiment_snapshots:
        if (snap.get("slot") or slot) != slot and slot:
            if snap.get("slot") != slot:
                continue
        sd = parse_iso_date(snap.get("generated_at"))
        m = snap.get("market") or {}
        score = m.get("composite_score")
        if score is None:
            score = m.get("sentiment_score")
        if sd is None or score is None:
            continue
        try:
            out[sd] = float(score)
        except (TypeError, ValueError):
            continue
    return out


def closes_from_series(dates: Sequence[Any], values: Sequence[float]) -> dict[date, float]:
    """Helper for tests: parallel date/value lists → close map."""
    out: dict[date, float] = {}
    for d, v in zip(dates, values):
        dd = parse_iso_date(d)
        if dd is not None:
            out[dd] = float(v)
    return out
