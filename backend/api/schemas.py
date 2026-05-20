from pydantic import BaseModel
from typing import List, Dict, Optional

# --- 기본 서브 모델 ---

class CandleSchema(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class SignalsSchema(BaseModel):
    vcp: List[bool]
    sniper: List[bool]
    pullback: List[bool]
    strong_trend: List[bool]
    overbought: List[bool]
    downtrend: List[bool]

class IntradayIndicatorsSchema(BaseModel):
    ema21: List[float]
    ema50: List[float]
    rsi: List[float]
    atr: List[float]

class DailyIndicatorsSchema(BaseModel):
    ema21: List[float]
    ema50: List[float]
    ema200: List[float]
    atr14: List[float]
    gc_upper: List[Optional[float]]
    gc_mid: List[Optional[float]]
    gc_lower: List[Optional[float]]

class Stage2ChecksSchema(BaseModel):
    price_above_emas: bool
    ema200_rising: bool
    near_52w_high: bool
    above_52w_low: bool
    pullback_shallow: bool
    rs_strong: bool
    volume_contracting: bool

class Stage2Schema(BaseModel):
    checks: Stage2ChecksSchema
    score: int
    rs_score: float
    ema200_slope: float
    pct_from_52w_high: float
    pct_from_52w_low: float
    pullback_pct: float
    latest_ema21: float
    latest_ema50: float
    latest_ema200: float
    latest_atr: float
    entry: float
    stop: float
    target: float
    latest_close: float
    pivot_high: float
    gc_upper: Optional[float] = None
    gc_mid: Optional[float] = None
    gc_lower: Optional[float] = None
    gc_above: bool
    gc_below: bool
    gc_breakout: bool
    gc_retest: bool

class WatchlistItemSchema(BaseModel):
    symbol: str
    price: float
    score: int
    rs_score: float
    pct_from_52w_high: float
    checks: Stage2ChecksSchema
    entry: float
    stop: float
    target: float
    latest_atr: float
    pivot_high: float


# --- API 응답 모델 ---

class OHLCVResponse(BaseModel):
    symbol: str
    timeframe: str
    candles: List[CandleSchema]
    signals: SignalsSchema
    indicators: IntradayIndicatorsSchema

class LatestSignalResponse(BaseModel):
    symbol: str
    timeframe: str
    active_signals: List[str]
    latest_price: float
    latest_rsi: float
    latest_ema21: float
    latest_ema50: float
    latest_atr: float
    latest_signals: Dict[str, bool]

class DailyResponse(BaseModel):
    symbol: str
    candles: List[CandleSchema]
    indicators: DailyIndicatorsSchema
    vol_avg20: List[int]
    stage2: Stage2Schema

class WatchlistResponse(BaseModel):
    watchlist: List[WatchlistItemSchema]
