'use client';

import { useStore } from '@/hooks/useStore';
import { useSentiment } from '@/hooks/useSentiment';
import { Card } from '@/components/ui/Card';
import { RadialGauge } from '@/components/ui/RadialGauge';
import { SENTIMENT_META, TREND_META, VOLUME_META } from '@/app/types';

// -2 ~ +2 범위를 색상으로 표현
function compositeColor(score: number): string {
  if (score >= 1.5) return 'var(--emerald)';
  if (score >= 0.5) return 'var(--teal)';
  if (score > -0.5) return 'var(--fg-muted)';
  if (score > -1.5) return 'var(--orange)';
  return 'var(--red)';
}

// -2 ~ +2 위치를 시각화하는 바
function ScoreBar({ score }: { score: number }) {
  const clampedScore = Math.max(-2, Math.min(2, score));
  const pct = ((clampedScore + 2) / 4) * 100; // -2→0%, 0→50%, +2→100%
  const isPositive = clampedScore >= 0;
  const fillLeft = isPositive ? 50 : pct;
  const fillWidth = isPositive ? pct - 50 : 50 - pct;
  const color = compositeColor(clampedScore);

  return (
    <div style={{ margin: '8px 0 6px' }}>
      {/* 트랙 */}
      <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'var(--border)' }}>
        {/* 중립(0) 기준선 */}
        <div style={{
          position: 'absolute', top: -2, bottom: -2, left: '50%',
          width: 1, background: 'var(--fg-subtle)', opacity: 0.5,
          transform: 'translateX(-50%)',
        }} />
        {/* 현재 점수 채움 (중립 기준으로 좌우) */}
        <div style={{
          position: 'absolute', top: 0, height: '100%',
          left: `${fillLeft}%`, width: `${fillWidth}%`,
          borderRadius: 3, background: color, opacity: 0.85,
        }} />
        {/* 현재 위치 도트 */}
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          width: 9, height: 9, borderRadius: '50%',
          background: color, border: '2px solid var(--card)',
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 4px ${color}`,
        }} />
      </div>
      {/* 스케일 레이블 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--fg-subtle)', marginTop: 4 }}>
        <span>−2 극도공포</span>
        <span>0 중립</span>
        <span>도취 +2</span>
      </div>
    </div>
  );
}

// 델타를 읽기 쉬운 문장으로
function DeltaLabel({ delta }: { delta: number | null }) {
  if (delta === null) return (
    <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>전일 데이터 없음</span>
  );
  if (Math.abs(delta) < 0.05) return (
    <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>어제와 동일</span>
  );
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? 'var(--bull)' : 'var(--bear)';
  const label = delta > 0 ? '상승' : '하락';
  return (
    <span style={{ fontSize: 10.5, color }}>
      어제보다 {sign}{delta} {label}
    </span>
  );
}

export function SentimentBoard() {
  const { symbol, setSymbol } = useStore();
  const { data: sentimentData, isLoading } = useSentiment();

  if (isLoading) {
    return (
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ padding: 24 }}>
          <div className="subtle">심리 데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!sentimentData?.available || !sentimentData.latest) {
    return (
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
            {sentimentData?.error ?? '심리 데이터를 불러올 수 없습니다.'}
          </div>
        </div>
      </div>
    );
  }

  const latest = sentimentData.latest;
  const market = latest.market;
  const symbols = latest.symbols ?? [];

  return (
    <div className="board fade-in" style={{ gridTemplateColumns: '380px 1fr', gridTemplateRows: 'auto 1fr' }}>
      {/* 시장 전체 */}
      <Card title="Market Sentiment" action={market?.as_of ?? ''}>
        {market ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <RadialGauge
                value={(market.composite_score ?? market.sentiment_score) + 2}
                max={4}
                size={110}
                label={market.composite_score ?? market.sentiment_score}
                sublabel={SENTIMENT_META[market.sentiment]?.label}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className={'badge ' + (SENTIMENT_META[market.sentiment]?.color.replace('text-', '').split('-')[0] ?? 'neutral')}>
                  {SENTIMENT_META[market.sentiment]?.label}
                </span>
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                  {market.key_reason}
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: 10.5 }}>
                  <div>
                    <div className="subtle" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>전일 대비</div>
                    <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>
                      {TREND_META[market.trend_vs_yesterday]?.icon} {market.trend_vs_yesterday}
                    </div>
                  </div>
                  <div>
                    <div className="subtle" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confidence</div>
                    <div className="mono" style={{ fontWeight: 600, fontSize: 13, color: 'var(--em-500)' }}>
                      {market.confidence.toUpperCase()}
                    </div>
                  </div>
                  {market.composite_score !== undefined && (
                    <div>
                      <div className="subtle" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>복합점수</div>
                      <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: compositeColor(market.composite_score) }}>
                        {market.composite_score > 0 ? '+' : ''}{market.composite_score}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="divider" style={{ margin: '14px 0 8px' }} />
            <div className="subtle" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>스케일</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(Object.entries(SENTIMENT_META) as [string, typeof SENTIMENT_META[keyof typeof SENTIMENT_META]][]).map(([k, m]) => (
                <div
                  key={k}
                  style={{
                    flex: 1, textAlign: 'center', fontSize: 10, padding: '5px 2px', borderRadius: 6,
                    background: k === market.sentiment ? `var(--${m.color.replace('text-', '').replace('-400', '-soft').replace('-500', '-soft')})` : 'transparent',
                    color: k === market.sentiment ? `var(--${m.color.replace('text-', '').replace(/-\d+/, '')})` : 'var(--fg-subtle)',
                    border: k === market.sentiment ? '1px solid currentColor' : '1px solid transparent',
                    fontWeight: k === market.sentiment ? 600 : 400,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      {/* 종목별 카드 */}
      <Card title="Symbol Sentiment" action="워치리스트 심리">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {symbols.map(it => {
            const score = it.composite_score ?? it.sentiment_score;
            const meta = SENTIMENT_META[it.sentiment];
            const trend = TREND_META[it.trend_vs_yesterday];
            const vol = VOLUME_META[it.mention_volume];
            return (
              <div
                key={it.symbol}
                onClick={() => setSymbol(it.symbol)}
                style={{
                  padding: 12,
                  borderRadius: 'var(--r)',
                  border: '1px solid var(--border)',
                  background: it.symbol === symbol ? 'var(--em-soft)' : 'var(--card)',
                  cursor: 'pointer',
                }}
              >
                {/* 헤더: 심볼 + 등급 배지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="sym-pill__badge" style={{ width: 22, height: 22 }}>{it.symbol[0]}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{it.symbol}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                    color: compositeColor(score),
                    background: 'var(--card)',
                    border: `1px solid ${compositeColor(score)}`,
                    padding: '1px 6px', borderRadius: 4,
                  }}>
                    {meta?.label}
                  </span>
                </div>

                {/* 주 점수 */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                  <span
                    className="mono"
                    title="복합점수: 신뢰도·봇의심·언급량·가격다이버전스 반영 (범위 −2 ~ +2)"
                    style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: compositeColor(score) }}
                  >
                    {score > 0 ? '+' : ''}{score}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>/ 2.0 최대</span>
                </div>

                {/* 스코어 바: −2 ~ +2 범위에서 현재 위치 시각화 */}
                <ScoreBar score={score} />

                {/* 델타 */}
                <div style={{ marginBottom: 6 }}>
                  <DeltaLabel delta={it.score_delta ?? null} />
                </div>

                {/* 이유 */}
                <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 6 }}>
                  {it.key_reason}
                </div>

                {/* 메타 */}
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--fg-subtle)' }}>
                  {trend && <span>{trend.icon} {it.trend_vs_yesterday}</span>}
                  {vol && <span>· {vol.label}</span>}
                  {it.bot_suspected === 'yes' && <span style={{ color: 'var(--warn)' }}>· 봇 의심</span>}
                </div>
              </div>
            );
          })}
        </div>
        {symbols.length === 0 && (
          <div className="subtle" style={{ textAlign: 'center', padding: 24 }}>심리 데이터 없음</div>
        )}
      </Card>
    </div>
  );
}
