'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

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

interface Indicators {
  ema21: number[];
  ema50: number[];
  rsi: number[];
  atr: number[];
}

interface LatestData {
  active_signals: string[];
  latest_price: number;
  latest_rsi: number;
  latest_ema21: number;
  latest_ema50: number;
  latest_atr: number;
}

const SIGNAL_META: Record<string, { label: string; color: string; bg: string; action: string; desc: string }> = {
  sniper:       { label: 'Sniper',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', action: '진입', desc: '21EMA 0.4% 이내 터치 후 반등 — RSI 38~58 구간, 거래량 급증' },
  vcp:          { label: 'VCP',          color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',       action: '돌파진입', desc: '30캔들 신고가 갱신 + 거래량 2배 + ATR 축소 — 기관 매집 돌파' },
  pullback:     { label: 'Pullback',     color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',   action: '눌림 진입', desc: '고점 대비 4.5~9% 조정 후 EMA 지지 + MACD 전환 — 꿀통 눌림목' },
  strong_trend: { label: 'StrongTrend', color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/30',       action: '홀딩', desc: '가격 > 21EMA > 50EMA, EMA 기울기 +0.15%, RSI 52~78 — 추세 가속' },
  overbought:   { label: 'Overbought',  color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   action: '분할 익절', desc: 'RSI ≥ 76, 21EMA 이격 +3.2%, 5캔들 중 4양봉 — 단기 고점 주의' },
  downtrend:    { label: 'Downtrend',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         action: '접근 금지', desc: '가격 < 21EMA, EMA 음의 기울기, 거래량 급증 — 떨어지는 칼날' },
};

export default function LazyAlphaDashboard() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState('TSLA');
  const [timeframe, setTimeframe] = useState('5m');
  const [latestData, setLatestData] = useState<LatestData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://172.16.8.250:5000';

    try {
      const [ohlcvRes, latestRes] = await Promise.all([
        fetch(`${apiBase}/api/ohlcv?symbol=${symbol}&tf=${timeframe}`),
        fetch(`${apiBase}/api/latest-signal?symbol=${symbol}&tf=${timeframe}`),
      ]);
      const data = await ohlcvRes.json();
      const latest = await latestRes.json();

      if (data.candles && data.signals) {
        renderChart(data.candles, data.signals, data.indicators ?? {});
      }
      setLatestData(latest);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (rawCandles: Candle[], signals: Signals, indicators: Partial<Indicators>) => {
    if (!chartContainerRef.current) return;

    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 520,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    // ── 캔들 시리즈 ──────────────────────────────────────────
    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // 유효 캔들 필터 + 원본 인덱스 매핑 (signals와 1:1 대응)
    const validCandleMap = new Map<number, number>();
    const validCandles: Candle[] = [];
    rawCandles.forEach((c, origIdx) => {
      if (
        typeof c.open === 'number' &&
        typeof c.high === 'number' &&
        typeof c.low === 'number' &&
        typeof c.close === 'number'
      ) {
        validCandleMap.set(origIdx, validCandles.length);
        validCandles.push(c);
      }
    });

    const toTs = (t: string): number => {
      const ms = new Date(t).getTime();
      if (isNaN(ms)) throw new Error(`Invalid time string from backend: "${t}"`);
      return Math.floor(ms / 1000);
    };

    const chartData = validCandles.map(c => ({
      time: toTs(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    if (chartData.length === 0) return;
    candleSeries.setData(chartData);

    // ── EMA 라인 ─────────────────────────────────────────────
    if (indicators.ema21 && indicators.ema21.length === validCandles.length) {
      const ema21Series = (chart as any).addLineSeries({
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'EMA21',
      });
      ema21Series.setData(validCandles.map((c, i) => ({ time: toTs(c.time), value: indicators.ema21![i] })));
    }

    if (indicators.ema50 && indicators.ema50.length === validCandles.length) {
      const ema50Series = (chart as any).addLineSeries({
        color: '#818cf8',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'EMA50',
      });
      ema50Series.setData(validCandles.map((c, i) => ({ time: toTs(c.time), value: indicators.ema50![i] })));
    }

    // ── 거래량 히스토그램 (차트 하단 20%) ───────────────────
    const volumeSeries = (chart as any).addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    (chart as any).priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeries.setData(
      validCandles.map((c, i) => ({
        time: toTs(c.time),
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
      }))
    );

    // ── 신호 마커 ────────────────────────────────────────────
    const markers: any[] = [];
    const addMarkers = (
      arr: boolean[] | undefined,
      position: string,
      color: string,
      shape: string,
      text: string
    ) => {
      arr?.forEach((active, origIdx) => {
        const vi = validCandleMap.get(origIdx);
        if (active && vi !== undefined) {
          markers.push({ time: chartData[vi].time, position, color, shape, text });
        }
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  const rsi = latestData?.latest_rsi ?? null;
  const price = latestData?.latest_price ?? null;
  const ema21 = latestData?.latest_ema21 ?? null;
  const ema50 = latestData?.latest_ema50 ?? null;
  const atr = latestData?.latest_atr ?? null;
  const emaSpread = ema21 && price ? ((price - ema21) / ema21 * 100) : null;
  const activeSignals = latestData?.active_signals ?? [];

  const getRsiColor = (v: number) =>
    v >= 76 ? 'text-orange-400' : v >= 60 ? 'text-yellow-400' : v >= 40 ? 'text-emerald-400' : 'text-blue-400';

  const getRsiLabel = (v: number) =>
    v >= 76 ? '과열' : v >= 60 ? '강세' : v >= 40 ? '중립' : '과매도';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto p-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">SniperBoard</h1>
            <p className="text-zinc-400 mt-1 text-sm">Precision Signal Dashboard · Livermore · O'Neil · Minervini · 30초 자동 갱신</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm"
            >
              {['TSLA','AAPL','NVDA','META','AMZN','GOOGL'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm"
            >
              <option value="5m">5분봉</option>
              <option value="1m">1분봉</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-5 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition disabled:opacity-50"
            >
              {loading ? '로딩중...' : '새로고침'}
            </button>
          </div>
        </div>

        {/* 차트 */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
          {/* 범례 */}
          <div className="flex items-center gap-4 mb-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-amber-400"></span>EMA 21</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-indigo-400"></span>EMA 50</span>
            <span className="flex items-center gap-1.5 ml-4"><span className="text-emerald-400">▲</span>Sniper / VCP / PB 매수</span>
            <span className="flex items-center gap-1.5"><span className="text-orange-400">▼</span>OB / DT 경고</span>
          </div>
          <div ref={chartContainerRef} className="w-full" />
        </div>

        {/* 지표 스탯 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <StatCard label="현재가" value={price ? `$${price.toFixed(2)}` : '—'} sub={symbol} valueClass="text-white text-xl" />
          <StatCard
            label="RSI (14)"
            value={rsi !== null ? rsi.toFixed(1) : '—'}
            sub={rsi !== null ? getRsiLabel(rsi) : ''}
            valueClass={`text-xl ${rsi !== null ? getRsiColor(rsi) : 'text-zinc-400'}`}
          />
          <StatCard
            label="21EMA 이격"
            value={emaSpread !== null ? `${emaSpread >= 0 ? '+' : ''}${emaSpread.toFixed(2)}%` : '—'}
            sub={emaSpread !== null ? (emaSpread > 3.2 ? '⚠ 과열 구간' : emaSpread < -2 ? '지지 접근' : '정상 범위') : ''}
            valueClass={`text-xl ${emaSpread !== null && Math.abs(emaSpread) > 3.2 ? 'text-orange-400' : 'text-zinc-200'}`}
          />
          <StatCard
            label="EMA21 / EMA50"
            value={ema21 && ema50 ? `${ema21.toFixed(2)}` : '—'}
            sub={ema21 && ema50 ? `/ ${ema50.toFixed(2)}` : ''}
            valueClass="text-amber-400 text-lg"
          />
          <StatCard
            label="ATR (14)"
            value={atr !== null ? `$${atr.toFixed(3)}` : '—'}
            sub="변동성 기준"
            valueClass="text-zinc-200 text-xl"
          />
        </div>

        {/* 활성 신호 + 신호 가이드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* 활성 신호 */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
            <div className="text-xs text-zinc-400 uppercase tracking-widest mb-3">현재 활성 신호</div>
            {activeSignals.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activeSignals.map((sig) => {
                  const meta = SIGNAL_META[sig];
                  return (
                    <div key={sig} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${meta?.bg ?? ''}`}>
                      <span className={`font-semibold text-sm ${meta?.color ?? 'text-white'}`}>{meta?.label ?? sig.toUpperCase()}</span>
                      <span className="text-xs text-zinc-400">{meta?.action}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">현재 활성 신호 없음</div>
            )}
          </div>

          {/* 신호 가이드 */}
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

        {/* RSI 게이지 바 */}
        {rsi !== null && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">RSI 게이지</div>
              <div className={`text-sm font-semibold ${getRsiColor(rsi)}`}>{rsi.toFixed(1)} — {getRsiLabel(rsi)}</div>
            </div>
            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
              {/* 구간 색상 */}
              <div className="absolute inset-0 flex">
                <div className="bg-blue-500/30 flex-none" style={{ width: '30%' }} />
                <div className="bg-emerald-500/30 flex-none" style={{ width: '30%' }} />
                <div className="bg-yellow-500/30 flex-none" style={{ width: '16%' }} />
                <div className="bg-orange-500/30 flex-none" style={{ width: '24%' }} />
              </div>
              {/* 현재 RSI 위치 */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg"
                style={{ left: `${Math.min(Math.max(rsi, 0), 100)}%`, transform: 'translateX(-50%)' }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>0 과매도</span><span>30</span><span>60</span><span>76</span><span>100 과열</span>
            </div>
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
