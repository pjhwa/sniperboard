'use client';

import { useStore } from '@/hooks/useStore';
import { useSentiment } from '@/hooks/useSentiment';
import { Card } from '@/components/ui/Card';
import { RadialGauge } from '@/components/ui/RadialGauge';
import { SENTIMENT_META, TREND_META, VOLUME_META } from '@/app/types';

function compositeColor(score: number): string {
  if (score >= 1.5) return 'var(--emerald)';
  if (score >= 0.5) return 'var(--teal)';
  if (score > -0.5) return 'var(--fg-muted)';
  if (score > -1.5) return 'var(--orange)';
  return 'var(--red)';
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
      {/* Market sentiment */}
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

      {/* Per-symbol cards */}
      <Card title="Symbol Sentiment" action="워치리스트 심리">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {symbols.map(it => {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="sym-pill__badge" style={{ width: 22, height: 22 }}>{it.symbol[0]}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{it.symbol}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)' }}>
                    {meta?.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  {it.composite_score !== undefined ? (
                    <span
                      className="mono"
                      title="복합점수: 신뢰도·봇의심·언급량·가격다이버전스 반영"
                      style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: compositeColor(it.composite_score) }}
                    >
                      {it.composite_score > 0 ? '+' : ''}{it.composite_score}
                    </span>
                  ) : (
                    <span className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
                      {it.sentiment_score}
                    </span>
                  )}
                  {it.score_delta != null && (
                    <span className={'mono ' + (it.score_delta >= 0 ? 'chg up' : 'chg down')} style={{ fontSize: 11 }}>
                      {it.score_delta >= 0 ? '+' : ''}{it.score_delta}
                    </span>
                  )}
                  <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>vs 어제</span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 8 }}>
                  {it.key_reason}
                </div>
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
