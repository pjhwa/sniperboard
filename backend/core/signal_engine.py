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
