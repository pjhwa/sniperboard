'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useDaily } from '@/hooks/useDaily';
import { useEarnings } from '@/hooks/useEarnings';
import { Card } from '@/components/ui/Card';
import { UpcomingEarning } from '@/app/types';
import { RadialGauge } from '@/components/ui/RadialGauge';
import DailyChart from '@/components/charts/DailyChart';
import { Check, X } from '@/components/ui/Icons';
import { STAGE2_META } from '@/app/types';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { HeatStrip } from '@/components/ui/HeatStrip';
import { t, tField } from '@/app/i18n';
import type { BiLang } from '@/app/i18n';

const S: Record<string, BiLang> = {
  guideTitle:    { en: 'Daily Guide', ko: 'Daily 가이드' },
  guide1Heading: { en: 'About this screen', ko: '이 화면은' },
  guide1Body:    { en: 'Analyzes setup quality and medium/long-term trends using daily candles. Use the Stage2 checklist to determine if this stock has a buyable structure now.', ko: '일봉 기준 셋업 품질과 중장기 추세를 분석하는 화면입니다. Stage2 체크리스트로 지금 이 종목이 매수 가능한 구조인지 판단합니다.' },
  guide2Heading: { en: 'How to read key indicators', ko: '핵심 지표 읽는 법' },
  guide2Body:    { en: 'Stage2 score (0-7) is key. 6-7 = consider entry, 4-5 = watch, ≤3 = avoid. GC status shows medium-term trend phase; Breakout = aggressive buy, Below Channel = watch. Check entry/stop/target in the R:R panel.', ko: 'Stage2 점수(0~7)가 핵심입니다. 6~7점이면 진입 검토, 4~5점은 관망, 3 이하면 회피. GC 상태는 중기 추세 단계를 나타내며, Breakout이면 적극 매수, Below Channel이면 관망입니다. R:R 패널에서 진입·손절·목표가를 확인합니다.' },
  guide3Heading: { en: 'How to use now', ko: '지금 이렇게 쓰세요' },
  guide3Body:    { en: 'Stage2 ≥ 5 → GC Breakout or Above → Monthly uptrend confirmed → R:R ≥ 1:2 → Enter. Strong setup when all 4 pass.', ko: 'Stage2 ≥ 5 확인 → GC Breakout 또는 Above 확인 → 월봉 상승 확인 → R:R ≥ 1:2 확인 → 진입. 4가지 통과 시 강한 셋업입니다.' },
  loading:       { en: 'Loading...', ko: '로딩 중...' },
  chartLoading:  { en: 'Loading chart + Conviction...', ko: '차트 + Conviction 로딩 중...' },
  considerEntry: { en: 'Consider Entry', ko: '진입 고려' },
  watch:         { en: 'Watch', ko: '관망' },
  avoid:         { en: 'Avoid', ko: '회피' },
  noPattern:     { en: 'No pattern', ko: '패턴 없음' },
  heatmapTitle:  { en: '{n}-day Return Heatmap', ko: '{n}일 등락 히트맵' },
  heatmapInfo:   { en: 'Left (past) → Right (recent). Good setups show smaller, lighter cells on the right — volatility contracting as pivot approaches. Larger, darker recent cells mean volatility is still elevated. Green = up day, Red = down day. Darkness = magnitude.', ko: '왼쪽(과거)→오른쪽(최근) 순서입니다. 좋은 셋업은 오른쪽으로 갈수록 셀이 작고 색이 연해집니다 — 변동성이 수축하며 피봇을 준비 중이라는 신호입니다. 반대로 최근 셀이 크고 진하면 아직 변동성이 살아있어 진입 시기가 이릅니다. 초록=상승일, 빨강=하락일. 색의 진하기=움직임의 크기.' },
  upDays:        { en: '↑ Up', ko: '↑' },
  downDays:      { en: '↓ Down', ko: '↓' },
  winRate:       { en: 'Win Rate', ko: '승률' },
  avgMove:       { en: 'Avg', ko: '평균' },
  posLabel:      { en: 'Position', ko: 'Position' },
  posUnit:       { en: 'sh', ko: '주' },
  stage2Title:   { en: 'Minervini Stage 2', ko: 'Minervini Stage 2' },
  stage2Action:  { en: 'Checklist · 7 items', ko: '체크리스트 · 7항목' },
  rrTitle:       { en: 'R:R + Patterns', ko: 'R:R + 패턴' },
};

const STRUCT_COLOR: Record<string, string> = {
  UPTREND: 'bull', DOWNTREND: 'bear', DISTRIBUTION: 'warn', ACCUMULATION: 'info', NEUTRAL: 'neutral',
};

const MONTHLY_PHASE_META: Record<string, { label: BiLang; color: string; bg: string }> = {
  CONFIRMED_UPTREND: { label: { en: 'Monthly Uptrend Confirmed', ko: '월봉 상승 확인' }, color: '#fff', bg: 'var(--bull)' },
  WEAKENING:         { label: { en: 'Monthly Trend Weakening',   ko: '월봉 추세 약화' }, color: '#000', bg: 'var(--warn)' },
  NEUTRAL:           { label: { en: 'Monthly Neutral',           ko: '월봉 중립' },      color: 'var(--fg)', bg: 'var(--border)' },
  DOWNTREND:         { label: { en: 'Monthly Downtrend',         ko: '월봉 하락' },      color: '#fff', bg: 'var(--bear)' },
  UNKNOWN:           { label: { en: 'Monthly Data Insufficient', ko: '월봉 데이터 부족' }, color: 'var(--fg-muted)', bg: 'var(--border-soft)' },
};

export function DailyBoard() {
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const handler = () => setGuideOpen(true);
    document.addEventListener('guide:open', handler);
    return () => document.removeEventListener('guide:open', handler);
  }, []);
  const { symbol, rrAccount, rrRiskPct, locale } = useStore();
  const { dailyData, isLoading } = useDaily(symbol);
  const { earningsData } = useEarnings();
  const symbolEarning: UpcomingEarning | undefined = earningsData?.upcoming_earnings?.find(
    (e: UpcomingEarning) => e.symbol === symbol
  );

  const stage2 = dailyData?.stage2;

  // 90-day VCP heatmap data
  const heatCandles = (dailyData?.candles ?? []).slice(-91);
  const heatPcts: number[] = [];
  const heatDates: string[] = [];
  const heatCloses: number[] = [];
  for (let i = 1; i < heatCandles.length; i++) {
    const prev = heatCandles[i - 1].close;
    if (prev === 0) continue;
    const curr = heatCandles[i].close;
    heatPcts.push(((curr - prev) / prev) * 100);
    heatDates.push(heatCandles[i].time);
    heatCloses.push(curr);
  }
  const heatDays = heatPcts.length;
  const upDays = heatPcts.filter(v => v > 0).length;
  const downDays = heatPcts.filter(v => v < 0).length;
  const winRate = heatDays > 0 ? ((upDays / heatDays) * 100).toFixed(0) : '—';
  const avgUp = upDays > 0
    ? (heatPcts.filter(v => v > 0).reduce((a, b) => a + b, 0) / upDays).toFixed(2)
    : '0.00';
  const avgDown = downDays > 0
    ? (heatPcts.filter(v => v < 0).reduce((a, b) => a + b, 0) / downDays).toFixed(2)
    : '0.00';

  const structColor = STRUCT_COLOR[stage2?.market_structure ?? 'NEUTRAL'] ?? 'neutral';

  const entry = stage2?.entry ?? 0;
  const stop = stage2?.stop ?? 0;
  const target = stage2?.target ?? 0;

  const accountNum = parseFloat(rrAccount.replace(/,/g, '')) || 100000;
  const riskPct = parseFloat(rrRiskPct) || 1;
  const riskAmt = accountNum * (riskPct / 100);
  const qty = stop > 0 && entry > stop ? Math.floor(riskAmt / (entry - stop)) : 0;
  const stopLossPct = entry > 0 ? ((entry - stop) / entry) * 100 : 0;

  const DAILY_GUIDE = (): GuideSection[] => [
    { heading: t(S.guide1Heading, locale), body: t(S.guide1Body, locale) },
    { heading: t(S.guide2Heading, locale), body: t(S.guide2Body, locale) },
    { heading: t(S.guide3Heading, locale), body: t(S.guide3Body, locale) },
  ];

  const sublabel = stage2
    ? (stage2.score >= 6 ? t(S.considerEntry, locale) : stage2.score >= 4 ? t(S.watch, locale) : t(S.avoid, locale))
    : '';

  return (
    <div className="board-wrap">
      <BoardGuidePanel title={t(S.guideTitle, locale)} sections={DAILY_GUIDE()} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '1fr 340px' }}
    >
      {/* Daily chart */}
      <div className="card" style={{ gridRow: 'span 2' }}>
        <div className="card__hd">
          <h3>{symbol} · Daily</h3>
          {stage2 && <span className={'badge ' + structColor}>{stage2.market_structure}</span>}
          <ConvictionBadge score={dailyData?.conviction_score} locale={locale} size="md" />
          <small style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            1Y · Gaussian Channel
            <InfoPopover term={t(G.gc_status.term, locale)} body={t(G.gc_status.body, locale)} />
          </small>
        </div>
        <div className="card__bd" style={{ paddingTop: 0 }}>
          {symbolEarning && symbolEarning.relevance_tier !== 'watching' && (
            <div style={{
              background: symbolEarning.relevance_tier === 'imminent' ? 'var(--warn)' : 'var(--border)',
              color: symbolEarning.relevance_tier === 'imminent' ? '#000' : 'var(--fg)',
              padding: '4px 12px',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: 0.9,
            }}>
              <span style={{ fontWeight: 700 }}>
                {symbolEarning.relevance_tier === 'imminent' ? '⚡' : '📅'} EARNINGS IN {symbolEarning.days_until}D
              </span>
              <span style={{ opacity: 0.8 }}>{tField(symbolEarning.action_note_en, symbolEarning.action_note_ko, symbolEarning.action_note, locale)}</span>
            </div>
          )}
          {isLoading ? (
            <div className="subtle" style={{ padding: 24 }}>
              {t(S.chartLoading, locale)}
            </div>
          ) : dailyData ? (
            <DailyChart data={dailyData} />
          ) : null}
        </div>
      </div>

      {/* Stage 2 score */}
      <Card title={t(S.stage2Title, locale)} action={t(S.stage2Action, locale)} info={{ term: t(G.stage2.term, locale), body: t(G.stage2.body, locale) }}>
        {stage2 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <RadialGauge
                value={stage2.score}
                max={7}
                size={88}
                label={`${stage2.score}/7`}
                sublabel={sublabel}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>RS Score</div>
                <div
                  className="mono"
                  style={{
                    fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em',
                    color: stage2.rs_score >= 70 ? 'var(--bull)' : stage2.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)',
                  }}
                >
                  {stage2.rs_score}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>{locale === 'en' ? 'vs SPY · 63d' : 'vs SPY · 63일'}</div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--fg-muted)' }}>
                  <div>{locale === 'en' ? '52w High:' : '52w 고점:'} <span className="mono">{stage2.pct_from_52w_high.toFixed(1)}%</span></div>
                  <div>{locale === 'en' ? 'Pullback:' : '최근 조정:'} <span className="mono">{stage2.pullback_pct.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            {/* Monthly trend */}
            {(() => {
              const mp = stage2.monthly_phase ?? 'UNKNOWN';
              const meta = MONTHLY_PHASE_META[mp] ?? MONTHLY_PHASE_META.UNKNOWN;
              return (
                <div style={{
                  marginTop: 8,
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: meta.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>
                    {t(meta.label, locale)}
                  </span>
                  {stage2.monthly_ema10 != null && (
                    <span style={{ fontSize: 11.5, color: meta.color, opacity: 0.85 }} className="mono">
                      EMA10 ${stage2.monthly_ema10.toFixed(2)}
                      {stage2.pct_from_monthly_ema10 != null && (
                        <> · {stage2.pct_from_monthly_ema10 > 0 ? '+' : ''}{stage2.pct_from_monthly_ema10.toFixed(1)}%</>
                      )}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Phase 1: Conviction - integrated in Stage 2 card */}
            {dailyData?.conviction_score != null && (
              <div style={{ marginTop: 10 }}>
                <ConvictionBadge score={dailyData.conviction_score} locale={locale} size="md" />
              </div>
            )}
            <div>
              {(Object.keys(STAGE2_META) as (keyof typeof STAGE2_META)[]).map(k => {
                const pass = stage2.checks[k];
                return (
                  <div key={k} className={'s2-row ' + (pass ? 'pass' : 'fail')}>
                    <div className="check">{pass ? <Check /> : <X />}</div>
                    <div className="s2-label">{STAGE2_META[k].label}</div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="subtle">{t(S.loading, locale)}</div>
        )}
      </Card>

      {/* R:R + patterns */}
      <Card title={t(S.rrTitle, locale)} info={{ term: t(G.rr_ratio.term, locale), body: t(G.rr_ratio.body, locale) }} style={{ minHeight: 0 }}>
        {stage2 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--info-soft)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Entry</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--info)' }}>${entry.toFixed(2)}</div>
              </div>
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--bear-soft)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--bear)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stop</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--bear)' }}>${stop.toFixed(2)}</div>
              </div>
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--bull-soft)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--bull)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--bull)' }}>${target.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <span>R:R Ratio</span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--fg)' }}>1 : 3.00</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <span>Stop Loss %</span>
              <span className="mono" style={{ color: 'var(--bear)' }}>-{stopLossPct.toFixed(2)}%</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
              <span>{t(S.posLabel, locale)} ({rrRiskPct}% risk on ${(accountNum / 1000).toFixed(0)}K)</span>
              <span className="mono" style={{ color: 'var(--em-500)', fontWeight: 600 }}>{qty > 0 ? `${qty} ${t(S.posUnit, locale)}` : '—'}</span>
            </div>

            <div className="divider" />

            <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Patterns</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {stage2.gc_breakout && <span className="badge purple">GC Breakout</span>}
              {stage2.gc_retest && <span className="badge purple">GC Retest</span>}
              {stage2.gc_above && <span className="badge teal">Above Channel</span>}
              {stage2.gc_below && <span className="badge bear">Below Channel</span>}
              {stage2.bear_flag && <span className="badge bear">Bear Flag</span>}
              {stage2.rsi_divergence_bearish && <span className="badge warn">RSI Bear Div</span>}
              {stage2.rsi_divergence_bullish && <span className="badge bull">RSI Bull Div</span>}
              {!stage2.bear_flag && !stage2.rsi_divergence_bearish && !stage2.gc_breakout && (
                <span className="badge neutral">{t(S.noPattern, locale)}</span>
              )}
            </div>
          </>
        ) : (
          <div className="subtle">{t(S.loading, locale)}</div>
        )}
      </Card>

      {/* 90-day VCP heatmap */}
      {heatDays > 0 && (
        <div
          className="card"
          style={{ gridColumn: '1 / -1' }}
        >
          <div className="card__hd">
            <h3>{t(S.heatmapTitle, locale).replace('{n}', String(heatDays))}</h3>
            <InfoPopover
              term={t(S.heatmapTitle, locale).replace('{n}', '90')}
              body={t(S.heatmapInfo, locale)}
            />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--fg-muted)' }}>
              <span>
                <span style={{ color: 'var(--bull)', fontWeight: 600 }}>{t(S.upDays, locale)}{upDays}{locale === 'ko' ? '일' : 'd'}</span>
                {' '}
                <span style={{ color: 'var(--bear)', fontWeight: 600 }}>{t(S.downDays, locale)}{downDays}{locale === 'ko' ? '일' : 'd'}</span>
              </span>
              <span>{t(S.winRate, locale)} <span className="mono" style={{ color: 'var(--fg)' }}>{winRate}%</span></span>
              <span>{t(S.avgMove, locale)} <span className="mono" style={{ color: 'var(--bull)' }}>+{avgUp}%</span> / <span className="mono" style={{ color: 'var(--bear)' }}>{avgDown}%</span></span>
            </div>
          </div>
          <div className="card__bd">
            <HeatStrip
              values={heatPcts}
              cols={heatDays}
              rows={1}
              dates={heatDates}
              closes={heatCloses}
            />
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
