"""Distribution Day Count — O'Neil 원전 시장 상단 선행 지표.

지난 N(=25) 거래일 중,
거래량이 전일 대비 증가 + 종가가 전일 대비 -0.2% 이하인 날 수.
4~5개: 경계 / 6개 이상: 시장 상단 임박.
"""
from typing import Optional
import pandas as pd

DD_LOOKBACK = 25
DD_THRESHOLD_PCT = -0.2
DD_WARNING = 4
DD_DANGER = 6


def count_distribution_days(df: pd.DataFrame, lookback: int = DD_LOOKBACK) -> Optional[dict]:
    """
    df: 일봉 OHLCV ('close', 'volume' 컬럼 필요)
    반환: { 'count': int, 'level': 'OK'|'WARNING'|'DANGER', 'dates': List[str] }
    """
    if df is None or len(df) < lookback + 1:
        return None

    recent = df.iloc[-(lookback + 1):].copy()
    recent['close_change'] = recent['close'].pct_change() * 100
    recent['vol_increase'] = recent['volume'] > recent['volume'].shift(1)
    recent['is_dd'] = (recent['close_change'] <= DD_THRESHOLD_PCT) & recent['vol_increase']

    dd_window = recent.iloc[1:]
    count = int(dd_window['is_dd'].sum())

    if count >= DD_DANGER:
        level = 'DANGER'
    elif count >= DD_WARNING:
        level = 'WARNING'
    else:
        level = 'OK'

    dd_dates = [
        d.strftime('%Y-%m-%d')
        for d in dd_window.index[dd_window['is_dd']]
    ]
    return {'count': count, 'level': level, 'dates': dd_dates}
