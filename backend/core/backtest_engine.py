"""
backtest_engine.py — SniperBoard 시그널 백테스트 엔진

방법론 (투자자 신뢰 확보를 위한 엄격한 설계):
─────────────────────────────────────────────────────────
신호:  Stage2 점수 ≥ threshold (일봉, 벡터 연산)
진입:  신호 발생일 다음 봉에서 entry_price 돌파 시 체결
       (당일 종가 진입 절대 불가 — look-ahead 차단)
손절:  진입가 − 2 × ATR(14)
목표:  진입가 + 3 × 리스크 (R:R = 1:3)
청산:  목표 도달 / 손절 도달 / timeout_bars 경과 (먼저 오는 것)
비용:  슬리피지 0.05% 반영 (수수료 0% — 미국 주식 브로커 기준)

Look-ahead 방지 원칙:
  - Stage2 지표는 벡터 rolling() 연산 — 순방향 윈도우 없음
  - 신호 판단: T-1 종가 기준 → T 시가 또는 이후에 체결
  - 갭업/갭다운 시 시가 우선 체결 (stop/target 초과 시 시가에 청산)

한계 (투명하게 공개):
  - 생존편향: 현재 워치리스트 종목만 포함 (상장폐지 제외)
  - yfinance 수정주가 사용 (배당·분할 조정)
  - 세금 미반영 (미국 주식 비거주자 양도세 별도)
"""

import json
import logging
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import yfinance as yf

from core.data_adapter import normalize_yf_dataframe
from core.signal_engine import add_daily_indicators, atr, ema

logger = logging.getLogger(__name__)

# ── 기본 설정 ──────────────────────────────────────────────────────────────────
STAGE2_THRESHOLD = 5      # 진입 최소 Stage2 점수 (7점 만점)
SLIPPAGE_PCT = 0.0005     # 슬리피지 0.05%
TIMEOUT_BARS = 60         # 최대 보유 기간 (거래일)
COOLDOWN_BARS = 10        # 청산 후 재진입 금지 기간 (거래일)
ENTRY_WINDOW_BARS = 5     # 신호 후 entry_price 도달 유효 기간
IN_SAMPLE_END = "2023-12-31"  # In-sample 종료일 (이후: Out-of-sample)
BACKTEST_START = "2019-01-01" # 데이터 시작일

CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "backtest_result.json")


@dataclass
class Trade:
    symbol: str
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    stop_price: float
    target_price: float
    outcome: str        # "WIN" | "LOSS" | "TIMEOUT"
    bars_held: int
    pnl_pct: float      # 수익률 %
    r_multiple: float   # 실현 R 배수
    stage2_score: int
    period: str         # "in_sample" | "out_of_sample"


# ── 데이터 수집 ────────────────────────────────────────────────────────────────

def fetch_backtest_data(symbols: List[str]) -> Dict[str, Optional[pd.DataFrame]]:
    """백테스트용 일봉 데이터 다운로드 (start 날짜 지정으로 충분한 기간 확보)."""
    all_syms = list(set(symbols + ["SPY"]))
    try:
        raw = yf.download(
            tickers=all_syms,
            start=BACKTEST_START,
            interval="1d",
            group_by="ticker",
            progress=False,
        )
    except Exception as e:
        logger.error(f"yfinance download failed: {e}", exc_info=True)
        return {}

    result: Dict[str, Optional[pd.DataFrame]] = {}
    for sym in all_syms:
        try:
            raw_df = raw[sym].copy() if len(all_syms) > 1 else raw.copy()
            df = normalize_yf_dataframe(raw_df)
            result[sym] = df if df is not None and not df.empty else None
        except Exception as e:
            logger.error(f"Normalize error for {sym}: {e}")
            result[sym] = None
    return result


# ── Stage2 벡터 계산 ───────────────────────────────────────────────────────────

def _compute_stage2_series(
    df: pd.DataFrame,
    spy_df: Optional[pd.DataFrame] = None,
    rs_threshold: int = 50,
    stop_atr_mult: float = 2.0,
    rr_ratio: float = 3.0,
) -> pd.DataFrame:
    """
    각 봉에 대한 Stage2 7개 체크 + R:R 플랜을 벡터 연산으로 계산.

    Look-ahead 없음:
    - rolling(N) 윈도우는 항상 과거 N개 봉 참조 (forward window 없음)
    - 이 결과를 신호로 쓸 때 .shift(1) 하여 T-1 기준으로만 진입 결정

    파라미터:
    - rs_threshold: RS 강도 최소값 (기본 50, 높을수록 더 강한 종목만 선별)
    - stop_atr_mult: 손절폭 ATR 배수 (기본 2.0)
    - rr_ratio: R:R 비율 (기본 3.0 → 1:3)
    """
    has_adj = 'adj_close' in df.columns
    if has_adj:
        ratio = df['adj_close'] / df['close']
        price = df['adj_close']
        high = df['high'] * ratio
        low = df['low'] * ratio
    else:
        price = df['close']
        high = df['high']
        low = df['low']

    ema21 = df['ema21']
    ema50 = df['ema50']
    ema200 = df['ema200']
    atr14 = df['atr14']
    volume = df['volume']

    # 1. price_above_emas
    price_above_emas = (price > ema21) & (ema21 > ema50) & (ema50 > ema200)

    # 2. ema200_rising (20봉 기울기)
    ema200_base = ema200.shift(20)
    ema200_slope = (ema200 - ema200_base) / ema200_base.replace(0, np.nan) * 100
    ema200_rising = ema200_slope > 0

    # 3. near_52w_high
    high52 = price.rolling(252, min_periods=126).max()
    pct_from_52w_high = (price - high52) / high52.replace(0, np.nan) * 100
    near_52w_high = pct_from_52w_high >= -25

    # 4. above_52w_low
    low52 = price.rolling(252, min_periods=126).min()
    pct_from_52w_low = (price - low52) / low52.replace(0, np.nan) * 100
    above_52w_low = pct_from_52w_low >= 30

    # 5. pullback_shallow (20봉 고점 대비)
    pivot = high.rolling(20, min_periods=5).max()
    pullback_pct = (pivot - price) / pivot.replace(0, np.nan) * 100
    pullback_shallow = pullback_pct <= 15

    # 6. rs_strong (63봉 수익률 vs SPY, rs_threshold 이상)
    if spy_df is not None and len(spy_df) >= 63:
        spy_price = spy_df['close'].reindex(price.index, method='ffill')
        rs_raw = 50 + (price.pct_change(63) - spy_price.pct_change(63)) * 200
        rs_score = rs_raw.clip(0, 100)
        rs_strong = rs_score >= rs_threshold
    else:
        rs_strong = pd.Series(True, index=df.index)

    # 7. volume_contracting
    vol_avg20 = volume.rolling(20, min_periods=10).mean()
    vol_avg5 = volume.rolling(5, min_periods=3).mean()
    volume_contracting = vol_avg5 < vol_avg20

    stage2_score = (
        price_above_emas.astype(int) +
        ema200_rising.astype(int) +
        near_52w_high.astype(int) +
        above_52w_low.astype(int) +
        pullback_shallow.astype(int) +
        rs_strong.astype(int) +
        volume_contracting.astype(int)
    )

    # R:R 플랜 (stop_atr_mult·rr_ratio 파라미터화)
    entry = (pivot * 1.005).round(4)
    stop = (entry - stop_atr_mult * atr14).round(4)
    risk = (entry - stop).clip(lower=0.01)
    target = (entry + rr_ratio * risk).round(4)

    return pd.DataFrame({
        'stage2_score': stage2_score,
        'entry': entry,
        'stop': stop,
        'target': target,
        'pivot': pivot,
    }, index=df.index)


# ── 트레이드 시뮬레이션 ────────────────────────────────────────────────────────

def _simulate_trades(
    symbol: str,
    df: pd.DataFrame,
    signals: pd.DataFrame,
    threshold: int = STAGE2_THRESHOLD,
    slippage_pct: float = SLIPPAGE_PCT,
    timeout_bars: int = TIMEOUT_BARS,
    cooldown_bars: int = COOLDOWN_BARS,
    entry_window: int = ENTRY_WINDOW_BARS,
    in_sample_end: str = IN_SAMPLE_END,
    spy_ema200_filter: Optional[pd.Series] = None,
) -> List[Trade]:
    """
    Bar-by-bar 트레이드 시뮬레이션.

    진입:
    - T-1 Stage2 ≥ threshold → T부터 entry_window 내에 entry_price 돌파 시 체결
    - 갭업(open ≥ entry): 시가에 체결 / 장중 돌파(high ≥ entry): entry가에 체결
    - 슬리피지: 체결가 × (1 + slippage_pct)
    - spy_ema200_filter: T-1 기준 SPY > EMA200일 때만 신호 생성 (시장 상황 필터)

    청산 (우선순위: 갭다운 → 손절 → 갭업 → 목표 → 타임아웃):
    - open ≤ stop: LOSS at open (갭다운)
    - low  ≤ stop: LOSS at stop
    - open ≥ target: WIN at open (갭업)
    - high ≥ target: WIN at target
    - bars_held ≥ timeout: TIMEOUT at close
    """
    trades: List[Trade] = []
    n = len(df)

    opens = df['open'].values
    highs = df['high'].values
    lows = df['low'].values
    closes = df['close'].values
    dates = df.index

    sig_scores = signals['stage2_score'].values
    sig_entry = signals['entry'].values
    sig_stop = signals['stop'].values
    sig_target = signals['target'].values

    in_sample_ts = pd.Timestamp(in_sample_end)

    in_trade = False
    cooldown = 0
    pending: Optional[dict] = None

    # SPY EMA200 필터: boolean 배열로 변환 (없으면 모두 True)
    spy_filter_values = None
    if spy_ema200_filter is not None:
        spy_filter_values = spy_ema200_filter.reindex(dates, method='ffill').fillna(False).values

    # EMA200(200봉) + 52주 계산(252봉) 워밍업 후 시작
    start_bar = 260

    for t in range(start_bar, n):
        date = dates[t]
        op, hi, lo, cl = opens[t], highs[t], lows[t], closes[t]

        # ── 보유 중: 청산 조건 확인 ─────────────────────────────────────────
        if in_trade:
            bars_held = t - trade_entry_bar
            exit_price = None
            outcome = None

            # 갭다운 손절 (open이 stop 아래)
            if op <= trade_stop:
                exit_price, outcome = op, "LOSS"
            # 갭업 목표 달성 (open이 target 위)
            elif op >= trade_target:
                exit_price, outcome = op, "WIN"
            # 장중 손절
            elif lo <= trade_stop:
                exit_price, outcome = trade_stop, "LOSS"
            # 장중 목표 달성
            elif hi >= trade_target:
                exit_price, outcome = trade_target, "WIN"
            # 타임아웃
            elif bars_held >= timeout_bars:
                exit_price, outcome = cl, "TIMEOUT"

            if exit_price is not None:
                pnl = (exit_price - trade_entry) / trade_entry * 100
                r_mult = (exit_price - trade_entry) / trade_risk
                period = "in_sample" if date <= in_sample_ts else "out_of_sample"
                trades.append(Trade(
                    symbol=symbol,
                    entry_date=trade_entry_date,
                    exit_date=date.strftime("%Y-%m-%d"),
                    entry_price=round(trade_entry, 4),
                    exit_price=round(exit_price, 4),
                    stop_price=round(trade_stop, 4),
                    target_price=round(trade_target, 4),
                    outcome=outcome,
                    bars_held=bars_held,
                    pnl_pct=round(pnl, 4),
                    r_multiple=round(r_mult, 3),
                    stage2_score=trade_score,
                    period=period,
                ))
                in_trade = False
                cooldown = cooldown_bars
                pending = None
            continue

        # ── 쿨다운 ──────────────────────────────────────────────────────────
        if cooldown > 0:
            cooldown -= 1
            continue

        # ── 진입 대기 중: 체결 시도 ─────────────────────────────────────────
        if pending is not None:
            if t > pending['deadline']:
                pending = None  # 진입 기간 만료 → 취소
            else:
                ep = pending['entry_price']
                fill = None
                if op >= ep:
                    fill = op        # 갭업 → 시가 체결
                elif hi >= ep:
                    fill = ep        # 장중 entry_price 돌파

                if fill is not None:
                    trade_entry = fill * (1 + slippage_pct)
                    trade_stop = pending['stop']
                    trade_target = pending['target']
                    trade_risk = max(trade_entry - trade_stop, 0.01)
                    trade_score = pending['score']
                    trade_entry_bar = t
                    trade_entry_date = date.strftime("%Y-%m-%d")
                    in_trade = True
                    pending = None
                continue  # 체결 여부와 관계없이 이 봉에서 새 신호 생성 안 함

        # ── 새 신호 감지 (T-1 지표 기준 → look-ahead 없음) ─────────────────
        prev = t - 1
        prev_score = sig_scores[prev]

        # SPY EMA200 필터: T-1 기준 SPY가 EMA200 아래면 신호 무시
        if spy_filter_values is not None and not spy_filter_values[prev]:
            continue

        ep = float(sig_entry[prev])
        sp = float(sig_stop[prev])
        tp = float(sig_target[prev])

        # 유효성 검증: NaN 제거, stop < entry, target > entry
        if (prev_score >= threshold and
                not np.isnan(ep) and not np.isnan(sp) and not np.isnan(tp) and
                0 < sp < ep < tp):
            pending = {
                'entry_price': ep,
                'stop': sp,
                'target': tp,
                'score': int(prev_score),
                'deadline': t + entry_window - 1,
            }

    return trades


# ── 통계 계산 ──────────────────────────────────────────────────────────────────

def compute_monte_carlo(trades: List[Trade], n_simulations: int = 10000) -> dict:
    """
    부트스트랩 리샘플링으로 주요 지표의 신뢰구간을 추정한다.

    핵심 원칙:
    - 거래 결과를 무작위로 복원 추출(n_simulations회)하여 분포를 추정
    - 파라미터 탐색이 아닌 "이 결과가 통계적으로 유의한가?" 검증
    - 완전 벡터 연산(numpy): (n_simulations × n_trades) 행렬로 일괄 처리

    반환:
    - expectancy_r.prob_positive: 기대값이 양수일 확률 (가장 중요한 지표)
    - 각 지표: p5/p25/median/p75/p95/mean/std
    """
    if not trades or len(trades) < 5:
        return {"note": "거래 수 부족 (5회 이상 필요)", "n_simulations": n_simulations}

    n = len(trades)
    rng = np.random.default_rng(42)  # 재현 가능한 결과

    r_multiples = np.array([t.r_multiple for t in trades], dtype=float)
    is_win      = np.array([t.outcome == "WIN"  for t in trades], dtype=float)
    is_loss     = np.array([t.outcome == "LOSS" for t in trades], dtype=float)
    pnl_pcts    = np.array([t.pnl_pct for t in trades], dtype=float)

    # 부트스트랩 인덱스: (n_simulations, n) 한 번에 생성
    idx = rng.integers(0, n, size=(n_simulations, n))

    r_samp   = r_multiples[idx]   # (n_sims, n)
    win_samp = is_win[idx]
    loss_samp = is_loss[idx]
    pnl_samp = pnl_pcts[idx]

    # 승률
    win_rates = win_samp.mean(axis=1)  # (n_sims,)

    # 평균 win/loss R (분모 0 방어)
    win_cnt  = win_samp.sum(axis=1)
    loss_cnt = loss_samp.sum(axis=1)
    avg_win_r  = np.where(win_cnt  > 0, (r_samp * win_samp).sum(axis=1)  / np.maximum(win_cnt,  1), 0.0)
    avg_loss_r = np.where(loss_cnt > 0, (r_samp * loss_samp).sum(axis=1) / np.maximum(loss_cnt, 1), 0.0)

    # 기대값 (R)
    expectancy = win_rates * avg_win_r + (1 - win_rates) * avg_loss_r

    # 손익비 (PF) — 무한대 cap 20
    gross_profit = (pnl_samp * win_samp).sum(axis=1)
    gross_loss   = np.abs((pnl_samp * loss_samp).sum(axis=1))
    pf = np.where(gross_loss > 0, gross_profit / gross_loss, 20.0).clip(0, 20)

    # MDD — 완전 벡터 연산 (누적곱 → 누적 최대값)
    eq_factors = 1 + pnl_samp / 100                                  # (n_sims, n)
    eq_curves  = np.cumprod(eq_factors, axis=1) * 10000              # (n_sims, n)
    eq_start   = np.full((n_simulations, 1), 10000.0)
    eq_full    = np.concatenate([eq_start, eq_curves], axis=1)       # (n_sims, n+1)
    run_max    = np.maximum.accumulate(eq_full, axis=1)
    dd         = (run_max - eq_full) / run_max * 100
    mdds       = dd.max(axis=1)

    def _pct(arr: np.ndarray) -> dict:
        a = arr[np.isfinite(arr)]
        return {
            "p5":     round(float(np.percentile(a,  5)), 3),
            "p25":    round(float(np.percentile(a, 25)), 3),
            "median": round(float(np.median(a)),         3),
            "p75":    round(float(np.percentile(a, 75)), 3),
            "p95":    round(float(np.percentile(a, 95)), 3),
            "mean":   round(float(np.mean(a)),           3),
            "std":    round(float(np.std(a)),            3),
        }

    exp_stats = _pct(expectancy)
    exp_stats["prob_positive"] = round(float((expectancy > 0).mean()), 4)

    return {
        "n_simulations": n_simulations,
        "n_trades": n,
        "expectancy_r":  exp_stats,
        "win_rate":      _pct(win_rates),
        "profit_factor": _pct(pf),
        "mdd":           _pct(mdds),
    }


def _compute_equity_curve(trades: List[Trade], start: float = 10000.0) -> List[dict]:
    equity = start
    curve = [{"date": trades[0].entry_date, "equity": round(equity, 2)}] if trades else []
    for t in trades:
        equity *= (1 + t.pnl_pct / 100)
        curve.append({"date": t.exit_date, "equity": round(equity, 2)})
    return curve


def _compute_mdd(equity_curve: List[dict]) -> float:
    if not equity_curve:
        return 0.0
    equities = [e['equity'] for e in equity_curve]
    peak = equities[0]
    mdd = 0.0
    for eq in equities:
        peak = max(peak, eq)
        dd = (peak - eq) / peak * 100
        mdd = max(mdd, dd)
    return round(mdd, 2)


def compute_stats(trades: List[Trade], label: str = "all") -> dict:
    if not trades:
        return {"label": label, "n": 0, "note": "거래 없음"}

    wins = [t for t in trades if t.outcome == "WIN"]
    losses = [t for t in trades if t.outcome == "LOSS"]
    timeouts = [t for t in trades if t.outcome == "TIMEOUT"]
    n = len(trades)

    win_rate = len(wins) / n

    avg_win_pct = float(np.mean([t.pnl_pct for t in wins])) if wins else 0.0
    avg_loss_pct = float(np.mean([t.pnl_pct for t in losses])) if losses else 0.0
    avg_timeout_pct = float(np.mean([t.pnl_pct for t in timeouts])) if timeouts else 0.0

    avg_win_r = float(np.mean([t.r_multiple for t in wins])) if wins else 0.0
    avg_loss_r = float(np.mean([t.r_multiple for t in losses])) if losses else 0.0

    # 기대값 (R 단위) — 가장 중요한 지표
    expectancy_r = win_rate * avg_win_r + (1 - win_rate) * avg_loss_r

    gross_profit = sum(t.pnl_pct for t in wins) if wins else 0.0
    gross_loss = abs(sum(t.pnl_pct for t in losses)) if losses else 0.0
    profit_factor = round(gross_profit / gross_loss, 3) if gross_loss > 0 else float('inf')

    equity_curve = _compute_equity_curve(trades)
    mdd = _compute_mdd(equity_curve)

    # 연속 손실 최대
    max_consecutive_loss = 0
    streak = 0
    for t in trades:
        if t.outcome == "LOSS":
            streak += 1
            max_consecutive_loss = max(max_consecutive_loss, streak)
        else:
            streak = 0

    return {
        "label": label,
        "n": n,
        "wins": len(wins),
        "losses": len(losses),
        "timeouts": len(timeouts),
        "win_rate": round(win_rate, 4),
        "avg_win_pct": round(avg_win_pct, 3),
        "avg_loss_pct": round(avg_loss_pct, 3),
        "avg_timeout_pct": round(avg_timeout_pct, 3),
        "avg_win_r": round(avg_win_r, 3),
        "avg_loss_r": round(avg_loss_r, 3),
        "expectancy_r": round(expectancy_r, 3),
        "profit_factor": profit_factor,
        "mdd": mdd,
        "max_consecutive_loss": max_consecutive_loss,
        "avg_bars_held": round(float(np.mean([t.bars_held for t in trades])), 1),
        "equity_curve": equity_curve,
    }


# ── 심볼별 / 전체 백테스트 ─────────────────────────────────────────────────────

def run_symbol_backtest(
    symbol: str,
    df: pd.DataFrame,
    spy_df: Optional[pd.DataFrame] = None,
    threshold: int = STAGE2_THRESHOLD,
    slippage_pct: float = SLIPPAGE_PCT,
    timeout_bars: int = TIMEOUT_BARS,
    in_sample_end: str = IN_SAMPLE_END,
    rs_threshold: int = 50,
    use_spy_filter: bool = False,
    stop_atr_mult: float = 2.0,
    rr_ratio: float = 3.0,
) -> dict:
    """단일 종목 백테스트. 충분한 데이터가 없으면 error 반환."""
    if df is None or len(df) < 300:
        return {"symbol": symbol, "error": "데이터 부족 (300봉 이상 필요)"}
    try:
        df_ind = add_daily_indicators(df)
        if df_ind is None or df_ind.empty:
            return {"symbol": symbol, "error": "지표 계산 실패"}

        signals = _compute_stage2_series(
            df_ind, spy_df,
            rs_threshold=rs_threshold,
            stop_atr_mult=stop_atr_mult,
            rr_ratio=rr_ratio,
        )

        # SPY EMA200 필터 준비 (use_spy_filter=True 시)
        spy_ema200_filter = None
        if use_spy_filter and spy_df is not None:
            spy_ind = add_daily_indicators(spy_df.copy())
            if spy_ind is not None and 'ema200' in spy_ind.columns:
                spy_ema200_filter = (spy_ind['close'] > spy_ind['ema200'])

        trades = _simulate_trades(
            symbol, df_ind, signals,
            threshold=threshold,
            slippage_pct=slippage_pct,
            timeout_bars=timeout_bars,
            in_sample_end=in_sample_end,
            spy_ema200_filter=spy_ema200_filter,
        )

        is_trades = [t for t in trades if t.period == "in_sample"]
        oos_trades = [t for t in trades if t.period == "out_of_sample"]

        # Stage2 점수별 분해
        breakdown: dict = {}
        for score in range(threshold, 8):
            score_trades = [t for t in trades if t.stage2_score == score]
            if score_trades:
                breakdown[str(score)] = compute_stats(score_trades, f"score_{score}")

        return {
            "symbol": symbol,
            "total_trades": len(trades),
            "all": compute_stats(trades, "all"),
            "in_sample": compute_stats(is_trades, "in_sample"),
            "out_of_sample": compute_stats(oos_trades, "out_of_sample"),
            "breakdown_by_score": breakdown,
            "trades": [asdict(t) for t in trades],
        }
    except Exception as e:
        logger.error(f"Backtest failed for {symbol}: {e}", exc_info=True)
        return {"symbol": symbol, "error": str(e)}


def run_full_backtest(
    symbols: List[str],
    threshold: int = STAGE2_THRESHOLD,
    slippage_pct: float = SLIPPAGE_PCT,
    timeout_bars: int = TIMEOUT_BARS,
    in_sample_end: str = IN_SAMPLE_END,
    rs_threshold: int = 50,
    use_spy_filter: bool = False,
    stop_atr_mult: float = 2.0,
    rr_ratio: float = 3.0,
) -> dict:
    """전 종목 백테스트 실행 후 집계 결과 반환 및 캐시 저장."""
    logger.info(f"백테스트 시작: {symbols}, threshold={threshold}, rs={rs_threshold}, spy_filter={use_spy_filter}")
    dfs = fetch_backtest_data(symbols)
    spy_df = dfs.get("SPY")

    by_symbol: dict = {}
    all_trades: List[Trade] = []

    for sym in symbols:
        df = dfs.get(sym)
        result = run_symbol_backtest(
            sym, df, spy_df,
            threshold=threshold,
            slippage_pct=slippage_pct,
            timeout_bars=timeout_bars,
            in_sample_end=in_sample_end,
            rs_threshold=rs_threshold,
            use_spy_filter=use_spy_filter,
            stop_atr_mult=stop_atr_mult,
            rr_ratio=rr_ratio,
        )
        by_symbol[sym] = result
        if "trades" in result:
            all_trades.extend([Trade(**t) for t in result["trades"]])

    is_trades = [t for t in all_trades if t.period == "in_sample"]
    oos_trades = [t for t in all_trades if t.period == "out_of_sample"]

    breakdown: dict = {}
    for score in range(threshold, 8):
        score_trades = [t for t in all_trades if t.stage2_score == score]
        if score_trades:
            breakdown[str(score)] = compute_stats(score_trades, f"score_{score}")

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "config": {
            "symbols": symbols,
            "stage2_threshold": threshold,
            "rs_threshold": rs_threshold,
            "use_spy_filter": use_spy_filter,
            "stop_atr_mult": stop_atr_mult,
            "rr_ratio": rr_ratio,
            "slippage_pct": slippage_pct,
            "timeout_bars": timeout_bars,
            "entry_window_bars": ENTRY_WINDOW_BARS,
            "cooldown_bars": COOLDOWN_BARS,
            "in_sample_end": in_sample_end,
            "data_start": BACKTEST_START,
        },
        "methodology": {
            "entry": "신호 발생일 다음 봉, entry_price(20일고점×1.005) 돌파 시 체결",
            "stop": "진입가 − 2×ATR(14)",
            "target": "진입가 + 3×리스크 (R:R 1:3)",
            "timeout": f"{timeout_bars}거래일 경과 시 종가 청산",
            "slippage": f"{slippage_pct*100:.2f}% 반영",
            "cost": "수수료 0% (미국 주식 브로커 기준)",
            "data": "yfinance 수정주가 (배당·분할 조정)",
            "lookahead": "T-1 지표 기준 진입 → look-ahead bias 없음",
            "survivorship_bias": "현재 워치리스트 종목만 포함 — 결과 상향 가능성 있음",
            "disclaimer": "과거 성과가 미래 수익을 보장하지 않습니다",
        },
        "aggregate": {
            "all": compute_stats(all_trades, "aggregate_all"),
            "in_sample": compute_stats(is_trades, "aggregate_in_sample"),
            "out_of_sample": compute_stats(oos_trades, "aggregate_out_of_sample"),
        },
        "monte_carlo": compute_monte_carlo(all_trades),
        "breakdown_by_score": breakdown,
        "by_symbol": by_symbol,
    }

    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    logger.info("백테스트 완료 — 캐시 저장됨")

    return payload


def run_parameter_sweep(
    symbols: List[str],
    configs: Optional[List[dict]] = None,
) -> List[dict]:
    """
    여러 파라미터 조합으로 백테스트를 실행하고 비교 결과를 반환.

    configs 예시:
    [
        {"threshold": 5, "rs_threshold": 50, "use_spy_filter": False},
        {"threshold": 6, "rs_threshold": 60, "use_spy_filter": True},
        ...
    ]
    configs=None 이면 기본 실험 세트 사용.

    반환: 각 config별 {config, aggregate, n_trades} 리스트 (성과 비교용)
    """
    if configs is None:
        configs = [
            {"label": "기본 (threshold=5, RS≥50)", "threshold": 5, "rs_threshold": 50, "use_spy_filter": False},
            {"label": "threshold=6", "threshold": 6, "rs_threshold": 50, "use_spy_filter": False},
            {"label": "SPY필터 (threshold=5, RS≥50)", "threshold": 5, "rs_threshold": 50, "use_spy_filter": True},
            {"label": "RS≥60 (threshold=5)", "threshold": 5, "rs_threshold": 60, "use_spy_filter": False},
            {"label": "RS≥60 + SPY필터", "threshold": 5, "rs_threshold": 60, "use_spy_filter": True},
            {"label": "threshold=6 + RS≥60", "threshold": 6, "rs_threshold": 60, "use_spy_filter": False},
            {"label": "threshold=6 + RS≥60 + SPY필터", "threshold": 6, "rs_threshold": 60, "use_spy_filter": True},
            {"label": "RS≥70 + SPY필터", "threshold": 5, "rs_threshold": 70, "use_spy_filter": True},
        ]

    logger.info(f"파라미터 스윕 시작: {len(configs)}개 조합, 종목={symbols}")
    dfs = fetch_backtest_data(symbols)
    spy_df = dfs.get("SPY")

    # SPY EMA200 계산 (공유)
    spy_ema200_filter = None
    if spy_df is not None:
        spy_ind = add_daily_indicators(spy_df.copy())
        if spy_ind is not None and 'ema200' in spy_ind.columns:
            spy_ema200_filter = (spy_ind['close'] > spy_ind['ema200'])

    sweep_results = []
    for cfg in configs:
        label = cfg.get("label", str(cfg))
        threshold = cfg.get("threshold", STAGE2_THRESHOLD)
        rs_threshold = cfg.get("rs_threshold", 50)
        use_spy_filter = cfg.get("use_spy_filter", False)
        stop_atr_mult = cfg.get("stop_atr_mult", 2.0)
        rr_ratio = cfg.get("rr_ratio", 3.0)

        all_trades: List[Trade] = []
        for sym in symbols:
            df = dfs.get(sym)
            if df is None or len(df) < 300:
                continue
            try:
                df_ind = add_daily_indicators(df)
                if df_ind is None or df_ind.empty:
                    continue
                signals = _compute_stage2_series(
                    df_ind, spy_df,
                    rs_threshold=rs_threshold,
                    stop_atr_mult=stop_atr_mult,
                    rr_ratio=rr_ratio,
                )
                active_filter = spy_ema200_filter if use_spy_filter else None
                trades = _simulate_trades(
                    sym, df_ind, signals,
                    threshold=threshold,
                    spy_ema200_filter=active_filter,
                )
                all_trades.extend(trades)
            except Exception as e:
                logger.error(f"Sweep error {sym}/{label}: {e}")

        is_trades = [t for t in all_trades if t.period == "in_sample"]
        oos_trades = [t for t in all_trades if t.period == "out_of_sample"]

        sweep_results.append({
            "label": label,
            "config": {
                "threshold": threshold,
                "rs_threshold": rs_threshold,
                "use_spy_filter": use_spy_filter,
                "stop_atr_mult": stop_atr_mult,
                "rr_ratio": rr_ratio,
            },
            "aggregate": compute_stats(all_trades, "all"),
            "in_sample": compute_stats(is_trades, "in_sample"),
            "out_of_sample": compute_stats(oos_trades, "out_of_sample"),
        })
        n = len(all_trades)
        agg = sweep_results[-1]["aggregate"]
        logger.info(
            f"  [{label}] n={n}, wr={agg.get('win_rate',0):.3f}, "
            f"exp={agg.get('expectancy_r',0):.3f}R, pf={agg.get('profit_factor',0):.3f}"
        )

    return sweep_results


def load_cached_result() -> Optional[dict]:
    if not os.path.exists(CACHE_PATH):
        return None
    try:
        with open(CACHE_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"백테스트 캐시 로드 실패: {e}")
        return None
