'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, Time } from 'lightweight-charts';
import { Candle, Signals, IntradayIndicators } from '../../app/types';
import { rsiWilder, macd, bollingerBands, atr, vwap } from '@/lib/indicators';
import { ChartToolbar, type DrawingTool, type IndicatorToggles } from './ChartToolbar';

interface IntradayChartProps {
  candles: Candle[];
  signals: Signals;
  indicators: IntradayIndicators;
}

const toTs = (t: string): number => {
  const ms = new Date(t).getTime();
  if (isNaN(ms)) throw new Error(`Invalid time: "${t}"`);
  return Math.floor(ms / 1000);
};

const LEGEND_ITEMS = [
  { color: '#f59e0b', label: 'EMA 21' },
  { color: '#818cf8', label: 'EMA 50' },
];

type Drawing = { type: DrawingTool; p1: { time: Time; price: number }; p2?: { time: Time; price: number } };

export default function IntradayChart({ candles, signals, indicators }: IntradayChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const pendingRef = useRef<{ time: Time; price: number } | null>(null);
  const [toggles, setToggles] = useState<IndicatorToggles>({ rsi: false, macd: false, bb: false, atr: false, vwap: false });
  const [tool, setTool] = useState<DrawingTool | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const toolRef = useRef<DrawingTool | null>(null);
  toolRef.current = tool;

  useEffect(() => {
    if (!chartContainerRef.current) return;

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

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // 유효한 데이터 맵 빌드
    const validCandleMap = new Map<number, number>();
    const validCandles: Candle[] = [];
    candles.forEach((c, origIdx) => {
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

    const chartData = validCandles.map((c) => ({
      time: toTs(c.time) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    if (chartData.length === 0) {
      chart.remove();
      return;
    }

    candleSeries.setData(chartData);
    candleSeriesRef.current = candleSeries;

    // EMA21 라인
    if (indicators.ema21?.length === validCandles.length) {
      const s = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(validCandles.map((c, i) => ({ time: toTs(c.time) as Time, value: indicators.ema21[i] })));
    }

    // EMA50 라인
    if (indicators.ema50?.length === validCandles.length) {
      const s = chart.addLineSeries({
        color: '#818cf8',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(validCandles.map((c, i) => ({ time: toTs(c.time) as Time, value: indicators.ema50[i] })));
    }

    // Volume 히스토그램
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volSeries.setData(
      validCandles.map((c) => ({
        time: toTs(c.time) as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
      }))
    );

    // 신호 마커
    const markers: any[] = [];
    const addMarkers = (arr: boolean[] | undefined, pos: string, color: string, shape: string, text: string) => {
      arr?.forEach((active, origIdx) => {
        const vi = validCandleMap.get(origIdx);
        if (active && vi !== undefined) {
          markers.push({ time: chartData[vi].time, position: pos, color, shape, text });
        }
      });
    };

    addMarkers(signals.sniper, 'belowBar', '#22c55e', 'arrowUp', 'Sniper');
    addMarkers(signals.vcp, 'belowBar', '#3b82f6', 'arrowUp', 'VCP');
    addMarkers(signals.pullback, 'belowBar', '#eab308', 'arrowUp', 'PB');
    addMarkers(signals.strong_trend, 'belowBar', '#14b8a6', 'circle', 'ST');
    addMarkers(signals.overbought, 'aboveBar', '#f97316', 'arrowDown', 'OB');
    addMarkers(signals.downtrend, 'aboveBar', '#ef4444', 'arrowDown', 'DT');

    markers.sort((a, b) => (a.time as number) - (b.time as number));
    candleSeries.setMarkers(markers);

    const closes = validCandles.map((c) => c.close);
    const highs = validCandles.map((c) => c.high);
    const lows = validCandles.map((c) => c.low);
    const vols = validCandles.map((c) => c.volume);
    const times = validCandles.map((c) => toTs(c.time) as Time);
    const lineOf = (vals: (number | null)[], color: string, scaleId?: string) => {
      const s = chart.addLineSeries({
        color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, priceScaleId: scaleId,
      });
      s.setData(times.map((t, i) => (vals[i] == null ? null : { time: t, value: vals[i] as number })).filter(Boolean) as any);
    };
    if (toggles.bb) {
      const bb = bollingerBands(closes, 20, 2);
      lineOf(bb.upper, '#60a5fa');
      lineOf(bb.middle, '#93c5fd');
      lineOf(bb.lower, '#60a5fa');
    }
    if (toggles.vwap) lineOf(vwap(highs, lows, closes, vols), '#f97316');
    if (toggles.atr) lineOf(atr(highs, lows, closes, 14), '#eab308', 'atr');
    if (toggles.rsi) lineOf(rsiWilder(closes, 14), '#a78bfa', 'rsi');
    if (toggles.macd) {
      const m = macd(closes);
      lineOf(m.macd, '#22d3ee', 'macd');
      lineOf(m.signal, '#f472b6', 'macd');
    }
    drawings.forEach((d) => {
      if (d.type === 'hline') {
        const s = chart.addLineSeries({ color: '#e5e7eb', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        s.setData(times.map((t) => ({ time: t, value: d.p1.price })));
      } else if (d.p2) {
        const s = chart.addLineSeries({ color: '#fbbf24', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        s.setData([{ time: d.p1.time, value: d.p1.price }, { time: d.p2.time, value: d.p2.price }]);
        if (d.type === 'fibonacci') {
          const lo = Math.min(d.p1.price, d.p2.price);
          const hi = Math.max(d.p1.price, d.p2.price);
          const mid = lo + (hi - lo) * 0.618;
          const fib = chart.addLineSeries({ color: '#c084fc', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
          fib.setData(times.map((t) => ({ time: t, value: mid })));
        }
      }
    });
    chart.subscribeClick((param) => {
      const ttool = toolRef.current;
      if (!ttool || !param.point || !param.time || !candleSeriesRef.current) return;
      const price = candleSeriesRef.current.coordinateToPrice(param.point.y);
      if (price == null) return;
      const pt = { time: param.time as Time, price };
      if (ttool === 'hline') {
        setDrawings((ds) => [...ds, { type: 'hline', p1: pt }]);
        return;
      }
      if (!pendingRef.current) { pendingRef.current = pt; return; }
      const p1 = pendingRef.current;
      pendingRef.current = null;
      setDrawings((ds) => [...ds, { type: ttool, p1, p2: pt }]);
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.resize(chartContainerRef.current.clientWidth, 520);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles, signals, indicators, toggles, drawings]);

  return (
    <div className="relative w-full">
      <ChartToolbar
        toggles={toggles}
        onToggle={(k) => setToggles((t) => ({ ...t, [k]: !t[k] }))}
        tool={tool}
        onTool={setTool}
        onClear={() => { setDrawings([]); pendingRef.current = null; setTool(null); }}
      />
      <div ref={chartContainerRef} className="w-full h-[520px]" />
      <div className="absolute top-2 left-2 flex flex-wrap gap-x-3 gap-y-1 pointer-events-none z-10">
        {LEGEND_ITEMS.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 2,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <span style={{ color: '#9ca3af', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.01em' }}>
              {label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
