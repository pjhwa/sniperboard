'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart, ColorType, CrosshairMode, Time,
  ISeriesPrimitive, SeriesAttachedParameter, ISeriesPrimitivePaneView,
  ISeriesPrimitivePaneRenderer, SeriesType,
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';
import { DailyData } from '../../app/types';
import { rsiWilder, macd, bollingerBands, atr, vwap } from '@/lib/indicators';
import { ChartToolbar, type DrawingTool, type IndicatorToggles } from './ChartToolbar';

interface DailyChartProps {
  data: DailyData;
}

// ── GC 밴드 프리미티브: gc_upper ~ gc_lower 사이만 정확히 채움 ─────────────
interface BandPoint { time: Time; upper: number; lower: number; }

class GCBandRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(
    private _points: BandPoint[],
    private _param: SeriesAttachedParameter<Time, SeriesType>,
  ) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hpr, verticalPixelRatio: vpr }) => {
      const timeScale = this._param.chart.timeScale();
      const series = this._param.series;

      const upper: [number, number][] = [];
      const lower: [number, number][] = [];

      for (const p of this._points) {
        const x = timeScale.timeToCoordinate(p.time);
        const yu = series.priceToCoordinate(p.upper);
        const yl = series.priceToCoordinate(p.lower);
        if (x === null || yu === null || yl === null) continue;
        upper.push([x * hpr, yu * vpr]);
        lower.push([x * hpr, yl * vpr]);
      }

      if (upper.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(upper[0][0], upper[0][1]);
      for (let i = 1; i < upper.length; i++) ctx.lineTo(upper[i][0], upper[i][1]);
      for (let i = lower.length - 1; i >= 0; i--) ctx.lineTo(lower[i][0], lower[i][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(168,85,247,0.15)';
      ctx.fill();
    });
  }
}

class GCBandPrimitive implements ISeriesPrimitive<Time> {
  private _param: SeriesAttachedParameter<Time, SeriesType> | null = null;

  constructor(private _points: BandPoint[]) {}

  attached(param: SeriesAttachedParameter<Time, SeriesType>): void {
    this._param = param;
  }

  paneViews(): readonly ISeriesPrimitivePaneView[] {
    if (!this._param) return [];
    const param = this._param;
    const points = this._points;
    return [{
      zOrder: () => 'bottom' as const,
      renderer: () => new GCBandRenderer(points, param),
    }];
  }
}
// ────────────────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { color: '#34d399', label: 'EMA 8',   dash: false },
  { color: '#f59e0b', label: 'EMA 21',  dash: false },
  { color: '#818cf8', label: 'EMA 50',  dash: false },
  { color: '#f43f5e', label: 'EMA 200', dash: false },
  { color: '#a855f7', label: 'GC Band', dash: false },
];

type Drawing = { type: DrawingTool; p1: { time: Time; price: number }; p2?: { time: Time; price: number } };

export default function DailyChart({ data }: DailyChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const pendingRef = useRef<{ time: Time; price: number } | null>(null);
  const [toggles, setToggles] = useState<IndicatorToggles>({ rsi: false, macd: false, bb: false, atr: false, vwap: false });
  const [tool, setTool] = useState<DrawingTool | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const toolRef = useRef<DrawingTool | null>(null);
  toolRef.current = tool;

  const hasEntry = !!data.stage2?.entry;
  const { candles, indicators } = data;
  const hasGC = !!(indicators?.gc_upper?.length && indicators?.gc_lower?.length);

  const legendItems = [
    ...LEGEND_ITEMS.filter((item) => item.label !== 'GC Band' || hasGC),
    ...(hasEntry ? [{ color: '#10b981', label: 'Entry Pivot', dash: true }] : []),
  ];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const BG = '#0a0a0a';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 480,
      layout: {
        background: { type: ColorType.Solid, color: BG },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: false },
    });

    chartRef.current = chart;

    // ── 1. 캔들스틱 ──────────────────────────────────────────────────────────
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candleSeries.setData(candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })));
    candleSeriesRef.current = candleSeries;

    // ── 2. GC 밴드 음영 ───────────────────────────────────────────────────────
    const gcUp = indicators['gc_upper'];
    const gcLo = indicators['gc_lower'];

    if (gcUp?.length && gcLo?.length) {
      const bandPoints: BandPoint[] = candles
        .map((c, i) => ({ time: c.time as Time, upper: gcUp[i], lower: gcLo[i] }))
        .filter((p): p is BandPoint => p.upper != null && p.lower != null);

      if (bandPoints.length > 0) {
        candleSeries.attachPrimitive(new GCBandPrimitive(bandPoints));
      }
    }

    // ── 3. EMA 라인 ───────────────────────────────────────────────────────────
    const emaConfig = [
      { key: 'ema8'   as const, color: '#34d399' },
      { key: 'ema21'  as const, color: '#f59e0b' },
      { key: 'ema50'  as const, color: '#818cf8' },
      { key: 'ema200' as const, color: '#f43f5e' },
    ];

    emaConfig.forEach(({ key, color }) => {
      if (indicators[key]?.length === candles.length) {
        const s = chart.addLineSeries({
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        s.setData(candles.map((c, i) => ({ time: c.time as Time, value: indicators[key][i] })));
      }
    });

    // ── 4. GC 테두리 라인 ────────────────────────────────────────────────────
    const gcConfig = [
      { key: 'gc_upper' as const, color: '#a855f7', style: 1 },
      { key: 'gc_mid'   as const, color: 'rgba(168,85,247,0.45)', style: 2 },
      { key: 'gc_lower' as const, color: '#a855f7', style: 1 },
    ];

    gcConfig.forEach(({ key, color, style }) => {
      const vals = indicators[key];
      if (!vals || vals.length === 0) return;

      const gcData = candles
        .map((c, i) => ({ time: c.time as Time, value: vals[i] }))
        .filter((p): p is { time: Time; value: number } => p.value !== null && p.value !== undefined);

      if (gcData.length > 0) {
        const s = chart.addLineSeries({
          color,
          lineWidth: 1,
          lineStyle: style,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        s.setData(gcData);
      }
    });

    // ── 5. 거래량 히스토그램 ─────────────────────────────────────────────────
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volSeries.setData(
      candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
      }))
    );

    // ── 6. Entry Pivot 라인 ───────────────────────────────────────────────────
    if (data.stage2?.entry) {
      const entryLine = chart.addLineSeries({
        color: '#10b981',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      entryLine.setData(candles.map((c) => ({ time: c.time as Time, value: data.stage2.entry })));
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const vols = candles.map((c) => c.volume);
    const times = candles.map((c) => c.time as Time);
    const lineOf = (vals: (number | null)[], color: string, scaleId?: string) => {
      const s = chart.addLineSeries({
        color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
        priceScaleId: scaleId,
      });
      s.setData(times.map((t, i) => (vals[i] == null ? null : { time: t, value: vals[i] as number })).filter(Boolean) as any);
      return s;
    };
    if (toggles.bb) {
      const bb = bollingerBands(closes, 20, 2);
      lineOf(bb.upper, '#60a5fa');
      lineOf(bb.middle, '#93c5fd');
      lineOf(bb.lower, '#60a5fa');
    }
    if (toggles.vwap) lineOf(vwap(highs, lows, closes, vols), '#f97316');
    if (toggles.atr) {
      chart.priceScale('atr').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      lineOf(atr(highs, lows, closes, 14), '#eab308', 'atr');
    }
    if (toggles.rsi) {
      chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
      lineOf(rsiWilder(closes, 14), '#a78bfa', 'rsi');
    }
    if (toggles.macd) {
      const m = macd(closes);
      chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
      lineOf(m.macd, '#22d3ee', 'macd');
      lineOf(m.signal, '#f472b6', 'macd');
    }
    drawings.forEach((d) => {
      if (d.type === 'hline') {
        const s = chart.addLineSeries({ color: '#e5e7eb', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        s.setData(times.map((t) => ({ time: t, value: d.p1.price })));
      } else if (d.p2) {
        const s = chart.addLineSeries({ color: '#fbbf24', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        s.setData([
          { time: d.p1.time, value: d.p1.price },
          { time: d.p2.time, value: d.p2.price },
        ]);
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
      const t = toolRef.current;
      if (!t || !param.point || !param.time || !candleSeriesRef.current) return;
      const price = candleSeriesRef.current.coordinateToPrice(param.point.y);
      if (price == null) return;
      const pt = { time: param.time as Time, price };
      if (t === 'hline') {
        setDrawings((ds) => [...ds, { type: 'hline', p1: pt }]);
        return;
      }
      if (!pendingRef.current) {
        pendingRef.current = pt;
        return;
      }
      const p1 = pendingRef.current;
      pendingRef.current = null;
      setDrawings((ds) => [...ds, { type: t, p1, p2: pt }]);
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.resize(chartContainerRef.current.clientWidth, chartContainerRef.current.clientHeight || 480);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, toggles, drawings]);

  return (
    <div className="relative w-full">
      <ChartToolbar
        toggles={toggles}
        onToggle={(k) => setToggles((t) => ({ ...t, [k]: !t[k] }))}
        tool={tool}
        onTool={setTool}
        onClear={() => { setDrawings([]); pendingRef.current = null; setTool(null); }}
      />
      <div ref={chartContainerRef} className="w-full h-[480px]" />
      <div className="absolute top-2 left-2 flex flex-wrap gap-x-3 gap-y-1 pointer-events-none z-10">
        {legendItems.map(({ color, label, dash }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 2,
                backgroundColor: color,
                borderRadius: 1,
                ...(dash ? { backgroundImage: `repeating-linear-gradient(to right, ${color} 0 4px, transparent 4px 7px)`, backgroundColor: 'transparent' } : {}),
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
