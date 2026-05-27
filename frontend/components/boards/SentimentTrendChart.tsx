'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, Time, LineStyle } from 'lightweight-charts';
import { useSentimentHistory } from '@/hooks/useSentimentHistory';
import { useDaily } from '@/hooks/useDaily';

interface Props {
  symbol: string;
}

// compositeColor와 동일한 로직 — SentimentBoard와 색상 통일
function scoreColor(score: number): string {
  if (score >= 1.5) return '#10b981';  // emerald
  if (score >= 0.5) return '#14b8a6';  // teal
  if (score > -0.5) return '#71717a';  // zinc
  if (score > -1.5) return '#f97316';  // orange
  return '#ef4444';                    // red
}

export function SentimentTrendChart({ symbol }: Props) {
  const [days, setDays] = useState<7 | 30>(7);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  const { data: historyData, isLoading: histLoading } = useSentimentHistory(symbol, days);
  const { dailyData, isLoading: priceLoading } = useDaily(symbol);

  const isLoading = histLoading || priceLoading;

  useEffect(() => {
    if (!chartContainerRef.current || isLoading || !historyData || !dailyData) return;

    // 기존 차트 정리
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 220,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(63,63,70,0.4)' },
        horzLines: { color: 'rgba(63,63,70,0.4)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { visible: true, borderColor: 'rgba(63,63,70,0.6)' },
      leftPriceScale: { visible: true, borderColor: 'rgba(63,63,70,0.6)' },
      timeScale: { timeVisible: true, borderColor: 'rgba(63,63,70,0.6)' },
    });
    chartRef.current = chart;

    // right price scale — auto-scale with margin (anchor series enforces -2~+2)
    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.05 },
    });

    // 주가 라인 (좌측 Y축)
    if (dailyData?.candles?.length) {
      const cutoff = days === 7 ? 7 : 30;
      const sliced = dailyData.candles.slice(-cutoff);
      const priceSeries = chart.addLineSeries({
        priceScaleId: 'left',
        color: '#a1a1aa',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        title: symbol,
      });
      // Fix 2: YYYY-MM-DD string → Unix epoch (seconds)
      priceSeries.setData(
        sliced.map((c) => ({
          time: (new Date(c.time).getTime() / 1000) as Time,
          value: c.close,
        }))
      );
    }

    // 심리 점수 라인 (우측 Y축 고정 -2 ~ +2)
    if (historyData?.points?.length) {
      const lastScore = historyData.points[historyData.points.length - 1]?.score ?? 0;
      const sentimentSeries = chart.addLineSeries({
        priceScaleId: 'right',
        color: scoreColor(lastScore),
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'Score',
      });

      // Fix 2: ISO 8601 → Unix epoch (seconds)
      sentimentSeries.setData(
        historyData.points.map((p) => ({
          time: (new Date(p.time).getTime() / 1000) as Time,
          value: p.score,
        }))
      );

      // Fix 2 + Fix 3: pre_open / post_close 마커 — ISO 8601 → Unix epoch, sorted
      sentimentSeries.setMarkers(
        [...historyData.points]
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
          .map((p) => ({
            time: (new Date(p.time).getTime() / 1000) as Time,
            position: 'aboveBar' as const,
            color: scoreColor(p.score),
            shape: p.slot === 'pre_open' ? ('arrowUp' as const) : ('circle' as const),
            size: 0.5,
          }))
      );

      // 범위 앵커 시리즈 (투명, 우측 Y축 -2~+2 강제)
      const rangeSeries = chart.addLineSeries({
        priceScaleId: 'right',
        color: 'rgba(0,0,0,0)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: '',
      });
      const times = historyData.points.map((p) => (new Date(p.time).getTime() / 1000) as Time);
      if (times.length >= 2) {
        rangeSeries.setData([
          { time: times[0], value: -2 },
          { time: times[times.length - 1], value: 2 },
        ]);
      }

      // 중립선 (score=0) — 기준선 표시용 더미 시리즈
      const zeroSeries = chart.addLineSeries({
        priceScaleId: 'right',
        color: 'rgba(113,113,122,0.3)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        title: '',
      });
      if (times.length >= 2) {
        zeroSeries.setData([
          { time: times[0], value: 0 },
          { time: times[times.length - 1], value: 0 },
        ]);
      }
    }

    // 반응형 리사이즈
    const observer = new ResizeObserver(() => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [historyData, dailyData, days, symbol]);  // Fix 1: isLoading 제거 — guard로만 사용

  return (
    <div style={{ marginTop: 12, padding: '10px 0 0' }}>
      {/* 7일 / 30일 토글 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 6 }}>
        {([7, 30] as const).map((d) => (
          <button
            key={d}
            onClick={(e) => { e.stopPropagation(); setDays(d); }}
            style={{
              fontSize: 10,
              fontWeight: days === d ? 700 : 400,
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid',
              borderColor: days === d ? 'var(--em-500, #6366f1)' : 'var(--border, rgba(63,63,70,0.6))',
              background: days === d ? 'var(--em-soft, rgba(99,102,241,0.1))' : 'transparent',
              color: days === d ? 'var(--em-500, #6366f1)' : 'var(--fg-subtle, #71717a)',
              cursor: 'pointer',
            }}
          >
            {d}일
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', fontSize: 11 }}>
          차트 로딩 중...
        </div>
      ) : (
        <div ref={chartContainerRef} style={{ width: '100%', height: 220 }} />
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 9, color: 'var(--fg-subtle)' }}>
        <span>── 주가 (좌축)</span>
        <span style={{ color: '#a78bfa' }}>── 심리점수 (우축 −2~+2)</span>
        <span>▲ pre_open &nbsp; ● post_close</span>
      </div>
    </div>
  );
}
