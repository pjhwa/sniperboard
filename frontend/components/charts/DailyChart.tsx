'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, Time } from 'lightweight-charts';
import { DailyData } from '../../app/types';

interface DailyChartProps {
  data: DailyData;
}

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

    // ── 1. GC 밴드 음영 (캔들·EMA보다 먼저 추가 → 가장 하위 레이어) ──────────
    const gcUp = indicators['gc_upper'];
    const gcLo = indicators['gc_lower'];

    if (gcUp?.length && gcLo?.length) {
      const upperFillData = candles
        .map((c, i) => ({ time: c.time as Time, value: gcUp[i] }))
        .filter((p): p is { time: Time; value: number } => p.value != null);

      const lowerFillData = candles
        .map((c, i) => ({ time: c.time as Time, value: gcLo[i] }))
        .filter((p): p is { time: Time; value: number } => p.value != null);

      // Upper → 차트 하단까지 보라 반투명 채움
      if (upperFillData.length > 0) {
        const upperFill = chart.addAreaSeries({
          lineColor: 'rgba(0,0,0,0)',
          topColor: 'rgba(168,85,247,0.13)',
          bottomColor: 'rgba(168,85,247,0.13)',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        upperFill.setData(upperFillData);
      }

      // Lower → 차트 하단까지 배경색으로 덮어 "채널 아래" 영역을 지움
      if (lowerFillData.length > 0) {
        const lowerFill = chart.addAreaSeries({
          lineColor: 'rgba(0,0,0,0)',
          topColor: BG,
          bottomColor: BG,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        lowerFill.setData(lowerFillData);
      }
    }

    // ── 2. 캔들스틱 ──────────────────────────────────────────────────────────
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

    // ── 4. GC 테두리 라인 (채움 위에 선명하게) ───────────────────────────────
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
