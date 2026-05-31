'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useSentiment } from '@/hooks/useSentiment';
import { useBrief } from '@/hooks/useBrief';
import { Card } from '@/components/ui/Card';
import { SymbolBrief, SETUP_QUALITY_META, TopNews } from '@/app/types';
import { RadialGauge } from '@/components/ui/RadialGauge';
import { SENTIMENT_META, TREND_META, VOLUME_META } from '@/app/types';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
import { formatDateTime } from '@/lib/formatDateTime';
import { SentimentTrendChart } from './SentimentTrendChart';
import { t, tField } from '@/app/i18n';
import type { BiLang } from '@/app/i18n';

const S: Record<string, BiLang> = {
  guideTitle:    { en: 'Sentiment Guide', ko: 'Sentiment 가이드' },
  guide1Heading: { en: 'About this screen', ko: '이 화면은' },
  guide1Body:    { en: 'Shows AI-analyzed social media and news sentiment scores for the market and individual symbols. Read together with technical signals to increase conviction.', ko: '소셜 미디어와 뉴스를 AI로 분석한 시장·종목별 심리 점수를 보여주는 화면입니다. 기술적 신호와 함께 읽으면 확신도를 높일 수 있습니다.' },
  guide2Heading: { en: 'How to read key indicators', ko: '핵심 지표 읽는 법' },
  guide2Body:    { en: 'Composite score (−2 to +2) is key. Above +1.5 = overheating caution, below −1.5 = contrarian buy opportunity. If Confidence is LOW, data reliability is low. Click on a symbol score to see 7-day/30-day trend chart.', ko: '복합점수(−2~+2)가 핵심. +1.5 이상은 과열 주의, −1.5 이하는 역발상 매수 기회. Confidence가 LOW이면 데이터 신뢰도 낮음. 종목별 점수 클릭 시 최근 7일/30일 추이 차트를 볼 수 있습니다.' },
  guide3Heading: { en: 'How to use now', ko: '지금 이렇게 쓰세요' },
  guide3Body:    { en: 'Check market-wide sentiment first → check sentiment for target symbols → if sentiment aligns with technical signal (e.g., Sniper signal + sentiment improving), judge as high-conviction entry.', ko: '시장 전체 심리 먼저 확인 → 관심 종목 심리 확인 → 심리가 기술적 신호와 일치(예: Sniper 신호 + 심리 개선)하면 확신 높은 진입으로 판단.' },
  loading:       { en: 'Loading sentiment data...', ko: '심리 데이터 로딩 중...' },
  noData:        { en: 'Sentiment data unavailable.', ko: '심리 데이터를 불러올 수 없습니다.' },
  noSymbolData:  { en: 'No sentiment data', ko: '심리 데이터 없음' },
  topNewsLabel:  { en: 'Top News', ko: '주요 뉴스' },
  sourceLabel:   { en: 'Source:', ko: '출처:' },
  scaleLabel:    { en: 'Scale', ko: '스케일' },
  vsYesterday:   { en: 'vs Yesterday', ko: '전일 대비' },
  compositeScore:{ en: 'Composite', ko: '복합점수' },
  botSuspected:  { en: 'Bot Suspected', ko: '봇 의심' },
  maxScore:      { en: '/ 2.0 max', ko: '/ 2.0 최대' },
  noChangeDelta: { en: 'Same as yesterday', ko: '어제와 동일' },
  noPrevData:    { en: 'No prior day data', ko: '전일 데이터 없음' },
  deltaUp:       { en: 'above yesterday', ko: '상승' },
  deltaDown:     { en: 'below yesterday', ko: '하락' },
  symbolSentTitle: { en: 'Symbol Sentiment', ko: 'Symbol Sentiment' },
  symbolSentAction:{ en: 'Watchlist Sentiment', ko: '워치리스트 심리' },
  marketSentTitle: { en: 'Market Sentiment', ko: 'Market Sentiment' },
  // Score bar labels
  extremeFear:   { en: '−2 Extreme Fear', ko: '−2 극도공포' },
  neutral:       { en: '0 Neutral', ko: '0 중립' },
  euphoric:      { en: 'Euphoric +2', ko: '도취 +2' },
  // Info card labels
  dataCollectTitle:{ en: 'Data Collection Method', ko: '데이터 수집 방식' },
  dataCollectBody: { en: 'AI analyzes stock mentions from social media including Reddit, X(Twitter), and news. Automatically classifies positive/negative sentiment and filters bot-suspected accounts to increase reliability.', ko: 'Reddit·X(Twitter)·뉴스 등 소셜 미디어에서 종목 언급을 AI로 분석합니다. 긍정/부정 감성을 자동 분류하고, 봇 의심 계정을 필터링하여 신뢰도를 높입니다.' },
  scoreInterpTitle:{ en: 'Composite Score Interpretation (−2 ~ +2)', ko: '복합점수 해석 (−2 ~ +2)' },
  contrarianTitle: { en: 'Contrarian Strategy Principle', ko: '역발상 전략의 원리' },
  contrarianBody:  { en: 'When social sentiment reaches extremes, markets tend to reverse. When everyone is fearful is the buy opportunity; when everyone is excited is the sell opportunity. Always confirm with technical signals (Stage2, Gaussian Channel).', ko: '소셜 심리가 극단에 달하면 시장은 반전하는 경향이 있습니다. 모두가 공포에 빠졌을 때가 매수 기회, 모두가 흥분했을 때가 매도 기회입니다. 단, 기술적 신호(Stage2, 가우시안 채널)와 반드시 같이 확인하세요.' },
  usageTitle:      { en: 'Correct Usage', ko: '올바른 활용법' },
  caveatsTitle:    { en: 'Caveats & Limitations', ko: '주의사항 · 한계' },
  socialDataTitle: { en: 'What is Social Sentiment Data?', ko: '소셜 심리 데이터란?' },
  socialDataSub:   { en: 'Data characteristics · Usage · Caveats', ko: '데이터 특성 · 활용 방법 · 주의사항' },
};

const USAGE_TIPS: BiLang[] = [
  { en: 'Increase entry conviction when sentiment aligns with technical signal direction', ko: '기술적 신호와 방향이 일치할 때 진입 확신도 높임' },
  { en: 'Only actively use when Confidence is HIGH', ko: 'Confidence가 HIGH일 때만 적극 활용' },
  { en: 'Reduce reliability when Bot Suspected is shown', ko: '봇 의심(Bot Suspected) 표시 시 신뢰도 낮춤' },
  { en: 'Do not use as a standalone indicator — use as a supplementary indicator', ko: '단독 지표로 사용하지 말고 보조 지표로 활용' },
];

const CAVEATS: BiLang[] = [
  { en: 'Social data is generated by external AI (Grok/Hermes) — not real-time', ko: '소셜 데이터는 외부 AI(Grok/Hermes)가 생성 — 실시간이 아님' },
  { en: 'Low-liquidity symbols with few mentions have low reliability', ko: '언급량이 적은 종목(저유동성)은 신뢰도 낮음' },
  { en: 'Scores can fluctuate sharply due to short-term news events', ko: '단기 뉴스 이벤트로 점수가 급변할 수 있음' },
  { en: 'Confidence LOW means insufficient data', ko: 'Confidence LOW이면 데이터 부족 상태' },
];

const SCORE_RANGES: { range: string; label: BiLang; color: string; bg: string; note: BiLang }[] = [
  { range: '+1.5 ~ +2.0', label: { en: 'Extreme Optimism', ko: '극도 낙관' }, color: 'var(--bull)',     bg: 'var(--bull-soft)',  note: { en: '⚠ Overheating — consider contrarian sell', ko: '⚠ 과열 — 역발상 매도 고려' } },
  { range: '+0.5 ~ +1.5', label: { en: 'Optimistic',       ko: '낙관' },     color: 'var(--teal)',     bg: 'var(--bg-subtle)', note: { en: 'Uptrend sustained', ko: '상승 추세 유지' } },
  { range: '−0.5 ~ +0.5', label: { en: 'Neutral',          ko: '중립' },     color: 'var(--fg-muted)', bg: 'var(--bg-subtle)', note: { en: 'Direction unclear', ko: '방향성 불분명' } },
  { range: '−1.5 ~ −0.5', label: { en: 'Pessimistic',      ko: '비관' },     color: 'hsl(20 90% 55%)', bg: 'var(--bg-subtle)', note: { en: 'Downside pressure caution', ko: '하락 압력 주의' } },
  { range: '−2.0 ~ −1.5', label: { en: 'Extreme Fear',     ko: '극도 공포' }, color: 'var(--bear)',    bg: 'var(--bear-soft)', note: { en: '✓ Consider contrarian buy', ko: '✓ 역발상 매수 고려' } },
];

function compositeColor(score: number): string {
  if (score >= 1.5) return 'var(--bull)';
  if (score >= 0.5) return 'var(--teal)';
  if (score > -0.5) return 'var(--fg-muted)';
  if (score > -1.5) return 'hsl(20 90% 55%)';
  return 'var(--bear)';
}

function ScoreBar({ score }: { score: number }) {
  const clampedScore = Math.max(-2, Math.min(2, score));
  const pct = ((clampedScore + 2) / 4) * 100;
  const isPositive = clampedScore >= 0;
  const fillLeft = isPositive ? 50 : pct;
  const fillWidth = isPositive ? pct - 50 : 50 - pct;
  const color = compositeColor(clampedScore);

  return (
    <div style={{ margin: '8px 0 6px' }}>
      <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'var(--border)' }}>
        <div style={{
          position: 'absolute', top: -2, bottom: -2, left: '50%',
          width: 1, background: 'var(--fg-subtle)', opacity: 0.5,
          transform: 'translateX(-50%)',
        }} />
        <div style={{
          position: 'absolute', top: 0, height: '100%',
          left: `${fillLeft}%`, width: `${fillWidth}%`,
          borderRadius: 3, background: color, opacity: 0.85,
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          width: 9, height: 9, borderRadius: '50%',
          background: color, border: '2px solid var(--card)',
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 4px ${color}`,
        }} />
      </div>
    </div>
  );
}

export function SentimentBoard() {
  const { symbol, setSymbol, locale } = useStore();
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const handler = () => setGuideOpen(true);
    document.addEventListener('guide:open', handler);
    return () => document.removeEventListener('guide:open', handler);
  }, []);
  const { data: sentimentData, isLoading } = useSentiment();
  const { briefData } = useBrief();
  const briefBySymbol = (briefData?.symbol_briefs ?? []).reduce(
    (acc: Record<string, SymbolBrief>, sb: SymbolBrief) => { acc[sb.symbol] = sb; return acc; },
    {}
  );

  const SENTIMENT_GUIDE = (): GuideSection[] => [
    { heading: t(S.guide1Heading, locale), body: t(S.guide1Body, locale) },
    { heading: t(S.guide2Heading, locale), body: t(S.guide2Body, locale) },
    { heading: t(S.guide3Heading, locale), body: t(S.guide3Body, locale) },
  ];

  function TopNewsBox({ topNews }: { topNews: TopNews | null | undefined }) {
    if (!topNews) return null;
    const headline = tField(topNews.headline_en, topNews.headline_ko, topNews.headline, locale);
    const summary  = tField(topNews.summary_en,  topNews.summary_ko,  topNews.summary,  locale);
    return (
      <div style={{
        marginTop: 8,
        padding: '7px 10px',
        borderRadius: 6,
        background: 'var(--em-soft)',
        borderLeft: '2px solid var(--em-500)',
      }}>
        <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)', marginBottom: 3 }}>
          {t(S.topNewsLabel, locale)}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.4, marginBottom: 3 }}>
          {headline}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 4 }}>
          {summary}
        </div>
        <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)' }}>
          {t(S.sourceLabel, locale)} {topNews.source}
        </div>
      </div>
    );
  }

  function DeltaLabel({ delta }: { delta: number | null }) {
    if (delta === null) return (
      <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>{t(S.noPrevData, locale)}</span>
    );
    if (Math.abs(delta) < 0.05) return (
      <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>{t(S.noChangeDelta, locale)}</span>
    );
    const sign = delta > 0 ? '+' : '';
    const color = delta > 0 ? 'var(--bull)' : 'var(--bear)';
    const dirLabel = delta > 0 ? t(S.deltaUp, locale) : t(S.deltaDown, locale);
    if (locale === 'ko') {
      return (
        <span style={{ fontSize: 10.5, color }}>
          어제보다 {sign}{delta} {dirLabel}
        </span>
      );
    }
    return (
      <span style={{ fontSize: 10.5, color }}>
        {sign}{delta} {dirLabel}
      </span>
    );
  }

  if (isLoading) {
    return (
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ padding: 24 }}>
          <div className="subtle">{t(S.loading, locale)}</div>
        </div>
      </div>
    );
  }

  if (!sentimentData?.available || !sentimentData.latest) {
    return (
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
            {sentimentData?.error ?? t(S.noData, locale)}
          </div>
        </div>
      </div>
    );
  }

  const latest = sentimentData.latest;
  const market = latest.market;
  const symbols = latest.symbols ?? [];

  const marketKeyReason = market
    ? tField(market.key_reason_en, market.key_reason_ko, market.key_reason, locale)
    : '';

  return (
    <div className="board-wrap">
      <BoardGuidePanel title={t(S.guideTitle, locale)} sections={SENTIMENT_GUIDE()} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    <div className="board fade-in" style={{ gridTemplateColumns: '380px 1fr', gridTemplateRows: 'auto 1fr auto', alignContent: 'start' }}>
      {/* Market-wide sentiment */}
      <Card title={t(S.marketSentTitle, locale)} className="mob-order-1" action={formatDateTime(market?.as_of)} info={{ term: t(G.composite_score.term, locale), body: t(G.composite_score.body, locale) }}>
        {market ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <RadialGauge
                value={(market.composite_score ?? market.sentiment_score) + 2}
                max={4}
                size={110}
                label={market.composite_score ?? market.sentiment_score}
                sublabel={t(SENTIMENT_META[market.sentiment]?.label, locale)}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className={'badge ' + (SENTIMENT_META[market.sentiment]?.color.replace('text-', '').split('-')[0] ?? 'neutral')}>
                  {t(SENTIMENT_META[market.sentiment]?.label, locale)}
                </span>
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                  {marketKeyReason}
                </div>
                <div className="hide-on-mobile">
                  <TopNewsBox topNews={market.top_news} />
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: 10.5 }}>
                  <div>
                    <div className="subtle" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t(S.vsYesterday, locale)}</div>
                    <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>
                      {TREND_META[market.trend_vs_yesterday]?.icon} {t(TREND_META[market.trend_vs_yesterday]?.label, locale)}
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
                      <div className="subtle" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t(S.compositeScore, locale)}</div>
                      <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: compositeColor(market.composite_score) }}>
                        {market.composite_score > 0 ? '+' : ''}{market.composite_score}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="divider" style={{ margin: '14px 0 8px' }} />
            <div className="subtle" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t(S.scaleLabel, locale)}</div>
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
                  {t(m.label, locale)}
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

      {/* Per-symbol cards */}
      <Card title={t(S.symbolSentTitle, locale)} className="mob-order-2" action={t(S.symbolSentAction, locale)} style={{ overflow: 'visible' }}>
        <div className="sym-sentiment-grid" style={{
          display: 'grid',
          gridTemplateColumns: expandedSymbol ? '1fr' : 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {symbols.map(it => {
            const score = it.composite_score ?? it.sentiment_score;
            const meta = SENTIMENT_META[it.sentiment];
            const trend = TREND_META[it.trend_vs_yesterday];
            const vol = VOLUME_META[it.mention_volume];
            const keyReason = tField(it.key_reason_en, it.key_reason_ko, it.key_reason, locale);
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
                {/* Header: symbol + quality badge */}
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
                    {t(meta?.label, locale)}
                  </span>
                </div>

                {/* Main score */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                  <span
                    className="mono"
                    style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: compositeColor(score) }}
                  >
                    {score > 0 ? '+' : ''}{score}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{t(S.maxScore, locale)}</span>
                </div>

                {/* Score bar */}
                <ScoreBar score={score} />

                {/* Scale labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--fg-subtle)', marginBottom: 6 }}>
                  <span>{t(S.extremeFear, locale)}</span>
                  <span>{t(S.neutral, locale)}</span>
                  <span>{t(S.euphoric, locale)}</span>
                </div>

                {/* Delta */}
                <div style={{ marginBottom: 6 }}>
                  <DeltaLabel delta={it.score_delta ?? null} />
                </div>

                {/* Reason */}
                <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 6 }}>
                  {keyReason}
                </div>
                <TopNewsBox topNews={it.top_news} />

                {/* Meta */}
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--fg-subtle)' }}>
                  {trend && <span>{trend.icon} {t(trend.label, locale)}</span>}
                  {vol && <span>· {t(vol.label, locale)}</span>}
                  {it.bot_suspected === 'yes' && <span style={{ color: 'var(--warn)' }}>· {t(S.botSuspected, locale)}</span>}
                </div>
                {expandedSymbol === it.symbol && (
                  <SentimentTrendChart symbol={it.symbol} />
                )}
              </div>
            );
          })}
        </div>
        {symbols.length === 0 && (
          <div className="subtle" style={{ textAlign: 'center', padding: 24 }}>{t(S.noSymbolData, locale)}</div>
        )}
      </Card>

      {/* Top News mobile-only */}
      <details className="mob-collapse mob-order-3 hide-desktop" open style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
        <summary>Top News</summary>
        <div className="mob-collapse-body">
          <TopNewsBox topNews={market?.top_news} />
        </div>
      </details>

      {/* Social sentiment data explainer card */}
      <div style={{ gridColumn: '1 / -1' }} className="mob-order-4">
        <div className="card">
          <div className="card__hd">
            <h3>{t(S.socialDataTitle, locale)}</h3>
            <small>{t(S.socialDataSub, locale)}</small>
          </div>
          <div className="card__bd">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>

              {/* Data collection */}
              <div style={{ padding: 14, borderRadius: 'var(--r)', background: 'var(--bg-muted)', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>📡</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{t(S.dataCollectTitle, locale)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                  {t(S.dataCollectBody, locale)}
                </div>
              </div>

              {/* Score interpretation */}
              <div style={{ padding: 14, borderRadius: 'var(--r)', background: 'var(--bg-muted)', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>📊</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{t(S.scoreInterpTitle, locale)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11 }}>
                  {SCORE_RANGES.map(row => (
                    <div key={row.range} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: row.bg }}>
                      <span className="mono" style={{ fontSize: 10, color: row.color, fontWeight: 600, minWidth: 90 }}>{row.range}</span>
                      <span style={{ fontWeight: 600, color: row.color, minWidth: 56 }}>{t(row.label, locale)}</span>
                      <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>{t(row.note, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contrarian strategy */}
              <div style={{ padding: 14, borderRadius: 'var(--r)', background: 'var(--bg-muted)', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>🔄</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{t(S.contrarianTitle, locale)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                  {t(S.contrarianBody, locale)}
                </div>
              </div>

              {/* Usage tips */}
              <div style={{ padding: 14, borderRadius: 'var(--r)', background: 'var(--bg-muted)', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{t(S.usageTitle, locale)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
                  {USAGE_TIPS.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--teal)', fontWeight: 700, flexShrink: 0 }}>→</span>
                      <span style={{ color: 'var(--fg-muted)', lineHeight: 1.5 }}>{t(tip, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caveats */}
              <div style={{ padding: 14, borderRadius: 'var(--r)', background: 'var(--warn-soft)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{t(S.caveatsTitle, locale)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
                  {CAVEATS.map((warn, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--warn)', fontWeight: 700, flexShrink: 0 }}>!</span>
                      <span style={{ color: 'var(--fg-muted)', lineHeight: 1.5 }}>{t(warn, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
    </div>
  );
}
