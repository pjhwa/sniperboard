'use client';

import React, { useEffect, useRef } from 'react';
import {
  createChart, ColorType, CrosshairMode, Time,
  ISeriesPrimitive, SeriesAttachedParameter, ISeriesPrimitivePaneView,
  ISeriesPrimitivePaneRenderer, SeriesType,
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';
import { DailyData } from '../../app/types';

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

export default function DailyChart({ data }: DailyChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const BG = '#0a0a0a';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
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

    const { candles, indicators } = data;

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

    // ── 2. GC 밴드 음영 (캔들 시리즈에 프리미티브로 부착 → 그리드 위, 캔들 아래) ─
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
      { key: 'ema8'   as const, color: '#34d399', title: 'EMA8' },
      { key: 'ema21'  as const, color: '#f59e0b', title: 'EMA21' },
      { key: 'ema50'  as const, color: '#818cf8', title: 'EMA50' },
      { key: 'ema200' as const, color: '#f43f5e', title: 'EMA200' },
    ];

    emaConfig.forEach(({ key, color, title }) => {
      if (indicators[key]?.length === candles.length) {
        const s = chart.addLineSeries({
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: true,
          title,
        });
        s.setData(candles.map((c, i) => ({ time: c.time as Time, value: indicators[key][i] })));
      }
    });

    // ── 4. GC 테두리 라인 ────────────────────────────────────────────────────
    const gcConfig = [
      { key: 'gc_upper' as const, color: '#a855f7', title: 'GC Upper', style: 1 },
      { key: 'gc_mid'   as const, color: 'rgba(168,85,247,0.45)', title: 'GC Mid', style: 2 },
      { key: 'gc_lower' as const, color: '#a855f7', title: 'GC Lower', style: 1 },
    ];

    gcConfig.forEach(({ key, color, title, style }) => {
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
          title,
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
        lastValueVisible: true,
        title: 'Entry',
      });
      entryLine.setData(candles.map((c) => ({ time: c.time as Time, value: data.stage2.entry })));
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.resize(chartContainerRef.current.clientWidth, 480);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data]);

  return <div ref={chartContainerRef} className="w-full h-[480px]" />;
}
