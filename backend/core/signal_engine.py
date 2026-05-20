import pandas as pd
import numpy as np
from typing import Dict, List, Tuple

def ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()

def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    tr1 = high - low
    tr2 = (high - close.shift()).abs()
    tr3 = (low - close.shift()).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return tr.rolling(window=period).mean()

def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.Series:
    ema_fast = ema(series, fast)
    ema_slow = ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = ema(macd_line, signal)
    hist = macd_line - signal_line
    return hist

def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['ema21'] = ema(df['close'], 21)
    df['ema50'] = ema(df['close'], 50)
    df['rsi'] = rsi(df['close'], 14)
    df['atr'] = atr(df['high'], df['low'], df['close'], 14)
    df['macd_hist'] = macd(df['close'])
    df['vol_avg20'] = df['volume'].rolling(20).mean()
    return df

def calculate_signals(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, List[bool]]]:
    """
    지표가 추가된 DataFrame과 매칭되는 6개 신호(Boolean list) 딕셔너리를 반환합니다.
    """
    df = add_indicators(df)
    df = df.dropna().copy()  # DatetimeIndex 유지 및 명시적 복사 수행

    close = df['close'].values
    volume = df['volume'].values
    ema21 = df['ema21'].values
    ema50 = df['ema50'].values
    rsi_vals = df['rsi'].values
    atr_vals = df['atr'].values
    macd_hist = df['macd_hist'].values
    vol_avg20 = df['vol_avg20'].values

    # VCP 신호 조건 계산
    def get_vcp() -> np.ndarray:
        cond1 = close == pd.Series(close).rolling(30).max().values
        cond2 = volume >= vol_avg20 * 2.0
        cond3 = close > ema21
        # 최적화: 람다 apply 대신 diff가 음수인 건수가 8개 연속인지(rolling.sum() == 8) 판단
        atr_diff_neg = pd.Series(np.diff(atr_vals, prepend=atr_vals[0])) < 0
        cond4 = (atr_diff_neg.rolling(8).sum() == 8).values
        cond5 = ema21 > ema50
        return cond1 & cond2 & cond3 & cond4 & cond5

    # Sniper 신호 조건 계산
    def get_sniper() -> np.ndarray:
        ema_touch = (np.abs(close - ema21) / ema21 * 100) <= 0.4
        rsi_range = (rsi_vals >= 38) & (rsi_vals <= 58)
        close_above = close > ema21
        vol_up = volume >= np.roll(volume, 1) * 1.4
        # 첫 캔들의 np.roll은 의미 없으므로 무효화 처리
        vol_up[0] = False
        return ema_touch & rsi_range & close_above & vol_up

    # Pullback 신호 조건 계산
    def get_pullback() -> np.ndarray:
        recent_high = pd.Series(close).rolling(15).max().values
        pullback = (recent_high - close) / recent_high * 100
        cond1 = (pullback >= 4.5) & (pullback <= 9)
        cond2 = (close <= ema21 * 1.01) | (close <= ema50 * 1.01)
        # 최적화: macd_hist 상승 전환 3캔들 연속 조건 (rolling.sum() == 3)
        macd_diff_pos = pd.Series(np.diff(macd_hist, prepend=macd_hist[0])) > 0
        cond3 = (macd_diff_pos.rolling(3).sum() == 3).values
        cond4 = volume < pd.Series(volume).shift(1).rolling(5).mean().values
        return cond1 & cond2 & cond3 & cond4

    # StrongTrend 신호 조건 계산
    def get_strong_trend() -> np.ndarray:
        cond1 = (close > ema21) & (ema21 > ema50)
        ema21_series = pd.Series(ema21)
        ema_slope = (ema21_series - ema21_series.shift(5)) / ema21_series.shift(5) * 100
        cond2 = (ema_slope >= 0.15).values
        cond3 = (rsi_vals >= 52) & (rsi_vals <= 78)
        cond4 = volume >= vol_avg20 * 0.9
        return cond1 & cond2 & cond3 & cond4

    # Overbought 신호 조건 계산
    def get_overbought() -> np.ndarray:
        cond1 = rsi_vals >= 76
        close_series = pd.Series(close)
        up_candles = (close_series > close_series.shift(1)).rolling(5).sum().values
        cond2 = up_candles >= 4
        cond3 = (close - ema21) / ema21 * 100 >= 3.2
        cond4 = volume < pd.Series(volume).shift(1).rolling(3).mean().values
        return cond1 & cond2 & cond3 & cond4

    # Downtrend 신호 조건 계산
    def get_downtrend() -> np.ndarray:
        cond1 = close < ema21
        ema21_series = pd.Series(ema21)
        ema_slope = (ema21_series - ema21_series.shift(5)) / ema21_series.shift(5) * 100
        cond2 = (ema_slope < 0).values
        cond3 = volume >= vol_avg20 * 1.3
        cond4 = close < pd.Series(close).rolling(8).min().shift(1).values
        return cond1 & cond2 & cond3 & cond4

    signals = {
        "vcp": get_vcp().tolist(),
        "sniper": get_sniper().tolist(),
        "pullback": get_pullback().tolist(),
        "strong_trend": get_strong_trend().tolist(),
        "overbought": get_overbought().tolist(),
        "downtrend": get_downtrend().tolist(),
    }
    return df, signals

def gaussian_channel(close: pd.Series, high: pd.Series, low: pd.Series,
                     period: int = 100, mult: float = 1.5) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    인과 관계 가우시안 커널 채널을 계산합니다.
    """
    sigma = period / 3.0
    k = np.arange(period, dtype=float)
    weights = np.exp(-0.5 * (k / sigma) ** 2)
    weights /= weights.sum()

    def _gwma(arr: np.ndarray) -> np.ndarray:
        valid = np.convolve(arr.astype(float), weights, mode='valid')
        return np.concatenate([np.full(period - 1, np.nan), valid])

    g_mid   = _gwma(close.values)
    g_high  = _gwma(high.values)
    g_low   = _gwma(low.values)

    half   = (g_high - g_low) / 2.0 * mult
    center = (g_high + g_low) / 2.0
    return center, center + half, center - half

def add_daily_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """일봉 데이터프레임에 EMA21/50/200, ATR14, 가우시안 채널 지표를 추가합니다."""
    df = df.copy()
    df['ema21'] = ema(df['close'], 21)
    df['ema50'] = ema(df['close'], 50)
    df['ema200'] = ema(df['close'], 200)
    df['atr14'] = atr(df['high'], df['low'], df['close'], 14)
    df['vol_avg20'] = df['volume'].rolling(20).mean()

    gc_mid, gc_upper, gc_lower = gaussian_channel(df['close'], df['high'], df['low'], period=100, mult=1.5)
    df['gc_mid']   = gc_mid
    df['gc_upper'] = gc_upper
    df['gc_lower'] = gc_lower

    return df.dropna()

def calculate_stage2_analysis(df: pd.DataFrame, spy_close: pd.Series = None) -> dict:
    """
    Minervini Stage 2 분석을 수행합니다.
    """
    if df.empty:
        return {}

    close = df['close']
    high_arr = df['high']
    low_arr = df['low']
    volume = df['volume']

    latest_close = float(close.iloc[-1])
    latest_ema21 = float(df['ema21'].iloc[-1])
    latest_ema50 = float(df['ema50'].iloc[-1])
    latest_ema200 = float(df['ema200'].iloc[-1])
    latest_atr = float(df['atr14'].iloc[-1])

    ema200_slope = 0.0
    if len(df) >= 20:
        base = float(df['ema200'].iloc[-20])
        if base != 0:
            ema200_slope = (float(df['ema200'].iloc[-1]) - base) / base * 100

    window = min(252, len(df))
    high52 = float(high_arr.iloc[-window:].max())
    low52 = float(low_arr.iloc[-window:].min())
    pct_from_52w_high = (latest_close - high52) / high52 * 100 if high52 != 0 else 0.0
    pct_from_52w_low = (latest_close - low52) / low52 * 100 if low52 != 0 else 0.0

    recent_high = float(close.rolling(20).max().iloc[-1])
    pullback_pct = (recent_high - latest_close) / recent_high * 100 if recent_high > 0 else 0.0

    vol_avg20 = float(volume.rolling(20).mean().iloc[-1])
    vol_last5 = float(volume.iloc[-5:].mean())
    vol_contracting = bool(vol_last5 < vol_avg20)

    rs_score = 50.0
    if spy_close is not None and len(df) >= 63 and len(spy_close) >= 63:
        try:
            stock_ret = (float(close.iloc[-1]) - float(close.iloc[-63])) / float(close.iloc[-63]) * 100
            spy_ret = (float(spy_close.iloc[-1]) - float(spy_close.iloc[-63])) / float(spy_close.iloc[-63]) * 100
            rs_score = min(100.0, max(0.0, 50.0 + (stock_ret - spy_ret) * 2.0))
        except Exception:
            pass

    checks = {
        'price_above_emas': bool(latest_close > latest_ema21 and latest_ema21 > latest_ema50 and latest_ema50 > latest_ema200),
        'ema200_rising': bool(ema200_slope > 0),
        'near_52w_high': bool(pct_from_52w_high >= -25),
        'above_52w_low': bool(pct_from_52w_low >= 30),
        'pullback_shallow': bool(pullback_pct <= 15),
        'rs_strong': bool(rs_score >= 50),
        'volume_contracting': bool(vol_contracting),
    }
    score = sum(1 for v in checks.values() if v)

    pivot = recent_high
    entry = round(pivot * 1.005, 2)
    stop = round(entry - 2 * latest_atr, 2)
    risk_per_share = entry - stop
    target = round(entry + 3 * risk_per_share, 2)

    # Gaussian Channel 분석
    gc_upper_val = gc_mid_val = gc_lower_val = None
    gc_above = gc_below = gc_breakout = gc_retest = False

    if 'gc_upper' in df.columns and df['gc_upper'].notna().any():
        gc_u = df['gc_upper'].values
        gc_m = df['gc_mid'].values
        gc_l = df['gc_lower'].values
        cl   = close.values

        gc_upper_val = float(gc_u[-1])
        gc_mid_val   = float(gc_m[-1])
        gc_lower_val = float(gc_l[-1])

        gc_above = bool(cl[-1] > gc_u[-1])
        gc_below = bool(cl[-1] < gc_l[-1])

        n_gc = len(cl)
        if n_gc >= 2 and not np.isnan(gc_u[-2]):
            gc_breakout = bool(cl[-2] <= gc_u[-2] and cl[-1] > gc_u[-1])

        lookback = min(20, n_gc - 1)
        recent_was_above = any(
            (not np.isnan(gc_u[-(i + 1)]) and cl[-(i + 1)] > gc_u[-(i + 1)])
            for i in range(1, lookback + 1)
        )
        near_upper = abs(cl[-1] - gc_upper_val) / gc_upper_val * 100 <= 3.0
        gc_retest = bool(recent_was_above and near_upper and not gc_above)

    return {
        'checks': checks,
        'score': score,
        'rs_score': round(rs_score, 1),
        'ema200_slope': round(ema200_slope, 3),
        'pct_from_52w_high': round(pct_from_52w_high, 2),
        'pct_from_52w_low': round(pct_from_52w_low, 2),
        'pullback_pct': round(pullback_pct, 2),
        'latest_ema21': round(latest_ema21, 2),
        'latest_ema50': round(latest_ema50, 2),
        'latest_ema200': round(latest_ema200, 2),
        'latest_atr': round(latest_atr, 4),
        'entry': entry,
        'stop': stop,
        'target': target,
        'latest_close': round(latest_close, 2),
        'pivot_high':   round(recent_high, 2),
        'gc_upper': round(gc_upper_val, 2) if gc_upper_val is not None else None,
        'gc_mid':   round(gc_mid_val,   2) if gc_mid_val   is not None else None,
        'gc_lower': round(gc_lower_val, 2) if gc_lower_val is not None else None,
        'gc_above':    gc_above,
        'gc_below':    gc_below,
        'gc_breakout': gc_breakout,
        'gc_retest':   gc_retest,
    }
