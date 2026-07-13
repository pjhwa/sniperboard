'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, Time, LineStyle } from 'lightweight-charts';
import { useSentimentHistory } from '@/hooks/useSentimentHistory';
import { useDaily } from '@/hooks/useDaily';

import type { Locale } from '@/app/i18n';

interface Props {
  symbol: string;
  locale?: Locale;
}

// compositeColor와 동일한 로직 — SentimentBoard와 색상 통일
function scoreColor(score: number): string {
  if (score >= 1.5) return '#10b981';  // emerald
  if (score >= 0.5) return '#14b8a6';  // teal
  if (score > -0.5) return '#71717a';  // zinc
  if (score > -1.5) return '#f97316';  // orange
  return '#ef4444';                    // red
}

export function SentimentTrendChart({ symbol, locale = 'ko' }: Props) {
  const [days, setDays] = useState<7 | 30>(7);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  const { data: historyData, isLoading: histLoading } = useSentimentHistory(symbol, days);
  const { dailyData, isLoading: priceLoading } = useDaily(symbol);

  const isLoading = histLoading || priceLoading;
  const hasData = !!historyData && !!dailyData;

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || isLoading || !historyData || !dailyData) return;

    // 기존 차트 정리
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const width = Math.max(el.clientWidth || 0, 1);
    const height = 220;

    const chart = createChart(el, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
        fontSize: 11,
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
        title: '',
      });

      sentimentSeries.setData(
        historyData.points.map((p) => ({
          time: (new Date(p.time).getTime() / 1000) as Time,
          value: p.score,
        }))
      );

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

      // 중립선 (score=0)
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

    // P0-2: fit series to full container width (matches Daily/Intraday)
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;
      const w = chartContainerRef.current.clientWidth;
      const h = chartContainerRef.current.clientHeight || 220;
      if (w > 0) {
        chartRef.current.resize(w, h);
        chartRef.current.timeScale().fitContent();
      }
    };

    // After layout settles (expand 3-col → 1-col), re-measure
    const raf = requestAnimationFrame(() => {
      handleResize();
    });

    const observer = new ResizeObserver(handleResize);
    observer.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [historyData, dailyData, days, symbol, isLoading]);

  const lastScore =
    historyData?.points?.length
      ? historyData.points[historyData.points.length - 1]?.score ?? 0
      : 0;

  return (
    <div style={{ marginTop: 12, padding: '10px 0 0' }}>
      {/* 7일 / 30일 토글 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 6 }}>
        {([7, 30] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={days === d}
            onClick={(e) => { e.stopPropagation(); setDays(d); }}
            style={{
              fontSize: 11,
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
            {d}{locale === 'en' ? 'd' : '일'}
          </button>
        ))}
      </div>

      {/* P0-2: host DOM always mounted — loading overlay, never unmount ref host */}
      <div
        ref={chartContainerRef}
        style={{
          width: '100%',
          height: 220,
          minWidth: 0,
          position: 'relative',
        }}
      >
        {(isLoading || !hasData) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg-subtle)',
              fontSize: 12,
              zIndex: 1,
              background: 'transparent',
              pointerEvents: 'none',
            }}
          >
            {isLoading
              ? (locale === 'en' ? 'Loading chart...' : '차트 로딩 중...')
              : (locale === 'en' ? 'No chart data' : '차트 데이터 없음')}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, color: 'var(--fg-subtle)', flexWrap: 'wrap' }}>
        <span>{locale === 'en' ? '── Price (left)' : '── 주가 (좌축)'}</span>
        <span style={{ color: scoreColor(lastScore) }}>
          {locale === 'en' ? '── Sentiment (right −2~+2)' : '── 심리점수 (우축 −2~+2)'}
        </span>
        <span>▲ pre_open &nbsp; ● post_close</span>
      </div>
    </div>
  );
}
