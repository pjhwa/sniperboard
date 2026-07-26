"""Pure tests for insight_engine MVP-1..4 — no network."""
from datetime import date, timedelta

from core.insight_engine import (
    analyze_actions,
    analyze_divergence,
    analyze_macro_transitions,
    analyze_pre_post_shift,
    analyze_themes,
    collect_brief_actions,
    collect_divergence_events,
    confidence_label,
    forward_return,
    normalize_divergence,
    summarize_returns,
)


def _closes(start: date, n: int, start_px: float = 100.0, step: float = 1.0) -> dict:
    """Monotonic trading days (skip weekends roughly by using calendar days as 'trading')."""
    out = {}
    px = start_px
    d = start
    while len(out) < n:
        if d.weekday() < 5:
            out[d] = px
            px += step
        d += timedelta(days=1)
    return out


def test_forward_return_basic():
    closes = {
        date(2026, 7, 1): 100.0,
        date(2026, 7, 2): 101.0,
        date(2026, 7, 3): 102.0,
        date(2026, 7, 6): 105.0,  # +3 trading from 7/1 if we only have these
    }
    # With only 4 keys: idx0=7/1, idx3=7/6 → horizon 3
    r = forward_return(closes, date(2026, 7, 1), 3)
    assert r is not None
    assert abs(r - 0.05) < 1e-9


def test_forward_return_uses_prior_trading_day_if_exact_missing():
    closes = {
        date(2026, 7, 1): 100.0,
        date(2026, 7, 2): 110.0,
        date(2026, 7, 3): 121.0,
    }
    # signal on weekend/holiday 7/1 is exact; signal on 7/1.5-like: use 7/1
    r = forward_return(closes, date(2026, 7, 1), 1)
    assert abs(r - 0.10) < 1e-9


def test_forward_return_insufficient_horizon():
    closes = {date(2026, 7, 1): 100.0, date(2026, 7, 2): 101.0}
    assert forward_return(closes, date(2026, 7, 1), 5) is None


def test_confidence_and_summarize():
    assert confidence_label(5) == "INSUFFICIENT"
    assert confidence_label(15) == "LOW"
    assert confidence_label(40) == "MEDIUM"
    s = summarize_returns([0.01, -0.02, 0.03])
    assert s["n"] == 3
    assert s["hit_rate"] == round(2 / 3, 4)
    assert s["honest_gap_en"]


def test_normalize_divergence():
    assert normalize_divergence("bullish_divergence") == "bullish_divergence"
    assert normalize_divergence("Bearish Div") == "bearish_divergence"
    assert normalize_divergence(None) is None
    assert normalize_divergence("none") == "none"


def test_mvp1_divergence_analysis():
    snaps = [
        {
            "generated_at": "2026-07-01T20:30:00Z",
            "slot": "post_close",
            "symbols": [
                {"symbol": "AAA", "divergence": "bullish_divergence", "composite_score": 1.0},
                {"symbol": "BBB", "divergence": "none", "composite_score": 0.0},
            ],
        },
        {
            "generated_at": "2026-07-02T20:30:00Z",
            "slot": "post_close",
            "symbols": [
                {"symbol": "AAA", "divergence": "bullish_divergence", "composite_score": 0.8},
            ],
        },
    ]
    events = collect_divergence_events(snaps)
    assert len(events) == 3
    # AAA rises after signals; BBB flat control
    prices = {
        "AAA": _closes(date(2026, 7, 1), 20, 100.0, step=1.0),
        "BBB": _closes(date(2026, 7, 1), 20, 100.0, step=0.0),
    }
    out = analyze_divergence(events, prices, horizons=(3, 5))
    assert out["n_total_events"] == 3
    bull = next(g for g in out["groups"] if g["divergence"] == "bullish_divergence")
    assert bull["horizons"]["3"]["n"] >= 1
    assert bull["horizons"]["3"]["avg_return"] is not None
    # Rising prices → positive avg for bullish_divergence
    assert bull["horizons"]["3"]["avg_return"] > 0


def test_mvp2_action_hitrate():
    events = [
        {"source": "brief", "symbol": "AAA", "signal_date": "2026-07-01", "slot": "post_close", "action": "buy"},
        {"source": "brief", "symbol": "BBB", "signal_date": "2026-07-01", "slot": "post_close", "action": "avoid"},
        {"source": "brief", "symbol": "CCC", "signal_date": "2026-07-01", "slot": "post_close", "action": "watch"},
    ]
    prices = {
        "AAA": _closes(date(2026, 7, 1), 15, 100.0, step=1.0),   # up
        "BBB": _closes(date(2026, 7, 1), 15, 100.0, step=-1.0),  # down → avoid hits
        "CCC": _closes(date(2026, 7, 1), 15, 100.0, step=0.5),
    }
    out = analyze_actions(events, prices, horizon=5)
    by = {r["action"]: r for r in out["by_action"]}
    assert by["buy"]["n"] == 1
    assert by["buy"]["directional_hit_rate"] == 1.0
    assert by["avoid"]["directional_hit_rate"] == 1.0
    assert by["watch"]["scored_directionally"] is False


def test_mvp2_collect_brief_actions():
    snaps = [{
        "generated_at": "2026-07-10T21:00:00Z",
        "slot": "post_close",
        "symbol_briefs": [
            {"symbol": "NVDA", "action_bias": "buy", "setup_quality": "A"},
            {"symbol": "TSLA", "action_bias": "avoid"},
        ],
    }]
    ev = collect_brief_actions(snaps)
    assert len(ev) == 2
    assert {e["action"] for e in ev} == {"buy", "avoid"}


def test_mvp3_themes_streak():
    snaps = []
    base = date(2026, 7, 1)
    for i in range(5):
        snaps.append({
            "generated_at": (base + timedelta(days=i)).isoformat() + "T21:00:00Z",
            "slot": "post_close",
            "market_brief": {
                "key_themes_en": ["AI semiconductors demand", "Fed caution"] if i < 3 else ["Fed caution"],
            },
        })
    out = analyze_themes(snaps, min_count=2)
    themes = {t["theme_key"]: t for t in out["themes"]}
    # AI theme 3 consecutive days
    ai_keys = [k for k in themes if "semiconductor" in k or "ai" in k]
    assert ai_keys
    assert themes[ai_keys[0]]["max_streak_days"] >= 3
    assert themes[ai_keys[0]]["count_days"] == 3


def test_mvp4_macro_transitions():
    macros = [
        {"generated_at": "2026-07-01T21:00:00Z", "overall_judgment": "RISK_ON"},
        {"generated_at": "2026-07-02T21:00:00Z", "overall_judgment": "RISK_ON"},
        {"generated_at": "2026-07-03T21:00:00Z", "overall_judgment": "MIXED"},
        {"generated_at": "2026-07-05T21:00:00Z", "overall_judgment": "RISK_OFF"},
    ]
    comps = {
        date(2026, 7, 1): 0.5,
        date(2026, 7, 2): 0.4,
        date(2026, 7, 3): -0.2,
        date(2026, 7, 5): -0.8,
    }
    out = analyze_macro_transitions(macros, comps)
    assert out["n_transitions"] == 2
    assert out["transitions"][0]["from"] == "RISK_ON"
    assert out["transitions"][0]["to"] == "MIXED"
    assert out["current_judgment"] == "RISK_OFF"


def test_mvp4_pre_post_shift():
    snaps = [
        {"generated_at": "2026-07-01T13:30:00Z", "slot": "pre_open", "market": {"composite_score": -1.0}},
        {"generated_at": "2026-07-01T20:30:00Z", "slot": "post_close", "market": {"composite_score": -0.2}},
        {"generated_at": "2026-07-02T13:30:00Z", "slot": "pre_open", "market": {"composite_score": 0.5}},
        {"generated_at": "2026-07-02T20:30:00Z", "slot": "post_close", "market": {"composite_score": 0.1}},
    ]
    out = analyze_pre_post_shift(snaps)
    assert out["n_days"] == 2
    assert abs(out["avg_delta"] - ((0.8 + (-0.4)) / 2)) < 1e-9
