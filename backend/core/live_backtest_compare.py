"""Phase C1/C2 — pure helpers for live signal stats vs backtest baseline.

No I/O. Empty/low-n cases stay honest (null expectancy, LOW confidence).
"""

from __future__ import annotations

from typing import Any, Optional


# Documented operational methodology (mirrors main.py scheduler + signal_tracker)
DEFAULT_METHODOLOGY: dict[str, Any] = {
    "stage2_threshold": 5,
    "scan_window_en": "US regular session (ET 09:30–16:00) ≈ KST 22:30–05:00, every 30 minutes",
    "scan_window_ko": "미국 정규장 (ET 09:30–16:00) ≈ KST 22:30–05:00, 30분마다 스캔",
    "entry_window_bars": 5,
    "timeout_bars": 60,
    "outcome_update_en": "After close ET 16:30 ≈ KST 05:30 daily",
    "outcome_update_ko": "장 마감 후 ET 16:30 ≈ KST 05:30 일 1회 결과 갱신",
    "note_en": "No/new signals is expected when Stage2 < threshold or open signals already exist — not a silent failure.",
    "note_ko": "Stage2 임계 미달 또는 이미 열린 신호가 있으면 신규 기록이 없을 수 있습니다 — 장애가 아닙니다.",
}


def confidence_from_n(n_closed: int) -> str:
    if n_closed < 30:
        return "LOW"
    if n_closed < 80:
        return "MEDIUM"
    return "HIGH"


def health_from_expectancy(
    n_closed: int,
    expectancy_r: Optional[float],
    baseline_expectancy: Optional[float],
) -> str:
    if n_closed < 10 or expectancy_r is None:
        return "INSUFFICIENT_DATA"
    if baseline_expectancy is None:
        return "WATCH" if expectancy_r >= 0 else "UNDERPERFORMING"
    if expectancy_r >= baseline_expectancy * 0.7:
        return "ON_TRACK"
    if expectancy_r >= 0.0:
        return "WATCH"
    return "UNDERPERFORMING"


def extract_backtest_baseline(backtest_payload: Optional[dict]) -> Optional[dict]:
    """Pull comparable aggregate metrics from load_cached_result() shape."""
    if not isinstance(backtest_payload, dict):
        return None
    agg = backtest_payload.get("aggregate") or {}
    all_ = agg.get("all") or {}
    oos = agg.get("out_of_sample") or {}
    cfg = backtest_payload.get("config") or {}
    if all_.get("expectancy_r") is None and all_.get("n") is None:
        return None
    return {
        "expectancy_r": all_.get("expectancy_r"),
        "win_rate": all_.get("win_rate"),
        "profit_factor": all_.get("profit_factor"),
        "n": all_.get("n") or all_.get("trades") or 0,
        "oos_expectancy_r": oos.get("expectancy_r"),
        "oos_n": oos.get("n") or oos.get("trades"),
        "config": {
            "stage2_threshold": cfg.get("stage2_threshold"),
            "rs_threshold": cfg.get("rs_threshold"),
            "use_spy_filter": cfg.get("use_spy_filter"),
            "entry_window_bars": cfg.get("entry_window_bars"),
            "timeout_bars": cfg.get("timeout_bars"),
        },
        "source": "backtest_result.json",
        "generated_at": backtest_payload.get("generated_at"),
    }


def compare_live_to_backtest(
    live: dict,
    baseline: Optional[dict],
) -> dict[str, Any]:
    """Side-by-side comparison payload for API/UI.

    live expects keys: n_closed, expectancy_r, win_rate, profit_factor
    baseline expects extract_backtest_baseline output or BACKTEST_BASELINE-like dict
    """
    n = int(live.get("n_closed") or 0)
    exp = live.get("expectancy_r")
    wr = live.get("win_rate")
    pf = live.get("profit_factor")

    b_exp = baseline.get("expectancy_r") if baseline else None
    b_wr = baseline.get("win_rate") if baseline else None
    b_pf = baseline.get("profit_factor") if baseline else None
    b_n = baseline.get("n") if baseline else None
    b_oos = baseline.get("oos_expectancy_r") if baseline else None

    def _delta(a, b):
        if a is None or b is None:
            return None
        try:
            return round(float(a) - float(b), 3)
        except (TypeError, ValueError):
            return None

    conf = confidence_from_n(n)
    health = health_from_expectancy(n, exp if exp is None else float(exp), b_exp if b_exp is None else float(b_exp))

    return {
        "sample_n": n,
        "confidence": conf,
        "health_status": health,
        "live": {
            "n": n,
            "expectancy_r": exp,
            "win_rate": wr,
            "profit_factor": pf,
        },
        "backtest": {
            "n": b_n,
            "expectancy_r": b_exp,
            "win_rate": b_wr,
            "profit_factor": b_pf,
            "oos_expectancy_r": b_oos,
            "config": (baseline or {}).get("config"),
            "source": (baseline or {}).get("source") or "baseline_constant",
            "generated_at": (baseline or {}).get("generated_at"),
        } if baseline else None,
        "delta": {
            "expectancy_r": _delta(exp, b_exp),
            "win_rate": _delta(wr, b_wr),
            "profit_factor": _delta(pf, b_pf),
        } if baseline else None,
        "honest_gap_en": (
            f"Live closed trades n={n} — expectancy not statistically reliable until n≥30."
            if n < 30
            else None
        ),
        "honest_gap_ko": (
            f"라이브 청산 n={n}건 — n≥30 이전에는 기대값 해석을 보수적으로 하세요."
            if n < 30
            else None
        ),
        "comparable": bool(
            baseline
            and baseline.get("config")
            and baseline["config"].get("stage2_threshold") is not None
        ),
    }
