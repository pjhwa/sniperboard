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
