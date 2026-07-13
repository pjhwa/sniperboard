import React from 'react';
'use client';

import { usePrediction } from '@/hooks/usePrediction';
import type { Locale } from '@/app/i18n';

const LABEL: Record<string, { en: string; ko: string }> = {
  no_change:  { en: 'No change',   ko: '동결' },
  cut_25bps:  { en: 'Cut 25bp',    ko: '25bp 인하' },
  cut_50bps:  { en: 'Cut 50bp+',   ko: '50bp+ 인하' },
  hike_25bps: { en: 'Hike 25bp',   ko: '25bp 인상' },
  hike_50bps: { en: 'Hike 50bp+',  ko: '50bp+ 인상' },
};

const S = {
  title:       { en: 'Market-Implied Fed Odds', ko: '시장 함의 · 연준 확률' },
  subtitle:    { en: 'Prediction market (reference only)', ko: '예측시장 함의 (참고용)' },
  noData:      { en: 'No active FOMC market', ko: '활성 FOMC 마켓 없음' },
  loading:     { en: 'Loading odds…', ko: '확률 로딩 중…' },
  dominant:    { en: 'Dominant', ko: '우세' },
  volume:      { en: 'Volume', ko: '거래대금' },
  meeting:     { en: 'Meeting window', ko: '회의 일정' },
  source:      { en: 'Source', ko: '출처' },
  open:        { en: 'Open on Polymarket', ko: 'Polymarket에서 보기' },
  refBadge:    { en: 'REFERENCE ONLY', ko: '참고용' },
  notOfficial: {
    en: 'Not Fed guidance · crypto prediction market · not used in Conviction',
    ko: '연준 공식 전망 아님 · 암호화폐 예측시장 · Conviction 미반영',
  },
};

function t(o: { en: string; ko: string }, locale: Locale) {
  return o[locale] ?? o.en;
}

function fmtPct(p: number) {
  return `${(p * 100).toFixed(1)}%`;
}

function fmtVol(v?: number | null) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function outcomeLabel(key: string, locale: Locale) {
  return t(LABEL[key] ?? { en: key, ko: key }, locale);
}

function barColor(key: string) {
  if (key.startsWith('cut')) return 'var(--bull)';
  if (key.startsWith('hike')) return 'var(--bear)';
  return 'var(--teal, #14b8a6)';
}

interface Props {
  locale: Locale;
  /** gridColumn span helper for briefing layout */
  span?: number | string;
  compact?: boolean;
}

/**
 * Reference-only FOMC odds from Polymarket (via /api/prediction).
 * Must never be interpreted as official Fed guidance or Conviction input.
 */
export function PredictionMarketCard({ locale, span, compact = false }: Props) {
  const { prediction, available, isLoading } = usePrediction();
  const nf = prediction?.next_fomc;
  const disclaimer = locale === 'ko'
    ? (prediction?.disclaimer_ko || prediction?.disclaimer_en)
    : (prediction?.disclaimer_en || prediction?.disclaimer_ko);

  const probs = nf?.probabilities
    ? Object.entries(nf.probabilities).sort((a, b) => b[1] - a[1])
    : [];

  const style: React.CSSProperties = {
    gridColumn: span != null ? `span ${span}` : undefined,
  };

  return (
    <div className="card" style={style}>
      <div className="card__hd" style={{ flexWrap: 'wrap', gap: 6 }}>
        <h3 style={{ margin: 0 }}>{t(S.title, locale)}</h3>
        <span
          className="badge warn"
          style={{ fontSize: 10, letterSpacing: '0.04em' }}
          title={disclaimer || t(S.notOfficial, locale)}
        >
          {t(S.refBadge, locale)}
        </span>
        <span className="subtle" style={{ fontSize: 11, marginLeft: 'auto' }}>
          {t(S.subtitle, locale)}
        </span>
      </div>
      <div className="card__bd">
        {isLoading && (
          <div className="subtle" style={{ fontSize: 13 }}>{t(S.loading, locale)}</div>
        )}
        {!isLoading && (!available || !nf) && (
          <div className="subtle" style={{ fontSize: 13 }}>{t(S.noData, locale)}</div>
        )}
        {!isLoading && nf && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10, fontSize: 12, color: 'var(--fg-muted)' }}>
              {nf.meeting_date && (
                <span>
                  <strong style={{ color: 'var(--fg-subtle)' }}>{t(S.meeting, locale)}:</strong>{' '}
                  {nf.meeting_date}
                  {nf.event_title ? ` · ${nf.event_title}` : ''}
                </span>
              )}
              {nf.dominant_outcome && (
                <span>
                  <strong style={{ color: 'var(--fg-subtle)' }}>{t(S.dominant, locale)}:</strong>{' '}
                  <span style={{ color: barColor(nf.dominant_outcome), fontWeight: 700 }}>
                    {outcomeLabel(nf.dominant_outcome, locale)}
                    {nf.dominant_probability != null ? ` ${fmtPct(nf.dominant_probability)}` : ''}
                  </span>
                </span>
              )}
              <span>
                <strong style={{ color: 'var(--fg-subtle)' }}>{t(S.volume, locale)}:</strong>{' '}
                {fmtVol(nf.volume_usd)}
              </span>
              <span>
                <strong style={{ color: 'var(--fg-subtle)' }}>{t(S.source, locale)}:</strong>{' '}
                {(prediction?.source || 'polymarket').toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {probs.map(([key, p]) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: compact ? '88px 1fr 48px' : '110px 1fr 52px', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{outcomeLabel(key, locale)}</span>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, p * 100))}%`,
                        height: '100%',
                        background: barColor(key),
                        borderRadius: 4,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', color: barColor(key) }}>
                    {fmtPct(p)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 12,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--warn-soft, rgba(251,191,36,.08))',
              borderLeft: '3px solid var(--warn)',
              fontSize: 11.5,
              lineHeight: 1.5,
              color: 'var(--fg-muted)',
            }}>
              {disclaimer || t(S.notOfficial, locale)}
              {nf.url && (
                <>
                  {' · '}
                  <a href={nf.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky, #38bdf8)' }}>
                    {t(S.open, locale)}
                  </a>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
