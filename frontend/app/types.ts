import type { BiLang } from './i18n'

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
  monthly_phase: string;
  monthly_uptrend_confirmed: boolean;
  monthly_ema10: number | null;
  pct_from_monthly_ema10: number | null;
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
  tier?: 1 | 2;
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
  // 월봉 추세
  monthly_phase?: string;
  monthly_uptrend_confirmed?: boolean;
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

export interface MacroGroupInsight {
  signal: 'green' | 'yellow' | 'red';
  direction: 'improving' | 'stable' | 'deteriorating';
  text: string | null;
  text_en: string | null;
  text_ko: string | null;
}

export interface MacroOverallInsight {
  judgment: 'RISK_ON' | 'MIXED' | 'RISK_OFF';
  green_count: number;
  red_count: number;
  summary: string | null;
  summary_en: string | null;
  summary_ko: string | null;
  bullets: string[];
  bullets_en: string[];
  bullets_ko: string[];
}

export interface MacroAiMeta {
  generated_at: string;
  age_minutes: number;
}

export interface MacroInsightData {
  overall: MacroOverallInsight;
  groups: Record<string, MacroGroupInsight>;
  ai_meta: MacroAiMeta | null;
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

export const REGIME_META: Record<RegimeData['regime'], { label: BiLang; color: string; bg: string; desc: BiLang }> = {
  RISK_ON: {
    label: { en: 'Risk-On', ko: '강세' },
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: { en: 'Macro environment is bullish. Trend-following strategies effective.', ko: '매크로 환경이 강세. 추세 추종 전략 유효.' },
  },
  CONSTRUCTIVE: {
    label: { en: 'Constructive', ko: '우호적' },
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/30',
    desc: { en: 'Generally healthy environment. Selective entry possible.', ko: '대체로 건전한 환경. 선별적 진입 가능.' },
  },
  MIXED: {
    label: { en: 'Mixed', ko: '혼조' },
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    desc: { en: 'Mixed signals. Reduce position size.', ko: '신호가 혼재. 포지션 사이즈 축소 권장.' },
  },
  DEFENSIVE: {
    label: { en: 'Defensive', ko: '방어적' },
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    desc: { en: 'Bearish signals dominant. Increase cash position.', ko: '약세 신호 우세. 현금 비중 늘리기.' },
  },
  RISK_OFF: {
    label: { en: 'Risk-Off', ko: '약세' },
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    desc: { en: 'Risk-off. Avoid new buys, hold defensive positions.', ko: '리스크 오프. 신규 매수 자제, 방어 포지션.' },
  },
  UNKNOWN: {
    label: { en: 'Unknown', ko: '불명' },
    color: 'text-zinc-400',
    bg: 'bg-zinc-800/60 border-zinc-700/40',
    desc: { en: 'Insufficient data to determine regime.', ko: '데이터 부족으로 판단 불가.' },
  },
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

export const DD_META: Record<DDDetail['level'], { label: BiLang; color: string; bg: string; desc: BiLang }> = {
  OK: {
    label: { en: 'Normal (0-3d)', ko: '정상 (0~3일)' },
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: { en: 'Low institutional selling pressure. Trend intact.', ko: '기관 분배 압력 낮음. 추세 진행 중.' },
  },
  WARNING: {
    label: { en: 'Caution (4-5d)', ko: '경계 (4~5일)' },
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    desc: { en: 'Institutions selling. Be cautious with new entries.', ko: '기관이 매도 중. 신규 진입 신중.' },
  },
  DANGER: {
    label: { en: 'Danger (6d+)', ko: '위험 (6일+)' },
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    desc: { en: "O'Neil: Market top likely. Consider reducing positions.", ko: "O'Neil: 시장 상단 임박. 포지션 축소 고려." },
  },
};

export const SIGNAL_META: Record<string, { label: string; color: string; bg: string; action: BiLang; desc: BiLang }> = {
  sniper: {
    label: 'Sniper',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    action: { en: 'Entry', ko: '진입' },
    desc: { en: '21EMA touch within 0.4% then bounce — RSI 38-58, volume surge', ko: '21EMA 0.4% 이내 터치 후 반등 — RSI 38~58 구간, 거래량 급증' },
  },
  vcp: {
    label: 'VCP',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    action: { en: 'Breakout Entry', ko: '돌파진입' },
    desc: { en: '30-candle high breakout + 2x volume + ATR contraction — institutional accumulation', ko: '30캔들 신고가 갱신 + 거래량 2배 + ATR 축소 — 기관 매집 돌파' },
  },
  pullback: {
    label: 'Pullback',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    action: { en: 'Pullback Entry', ko: '눌림 진입' },
    desc: { en: '4.5-9% correction from high then EMA support + MACD reversal', ko: '고점 대비 4.5~9% 조정 후 EMA 지지 + MACD 전환 — 꿀통 눌림목' },
  },
  strong_trend: {
    label: 'StrongTrend',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/30',
    action: { en: 'Hold', ko: '홀딩' },
    desc: { en: 'Price > 21EMA > 50EMA, EMA slope +0.15%, RSI 52-78 — trend acceleration', ko: '가격 > 21EMA > 50EMA, EMA 기울기 +0.15%, RSI 52~78 — 추세 가속' },
  },
  overbought: {
    label: 'Overbought',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    action: { en: 'Partial Exit', ko: '분할 익절' },
    desc: { en: 'RSI ≥ 76, 21EMA deviation +3.2%, 4 of 5 candles bullish — near-term peak warning', ko: 'RSI ≥ 76, 21EMA 이격 +3.2%, 5캔들 중 4양봉 — 단기 고점 주의' },
  },
  downtrend: {
    label: 'Downtrend',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    action: { en: 'Avoid', ko: '접근 금지' },
    desc: { en: 'Price < 21EMA, negative EMA slope, volume surge — falling knife', ko: '가격 < 21EMA, EMA 음의 기울기, 거래량 급증 — 떨어지는 칼날' },
  },
};

export const STAGE2_META: Record<keyof Stage2Checks, { label: string; desc: BiLang }> = {
  price_above_emas:   { label: 'Price > EMA21 > EMA50 > EMA200', desc: { en: 'Price above all moving averages', ko: '가격이 모든 이평선 위에 위치' } },
  ema200_rising:      { label: 'EMA200 Rising',                   desc: { en: 'EMA200 slope positive (uptrend)', ko: 'EMA200 기울기 양수 (추세 상승)' } },
  near_52w_high:      { label: '52w High -25%',                   desc: { en: 'Within 25% of 52-week high', ko: '52주 신고가 대비 조정 폭 제한' } },
  above_52w_low:      { label: '52w Low +30%',                    desc: { en: 'At least 30% above 52-week low', ko: '52주 신저가 대비 충분한 반등' } },
  pullback_shallow:   { label: 'Correction < 15%',                desc: { en: 'Recent pullback within 15% of 20-day high', ko: '20일 고점 대비 조정이 얕음' } },
  rs_strong:          { label: 'RS Score ≥ 50 (vs SPY)',          desc: { en: '63-day return outperforming SPY', ko: '63일 수익률 SPY 대비 우위' } },
  volume_contracting: { label: 'Volume Contracting',              desc: { en: '5-day avg < 20-day avg (confirming pullback)', ko: '5일 평균 < 20일 평균 (눌림 확인)' } },
};

// TIER1: 빅테크/대형주 — 개별 심층 분석, 백테스트 포함
export const TIER1_SYMBOLS = ['TSM', 'NVDA', 'META', 'TSLA', 'PLTR', 'MU', 'CRWD', 'AMZN', 'MSFT', 'AAPL', 'GOOGL'];
// TIER2: 모멘텀/테마주 — 배치 분석
export const TIER2_SYMBOLS = ['RKLB', 'CEG', 'VST', 'ALAB', 'OKLO', 'APP', 'ANET', 'NVO', 'QBTS', 'SOFI'];
export const ALL_SYMBOLS = [...TIER1_SYMBOLS, ...TIER2_SYMBOLS];
// 심볼 → 티어 조회 맵
export const SYMBOL_TIER: Record<string, 1 | 2> = {
  ...Object.fromEntries(TIER1_SYMBOLS.map(s => [s, 1 as const])),
  ...Object.fromEntries(TIER2_SYMBOLS.map(s => [s, 2 as const])),
};
// 회사명 (BiLang)
export const SYMBOL_NAMES: Record<string, BiLang> = {
  TSM:  { en: 'TSMC',                ko: 'TSMC' },
  NVDA: { en: 'Nvidia',              ko: '엔비디아' },
  META: { en: 'Meta Platforms',      ko: '메타 플랫폼스' },
  TSLA: { en: 'Tesla',               ko: '테슬라' },
  PLTR: { en: 'Palantir',            ko: '팔란티어' },
  MU:   { en: 'Micron Technology',   ko: '마이크론' },
  CRWD: { en: 'CrowdStrike',         ko: '크라우드스트라이크' },
  AMZN: { en: 'Amazon',             ko: '아마존' },
  MSFT: { en: 'Microsoft',           ko: '마이크로소프트' },
  AAPL: { en: 'Apple',               ko: '애플' },
  GOOGL:{ en: 'Alphabet / Google',   ko: '알파벳 / 구글' },
  RKLB: { en: 'Rocket Lab',          ko: '로켓랩' },
  CEG:  { en: 'Constellation Energy',ko: '컨스텔레이션 에너지' },
  VST:  { en: 'Vistra Energy',       ko: '비스트라 에너지' },
  ALAB: { en: 'Astera Labs',         ko: '아스테라 랩스' },
  OKLO: { en: 'Oklo',               ko: '오클로' },
  APP:  { en: 'AppLovin',            ko: '앱러빈' },
  ANET: { en: 'Arista Networks',     ko: '아리스타 네트웍스' },
  NVO:  { en: 'Novo Nordisk',        ko: '노보 노르디스크' },
  QBTS: { en: 'D-Wave Quantum',      ko: '디웨이브 퀀텀' },
  SOFI: { en: 'SoFi Technologies',   ko: '소파이' },
};
// 하위 호환 (기존 SYMBOLS 참조 코드 유지)
export const SYMBOLS = ALL_SYMBOLS;

// Macro symbol display names (BiLang) — covers all 21 MACRO_SYMBOLS from the backend
export const MACRO_SYMBOL_NAMES: Record<string, BiLang> = {
  'DX-Y.NYB': { en: 'Dollar Index (DXY)',        ko: '달러인덱스 (DXY)' },
  '^TNX':     { en: '10Y Treasury (TNX)',          ko: '10년물 금리 (TNX)' },
  'TLT':      { en: 'Long Bond ETF (TLT)',         ko: '장기채 ETF (TLT)' },
  'CL=F':     { en: 'WTI Crude Oil',              ko: 'WTI 원유 (Crude)' },
  'GLD':      { en: 'Gold ETF (GLD)',              ko: '금 ETF (GLD)' },
  'SPY':      { en: 'S&P 500 (SPY)',              ko: 'S&P 500 (SPY)' },
  'QQQ':      { en: 'Nasdaq 100 (QQQ)',           ko: '나스닥 100 (QQQ)' },
  '^VIX':     { en: 'VIX Volatility',             ko: 'VIX 변동성' },
  '^VVIX':    { en: 'VIX of VIX (^VVIX)',         ko: 'VIX의 변동성 (^VVIX)' },
  '^VIX9D':   { en: '9-Day VIX (^VIX9D)',         ko: '9일 VIX (^VIX9D)' },
  'HYG':      { en: 'High Yield ETF (HYG)',       ko: '하이일드 ETF (HYG)' },
  'JNK':      { en: 'Junk Bond ETF (JNK)',        ko: '정크본드 ETF (JNK)' },
  'LQD':      { en: 'Inv. Grade ETF (LQD)',       ko: '투자등급 ETF (LQD)' },
  'IEF':      { en: 'Mid-Term Treasury (IEF)',    ko: '중기국채 ETF (IEF)' },
  'RSP':      { en: 'S&P Equal Weight (RSP)',     ko: 'S&P 동등가중 (RSP)' },
  'MAGS':     { en: 'Magnificent 7 (MAGS)',       ko: 'Magnificent 7 (MAGS)' },
  'IWM':      { en: 'Russell 2000 (IWM)',         ko: '러셀2000 (IWM)' },
  'SMH':      { en: 'Semiconductors (SMH)',       ko: '반도체 (SMH)' },
  'XLE':      { en: 'Energy (XLE)',              ko: '에너지 (XLE)' },
  'XLY':      { en: 'Consumer Disc. (XLY)',      ko: '소비재 (XLY)' },
  'XHB':      { en: 'Homebuilders (XHB)',        ko: '홈빌더 (XHB)' },
  'ITA':      { en: 'Aerospace/Def. (ITA)',      ko: '방산 (ITA)' },
};

// Conviction score → BiLang label mapping (matches conviction_calculator.py thresholds)
export const CONVICTION_LABEL_META: { min: number; label: BiLang }[] = [
  { min: 80, label: { en: 'Very High', ko: '매우 강한 확신' } },
  { min: 65, label: { en: 'High',      ko: '강한 확신 구간' } },
  { min: 50, label: { en: 'Moderate',  ko: '중립적 확신'   } },
  { min: 35, label: { en: 'Low',       ko: '약한 확신'     } },
  { min: 0,  label: { en: 'Very Low',  ko: '낮은 확신'     } },
];

export const API_BASE = '';

// --- Pre/Post Market Data ---

export interface PrePostData {
  symbol: string;
  market_state: 'PRE' | 'POST' | 'REGULAR' | 'CLOSED' | 'OVERNIGHT';
  pre_market_price: number | null;
  pre_market_change_pct: number | null;
  post_market_price: number | null;
  post_market_change_pct: number | null;
  overnight_price: number | null;
  overnight_change_pct: number | null;
  regular_close: number | null;
  regular_change_pct: number | null;
}

// --- Sentiment (소셜 심리) ---

export interface TopNews {
  // v2.0
  headline_en?: string
  headline_ko?: string
  summary_en?: string
  summary_ko?: string
  // v1.x compat
  headline?: string
  summary?: string
  source: string;
}

export interface SymbolSentiment {
  symbol: string;
  as_of: string;
  sentiment: SentimentEnum;
  sentiment_score: number;
  composite_score?: number;
  trend_vs_yesterday: TrendEnum;
  mention_volume: VolumeEnum;
  key_reason_en?: string;
  key_reason_ko?: string;
  key_reason?: string;  // v1.x compat
  bot_suspected: 'yes' | 'no' | 'unclear';
  confidence: ConfidenceEnum;
  source: string;
  score_delta: number | null;  // composite_score 기준 전일 대비 delta (float)
  intraday_shift: TrendEnum | null;
  top_news?: TopNews | null;
}

export interface MarketSentiment {
  as_of: string;
  sentiment: SentimentEnum;
  sentiment_score: number;
  composite_score?: number;
  trend_vs_yesterday: TrendEnum;
  extreme_flag: 'none' | 'extreme_fear' | 'extreme_greed';
  key_reason_en?: string;
  key_reason_ko?: string;
  key_reason?: string;  // v1.x compat
  confidence: ConfidenceEnum;
  intraday_shift: TrendEnum | null;
  top_news?: TopNews | null;
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

export const SENTIMENT_META: Record<SentimentEnum, { label: BiLang; color: string; bg: string; score: number }> = {
  very_fearful: { label: { en: 'Extreme Fear', ko: '극도 공포' }, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         score: -2 },
  fearful:      { label: { en: 'Fear',         ko: '공포'     }, color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   score: -1 },
  neutral:      { label: { en: 'Neutral',      ko: '중립'     }, color: 'text-zinc-400',    bg: 'bg-zinc-700/30 border-zinc-600/30',       score:  0 },
  optimistic:   { label: { en: 'Optimistic',   ko: '낙관'     }, color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/30',       score:  1 },
  euphoric:     { label: { en: 'Euphoric',     ko: '도취'     }, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', score:  2 },
};

export const TREND_META: Record<TrendEnum, { icon: string; label: BiLang; color: string }> = {
  heating: { icon: '↑', label: { en: 'Rising',  ko: '상승 중' }, color: 'text-emerald-400' },
  stable:  { icon: '→', label: { en: 'Stable',  ko: '유지'    }, color: 'text-zinc-400'    },
  cooling: { icon: '↓', label: { en: 'Cooling', ko: '냉각 중' }, color: 'text-red-400'     },
};

export const VOLUME_META: Record<VolumeEnum, { label: BiLang; color: string }> = {
  low:      { label: { en: 'Low',      ko: '낮음' }, color: 'text-zinc-500'   },
  normal:   { label: { en: 'Normal',   ko: '보통' }, color: 'text-zinc-400'   },
  elevated: { label: { en: 'Elevated', ko: '높음' }, color: 'text-yellow-400' },
  surging:  { label: { en: 'Surging',  ko: '급증' }, color: 'text-orange-400' },
};

export interface SentimentHistoryPoint {
  time: string;        // ISO 8601 타임스탬프
  score: number;       // composite_score (-2 ~ +2)
  slot: string;        // "pre_open" | "post_close"
  sentiment: string;   // "fearful" | "neutral" | "optimistic" 등
}

export interface SentimentHistoryData {
  symbol: string;
  days: number;
  points: SentimentHistoryPoint[];
}

// --- AI Brief ---

export interface MarketBrief {
  // v2.0
  summary_en?: string;
  summary_ko?: string;
  key_themes_en?: string[];
  key_themes_ko?: string[];
  watch_points_en?: string;
  watch_points_ko?: string;
  // v1.x compat
  summary?: string;
  key_themes?: string[];
  watch_points?: string;
  tone: 'bullish' | 'cautious' | 'bearish' | 'neutral';
}

export interface SymbolBrief {
  symbol: string;
  setup_quality: 'A+' | 'A' | 'B' | 'C' | 'D';
  // v2.0
  brief_en?: string;
  brief_ko?: string;
  key_risk_en?: string;
  key_risk_ko?: string;
  key_opportunity_en?: string;
  key_opportunity_ko?: string;
  // v1.x compat
  brief?: string;
  key_risk?: string;
  key_opportunity?: string;
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
  ai_summary: string | null;
  ai_summary_en: string | null;
  ai_summary_ko: string | null;
  risk_level: 'high' | 'med' | 'low';
  action_note: string | null;
  action_note_en: string | null;
  action_note_ko: string | null;
}

export interface RecentResult {
  symbol: string;
  report_date: string;
  eps_actual: number;
  eps_estimate: number;
  surprise_pct: number;
  ai_reaction: string | null;
  ai_reaction_en: string | null;
  ai_reaction_ko: string | null;
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
