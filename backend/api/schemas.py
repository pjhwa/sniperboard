from pydantic import BaseModel
from typing import List, Dict, Optional, Any

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
    ema8:  List[float]
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
    latest_ema8: Optional[float] = None
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
    # 시장 구조
    market_structure: str = 'NEUTRAL'
    higher_high: bool = False
    higher_low: bool = False
    lower_high: bool = False
    lower_low: bool = False
    rsi_divergence_bearish: bool = False
    rsi_divergence_bullish: bool = False
    bear_flag: bool = False
    breadth_narrow: bool = False

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

class MacroItemSchema(BaseModel):
    symbol: str
    name: str
    price: Optional[float] = None
    change_pct_1d: Optional[float] = None
    change_pct_5d: Optional[float] = None
    ema8: Optional[float] = None
    ema21: Optional[float] = None
    above_ema8: bool = False
    above_ema21: bool = False
    market_structure: str = 'NEUTRAL'
    rsi14: Optional[float] = None

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

class MacroResponse(BaseModel):
    macro: List[MacroItemSchema]


# --- Regime + Distribution Day ---

class RegimeComponentsSchema(BaseModel):
    trend: Optional[float] = None
    breadth: Optional[float] = None
    credit: Optional[float] = None
    volatility: Optional[float] = None
    momentum: Optional[float] = None

class RegimeResponse(BaseModel):
    total: Optional[float] = None
    regime: str
    components: RegimeComponentsSchema
    valid_count: int

class DDDetailSchema(BaseModel):
    count: int
    level: str
    dates: List[str]

class DistributionDayResponse(BaseModel):
    spy: DDDetailSchema
    qqq: DDDetailSchema


# --- Sentiment (소셜 심리) ---

class SymbolSentiment(BaseModel):
    symbol: str
    as_of: str
    sentiment: str
    sentiment_score: int
    composite_score: Optional[float] = None
    trend_vs_yesterday: str
    mention_volume: str
    key_reason: str
    bot_suspected: str
    confidence: str
    source: str
    score_delta: Optional[int] = None
    intraday_shift: Optional[str] = None

class MarketSentiment(BaseModel):
    as_of: str
    sentiment: str
    sentiment_score: int
    composite_score: Optional[float] = None
    trend_vs_yesterday: str
    extreme_flag: str
    key_reason: str
    confidence: str
    intraday_shift: Optional[str] = None

class SnapshotData(BaseModel):
    generated_at: Optional[str] = None
    schema_version: Optional[str] = None
    slot: Optional[str] = None
    market: Optional[MarketSentiment] = None
    symbols: Optional[List[SymbolSentiment]] = None


class TodaySlots(BaseModel):
    pre_open: Optional[SnapshotData] = None
    post_close: Optional[SnapshotData] = None


class SentimentResponse(BaseModel):
    available: bool
    latest: Optional[SnapshotData] = None
    today: Optional[TodaySlots] = None
    error: Optional[str] = None
