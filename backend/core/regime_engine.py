"""Risk Regime 5요소 종합 점수 — 매크로 환경 분류.

5요소 각 0~20점. 누락은 None. 유효 컴포넌트 3개 이상일 때만 합산.
임계값은 명시 상수.
"""
from typing import Optional, Dict
import pandas as pd

TREND_LOW, TREND_HIGH = -5.0, 10.0
BREADTH_LOW, BREADTH_HIGH = -5.0, 3.0
CREDIT_LOW, CREDIT_HIGH = -2.0, 1.0
VOL_LOW, VOL_HIGH = 14.0, 30.0
MOMENTUM_LOW, MOMENTUM_HIGH = -5.0, 5.0


def _linear(value: float, lo: float, hi: float, invert: bool = False) -> Optional[float]:
    if pd.isna(value):
        return None
    if invert:
        lo, hi = hi, lo
    span_lo = min(lo, hi)
    span_hi = max(lo, hi)
    clamped = max(min(value, span_hi), span_lo)
    return (clamped - lo) / (hi - lo) * 20.0


def compute_regime(dfs: Dict[str, Optional[pd.DataFrame]]) -> dict:
    def _close(s: str) -> pd.Series:
        df = dfs.get(s)
        if df is not None and not df.empty and 'close' in df.columns:
            return df['close']
        return pd.Series(dtype=float)

    spy = _close('SPY')
    rsp = _close('RSP')
    hyg = _close('HYG')
    ief = _close('IEF')
    vix = _close('^VIX')

    # 1. Trend: SPY vs EMA200
    trend = None
    if len(spy) >= 200:
        ema200 = spy.ewm(span=200, adjust=False).mean().iloc[-1]
        if ema200 != 0:
            trend = _linear((spy.iloc[-1] - ema200) / ema200 * 100, TREND_LOW, TREND_HIGH)

    # 2. Breadth: RSP - SPY 60일 상대성과
    breadth = None
    if len(rsp) >= 60 and len(spy) >= 60:
        rsp_ret = (rsp.iloc[-1] / rsp.iloc[-60] - 1) * 100
        spy_ret = (spy.iloc[-1] / spy.iloc[-60] - 1) * 100
        breadth = _linear(rsp_ret - spy_ret, BREADTH_LOW, BREADTH_HIGH)

    # 3. Credit: HYG/IEF 30일 변화율
    credit = None
    if len(hyg) >= 30 and len(ief) >= 30:
        ratio_now  = hyg.iloc[-1]  / ief.iloc[-1]
        ratio_prev = hyg.iloc[-30] / ief.iloc[-30]
        if ratio_prev != 0:
            credit = _linear((ratio_now / ratio_prev - 1) * 100, CREDIT_LOW, CREDIT_HIGH)

    # 4. Volatility: ^VIX (낮을수록 risk-on)
    vol = None
    if len(vix) >= 1:
        vol = _linear(float(vix.iloc[-1]), VOL_LOW, VOL_HIGH, invert=True)

    # 5. Momentum: SPY 20일 RoC
    momentum = None
    if len(spy) >= 20 and float(spy.iloc[-20]) != 0:
        momentum = _linear((spy.iloc[-1] / spy.iloc[-20] - 1) * 100, MOMENTUM_LOW, MOMENTUM_HIGH)

    components = {
        'trend':      round(trend,    1) if trend    is not None else None,
        'breadth':    round(breadth,  1) if breadth  is not None else None,
        'credit':     round(credit,   1) if credit   is not None else None,
        'volatility': round(vol,      1) if vol      is not None else None,
        'momentum':   round(momentum, 1) if momentum is not None else None,
    }
    valid = [v for v in components.values() if v is not None]
    if len(valid) < 3:
        return {
            'total': None, 'regime': 'UNKNOWN',
            'components': components, 'valid_count': len(valid),
        }

    total = sum(valid) / len(valid) * 5
    if   total >= 80: regime = 'RISK_ON'
    elif total >= 60: regime = 'CONSTRUCTIVE'
    elif total >= 40: regime = 'MIXED'
    elif total >= 20: regime = 'DEFENSIVE'
    else:             regime = 'RISK_OFF'

    return {
        'total': round(total, 1),
        'regime': regime,
        'components': components,
        'valid_count': len(valid),
    }
