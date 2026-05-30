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
    # 월봉 추세 (10개월 EMA 기반)
    monthly_phase: str = 'UNKNOWN'
    monthly_uptrend_confirmed: bool = False
    monthly_ema10: Optional[float] = None
    pct_from_monthly_ema10: Optional[float] = None

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
    # Phase 1: Conviction Composite Score
    conviction_score: Optional[float] = None
    conviction_label: Optional[str] = None
    conviction_reliability: Optional[str] = None  # high / medium / low
    conviction_notes: Optional[List[str]] = None
    # 월봉 추세
    monthly_phase: str = 'UNKNOWN'
    monthly_uptrend_confirmed: bool = False

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
    # Phase 1: Conviction Composite Score
    conviction_score: Optional[float] = None
    conviction_label: Optional[str] = None
    conviction_reliability: Optional[str] = None  # high / medium / low
    conviction_notes: Optional[List[str]] = None

class WatchlistResponse(BaseModel):
    watchlist: List[WatchlistItemSchema]

class MacroResponse(BaseModel):
    macro: List[MacroItemSchema]


# --- Macro Insight ---

class MacroGroupInsight(BaseModel):
    signal: str          # green / yellow / red
    direction: str       # improving / stable / deteriorating
    text: Optional[str] = None

class MacroOverallInsight(BaseModel):
    judgment: str        # RISK_ON / MIXED / RISK_OFF
    green_count: int
    red_count: int
    summary: Optional[str] = None
    bullets: List[str] = []

class MacroAiMeta(BaseModel):
    generated_at: str
    age_minutes: int

class MacroInsightResponse(BaseModel):
    overall: MacroOverallInsight
    groups: Dict[str, MacroGroupInsight]
    ai_meta: Optional[MacroAiMeta] = None


# --- Regime + Distribution Day ---

class RegimeComponentsSchema(BaseModel):
    trend: Optional[float] = None
    breadth: Optional[float] = None
    credit: Optional[float] = None
    volatility: Optional[float] = None
    momentum: Optional[float] = None

class RegimeDiagnosticsSchema(BaseModel):
    spy_vs_ema200_pct: Optional[float] = None   # Trend 원시값
    rsp_minus_spy_60d: Optional[float] = None   # Breadth 원시값 (RSP-SPY 60일 스프레드)
    hyg_ief_ratio_chg_pct: Optional[float] = None  # Credit 원시값
    vix_level: Optional[float] = None           # Volatility 원시값
    spy_roc_20d: Optional[float] = None         # Momentum 원시값

class RegimeResponse(BaseModel):
    total: Optional[float] = None
    regime: str
    components: RegimeComponentsSchema
    diagnostics: Optional[RegimeDiagnosticsSchema] = None
    valid_count: int

class DDDetailSchema(BaseModel):
    count: int
    level: str
    dates: List[str]

class DistributionDayResponse(BaseModel):
    spy: DDDetailSchema
    qqq: DDDetailSchema


class FreshnessMeta(BaseModel):
    """Freshness metadata for externally-sourced AI data (sentiment/brief/earnings).
    Added in Task 3 for yfinance accuracy hardening follow-up.
    """
    fetched_at: str
    age_minutes: float
    source: str


class TopNews(BaseModel):
    headline: str
    summary: str
    source: str


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
    score_delta: Optional[float] = None
    intraday_shift: Optional[str] = None
    top_news: Optional[TopNews] = None

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
    top_news: Optional[TopNews] = None

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
    meta: Optional[FreshnessMeta] = None


# --- AI Brief ---

class MarketBrief(BaseModel):
    summary: str
    tone: str  # "bullish" | "cautious" | "bearish" | "neutral"
    key_themes: List[str]
    watch_points: str

class SymbolBrief(BaseModel):
    symbol: str
    setup_quality: str  # "A+" | "A" | "B" | "C" | "D"
    brief: str
    key_risk: str
    key_opportunity: str
    action_bias: str  # "buy" | "hold" | "watch" | "avoid"

class BriefData(BaseModel):
    generated_at: Optional[str] = None
    schema_version: Optional[str] = None
    slot: Optional[str] = None
    market_brief: Optional[MarketBrief] = None
    symbol_briefs: Optional[List[SymbolBrief]] = None

class BriefResponse(BaseModel):
    available: bool
    data: Optional[BriefData] = None
    error: Optional[str] = None
    meta: Optional[FreshnessMeta] = None
    context: Optional[dict] = None   # Phase 1: Context Attribution snapshot at generation time


# --- Earnings Intelligence ---

class UpcomingEarning(BaseModel):
    symbol: str
    earnings_date: str
    days_until: int
    eps_estimate: Optional[float] = None
    revenue_estimate_b: Optional[float] = None
    historical_beat_rate: Optional[float] = None
    ai_summary: str
    risk_level: str  # "high" | "med" | "low"
    action_note: str

class RecentResult(BaseModel):
    symbol: str
    report_date: str
    eps_actual: float
    eps_estimate: float
    surprise_pct: float
    ai_reaction: str

class EarningsData(BaseModel):
    generated_at: Optional[str] = None
    schema_version: Optional[str] = None
    upcoming_earnings: Optional[List[UpcomingEarning]] = None
    recent_results: Optional[List[RecentResult]] = None

class EarningsResponse(BaseModel):
    available: bool
    data: Optional[EarningsData] = None
    error: Optional[str] = None
    meta: Optional[FreshnessMeta] = None


# --- Sentiment History ---

class SentimentHistoryPoint(BaseModel):
    time: str
    score: float
    slot: str
    sentiment: str


class SentimentHistoryResponse(BaseModel):
    symbol: str
    days: int
    points: List[SentimentHistoryPoint]


class PrePostResponse(BaseModel):
    symbol: str
    market_state: str  # "PRE" | "POST" | "REGULAR" | "CLOSED" | "OVERNIGHT"
    pre_market_price: Optional[float] = None
    pre_market_change_pct: Optional[float] = None
    post_market_price: Optional[float] = None
    post_market_change_pct: Optional[float] = None
    overnight_price: Optional[float] = None
    overnight_change_pct: Optional[float] = None
    regular_close: Optional[float] = None
    regular_change_pct: Optional[float] = None  # regularMarketChangePercent from yfinance
