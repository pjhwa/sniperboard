"""
signal_tracker.py — SniperBoard 실거래 신호 트래킹

경쟁 우위 설계 원칙:
  1. 자동 로깅: /api/watchlist 응답에 Stage2 신호 발생 시 자동 기록 (수동 입력 불필요)
  2. 결과 추적: 매일 update_outcomes() 호출로 WIN/LOSS/TIMEOUT 자동 갱신
  3. 백테스트 대조: compute_live_stats() 가 백테스트 기준값(+0.460R)과 라이브를 비교
  4. 레짐 분해: 신호 발생 시 레짐(RISK_ON/MIXED/RISK_OFF)을 기록 → 언제 신호가 통하는지 분석
  5. 투명성: 모든 신호 기록 공개 (체리피킹 없음) — 유료 전환 신뢰 기반

SQLite (backend/data/signal_log.db) 사용 — 의존성 추가 없음.
"""

import logging
import sqlite3
from datetime import datetime, date
from pathlib import Path
from typing import Optional

import pandas as pd

from core.data_adapter import get_multi_daily

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "data" / "signal_log.db"

SIGNAL_THRESHOLD = 5     # Stage2 최소 점수
ENTRY_WINDOW_BARS = 5    # 신호 후 진입가 도달 유효 기간 (거래일)
TIMEOUT_BARS = 60        # 최대 보유 기간 (거래일)
SLIPPAGE_PCT = 0.0005    # 슬리피지 0.05%

STATUS_PENDING   = "PENDING"    # 신호 발생, 진입 대기
STATUS_ACTIVE    = "ACTIVE"     # 진입 완료, 보유 중
STATUS_WIN       = "WIN"        # 목표가 도달
STATUS_LOSS      = "LOSS"       # 손절가 도달
STATUS_TIMEOUT   = "TIMEOUT"    # 60일 경과
STATUS_CANCELLED = "CANCELLED"  # 진입 윈도우 내 진입 실패

# 백테스트 기준값 (RS≥70 + SPY필터, 2019~2026, 145거래)
BACKTEST_BASELINE = {
    "expectancy_r": 0.460,
    "win_rate": 0.386,
    "profit_factor": 1.917,
    "n": 145,
    "oos_expectancy_r": 0.511,
}


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    return c


def init_db() -> None:
    """앱 시작 시 1회 호출. 테이블 없으면 생성."""
    with _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS signal_log (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol        TEXT    NOT NULL,
                signal_date   TEXT    NOT NULL,
                stage2_score  INTEGER NOT NULL,
                rs_score      REAL,
                entry         REAL    NOT NULL,
                stop          REAL    NOT NULL,
                target        REAL    NOT NULL,
                status        TEXT    NOT NULL DEFAULT 'PENDING',
                entry_date    TEXT,
                entry_price   REAL,
                exit_date     TEXT,
                exit_price    REAL,
                r_multiple    REAL,
                bars_held     INTEGER,
                regime        TEXT,
                created_at    TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
                updated_at    TEXT
            )
        """)
        c.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_signal
            ON signal_log(symbol, signal_date)
        """)
        c.commit()
    logger.info("signal_log DB initialized")


def scan_and_log(watchlist_items: list[dict], regime: Optional[str] = None) -> int:
    """
    워치리스트 아이템에서 Stage2 >= threshold 신호를 탐지하고 신규 기록.
    동일 심볼에 OPEN(PENDING/ACTIVE) 신호가 이미 있으면 스킵.
    반환: 새로 기록된 신호 수
    """
    today = date.today().isoformat()
    logged = 0

    with _conn() as c:
        for item in watchlist_items:
            sym   = item.get("symbol", "")
            score = item.get("score", 0)
            entry = item.get("entry", 0.0)
            stop  = item.get("stop", 0.0)
            tgt   = item.get("target", 0.0)
            rs    = item.get("rs_score", 0.0)

            if score < SIGNAL_THRESHOLD or not entry or not stop or not tgt:
                continue

            # 이미 OPEN 신호가 있으면 새 신호 불필요
            exists = c.execute(
                "SELECT id FROM signal_log WHERE symbol=? AND status IN ('PENDING','ACTIVE')",
                (sym,)
            ).fetchone()
            if exists:
                continue

            try:
                c.execute("""
                    INSERT OR IGNORE INTO signal_log
                        (symbol, signal_date, stage2_score, rs_score,
                         entry, stop, target, status, regime)
                    VALUES (?,?,?,?,?,?,?,'PENDING',?)
                """, (sym, today, score, rs, entry, stop, tgt, regime))
                if c.execute("SELECT changes()").fetchone()[0] > 0:
                    logged += 1
                    logger.info(f"Signal logged: {sym} score={score} entry={entry:.2f}")
            except Exception as e:
                logger.warning(f"scan_and_log insert failed for {sym}: {e}")
        c.commit()

    return logged


def update_outcomes() -> dict:
    """
    PENDING/ACTIVE 신호의 결과를 실제 일봉 데이터로 갱신.
    반환: {updated, wins, losses, timeouts, cancelled, activated}
    """
    with _conn() as c:
        open_rows = [dict(r) for r in c.execute(
            "SELECT * FROM signal_log WHERE status IN ('PENDING','ACTIVE') ORDER BY signal_date"
        ).fetchall()]

    if not open_rows:
        return {"updated": 0, "wins": 0, "losses": 0,
                "timeouts": 0, "cancelled": 0, "activated": 0}

    symbols = list({r["symbol"] for r in open_rows})
    try:
        dfs = get_multi_daily(symbols, period="6mo")
    except Exception as e:
        logger.error(f"update_outcomes: data fetch failed: {e}")
        return {"updated": 0, "wins": 0, "losses": 0,
                "timeouts": 0, "cancelled": 0, "activated": 0}

    summary = {"updated": 0, "wins": 0, "losses": 0,
               "timeouts": 0, "cancelled": 0, "activated": 0}

    with _conn() as c:
        for row in open_rows:
            sym = row["symbol"]
            df  = dfs.get(sym)
            if df is None or df.empty:
                continue

            signal_dt = pd.Timestamp(row["signal_date"])
            signal_entry  = float(row["entry"])
            signal_stop   = float(row["stop"])
            signal_target = float(row["target"])

            # ── 현재 상태에 따라 처리 시작점 결정 ────────────────────────────
            if row["status"] == STATUS_PENDING:
                bars = df[df.index > signal_dt]
                status       = STATUS_PENDING
                actual_entry = None
                entry_date   = None
                risk         = None
            else:  # ACTIVE
                entry_dt = pd.Timestamp(row["entry_date"]) if row["entry_date"] else signal_dt
                bars = df[df.index > entry_dt]
                status       = STATUS_ACTIVE
                actual_entry = float(row["entry_price"]) if row["entry_price"] else signal_entry
                entry_date   = row["entry_date"]
                risk         = actual_entry - signal_stop
                if risk <= 0.01:
                    risk = actual_entry * 0.03

            if bars.empty:
                continue

            new_status = status
            exit_date  = None
            exit_price = None
            r_multiple = None
            bars_held  = 0
            pending_bars = 0

            for i, (bar_dt, bar) in enumerate(bars.iterrows()):
                bar_date_str = bar_dt.strftime("%Y-%m-%d")
                o = float(bar.get("open", bar["close"]))
                h = float(bar["high"])
                lo = float(bar["low"])
                cl = float(bar["close"])

                # ── PENDING: 진입 대기 ─────────────────────────────────────
                if status == STATUS_PENDING:
                    pending_bars += 1
                    if pending_bars > ENTRY_WINDOW_BARS:
                        new_status = STATUS_CANCELLED
                        break
                    if o >= signal_entry:
                        actual_entry = o * (1 + SLIPPAGE_PCT)
                    elif h >= signal_entry:
                        actual_entry = signal_entry * (1 + SLIPPAGE_PCT)
                    else:
                        continue

                    entry_date = bar_date_str
                    status = STATUS_ACTIVE
                    risk = actual_entry - signal_stop
                    if risk <= 0.01:
                        risk = actual_entry * 0.03
                    bars_held = 0
                    new_status = STATUS_ACTIVE

                # ── ACTIVE: 청산 판단 ──────────────────────────────────────
                if status == STATUS_ACTIVE:
                    bars_held += 1

                    if bars_held >= TIMEOUT_BARS:
                        new_status = STATUS_TIMEOUT
                        exit_date  = bar_date_str
                        exit_price = cl
                        r_multiple = round((cl - actual_entry) / risk, 3)
                        break

                    # 갭다운 손절 (시가가 이미 stop 이하)
                    if o <= signal_stop:
                        new_status = STATUS_LOSS
                        exit_date  = bar_date_str
                        exit_price = o
                        r_multiple = round((o - actual_entry) / risk, 3)
                        break

                    # 갭업 목표 (시가가 이미 target 이상)
                    if o >= signal_target:
                        new_status = STATUS_WIN
                        exit_date  = bar_date_str
                        exit_price = o
                        r_multiple = round((o - actual_entry) / risk, 3)
                        break

                    # 장중 손절
                    if lo <= signal_stop:
                        new_status = STATUS_LOSS
                        exit_date  = bar_date_str
                        exit_price = signal_stop
                        r_multiple = round((signal_stop - actual_entry) / risk, 3)
                        break

                    # 장중 목표
                    if h >= signal_target:
                        new_status = STATUS_WIN
                        exit_date  = bar_date_str
                        exit_price = signal_target
                        r_multiple = round((signal_target - actual_entry) / risk, 3)
                        break

            # ── DB 업데이트 ────────────────────────────────────────────────
            old_status = row["status"]
            status_changed = new_status != old_status
            entry_changed  = (old_status == STATUS_PENDING and
                              new_status in (STATUS_ACTIVE,) + tuple(
                                  s for s in [STATUS_WIN, STATUS_LOSS, STATUS_TIMEOUT, STATUS_CANCELLED]
                              ) and actual_entry is not None)

            if status_changed or entry_changed:
                c.execute("""
                    UPDATE signal_log SET
                        status=?, entry_date=?, entry_price=?,
                        exit_date=?, exit_price=?, r_multiple=?,
                        bars_held=?,
                        updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
                    WHERE id=?
                """, (
                    new_status,
                    entry_date or row.get("entry_date"),
                    actual_entry or row.get("entry_price"),
                    exit_date,
                    exit_price,
                    r_multiple,
                    bars_held if bars_held else None,
                    row["id"],
                ))
                summary["updated"] += 1
                if new_status == STATUS_WIN:
                    summary["wins"] += 1
                elif new_status == STATUS_LOSS:
                    summary["losses"] += 1
                elif new_status == STATUS_TIMEOUT:
                    summary["timeouts"] += 1
                elif new_status == STATUS_CANCELLED:
                    summary["cancelled"] += 1
                elif new_status == STATUS_ACTIVE and old_status == STATUS_PENDING:
                    summary["activated"] += 1

        c.commit()

    logger.info(f"update_outcomes: {summary}")
    return summary


def get_signal_log(limit: int = 200, symbol: Optional[str] = None) -> list[dict]:
    """신호 로그 조회 (최신순)."""
    with _conn() as c:
        if symbol:
            rows = c.execute(
                "SELECT * FROM signal_log WHERE symbol=? ORDER BY signal_date DESC LIMIT ?",
                (symbol, limit)
            ).fetchall()
        else:
            rows = c.execute(
                "SELECT * FROM signal_log ORDER BY signal_date DESC LIMIT ?",
                (limit,)
            ).fetchall()
    return [dict(r) for r in rows]


def compute_live_stats() -> dict:
    """
    청산된 거래 기준 라이브 성과 통계 계산.
    백테스트 기준값과 비교하여 모델 헬스(ON_TRACK/WATCH/UNDERPERFORMING) 반환.
    """
    with _conn() as c:
        closed = [dict(r) for r in c.execute(
            "SELECT * FROM signal_log WHERE status IN ('WIN','LOSS','TIMEOUT') ORDER BY exit_date"
        ).fetchall()]
        n_active  = c.execute("SELECT COUNT(*) FROM signal_log WHERE status='ACTIVE'").fetchone()[0]
        n_pending = c.execute("SELECT COUNT(*) FROM signal_log WHERE status='PENDING'").fetchone()[0]
        n_total   = c.execute("SELECT COUNT(*) FROM signal_log").fetchone()[0]
        recent_pipeline = [dict(r) for r in c.execute(
            "SELECT * FROM signal_log WHERE status IN ('PENDING','ACTIVE') ORDER BY signal_date DESC LIMIT 10"
        ).fetchall()]

    n = len(closed)
    wins    = [t for t in closed if t["status"] == STATUS_WIN]
    losses  = [t for t in closed if t["status"] == STATUS_LOSS]
    timeouts = [t for t in closed if t["status"] == STATUS_TIMEOUT]

    win_rs   = [t["r_multiple"] for t in wins     if t["r_multiple"] is not None]
    loss_rs  = [t["r_multiple"] for t in losses   if t["r_multiple"] is not None]
    tout_rs  = [t["r_multiple"] for t in timeouts if t["r_multiple"] is not None]
    all_rs   = win_rs + loss_rs + tout_rs
    n_valid  = len(all_rs)

    win_rate     = len(wins) / n if n > 0 else None
    avg_win_r    = sum(win_rs) / len(win_rs)   if win_rs  else None
    avg_loss_r   = sum(loss_rs + tout_rs) / len(loss_rs + tout_rs) if (loss_rs or tout_rs) else None
    expectancy_r = round(sum(all_rs) / n_valid, 3) if n_valid > 0 else None

    total_gain = sum(r for r in all_rs if r > 0)
    total_loss = abs(sum(r for r in all_rs if r < 0))
    profit_factor = round(total_gain / total_loss, 3) if total_loss > 0 else None

    # 자산곡선 + MDD
    equity = 0.0
    peak   = 0.0
    max_dd = 0.0
    curve  = []
    for t in closed:
        r = t.get("r_multiple")
        if r is None:
            continue
        equity += r
        curve.append({"date": t.get("exit_date", ""), "equity": round(equity, 3), "trade_n": len(curve) + 1})
        if equity > peak:
            peak = equity
        dd = (peak - equity) / max(abs(peak), 0.001) * 100 if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd

    # 레짐별 성과
    regime_stats: dict[str, dict] = {}
    for t in closed:
        reg = t.get("regime") or "UNKNOWN"
        if reg not in regime_stats:
            regime_stats[reg] = {"n": 0, "wins": 0, "rs": []}
        regime_stats[reg]["n"] += 1
        if t["status"] == STATUS_WIN:
            regime_stats[reg]["wins"] += 1
        if t.get("r_multiple") is not None:
            regime_stats[reg]["rs"].append(t["r_multiple"])

    regime_breakdown = {}
    for reg, data in regime_stats.items():
        rs = data["rs"]
        regime_breakdown[reg] = {
            "n": data["n"],
            "win_rate": round(data["wins"] / data["n"], 3) if data["n"] > 0 else None,
            "expectancy_r": round(sum(rs) / len(rs), 3) if rs else None,
        }

    # 모델 헬스 판단
    confidence = "LOW" if n < 30 else ("MEDIUM" if n < 80 else "HIGH")
    bsl_exp = BACKTEST_BASELINE["expectancy_r"]

    if n < 10 or expectancy_r is None:
        health_status = "INSUFFICIENT_DATA"
    elif expectancy_r >= bsl_exp * 0.7:
        health_status = "ON_TRACK"
    elif expectancy_r >= 0.0:
        health_status = "WATCH"
    else:
        health_status = "UNDERPERFORMING"

    return {
        "n_closed":   n,
        "n_active":   n_active,
        "n_pending":  n_pending,
        "n_total":    n_total,
        "wins":       len(wins),
        "losses":     len(losses),
        "timeouts":   len(timeouts),
        "win_rate":   round(win_rate, 3) if win_rate is not None else None,
        "expectancy_r": expectancy_r,
        "profit_factor": profit_factor,
        "mdd":        round(max_dd, 1) if curve else None,
        "avg_win_r":  round(avg_win_r, 3)  if avg_win_r  is not None else None,
        "avg_loss_r": round(avg_loss_r, 3) if avg_loss_r is not None else None,
        "equity_curve": curve,
        "regime_breakdown": regime_breakdown,
        "pipeline": recent_pipeline,
        "health": {
            "status":           health_status,
            "confidence":       confidence,
            "expectancy_delta": round(expectancy_r - bsl_exp, 3) if expectancy_r is not None else None,
            "win_rate_delta":   round(win_rate - BACKTEST_BASELINE["win_rate"], 3)
                                if win_rate is not None else None,
        },
        "backtest_baseline": BACKTEST_BASELINE,
    }
