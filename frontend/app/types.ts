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
}

export interface DailyData {
  symbol: string;
  candles: Candle[];
  indicators: DailyIndicators;
  vol_avg20: number[];
  stage2: Stage2;
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

export type Tab = 'intraday' | 'daily' | 'watchlist';

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

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://172.16.8.250:5000';
