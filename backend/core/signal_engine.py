import pandas as pd
import numpy as np
from typing import Dict, List

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

def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = ema(series, fast)
    ema_slow = ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = ema(macd_line, signal)
    hist = macd_line - signal_line
    return hist

def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df['ema21'] = ema(df['close'], 21)
    df['ema50'] = ema(df['close'], 50)
    df['rsi'] = rsi(df['close'], 14)
    df['atr'] = atr(df['high'], df['low'], df['close'], 14)
    df['macd_hist'] = macd(df['close'])
    df['vol_avg20'] = df['volume'].rolling(20).mean()
    return df

def calculate_signals(df: pd.DataFrame):
    """
    Returns (processed_df, signals_dict) where processed_df has indicators
    and signals_dict arrays align 1-to-1 with processed_df rows.
    """
    df = add_indicators(df)
    df = df.dropna()  # DatetimeIndex 유지 — reset_index 하면 정수 인덱스로 바뀌어 time 문자열 깨짐

    close = df['close'].values
    volume = df['volume'].values
    ema21 = df['ema21'].values
    ema50 = df['ema50'].values
    rsi = df['rsi'].values
    atr = df['atr'].values
    macd_hist = df['macd_hist'].values
    vol_avg20 = df['vol_avg20'].values

    def get_vcp():
        cond1 = close == pd.Series(close).rolling(30).max().values
        cond2 = volume >= vol_avg20 * 2.0
        cond3 = close > ema21
        cond4 = pd.Series(np.diff(atr, prepend=0)).rolling(8).apply(lambda x: (x < 0).all()).values == 1
        cond5 = ema21 > ema50
        return cond1 & cond2 & cond3 & cond4 & cond5

    def get_sniper():
        ema_touch = (np.abs(close - ema21) / ema21 * 100) <= 0.4
        rsi_range = (rsi >= 38) & (rsi <= 58)
        close_above = close > ema21
        vol_up = volume >= np.roll(volume, 1) * 1.4
        return ema_touch & rsi_range & close_above & vol_up

    def get_pullback():
        recent_high = pd.Series(close).rolling(15).max().values
        pullback = (recent_high - close) / recent_high * 100
        cond1 = (pullback >= 4.5) & (pullback <= 9)
        cond2 = (close <= ema21 * 1.01) | (close <= ema50 * 1.01)
        cond3 = pd.Series(np.diff(macd_hist, prepend=0)).rolling(3).apply(lambda x: (x > 0).all()).values == 1
        cond4 = volume < pd.Series(volume).shift(1).rolling(5).mean().values
        return cond1 & cond2 & cond3 & cond4

    def get_strong_trend():
        cond1 = (close > ema21) & (ema21 > ema50)
        ema_slope = (ema21 - pd.Series(ema21).shift(5).values) / pd.Series(ema21).shift(5).values * 100
        cond2 = ema_slope >= 0.15
        cond3 = (rsi >= 52) & (rsi <= 78)
        cond4 = volume >= vol_avg20 * 0.9
        return cond1 & cond2 & cond3 & cond4

    def get_overbought():
        cond1 = rsi >= 76
        up_candles = pd.Series(close > pd.Series(close).shift(1).values).rolling(5).sum().values
        cond2 = up_candles >= 4
        cond3 = (close - ema21) / ema21 * 100 >= 3.2
        cond4 = volume < pd.Series(volume).shift(1).rolling(3).mean().values
        return cond1 & cond2 & cond3 & cond4

    def get_downtrend():
        cond1 = close < ema21
        ema_slope = (ema21 - pd.Series(ema21).shift(5).values) / pd.Series(ema21).shift(5).values * 100
        cond2 = ema_slope < 0
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


def add_daily_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Add EMA21/50/200 and ATR14 to a daily OHLCV DataFrame. Drops NaN rows."""
    df = df.copy()
    df['ema21'] = ema(df['close'], 21)
    df['ema50'] = ema(df['close'], 50)
    df['ema200'] = ema(df['close'], 200)
    df['atr14'] = atr(df['high'], df['low'], df['close'], 14)
    df['vol_avg20'] = df['volume'].rolling(20).mean()
    return df.dropna()


def calculate_stage2_analysis(df: pd.DataFrame, spy_close: pd.Series = None) -> dict:
    """
    Minervini Stage 2 analysis. df must have columns added by add_daily_indicators.
    Returns 7 checks, score, RS score, key levels, and suggested entry/stop/target.
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
    }
