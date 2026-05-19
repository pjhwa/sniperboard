import yfinance as yf
import pandas as pd
import pandas_ta as ta
import numpy as np

ticker = "TSLA"
print(f"{ticker} 5분봉 데이터 분석 중...\n")

df = yf.download(tickers=ticker, period="5d", interval="5m", progress=False)
df.columns = df.columns.get_level_values(0)
df = df.rename(columns={
    "Open": "open", "High": "high", "Low": "low",
    "Close": "close", "Volume": "volume"
})
df = df.dropna().reset_index(drop=True)

def add_indicators(df):
    df['ema21'] = ta.ema(df['close'], length=21)
    df['ema50'] = ta.ema(df['close'], length=50)
    df['rsi'] = ta.rsi(df['close'], length=14)
    df['atr'] = ta.atr(df['high'], df['low'], df['close'], length=14)
    macd_df = ta.macd(df['close'], fast=12, slow=26, signal=9)
    df['macd_hist'] = macd_df['MACDh_12_26_9'].fillna(0) if macd_df is not None else 0
    df['vol_avg20'] = df['volume'].rolling(20).mean()
    return df

df = add_indicators(df)
df = df.dropna().reset_index(drop=True)

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
    'VCP': get_vcp(),
    'Sniper': get_sniper(),
    'Pullback': get_pullback(),
    'StrongTrend': get_strong_trend(),
    'Overbought': get_overbought(),
    'Downtrend': get_downtrend()
}

print(f"=== {ticker} 최근 15개 캔들 상세 신호 ===\n")
print(f"{'시간':<17} | {'종가':>8} | {'신호':<40}")
print("-" * 70)

for i in range(-15, 0):
    active = [name for name, sig in signals.items() if sig[i]]
    status = ", ".join(active) if active else "신호 없음"
    print(f"Row {len(df)+i:3d} | {close[i]:>8.2f} | {status}")

print("\n=== 최종 요약 ===")
latest = {name: sig[-1] for name, sig in signals.items()}
for name, triggered in latest.items():
    if triggered:
        print(f"  {name}: 현재 발생 중")
if not any(latest.values()):
    print("  현재 뚜렷한 신호 없음")