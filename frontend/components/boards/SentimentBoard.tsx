'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useSentiment } from '@/hooks/useSentiment';
import { useBrief } from '@/hooks/useBrief';
import { Card } from '@/components/ui/Card';
import { SymbolBrief, SETUP_QUALITY_META, FreshnessMeta, TopNews } from '@/app/types';
import { RadialGauge } from '@/components/ui/RadialGauge';
import { SENTIMENT_META, TREND_META, VOLUME_META } from '@/app/types';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
import { formatDateTime } from '@/lib/formatDateTime';
import { SentimentTrendChart } from './SentimentTrendChart';

const SENTIMENT_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '소셜 미디어와 뉴스를 AI로 분석한 시장·종목별 심리 점수를 보여주는 화면입니다. 기술적 신호와 함께 읽으면 확신도를 높일 수 있습니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: '복합점수(−2~+2)가 핵심. +1.5 이상은 과열 주의, −1.5 이하는 역발상 매수 기회. Confidence가 LOW이면 데이터 신뢰도 낮음. 종목별 점수 클릭 시 최근 7일/30일 추이 차트를 볼 수 있습니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: '시장 전체 심리 먼저 확인 → 관심 종목 심리 확인 → 심리가 기술적 신호와 일치(예: Sniper 신호 + 심리 개선)하면 확신 높은 진입으로 판단.',
  },
];

function TopNewsBox({ topNews }: { topNews: TopNews | null | undefined }) {
  if (!topNews) return null;
  return (
    <div style={{
      marginTop: 8,
      padding: '7px 10px',
      borderRadius: 6,
      background: 'var(--em-soft)',
      borderLeft: '2px solid var(--em-500)',
    }}>
      <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)', marginBottom: 3 }}>
        주요 뉴스
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.4, marginBottom: 3 }}>
        {topNews.headline}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 4 }}>
        {topNews.summary}
      </div>
      <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)' }}>
        출처: {topNews.source}
      </div>
    </div>
  );
}

// -2 ~ +2 범위를 색상으로 표현  (var(--emerald/orange/red)는 미정의 → bull/orange literal/bear)
function compositeColor(score: number): string {
  if (score >= 1.5) return 'var(--bull)';
  if (score >= 0.5) return 'var(--teal)';
  if (score > -0.5) return 'var(--fg-muted)';
  if (score > -1.5) return 'hsl(20 90% 55%)';
  return 'var(--bear)';
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
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const { data: sentimentData, isLoading } = useSentiment();
  const { briefData } = useBrief();
  const briefBySymbol = (briefData?.symbol_briefs ?? []).reduce(
    (acc: Record<string, SymbolBrief>, sb: SymbolBrief) => { acc[sb.symbol] = sb; return acc; },
    {}
  );

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
    <div className="board-wrap">
      <button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
      <BoardGuidePanel title="Sentiment 가이드" sections={SENTIMENT_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    <div className="board fade-in" style={{ gridTemplateColumns: '380px 1fr', gridTemplateRows: 'auto 1fr auto', alignContent: 'start' }}>
      {/* 시장 전체 */}
      <Card title="Market Sentiment" action={formatDateTime(market?.as_of)} info={G.composite_score}>
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
                <TopNewsBox topNews={market.top_news} />
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
        {sentimentData?.meta && (
          <div style={{ marginTop: 8, fontSize: 9.5, color: (sentimentData.meta.age_minutes > 90 ? 'var(--warn)' : 'var(--fg-subtle)'), opacity: 0.7, fontFamily: 'var(--font-mono, monospace)' }}>
            ⏱ {Math.round(sentimentData.meta.age_minutes)}m ago
          </div>
        )}
      </Card>

      {/* 종목별 카드 */}
      <Card title="Symbol Sentiment" action="워치리스트 심리" style={{ overflow: 'visible' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: expandedSymbol ? '1fr' : 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {symbols.map(it => {
            const score = it.composite_score ?? it.sentiment_score;
            const meta = SENTIMENT_META[it.sentiment];
            const trend = TREND_META[it.trend_vs_yesterday];
            const vol = VOLUME_META[it.mention_volume];
            return (
              <div
                key={it.symbol}
                onClick={() => {
                  setSymbol(it.symbol);
                  setExpandedSymbol(prev => prev === it.symbol ? null : it.symbol);
                }}
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
                  {briefBySymbol[it.symbol] && (() => {
                    const sq = briefBySymbol[it.symbol].setup_quality;
                    const sqMeta = SETUP_QUALITY_META[sq] ?? SETUP_QUALITY_META['B'];
                    return (
                      <span className={`badge ${sqMeta.color}`} style={{ fontSize: 10, marginLeft: 2 }}>
                        {sqMeta.label}
                      </span>
                    );
                  })()}
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
                <TopNewsBox topNews={it.top_news} />

                {/* 메타 */}
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--fg-subtle)' }}>
                  {trend && <span>{trend.icon} {it.trend_vs_yesterday}</span>}
                  {vol && <span>· {vol.label}</span>}
                  {it.bot_suspected === 'yes' && <span style={{ color: 'var(--warn)' }}>· 봇 의심</span>}
                </div>
                {expandedSymbol === it.symbol && (
                  <SentimentTrendChart symbol={it.symbol} />
                )}
              </div>
            );
          })}
        </div>
        {symbols.length === 0 && (
          <div className="subtle" style={{ textAlign: 'center', padding: 24 }}>심리 데이터 없음</div>
        )}
      </Card>

    </div>
    </div>
  );
}
