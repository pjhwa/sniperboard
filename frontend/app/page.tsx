'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

// ── Interfaces ────────────────────────────────────────────

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Signals {
  vcp: boolean[];
  sniper: boolean[];
  pullback: boolean[];
  strong_trend: boolean[];
  overbought: boolean[];
  downtrend: boolean[];
}

interface IntradayIndicators {
  ema21: number[];
  ema50: number[];
  rsi: number[];
  atr: number[];
}

interface DailyIndicators {
  ema21: number[];
  ema50: number[];
  ema200: number[];
  atr14: number[];
}

interface Stage2Checks {
  price_above_emas: boolean;
  ema200_rising: boolean;
  near_52w_high: boolean;
  above_52w_low: boolean;
  pullback_shallow: boolean;
  rs_strong: boolean;
  volume_contracting: boolean;
}

interface Stage2 {
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
}

interface DailyData {
  symbol: string;
  candles: Candle[];
  indicators: DailyIndicators;
  vol_avg20: number[];
  stage2: Stage2;
}

interface WatchlistItem {
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
}

interface LatestData {
  active_signals: string[];
  latest_price: number;
  latest_rsi: number;
  latest_ema21: number;
  latest_ema50: number;
  latest_atr: number;
}

type Tab = 'intraday' | 'daily' | 'watchlist';

// ── Constants ─────────────────────────────────────────────

const SIGNAL_META: Record<string, { label: string; color: string; bg: string; action: string; desc: string }> = {
  sniper:       { label: 'Sniper',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', action: '진입',      desc: '21EMA 0.4% 이내 터치 후 반등 — RSI 38~58 구간, 거래량 급증' },
  vcp:          { label: 'VCP',         color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',       action: '돌파진입',   desc: '30캔들 신고가 갱신 + 거래량 2배 + ATR 축소 — 기관 매집 돌파' },
  pullback:     { label: 'Pullback',    color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',   action: '눌림 진입', desc: '고점 대비 4.5~9% 조정 후 EMA 지지 + MACD 전환 — 꿀통 눌림목' },
  strong_trend: { label: 'StrongTrend',color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/30',       action: '홀딩',      desc: '가격 > 21EMA > 50EMA, EMA 기울기 +0.15%, RSI 52~78 — 추세 가속' },
  overbought:   { label: 'Overbought', color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   action: '분할 익절', desc: 'RSI ≥ 76, 21EMA 이격 +3.2%, 5캔들 중 4양봉 — 단기 고점 주의' },
  downtrend:    { label: 'Downtrend',  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         action: '접근 금지', desc: '가격 < 21EMA, EMA 음의 기울기, 거래량 급증 — 떨어지는 칼날' },
};

const STAGE2_META: Record<keyof Stage2Checks, { label: string; desc: string }> = {
  price_above_emas:   { label: 'Price > EMA21 > EMA50 > EMA200', desc: '가격이 모든 이평선 위에 위치' },
  ema200_rising:      { label: 'EMA200 상승 중',                  desc: 'EMA200 기울기 양수 (추세 상승)' },
  near_52w_high:      { label: '52주 고점 -25% 이내',            desc: '52주 신고가 대비 조정 폭 제한' },
  above_52w_low:      { label: '52주 저점 +30% 이상',            desc: '52주 신저가 대비 충분한 반등' },
  pullback_shallow:   { label: '최근 조정 15% 이내',             desc: '20일 고점 대비 조정이 얕음' },
  rs_strong:          { label: 'RS Score ≥ 50 (vs SPY)',          desc: '63일 수익률 SPY 대비 우위' },
  volume_contracting: { label: '거래량 수축',                     desc: '5일 평균 < 20일 평균 (눌림 확인)' },
};

const SYMBOLS = ['TSLA', 'AAPL', 'NVDA', 'META', 'AMZN', 'GOOGL'];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://172.16.8.250:5000';

// ── Helpers ───────────────────────────────────────────────

const toTs = (t: string): number => {
  const ms = new Date(t).getTime();
  if (isNaN(ms)) throw new Error(`Invalid time: "${t}"`);
  return Math.floor(ms / 1000);
};

const getRsiColor  = (v: number) => v >= 76 ? 'text-orange-400' : v >= 60 ? 'text-yellow-400' : v >= 40 ? 'text-emerald-400' : 'text-blue-400';
const getRsiLabel  = (v: number) => v >= 76 ? '과열' : v >= 60 ? '강세' : v >= 40 ? '중립' : '과매도';
const getScoreColor = (s: number) => s >= 6 ? 'text-emerald-400' : s >= 4 ? 'text-yellow-400' : 'text-red-400';
const getScoreBg   = (s: number) => s >= 6 ? 'bg-emerald-500/20 border-emerald-500/40' : s >= 4 ? 'bg-yellow-500/20 border-yellow-500/40' : 'bg-red-500/20 border-red-500/40';

// ── Component ─────────────────────────────────────────────

export default function SniperBoard() {
  const [tab, setTab] = useState<Tab>('intraday');
  const [symbol, setSymbol] = useState('TSLA');
  const [timeframe, setTimeframe] = useState('5m');
  const [loading, setLoading] = useState(false);

  // Intraday
  const intradayRef = useRef<HTMLDivElement>(null);
  const [latestData, setLatestData] = useState<LatestData | null>(null);

  // Daily
  const dailyRef = useRef<HTMLDivElement>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);

  // Watchlist
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // R:R Calculator
  const [rrEntry, setRrEntry] = useState('');
  const [rrStop, setRrStop]   = useState('');
  const [rrTarget, setRrTarget] = useState('');
  const [rrAccount, setRrAccount] = useState('100000');
  const [rrRiskPct, setRrRiskPct] = useState('1');

  // ── Fetch functions ──────────────────────────────────────

  const fetchIntraday = async () => {
    setLoading(true);
    try {
      const [oRes, lRes] = await Promise.all([
        fetch(`${API_BASE}/api/ohlcv?symbol=${symbol}&tf=${timeframe}`),
        fetch(`${API_BASE}/api/latest-signal?symbol=${symbol}&tf=${timeframe}`),
      ]);
      const data = await oRes.json();
      const latest = await lRes.json();
      if (data.candles && data.signals) renderIntradayChart(data.candles, data.signals, data.indicators ?? {});
      setLatestData(latest);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/daily?symbol=${symbol}`);
      const data: DailyData = await res.json();
      setDailyData(data);
      if (data.candles && data.indicators) renderDailyChart(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/watchlist`);
      const data = await res.json();
      setWatchlist(data.watchlist ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setWatchlistLoading(false);
    }
  };

  // ── Effects ──────────────────────────────────────────────

  useEffect(() => {
    if (tab === 'intraday') {
      fetchIntraday();
      const id = setInterval(fetchIntraday, 30000);
      return () => clearInterval(id);
    } else if (tab === 'daily') {
      fetchDaily();
    } else {
      fetchWatchlist();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, symbol, timeframe]);

  useEffect(() => {
    if (dailyData?.stage2) {
      setRrEntry(String(dailyData.stage2.entry));
      setRrStop(String(dailyData.stage2.stop));
      setRrTarget(String(dailyData.stage2.target));
    }
  }, [dailyData]);

  // ── Chart renderers ──────────────────────────────────────

  const renderIntradayChart = (rawCandles: Candle[], signals: Signals, indicators: Partial<IntradayIndicators>) => {
    if (!intradayRef.current) return;
    intradayRef.current.innerHTML = '';

    const chart = createChart(intradayRef.current, {
      width: intradayRef.current.clientWidth,
      height: 520,
      layout: { background: { type: ColorType.Solid, color: '#0a0a0a' }, textColor: '#d1d5db' },
      grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444', borderVisible: false,
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    const validCandleMap = new Map<number, number>();
    const validCandles: Candle[] = [];
    rawCandles.forEach((c, origIdx) => {
      if (typeof c.open === 'number' && typeof c.high === 'number' && typeof c.low === 'number' && typeof c.close === 'number') {
        validCandleMap.set(origIdx, validCandles.length);
        validCandles.push(c);
      }
    });

    const chartData = validCandles.map(c => ({ time: toTs(c.time), open: c.open, high: c.high, low: c.low, close: c.close }));
    if (chartData.length === 0) return;
    candleSeries.setData(chartData);

    if (indicators.ema21?.length === validCandles.length) {
      const s = (chart as any).addLineSeries({ color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: 'EMA21' });
      s.setData(validCandles.map((c, i) => ({ time: toTs(c.time), value: indicators.ema21![i] })));
    }
    if (indicators.ema50?.length === validCandles.length) {
      const s = (chart as any).addLineSeries({ color: '#818cf8', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: 'EMA50' });
      s.setData(validCandles.map((c, i) => ({ time: toTs(c.time), value: indicators.ema50![i] })));
    }

    const volSeries = (chart as any).addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
    (chart as any).priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volSeries.setData(validCandles.map((c) => ({
      time: toTs(c.time), value: c.volume,
      color: c.close >= c.open ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
    })));

    const markers: any[] = [];
    const addMarkers = (arr: boolean[] | undefined, pos: string, color: string, shape: string, text: string) => {
      arr?.forEach((active, origIdx) => {
        const vi = validCandleMap.get(origIdx);
        if (active && vi !== undefined) markers.push({ time: chartData[vi].time, position: pos, color, shape, text });
      });
    };
    addMarkers(signals.sniper,       'belowBar', '#22c55e', 'arrowUp',   'Sniper');
    addMarkers(signals.vcp,          'belowBar', '#3b82f6', 'arrowUp',   'VCP');
    addMarkers(signals.pullback,     'belowBar', '#eab308', 'arrowUp',   'PB');
    addMarkers(signals.strong_trend, 'belowBar', '#14b8a6', 'circle',    'ST');
    addMarkers(signals.overbought,   'aboveBar', '#f97316', 'arrowDown', 'OB');
    addMarkers(signals.downtrend,    'aboveBar', '#ef4444', 'arrowDown', 'DT');
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    candleSeries.setMarkers(markers);
    chart.timeScale().fitContent();
  };

  const renderDailyChart = (data: DailyData) => {
    if (!dailyRef.current) return;
    dailyRef.current.innerHTML = '';

    const chart = createChart(dailyRef.current, {
      width: dailyRef.current.clientWidth,
      height: 480,
      layout: { background: { type: ColorType.Solid, color: '#0a0a0a' }, textColor: '#d1d5db' },
      grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: false },
    });

    const { candles, indicators } = data;

    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444', borderVisible: false,
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    candleSeries.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));

    const emaConfig: { key: keyof DailyIndicators; color: string; title: string }[] = [
      { key: 'ema21',  color: '#f59e0b', title: 'EMA21' },
      { key: 'ema50',  color: '#818cf8', title: 'EMA50' },
      { key: 'ema200', color: '#f43f5e', title: 'EMA200' },
    ];
    for (const { key, color, title } of emaConfig) {
      if (indicators[key]?.length === candles.length) {
        const s = (chart as any).addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title });
        s.setData(candles.map((c, i) => ({ time: c.time, value: indicators[key][i] })));
      }
    }

    const volSeries = (chart as any).addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
    (chart as any).priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volSeries.setData(candles.map(c => ({
      time: c.time, value: c.volume,
      color: c.close >= c.open ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
    })));

    if (data.stage2?.entry) {
      const entryLine = (chart as any).addLineSeries({
        color: '#10b981', lineWidth: 1, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: true, title: 'Entry',
      });
      entryLine.setData(candles.map(c => ({ time: c.time, value: data.stage2.entry })));
    }

    chart.timeScale().fitContent();
  };

  // ── R:R Calculations ──────────────────────────────────────

  const rrEntryN  = parseFloat(rrEntry);
  const rrStopN   = parseFloat(rrStop);
  const rrTargetN = parseFloat(rrTarget);
  const rrAccN    = parseFloat(rrAccount);
  const rrRiskN   = parseFloat(rrRiskPct);

  const rrRiskPerShare = !isNaN(rrEntryN) && !isNaN(rrStopN) ? rrEntryN - rrStopN : null;
  const rrReward       = !isNaN(rrEntryN) && !isNaN(rrTargetN) ? rrTargetN - rrEntryN : null;
  const rrRatio        = rrRiskPerShare && rrReward && rrRiskPerShare > 0 ? rrReward / rrRiskPerShare : null;
  const riskDollar     = !isNaN(rrAccN) && !isNaN(rrRiskN) ? rrAccN * rrRiskN / 100 : null;
  const shares         = riskDollar && rrRiskPerShare && rrRiskPerShare > 0 ? Math.floor(riskDollar / rrRiskPerShare) : null;
  const positionSize   = shares && !isNaN(rrEntryN) ? shares * rrEntryN : null;
  const expectedProfit = shares && rrReward ? shares * rrReward : null;

  // ── Intraday derived state ────────────────────────────────

  const rsi        = latestData?.latest_rsi ?? null;
  const price      = latestData?.latest_price ?? null;
  const ema21val   = latestData?.latest_ema21 ?? null;
  const ema50val   = latestData?.latest_ema50 ?? null;
  const atrVal     = latestData?.latest_atr ?? null;
  const emaSpread  = ema21val && price ? (price - ema21val) / ema21val * 100 : null;
  const activeSigs = latestData?.active_signals ?? [];

  const handleRefresh = () => {
    if (tab === 'intraday') fetchIntraday();
    else if (tab === 'daily') fetchDaily();
    else fetchWatchlist();
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">SniperBoard</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Precision Signal Dashboard · Livermore · O&apos;Neil · Minervini</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={symbol} onChange={e => setSymbol(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm">
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {tab === 'intraday' && (
              <select value={timeframe} onChange={e => setTimeframe(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm">
                <option value="5m">5분봉</option>
                <option value="1m">1분봉</option>
              </select>
            )}
            <button onClick={handleRefresh} disabled={loading || watchlistLoading}
              className="px-5 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition disabled:opacity-50">
              {loading || watchlistLoading ? '로딩중...' : '새로고침'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-5 w-fit">
          {([
            ['intraday',  '단기 (Intraday)'],
            ['daily',     '일봉 분석 (Daily)'],
            ['watchlist', '워치리스트'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            TAB: INTRADAY
        ════════════════════════════════════════════════════ */}
        {tab === 'intraday' && (
          <>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
              <div className="flex items-center gap-4 mb-3 text-xs text-zinc-400 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-amber-400" />EMA 21</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-indigo-400" />EMA 50</span>
                <span className="flex items-center gap-1.5 ml-4"><span className="text-emerald-400">▲</span>Sniper / VCP / PB 매수</span>
                <span className="flex items-center gap-1.5"><span className="text-orange-400">▼</span>OB / DT 경고</span>
                <span className="ml-auto text-zinc-500">30초 자동 갱신</span>
              </div>
              <div ref={intradayRef} className="w-full" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <StatCard label="현재가" value={price ? `$${price.toFixed(2)}` : '—'} sub={symbol} valueClass="text-white text-xl" />
              <StatCard label="RSI (14)"
                value={rsi !== null ? rsi.toFixed(1) : '—'}
                sub={rsi !== null ? getRsiLabel(rsi) : ''}
                valueClass={`text-xl ${rsi !== null ? getRsiColor(rsi) : 'text-zinc-400'}`} />
              <StatCard label="21EMA 이격"
                value={emaSpread !== null ? `${emaSpread >= 0 ? '+' : ''}${emaSpread.toFixed(2)}%` : '—'}
                sub={emaSpread !== null ? (emaSpread > 3.2 ? '⚠ 과열 구간' : emaSpread < -2 ? '지지 접근' : '정상 범위') : ''}
                valueClass={`text-xl ${emaSpread !== null && Math.abs(emaSpread) > 3.2 ? 'text-orange-400' : 'text-zinc-200'}`} />
              <StatCard label="EMA21 / EMA50"
                value={ema21val && ema50val ? `${ema21val.toFixed(2)}` : '—'}
                sub={ema21val && ema50val ? `/ ${ema50val.toFixed(2)}` : ''}
                valueClass="text-amber-400 text-lg" />
              <StatCard label="ATR (14)"
                value={atrVal !== null ? `$${atrVal.toFixed(3)}` : '—'}
                sub="변동성 기준"
                valueClass="text-zinc-200 text-xl" />
            </div>

            {/* Active signals + signal guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-3">현재 활성 신호</div>
                {activeSigs.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {activeSigs.map(sig => {
                      const meta = SIGNAL_META[sig];
                      return (
                        <div key={sig} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${meta?.bg ?? ''}`}>
                          <span className={`font-semibold text-sm ${meta?.color ?? 'text-white'}`}>{meta?.label ?? sig}</span>
                          <span className="text-xs text-zinc-400">{meta?.action}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm">현재 활성 신호 없음</div>
                )}
              </div>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 md:col-span-2">
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-3">신호 가이드</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(SIGNAL_META).map(([key, meta]) => (
                    <div key={key} className={`rounded-lg border p-2.5 ${meta.bg}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>{meta.action}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{meta.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RSI gauge */}
            {rsi !== null && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-zinc-400 uppercase tracking-widest">RSI 게이지</div>
                  <div className={`text-sm font-semibold ${getRsiColor(rsi)}`}>{rsi.toFixed(1)} — {getRsiLabel(rsi)}</div>
                </div>
                <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="absolute inset-0 flex">
                    <div className="bg-blue-500/30 flex-none" style={{ width: '30%' }} />
                    <div className="bg-emerald-500/30 flex-none" style={{ width: '30%' }} />
                    <div className="bg-yellow-500/30 flex-none" style={{ width: '16%' }} />
                    <div className="bg-orange-500/30 flex-none" style={{ width: '24%' }} />
                  </div>
                  <div className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg"
                    style={{ left: `${Math.min(Math.max(rsi, 0), 100)}%`, transform: 'translateX(-50%)' }} />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>0 과매도</span><span>30</span><span>60</span><span>76</span><span>100 과열</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════
            TAB: DAILY
        ════════════════════════════════════════════════════ */}
        {tab === 'daily' && (
          <>
            {/* Daily chart */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
              <div className="flex items-center gap-4 mb-3 text-xs text-zinc-400 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-amber-400" />EMA 21</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-indigo-400" />EMA 50</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-rose-400" />EMA 200</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-emerald-400 opacity-60" />Entry Pivot</span>
                <span className="ml-auto text-zinc-500">1년 일봉</span>
              </div>
              <div ref={dailyRef} className="w-full" />
            </div>

            {dailyData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stage 2 Checklist */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-zinc-400 uppercase tracking-widest">Stage 2 체크리스트</div>
                    {dailyData.stage2 && (
                      <div className={`font-bold text-lg px-3 py-1 rounded-lg border ${getScoreBg(dailyData.stage2.score)}`}>
                        <span className={getScoreColor(dailyData.stage2.score)}>{dailyData.stage2.score}/7</span>
                      </div>
                    )}
                  </div>

                  {dailyData.stage2?.checks && (
                    <div className="flex flex-col gap-2.5">
                      {(Object.entries(dailyData.stage2.checks) as [keyof Stage2Checks, boolean][]).map(([key, passed]) => (
                        <div key={key} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-200 leading-tight">{STAGE2_META[key]?.label}</div>
                            <div className="text-xs text-zinc-500 leading-tight mt-0.5">{STAGE2_META[key]?.desc}</div>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-none mt-0.5 ${passed ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'}`}>
                            {passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {dailyData.stage2 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-3 gap-3 text-xs">
                      <div><div className="text-zinc-500 mb-0.5">RS Score</div><div className={`font-semibold ${dailyData.stage2.rs_score >= 60 ? 'text-emerald-400' : 'text-zinc-300'}`}>{dailyData.stage2.rs_score}</div></div>
                      <div><div className="text-zinc-500 mb-0.5">52W 고점</div><div className="font-semibold text-zinc-200">{dailyData.stage2.pct_from_52w_high.toFixed(1)}%</div></div>
                      <div><div className="text-zinc-500 mb-0.5">52W 저점</div><div className="font-semibold text-zinc-200">+{dailyData.stage2.pct_from_52w_low.toFixed(1)}%</div></div>
                      <div><div className="text-zinc-500 mb-0.5">최근 조정</div><div className="font-semibold text-zinc-200">{dailyData.stage2.pullback_pct.toFixed(1)}%</div></div>
                      <div><div className="text-zinc-500 mb-0.5">EMA200</div><div className="font-semibold text-rose-400">${dailyData.stage2.latest_ema200.toFixed(2)}</div></div>
                      <div><div className="text-zinc-500 mb-0.5">ATR(14)</div><div className="font-semibold text-zinc-200">${dailyData.stage2.latest_atr.toFixed(2)}</div></div>
                    </div>
                  )}
                </div>

                {/* R:R Calculator */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                  <div className="text-xs text-zinc-400 uppercase tracking-widest mb-4">R:R 계산기</div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: '진입가 (Entry)', value: rrEntry, set: setRrEntry, border: 'focus:border-emerald-500' },
                      { label: '손절가 (Stop)',  value: rrStop,  set: setRrStop,  border: 'focus:border-red-500' },
                      { label: '목표가 (Target)',value: rrTarget,set: setRrTarget, border: 'focus:border-blue-500' },
                      { label: '계좌 규모 ($)', value: rrAccount,set: setRrAccount,border: 'focus:border-zinc-500' },
                    ].map(({ label, value, set, border }) => (
                      <div key={label}>
                        <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                        <input type="number" value={value} onChange={e => set(e.target.value)} step="0.01"
                          className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none ${border}`} />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="text-xs text-zinc-500 mb-1 block">리스크 % (계좌 대비)</label>
                      <input type="number" value={rrRiskPct} onChange={e => setRrRiskPct(e.target.value)} step="0.5" min="0.5" max="5"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800 rounded-xl p-3">
                      <div className="text-xs text-zinc-500 mb-1">R:R 비율</div>
                      <div className={`text-xl font-bold ${rrRatio && rrRatio >= 2 ? 'text-emerald-400' : rrRatio ? 'text-yellow-400' : 'text-zinc-400'}`}>
                        {rrRatio ? `1 : ${rrRatio.toFixed(2)}` : '—'}
                      </div>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3">
                      <div className="text-xs text-zinc-500 mb-1">리스크 금액</div>
                      <div className="text-xl font-bold text-red-400">
                        {riskDollar ? `$${riskDollar.toFixed(0)}` : '—'}
                      </div>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3">
                      <div className="text-xs text-zinc-500 mb-1">매수 수량 (주)</div>
                      <div className="text-xl font-bold text-blue-400">
                        {shares !== null ? shares.toLocaleString() : '—'}
                      </div>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3">
                      <div className="text-xs text-zinc-500 mb-1">포지션 규모</div>
                      <div className="text-xl font-bold text-zinc-200">
                        {positionSize ? `$${positionSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                      </div>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3 col-span-2">
                      <div className="text-xs text-zinc-500 mb-1">예상 수익 (목표 달성 시)</div>
                      <div className="text-xl font-bold text-emerald-400">
                        {expectedProfit ? `+$${expectedProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm text-center py-12">
                {loading ? '일봉 데이터 로딩 중 (최초 로딩 약 30초)...' : '데이터 없음'}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════
            TAB: WATCHLIST
        ════════════════════════════════════════════════════ */}
        {tab === 'watchlist' && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">워치리스트 — Stage 2 스코어 순위</div>
              {watchlistLoading && <span className="text-xs text-zinc-500 animate-pulse">분석 중... (1~2분 소요)</span>}
            </div>

            {watchlist.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                        <th className="text-left pb-3 pr-4">종목</th>
                        <th className="text-right pb-3 pr-4">현재가</th>
                        <th className="text-right pb-3 pr-4">Stage2</th>
                        <th className="text-right pb-3 pr-4">RS</th>
                        <th className="text-right pb-3 pr-4">52W고점</th>
                        <th className="text-right pb-3 pr-4">진입가</th>
                        <th className="text-right pb-3 pr-4">손절가</th>
                        <th className="text-right pb-3 pr-4">목표가</th>
                        <th className="text-center pb-3">체크 (7)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchlist.map(item => (
                        <tr key={item.symbol}
                          onClick={() => { setSymbol(item.symbol); setTab('daily'); }}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer transition">
                          <td className="py-3 pr-4 font-semibold">{item.symbol}</td>
                          <td className="text-right pr-4 text-zinc-200">${item.price.toFixed(2)}</td>
                          <td className="text-right pr-4">
                            <span className={`font-bold ${getScoreColor(item.score)}`}>{item.score}/7</span>
                          </td>
                          <td className="text-right pr-4">
                            <span className={item.rs_score >= 60 ? 'text-emerald-400' : item.rs_score >= 40 ? 'text-zinc-300' : 'text-red-400'}>
                              {item.rs_score.toFixed(0)}
                            </span>
                          </td>
                          <td className="text-right pr-4">
                            <span className={item.pct_from_52w_high >= -10 ? 'text-emerald-400' : item.pct_from_52w_high >= -25 ? 'text-yellow-400' : 'text-red-400'}>
                              {item.pct_from_52w_high.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-right pr-4 text-emerald-400">${item.entry.toFixed(2)}</td>
                          <td className="text-right pr-4 text-red-400">${item.stop.toFixed(2)}</td>
                          <td className="text-right pr-4 text-blue-400">${item.target.toFixed(2)}</td>
                          <td className="text-center">
                            <div className="flex justify-center gap-0.5">
                              {(Object.values(item.checks) as boolean[]).map((v, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${v ? 'bg-emerald-400' : 'bg-red-400/40'}`} />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-zinc-600">* 행 클릭 시 해당 종목의 일봉 분석 탭으로 이동합니다.</div>
              </>
            ) : (
              <div className="text-zinc-500 text-sm text-center py-12">
                {watchlistLoading ? '데이터 분석 중...' : '데이터를 불러오지 못했습니다.'}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ label, value, sub, valueClass }: { label: string; value: string; sub: string; valueClass: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="text-xs text-zinc-400 mb-1 uppercase tracking-wide">{label}</div>
      <div className={`font-semibold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}
