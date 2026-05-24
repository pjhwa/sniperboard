'use client';

import { useStore } from '@/hooks/useStore';
import { useDaily } from '@/hooks/useDaily';
import { useEarnings } from '@/hooks/useEarnings';
import { Card } from '@/components/ui/Card';
import { UpcomingEarning } from '@/app/types';
import { RadialGauge } from '@/components/ui/RadialGauge';
import DailyChart from '@/components/charts/DailyChart';
import { Check, X } from '@/components/ui/Icons';
import { STAGE2_META } from '@/app/types';
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';

const DAILY_GLOSSARY: GlossaryItem[] = [
  { term: 'Stage 2 점수 (0~7)', plain: 'Minervini가 정의한 이상적인 매수 구간 조건 7가지를 충족한 개수입니다. 6~7점이면 진입 검토, 4~5점은 관망, 3점 이하면 매수 회피를 권장합니다.', color: 'var(--bull)' },
  { term: 'RS Score (상대 강도)', plain: 'S&P500(미국 대표 지수)과 비교해 최근 63일(약 3개월) 수익률이 얼마나 우수한지를 0~100 점수로 나타냅니다. 70 이상이면 시장의 상위 30% 강세주입니다.' },
  { term: '52w 고점 이격', plain: '최근 52주(1년) 중 가장 높은 가격에서 현재 가격이 몇 % 아래에 있는지 보여줍니다. -25% 이내면 Stage 2 조건 중 하나를 충족합니다.' },
  { term: '최근 조정 (Pullback %)', plain: '최근 20일 고점 대비 현재가가 얼마나 하락했는지를 나타냅니다. 15% 이내면 건강한 조정, 그 이상이면 추세 붕괴 가능성이 있습니다.' },
  { term: '가우시안 채널 (Gaussian Channel)', plain: '통계적 평활화 기법으로 그린 추세 밴드입니다. 주가가 채널 위에 있으면 강세, 채널 안에서 움직이면 정상 추세, 채널 아래로 이탈하면 약세 신호입니다.' },
  { term: 'GC Breakout (가우시안 채널 상단 돌파)', plain: '주가가 가우시안 채널의 위 경계를 위로 돌파한 상태입니다. 강한 모멘텀의 신호로, 추세 가속을 의미합니다.', color: 'var(--purple)' },
  { term: 'GC Retest (채널 재접촉)', plain: '채널 상단을 돌파한 후 다시 채널 경계에 접촉하는 패턴입니다. "눌림목 확인" 진입 기회가 될 수 있습니다.', color: 'var(--purple)' },
  { term: 'Above Channel / Below Channel', plain: '주가가 가우시안 채널 위(Above)에 완전히 있으면 강세, 채널 아래(Below)로 이탈했으면 약세를 의미합니다.' },
  { term: 'Bear Flag (베어 플래그)', plain: '주가가 급락 후 횡보하는 약세 패턴입니다. 이 패턴이 완성되면 추가 하락 가능성이 높아 매수를 피해야 합니다.', color: 'var(--bear)' },
  { term: 'RSI Bull Div (강세 다이버전스)', plain: '주가는 이전 저점보다 낮아졌는데 RSI는 이전보다 높아지는 현상입니다. 하락 모멘텀이 약해지며 반등 가능성을 시사합니다.', color: 'var(--bull)' },
  { term: 'RSI Bear Div (약세 다이버전스)', plain: '주가는 이전 고점보다 높아졌는데 RSI는 이전보다 낮아지는 현상입니다. 상승 모멘텀이 약해지며 하락 전환 가능성을 경고합니다.', color: 'var(--warn)' },
  { term: 'Entry / Stop / Target', plain: '피벗 진입가(어디서 살지), 손절가(틀렸을 때 어디서 팔지), 목표가(어디까지 벌지)입니다. 이 세 가격을 미리 정하는 것이 계획적인 트레이딩의 기본입니다.' },
  { term: 'R:R Ratio 1:3', plain: '리스크 대 보상 비율입니다. 1을 잃을 위험을 감수하고 3을 버는 구조입니다. 이 비율을 지키면 3번 중 1번만 성공해도 전체적으로 손익이 맞습니다.' },
  { term: 'Position (매수 수량)', plain: '계좌 금액과 리스크 %를 입력하면 자동으로 계산되는 권장 매수 주수입니다. 한 번의 손절로 잃는 금액이 계좌의 일정 % 이내가 되도록 조절합니다.' },
];

const STRUCT_COLOR: Record<string, string> = {
  UPTREND: 'bull', DOWNTREND: 'bear', DISTRIBUTION: 'warn', ACCUMULATION: 'info', NEUTRAL: 'neutral',
};

export function DailyBoard() {
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
      style={{ gridTemplateColumns: '1fr 340px', gridTemplateRows: 'auto 1fr auto' }}
    >
      {/* Daily chart */}
      <div className="card" style={{ gridRow: 'span 2' }}>
        <div className="card__hd">
          <h3>{symbol} · Daily</h3>
          {stage2 && <span className={'badge ' + structColor}>{stage2.market_structure}</span>}
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
            <div className="subtle" style={{ padding: 24 }}>차트 로딩 중...</div>
          ) : dailyData ? (
            <DailyChart data={dailyData} />
          ) : null}
        </div>
      </div>

      {/* Stage 2 score */}
      <Card title="Minervini Stage 2" action="Checklist · 7 items">
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
      <Card title="R:R + Patterns">
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

      {/* 이 화면 데이터 설명 */}
      <div style={{ gridColumn: 'span 2' }}>
        <GlossaryPanel items={DAILY_GLOSSARY} />
      </div>
    </div>
  );
}
