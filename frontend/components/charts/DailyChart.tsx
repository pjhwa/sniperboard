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

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
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

    // EMA 라인 렌더링 설정
    const emaConfig = [
      { key: 'ema21' as const, color: '#f59e0b', title: 'EMA21' },
      { key: 'ema50' as const, color: '#818cf8', title: 'EMA50' },
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

    // Gaussian Channel 라인 렌더링 설정
    const gcConfig = [
      { key: 'gc_upper' as const, color: '#a855f7', title: 'GC Upper', style: 1 },
      { key: 'gc_mid' as const, color: 'rgba(168,85,247,0.45)', title: 'GC Mid', style: 2 },
      { key: 'gc_lower' as const, color: '#a855f7', title: 'GC Lower', style: 1 },
    ];

    gcConfig.forEach(({ key, color, title, style }) => {
      const vals = indicators[key];
      if (!vals || vals.length === 0) return;

      const gcData = candles
        .map((c, i) => ({ time: c.time as Time, value: vals[i] }))
        .filter((p) => p.value !== null && p.value !== undefined) as { time: Time; value: number }[];

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

    // Volume 히스토그램 추가
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

    // Entry Pivot 라인 추가
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

    // 반응형 리사이징 처리
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
