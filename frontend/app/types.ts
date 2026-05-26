export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signals {
  vcp: boolean[];
  sniper: boolean[];
  pullback: boolean[];
  strong_trend: boolean[];
  overbought: boolean[];
  downtrend: boolean[];
}

export interface IntradayIndicators {
  ema21: number[];
  ema50: number[];
  rsi: number[];
  atr: number[];
}

export interface DailyIndicators {
  ema8:  number[];
  ema21: number[];
  ema50: number[];
  ema200: number[];
  atr14: number[];
  gc_upper: (number | null)[];
  gc_mid:   (number | null)[];
  gc_lower: (number | null)[];
}

export interface Stage2Checks {
  price_above_emas: boolean;
  ema200_rising: boolean;
  near_52w_high: boolean;
  above_52w_low: boolean;
  pullback_shallow: boolean;
  rs_strong: boolean;
  volume_contracting: boolean;
}

export interface Stage2 {
  checks: Stage2Checks;
  score: number;
  rs_score: number;
  ema200_slope: number;
  pct_from_52w_high: number;
  pct_from_52w_low: number;
  pullback_pct: number;
  latest_ema8: number | null;
  latest_ema21: number;
  latest_ema50: number;
  latest_ema200: number;
  latest_atr: number;
  entry: number;
  stop: number;
  target: number;
  latest_close: number;
  pivot_high:   number;
  gc_upper:    number | null;
  gc_mid:      number | null;
  gc_lower:    number | null;
  gc_above:    boolean;
  gc_below:    boolean;
  gc_breakout: boolean;
  gc_retest:   boolean;
  market_structure: string;
  higher_high: boolean;
  higher_low: boolean;
  lower_high: boolean;
  lower_low: boolean;
  rsi_divergence_bearish: boolean;
  rsi_divergence_bullish: boolean;
  bear_flag: boolean;
  breadth_narrow: boolean;
}

export interface DailyData {
  symbol: string;
  candles: Candle[];
  indicators: DailyIndicators;
  vol_avg20: number[];
  stage2: Stage2;
  // Phase 1 Conviction (added to backend DailyResponse)
  conviction_score?: number;
  conviction_label?: string;
  conviction_reliability?: 'high' | 'medium' | 'low';
  conviction_notes?: string[];
}

export interface WatchlistItem {
  symbol: string;
  price: number;
  score: number;
  rs_score: number;
  pct_from_52w_high: number;
  checks: Stage2Checks;
  entry: number;
  stop: number;
  target: number;
  latest_atr: number;
  pivot_high: number;
  // Phase 1 Conviction
  conviction_score?: number;
  conviction_label?: string;
  conviction_reliability?: 'high' | 'medium' | 'low';
  conviction_notes?: string[];
}

export interface LatestData {
  symbol: string;
  timeframe: string;
  active_signals: string[];
  latest_price: number;
  latest_rsi: number;
  latest_ema21: number;
  latest_ema50: number;
  latest_atr: number;
  latest_signals: Record<string, boolean>;
}

export interface MacroItem {
  symbol: string;
  name: string;
  price: number | null;
  change_pct_1d: number | null;
  change_pct_5d: number | null;
  ema8: number | null;
  ema21: number | null;
  above_ema8: boolean;
  above_ema21: boolean;
  market_structure: string;
  rsi14: number | null;
}

export interface MacroData {
  macro: MacroItem[];
}

export type Tab = 'intraday' | 'daily' | 'watchlist' | 'macro' | 'sentiment';

// --- Regime ---

export interface RegimeComponents {
  trend: number | null;
  breadth: number | null;
  credit: number | null;
  volatility: number | null;
  momentum: number | null;
}

export interface RegimeDiagnostics {
  spy_vs_ema200_pct: number | null;    // SPY vs EMA200 (%)
  rsp_minus_spy_60d: number | null;    // RSP-SPY 60일 스프레드 (%)
  hyg_ief_ratio_chg_pct: number | null; // HYG/IEF 30일 변화율 (%)
  vix_level: number | null;            // VIX 현재값
  spy_roc_20d: number | null;          // SPY 20일 RoC (%)
}

export interface RegimeData {
  total: number | null;
  regime: 'RISK_ON' | 'CONSTRUCTIVE' | 'MIXED' | 'DEFENSIVE' | 'RISK_OFF' | 'UNKNOWN';
  components: RegimeComponents;
  diagnostics?: RegimeDiagnostics;
  valid_count: number;
}

export const REGIME_META: Record<RegimeData['regime'], { label: string; labelKo: string; color: string; bg: string; desc: string }> = {
  RISK_ON:      { label: 'Risk-On',      labelKo: '강세',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', desc: '매크로 환경이 강세. 추세 추종 전략 유효.' },
  CONSTRUCTIVE: { label: 'Constructive', labelKo: '우호적',  color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/30',       desc: '대체로 건전한 환경. 선별적 진입 가능.' },
  MIXED:        { label: 'Mixed',        labelKo: '혼조',    color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',   desc: '신호가 혼재. 포지션 사이즈 축소 권장.' },
  DEFENSIVE:    { label: 'Defensive',    labelKo: '방어적',  color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   desc: '약세 신호 우세. 현금 비중 늘리기.' },
  RISK_OFF:     { label: 'Risk-Off',     labelKo: '약세',    color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         desc: '리스크 오프. 신규 매수 자제, 방어 포지션.' },
  UNKNOWN:      { label: 'Unknown',      labelKo: '불명',    color: 'text-zinc-400',    bg: 'bg-zinc-800/60 border-zinc-700/40',       desc: '데이터 부족으로 판단 불가.' },
};

// --- Distribution Day ---

export interface DDDetail {
  count: number;
  level: 'OK' | 'WARNING' | 'DANGER';
  dates: string[];
}

export interface DistributionDayData {
  spy: DDDetail;
  qqq: DDDetail;
}

export const DD_META: Record<DDDetail['level'], { label: string; color: string; bg: string; desc: string }> = {
  OK:      { label: '정상 (0~3일)',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', desc: '기관 분배 압력 낮음. 추세 진행 중.' },
  WARNING: { label: '경계 (4~5일)',    color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   desc: '기관이 매도 중. 신규 진입 신중.' },
  DANGER:  { label: '위험 (6일+)',     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         desc: 'O\'Neil: 시장 상단 임박. 포지션 축소 고려.' },
};

export const SIGNAL_META: Record<string, { label: string; color: string; bg: string; action: string; desc: string }> = {
  sniper:       { label: 'Sniper',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', action: '진입',      desc: '21EMA 0.4% 이내 터치 후 반등 — RSI 38~58 구간, 거래량 급증' },
  vcp:          { label: 'VCP',         color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',       action: '돌파진입',   desc: '30캔들 신고가 갱신 + 거래량 2배 + ATR 축소 — 기관 매집 돌파' },
  pullback:     { label: 'Pullback',    color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',   action: '눌림 진입', desc: '고점 대비 4.5~9% 조정 후 EMA 지지 + MACD 전환 — 꿀통 눌림목' },
  strong_trend: { label: 'StrongTrend',color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/30',       action: '홀딩',      desc: '가격 > 21EMA > 50EMA, EMA 기울기 +0.15%, RSI 52~78 — 추세 가속' },
  overbought:   { label: 'Overbought', color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   action: '분할 익절', desc: 'RSI ≥ 76, 21EMA 이격 +3.2%, 5캔들 중 4양봉 — 단기 고점 주의' },
  downtrend:    { label: 'Downtrend',  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         action: '접근 금지', desc: '가격 < 21EMA, EMA 음의 기울기, 거래량 급증 — 떨어지는 칼날' },
};

export const STAGE2_META: Record<keyof Stage2Checks, { label: string; desc: string }> = {
  price_above_emas:   { label: 'Price > EMA21 > EMA50 > EMA200', desc: '가격이 모든 이평선 위에 위치' },
  ema200_rising:      { label: 'EMA200 상승 중',                  desc: 'EMA200 기울기 양수 (추세 상승)' },
  near_52w_high:      { label: '52주 고점 -25% 이내',            desc: '52주 신고가 대비 조정 폭 제한' },
  above_52w_low:      { label: '52주 저점 +30% 이상',            desc: '52주 신저가 대비 충분한 반등' },
  pullback_shallow:   { label: '최근 조정 15% 이내',             desc: '20일 고점 대비 조정이 얕음' },
  rs_strong:          { label: 'RS Score ≥ 50 (vs SPY)',          desc: '63일 수익률 SPY 대비 우위' },
  volume_contracting: { label: '거래량 수축',                     desc: '5일 평균 < 20일 평균 (눌림 확인)' },
};

export const SYMBOLS = ['TSLA', 'AAPL', 'NVDA', 'META', 'AMZN', 'GOOGL'];

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// --- Sentiment (소셜 심리) ---

export interface SymbolSentiment {
  symbol: string;
  as_of: string;
  sentiment: SentimentEnum;
  sentiment_score: number;
  composite_score?: number;
  trend_vs_yesterday: TrendEnum;
  mention_volume: VolumeEnum;
  key_reason: string;
  bot_suspected: 'yes' | 'no' | 'unclear';
  confidence: ConfidenceEnum;
  source: string;
  score_delta: number | null;  // composite_score 기준 전일 대비 delta (float)
  intraday_shift: TrendEnum | null;
}

export interface MarketSentiment {
  as_of: string;
  sentiment: SentimentEnum;
  sentiment_score: number;
  composite_score?: number;
  trend_vs_yesterday: TrendEnum;
  extreme_flag: 'none' | 'extreme_fear' | 'extreme_greed';
  key_reason: string;
  confidence: ConfidenceEnum;
  intraday_shift: TrendEnum | null;
}

export interface SnapshotData {
  generated_at?: string;
  schema_version?: string;
  slot?: 'pre_open' | 'post_close';
  market?: MarketSentiment;
  symbols?: SymbolSentiment[];
}

export interface SentimentData {
  available: boolean;
  latest?: SnapshotData;
  today?: {
    pre_open?: SnapshotData | null;
    post_close?: SnapshotData | null;
  };
  error?: string;
  meta?: FreshnessMeta;  // Phase 4: freshness from backend (fetched_at, age_minutes, source)
}

export type SentimentEnum = 'very_fearful' | 'fearful' | 'neutral' | 'optimistic' | 'euphoric';
export type TrendEnum = 'cooling' | 'stable' | 'heating';
export type VolumeEnum = 'low' | 'normal' | 'elevated' | 'surging';
export type ConfidenceEnum = 'high' | 'med' | 'low';

export const SENTIMENT_META: Record<SentimentEnum, { label: string; color: string; bg: string; score: number }> = {
  very_fearful: { label: '극도 공포', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         score: -2 },
  fearful:      { label: '공포',     color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   score: -1 },
  neutral:      { label: '중립',     color: 'text-zinc-400',    bg: 'bg-zinc-700/30 border-zinc-600/30',       score:  0 },
  optimistic:   { label: '낙관',     color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/30',       score:  1 },
  euphoric:     { label: '도취',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', score:  2 },
};

export const TREND_META: Record<TrendEnum, { icon: string; label: string; color: string }> = {
  heating: { icon: '↑', label: '상승 중', color: 'text-emerald-400' },
  stable:  { icon: '→', label: '유지',    color: 'text-zinc-400'    },
  cooling: { icon: '↓', label: '냉각 중', color: 'text-red-400'     },
};

export const VOLUME_META: Record<VolumeEnum, { label: string; color: string }> = {
  low:      { label: '낮음',  color: 'text-zinc-500'    },
  normal:   { label: '보통',  color: 'text-zinc-400'    },
  elevated: { label: '높음',  color: 'text-yellow-400'  },
  surging:  { label: '급증',  color: 'text-orange-400'  },
};

// --- AI Brief ---

export interface MarketBrief {
  summary: string;
  tone: 'bullish' | 'cautious' | 'bearish' | 'neutral';
  key_themes: string[];
  watch_points: string;
}

export interface SymbolBrief {
  symbol: string;
  setup_quality: 'A+' | 'A' | 'B' | 'C' | 'D';
  brief: string;
  key_risk: string;
  key_opportunity: string;
  action_bias: 'buy' | 'hold' | 'watch' | 'avoid';
}

export interface BriefData {
  generated_at?: string | null;
  schema_version?: string | null;
  slot?: string | null;
  market_brief?: MarketBrief | null;
  symbol_briefs?: SymbolBrief[] | null;
}

export interface BriefResponse {
  available: boolean;
  data?: BriefData | null;
  error?: string | null;
  meta?: FreshnessMeta;  // Phase 4: freshness from backend (fetched_at, age_minutes, source)
}

// --- Earnings Intelligence ---

export interface UpcomingEarning {
  symbol: string;
  earnings_date: string;
  days_until: number;
  relevance_tier?: 'imminent' | 'approaching' | 'watching' | null;
  eps_estimate?: number | null;
  revenue_estimate_b?: number | null;
  historical_beat_rate?: number | null;
  ai_summary: string;
  risk_level: 'high' | 'med' | 'low';
  action_note: string;
}

export interface RecentResult {
  symbol: string;
  report_date: string;
  eps_actual: number;
  eps_estimate: number;
  surprise_pct: number;
  ai_reaction: string;
}

export interface EarningsData {
  generated_at?: string | null;
  schema_version?: string | null;
  upcoming_earnings?: UpcomingEarning[] | null;
  recent_results?: RecentResult[] | null;
}

export interface EarningsResponse {
  available: boolean;
  data?: EarningsData | null;
  error?: string | null;
  meta?: FreshnessMeta;  // Phase 4: freshness from backend (fetched_at, age_minutes, source)
}

export const SETUP_QUALITY_META: Record<string, { color: string; label: string }> = {
  'A+': { color: 'bull',  label: 'A+' },
  'A':  { color: 'teal', label: 'A'  },
  'B':  { color: 'warn', label: 'B'  },
  'C':  { color: 'bear', label: 'C'  },
  'D':  { color: 'bear', label: 'D'  },
};

export const EARNINGS_RISK_META: Record<string, { color: string; dot: string }> = {
  high: { color: 'bear', dot: '●' },
  med:  { color: 'warn', dot: '●' },
  low:  { color: 'teal', dot: '●' },
};

// Freshness metadata for AI-sourced data (sentiment/brief/earnings) — mirrors backend FreshnessMeta (Task 3 / Phase 4)
export interface FreshnessMeta {
  fetched_at: string;
  age_minutes: number;
  source: string;
}
