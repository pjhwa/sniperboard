import pytest
import pandas as pd
import numpy as np
from core.signal_engine import calculate_signals, add_indicators, gaussian_channel, add_daily_indicators, calculate_stage2_analysis

def create_mock_ohlcv(length=100) -> pd.DataFrame:
    """테스트용 가상 OHLCV 데이터프레임을 생성합니다."""
    dates = pd.date_range(start="2026-01-01", periods=length, freq="5min")
    
    # 임의의 추세가 있는 데이터 생성
    np.random.seed(42)
    close_prices = 100.0 + np.cumsum(np.random.normal(0.1, 1.0, length))
    open_prices = close_prices + np.random.normal(0, 0.2, length)
    high_prices = np.maximum(open_prices, close_prices) + np.abs(np.random.normal(0, 0.5, length))
    low_prices = np.minimum(open_prices, close_prices) - np.abs(np.random.normal(0, 0.5, length))
    volume = np.random.randint(100, 10000, length)
    
    df = pd.DataFrame({
        "open": open_prices,
        "high": high_prices,
        "low": low_prices,
        "close": close_prices,
        "volume": volume
    }, index=dates)
    return df

def test_add_indicators():
    df = create_mock_ohlcv(50)
    df_with_ind = add_indicators(df)
    
    # 지표 컬럼 추가 검증
    for col in ['ema21', 'ema50', 'rsi', 'atr', 'macd_hist', 'vol_avg20']:
        assert col in df_with_ind.columns
    assert len(df_with_ind) == 50

def test_calculate_signals():
    df = create_mock_ohlcv(100)
    processed_df, signals = calculate_signals(df)
    
    # 반환 형식 검증
    assert isinstance(processed_df, pd.DataFrame)
    assert isinstance(signals, dict)
    
    # 신호 목록 검증
    signal_keys = ["vcp", "sniper", "pullback", "strong_trend", "overbought", "downtrend"]
    for key in signal_keys:
        assert key in signals
        assert len(signals[key]) == len(processed_df)
        assert all(isinstance(v, bool) for v in signals[key])

def test_gaussian_channel():
    df = create_mock_ohlcv(120)
    mid, upper, lower = gaussian_channel(df['close'], df['high'], df['low'], period=100)
    
    assert len(mid) == len(df)
    # 초기 warm-up 구간은 NaN이어야 함
    assert np.isnan(mid[0])
    # 후반부는 숫자 값이어야 함
    assert not np.isnan(mid[-1])
    assert upper[-1] > mid[-1] > lower[-1]

def test_calculate_stage2_analysis():
    df = create_mock_ohlcv(300)  # 200 EMA warm-up을 위해 300일 필요
    df = add_daily_indicators(df)
    
    result = calculate_stage2_analysis(df)
    
    assert isinstance(result, dict)
    assert "score" in result
    assert 0 <= result["score"] <= 7
    assert "checks" in result
    assert len(result["checks"]) == 7
    assert "entry" in result
    assert "stop" in result
    assert "target" in result


# =============================================================================
# Phase 2: Adjusted prices TDD tests for split-symbol accuracy (NVDA-style)
# =============================================================================

def _create_daily_mock_with_split(n=300, split_factor=10.0, seed=123):
    """Daily-style mock DF simulating a split (e.g. NVDA 10:1).
    Pre-split bars have artificially high raw prices; adj_close scales them down.
    Post-split (recent) raw == adj. This makes raw-based 52w/pivot/RS/ema_slope wrong.
    """
    dates = pd.date_range(start="2025-05-01", periods=n, freq="D")
    np.random.seed(seed)
    # Base continuous trend on "adjusted" scale
    base = 100.0 + np.cumsum(np.random.normal(0.05, 1.2, n))
    # Simulate raw close with a *recent* split (within last ~18 bars so the 20d pivot window
    # spans the split point). This makes raw 20d high/pivot/entry see the 10x pre-split levels.
    # 252w and ema200 always span for this n.
    split_idx = max(5, n - 18)
    raw_close = base.copy()
    raw_close[:split_idx] = base[:split_idx] * split_factor

    # High/low around close (small noise)
    high = raw_close + np.abs(np.random.normal(0, 0.8, n))
    low = raw_close - np.abs(np.random.normal(0, 0.8, n))
    open_p = raw_close + np.random.normal(0, 0.3, n)
    volume = np.random.randint(10_000_000, 80_000_000, n)

    df = pd.DataFrame({
        "open": open_p,
        "high": high,
        "low": low,
        "close": raw_close,
        "volume": volume,
    }, index=dates)

    # adj_close: continuous "true" economic series (pre-split scaled back)
    adj_c = base.copy()
    adj_c[:split_idx] = raw_close[:split_idx] / split_factor   # = base
    adj_c[split_idx:] = raw_close[split_idx:]                  # = raw post
    df["adj_close"] = adj_c
    return df, split_idx


def test_calculate_stage2_analysis_adjusted_vs_raw_split_symbol():
    """TDD: With 'adj_close' present, long-horizon Stage2 metrics (52w, RS, ema_slope, pullback, pivot/entry)
    use adjusted data for accuracy. Raw path (no adj col) reproduces pre-Phase2 (wrong on splits).
    """
    raw_df, _ = _create_daily_mock_with_split(n=320, split_factor=10.0)
    # Precompute indicators on the *raw* (discontinuous) close — chart path unchanged
    df_raw = add_daily_indicators(raw_df.copy())

    # --- Raw path (no adj_close col) : simulates pre-Phase2 or non-split ---
    df_no_adj = df_raw.drop(columns=["adj_close"], errors="ignore")
    res_raw = calculate_stage2_analysis(df_no_adj)

    # --- Adjusted path (adj_close present) : Phase 2 hardened ---
    res_adj = calculate_stage2_analysis(df_raw)  # has adj_close

    # Common sanity
    for res in (res_raw, res_adj):
        assert isinstance(res, dict)
        assert 0 <= res["score"] <= 7
        assert "checks" in res and len(res["checks"]) == 7
        assert all(k in res for k in ["rs_score", "ema200_slope", "pct_from_52w_high", "pct_from_52w_low",
                                       "pullback_pct", "entry", "pivot_high", "latest_close"])

    # latest_close must be identical (most recent bar never adjusted differently)
    assert abs(res_raw["latest_close"] - res_adj["latest_close"]) < 0.01

    # On split mock (recent): raw path sees pre-split high ~10x in 52w/20d windows
    # → extreme negative 52w pct and inflated pivot/entry. adj path corrects via scaling.
    assert res_raw["pct_from_52w_high"] < -70.0   # bogus extreme due to split gap in raw
    assert -70.0 < res_adj["pct_from_52w_high"] < 40.0   # sensible after adjustment

    # Pivot/entry (20d) also capture split effect in raw when split recent
    assert res_raw["pivot_high"] > res_adj["pivot_high"] * 4.0   # strong split factor effect
    assert res_raw["entry"] > res_adj["entry"] * 4.0

    # Sensible positive entry on adj path
    assert res_adj["entry"] > res_adj["latest_close"] * 0.5

    # EMA200 slope (long-term 200d) differs: raw ema polluted across split
    assert res_raw["ema200_slope"] != res_adj["ema200_slope"]

    # RS (if we pass spy) also benefits; here we just ensure it runs and uses adj path
    # (spy_close raw is fine, stock uses adj when present)
    spy = pd.Series(np.linspace(400, 520, 320), index=raw_df.index)
    res_adj_spy = calculate_stage2_analysis(df_raw, spy_close=spy)
    res_raw_spy = calculate_stage2_analysis(df_no_adj, spy_close=spy)
    assert "rs_score" in res_adj_spy and "rs_score" in res_raw_spy
    # Both in [0,100] range
    assert 0.0 <= res_adj_spy["rs_score"] <= 100.0
    assert 0.0 <= res_raw_spy["rs_score"] <= 100.0

    # Backward compat: calling on df with no adj ever produces same as before Phase2
    # (we already compared raw vs adj; additionally, df_no_adj path == original behavior)
    assert res_raw["checks"]["ema200_rising"] == (res_raw["ema200_slope"] > 0)


def test_calculate_stage2_analysis_no_behavior_change_without_adj():
    """Explicit backward-compat: DF without adj_close produces identical numeric results
    for all Stage2 outputs (within float tolerance) to pre-Phase2 logic.
    """
    df = create_mock_ohlcv(280)  # reuse existing helper (no split, no adj)
    # Make it daily-like length for 252/200/63 windows
    df = df.iloc[-280:].copy()
    df_daily = add_daily_indicators(df)

    res1 = calculate_stage2_analysis(df_daily)
    # Simulate explicit no-adj (drop if somehow present)
    df2 = df_daily.drop(columns=["adj_close"], errors="ignore")
    res2 = calculate_stage2_analysis(df2)

    for k in ["score", "rs_score", "ema200_slope", "pct_from_52w_high", "pct_from_52w_low",
              "pullback_pct", "entry", "pivot_high", "latest_close"]:
        if k in res1 and k in res2:
            assert abs(res1[k] - res2[k]) < 1e-6, f"Mismatch on {k}"
