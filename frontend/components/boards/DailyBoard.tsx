'use client';

import { useState } from 'react';
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

const DAILY_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '일봉 기준 셋업 품질과 중장기 추세를 분석하는 화면입니다. Stage2 체크리스트로 지금 이 종목이 매수 가능한 구조인지 판단합니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: 'Stage2 점수(0~7)가 핵심입니다. 6~7점이면 진입 검토, 4~5점은 관망, 3 이하면 회피. GC 상태는 중기 추세 단계를 나타내며, Breakout이면 적극 매수, Below Channel이면 관망입니다. R:R 패널에서 진입·손절·목표가를 확인합니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'Stage2 ≥ 5 확인 → GC Breakout 또는 Above 확인 → 월봉 상승 확인 → R:R ≥ 1:2 확인 → 진입. 4가지 통과 시 강한 셋업입니다.',
  },
];

const STRUCT_COLOR: Record<string, string> = {
  UPTREND: 'bull', DOWNTREND: 'bear', DISTRIBUTION: 'warn', ACCUMULATION: 'info', NEUTRAL: 'neutral',
};

const MONTHLY_PHASE_META: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED_UPTREND: { label: '월봉 상승 확인', color: '#fff', bg: 'var(--bull)' },
  WEAKENING:         { label: '월봉 추세 약화', color: '#000', bg: 'var(--warn)' },
  NEUTRAL:           { label: '월봉 중립',      color: 'var(--fg)', bg: 'var(--border)' },
  DOWNTREND:         { label: '월봉 하락',       color: '#fff', bg: 'var(--bear)' },
  UNKNOWN:           { label: '월봉 데이터 부족', color: 'var(--fg-muted)', bg: 'var(--border-soft)' },
};

export function DailyBoard() {
  const [guideOpen, setGuideOpen] = useState(false);
  const { symbol, rrAccount, rrRiskPct } = useStore();
  const { dailyData, isLoading } = useDaily(symbol);
  const { earningsData } = useEarnings();
  const symbolEarning: UpcomingEarning | undefined = earningsData?.upcoming_earnings?.find(
    (e: UpcomingEarning) => e.symbol === symbol
  );

  const stage2 = dailyData?.stage2;
  const structColor = STRUCT_COLOR[stage2?.market_structure ?? 'NEUTRAL'] ?? 'neutral';

  const entry = stage2?.entry ?? 0;
  const stop = stage2?.stop ?? 0;
  const target = stage2?.target ?? 0;

  const accountNum = parseFloat(rrAccount.replace(/,/g, '')) || 100000;
  const riskPct = parseFloat(rrRiskPct) || 1;
  const riskAmt = accountNum * (riskPct / 100);
  const qty = stop > 0 && entry > stop ? Math.floor(riskAmt / (entry - stop)) : 0;
  const stopLossPct = entry > 0 ? ((entry - stop) / entry) * 100 : 0;

  return (
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '1fr 340px', gridTemplateRows: 'auto 1fr auto', position: 'relative' }}
    >
      <button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
      <BoardGuidePanel title="Daily 가이드" sections={DAILY_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      {/* Daily chart */}
      <div className="card" style={{ gridRow: 'span 2' }}>
        <div className="card__hd">
          <h3>{symbol} · Daily</h3>
          {stage2 && <span className={'badge ' + structColor}>{stage2.market_structure}</span>}
          <ConvictionBadge score={dailyData?.conviction_score} size="md" />
          <small>1Y · Gaussian Channel</small>
        </div>
        <div className="card__bd" style={{ paddingTop: 0 }}>
          {/* watching tier(22-30일, 추정치 미형성)는 배너 노출 안 함 — 노이즈 */}
          {symbolEarning && symbolEarning.relevance_tier !== 'watching' && (
            <div style={{
              background: symbolEarning.relevance_tier === 'imminent' ? 'var(--warn)' : 'var(--border)',
              color: symbolEarning.relevance_tier === 'imminent' ? '#000' : 'var(--fg)',
              padding: '4px 12px',
              fontSize: 11.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: 0.9,
            }}>
              <span style={{ fontWeight: 700 }}>
                {symbolEarning.relevance_tier === 'imminent' ? '⚡' : '📅'} EARNINGS IN {symbolEarning.days_until}D
              </span>
              <span style={{ opacity: 0.8 }}>{symbolEarning.action_note}</span>
            </div>
          )}
          {isLoading ? (
            <div className="subtle" style={{ padding: 24 }}>
              차트 + Conviction 로딩 중...
            </div>
          ) : dailyData ? (
            <DailyChart data={dailyData} />
          ) : null}
        </div>
      </div>

      {/* Stage 2 score */}
      <Card title="Minervini Stage 2" action="Checklist · 7 items" info={G.stage2}>
        {stage2 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <RadialGauge
                value={stage2.score}
                max={7}
                size={88}
                label={`${stage2.score}/7`}
                sublabel={stage2.score >= 6 ? '진입 고려' : stage2.score >= 4 ? '관망' : '회피'}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>RS Score</div>
                <div
                  className="mono"
                  style={{
                    fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em',
                    color: stage2.rs_score >= 70 ? 'var(--bull)' : stage2.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)',
                  }}
                >
                  {stage2.rs_score}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--fg-muted)' }}>vs SPY · 63일</div>
                <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--fg-muted)' }}>
                  <div>52w 고점: <span className="mono">{stage2.pct_from_52w_high.toFixed(1)}%</span></div>
                  <div>최근 조정: <span className="mono">{stage2.pullback_pct.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            {/* 월봉 추세 */}
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
                  <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>
                    {meta.label}
                  </span>
                  {stage2.monthly_ema10 != null && (
                    <span style={{ fontSize: 10.5, color: meta.color, opacity: 0.85 }} className="mono">
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
                <ConvictionBadge score={dailyData.conviction_score} label={dailyData.conviction_label} size="md" />
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
          <div className="subtle">로딩 중...</div>
        )}
      </Card>

      {/* R:R + patterns */}
      <Card title="R:R + Patterns" info={G.rr_ratio}>
        {stage2 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--info-soft)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Entry</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--info)' }}>${entry.toFixed(2)}</div>
              </div>
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--bear-soft)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--bear)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stop</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--bear)' }}>${stop.toFixed(2)}</div>
              </div>
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--bull-soft)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--bull)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--bull)' }}>${target.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <span>R:R Ratio</span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--fg)' }}>1 : 3.00</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <span>Stop Loss %</span>
              <span className="mono" style={{ color: 'var(--bear)' }}>-{stopLossPct.toFixed(2)}%</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
              <span>Position ({rrRiskPct}% risk on ${(accountNum / 1000).toFixed(0)}K)</span>
              <span className="mono" style={{ color: 'var(--em-500)', fontWeight: 600 }}>{qty > 0 ? `${qty} 주` : '—'}</span>
            </div>

            <div className="divider" />

            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Patterns</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {stage2.gc_breakout && <span className="badge purple">GC Breakout</span>}
              {stage2.gc_retest && <span className="badge purple">GC Retest</span>}
              {stage2.gc_above && <span className="badge teal">Above Channel</span>}
              {stage2.gc_below && <span className="badge bear">Below Channel</span>}
              {stage2.bear_flag && <span className="badge bear">Bear Flag</span>}
              {stage2.rsi_divergence_bearish && <span className="badge warn">RSI Bear Div</span>}
              {stage2.rsi_divergence_bullish && <span className="badge bull">RSI Bull Div</span>}
              {!stage2.bear_flag && !stage2.rsi_divergence_bearish && !stage2.gc_breakout && (
                <span className="badge neutral">패턴 없음</span>
              )}
            </div>
          </>
        ) : (
          <div className="subtle">로딩 중...</div>
        )}
      </Card>

    </div>
  );
}
