'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useRegime } from '@/hooks/useRegime';
import { useDistributionDays } from '@/hooks/useDistributionDays';
import { useMacro } from '@/hooks/useMacro';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Card, ScorePill } from '@/components/ui/Card';
import { RadialGauge } from '@/components/ui/RadialGauge';
import { Sparkle } from '@/components/ui/Icons';
import { MacroItem, RegimeDiagnostics, UpcomingEarning, EARNINGS_RISK_META, FreshnessMeta, TIER1_SYMBOLS, SymbolBrief, REGIME_META } from '@/app/types';
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
import { useBrief } from '@/hooks/useBrief';
import { useEarnings } from '@/hooks/useEarnings';
import { t, tField } from '@/app/i18n';

// Static bilingual strings
const S = {
  guideTitle:        { en: 'Overview Guide', ko: 'Overview 가이드' },
  guide1Heading:     { en: 'This screen', ko: '이 화면은' },
  guide1Body:        { en: 'A dashboard for grasping overall market conditions at a glance. Check "Is the market suitable for buying now?" before entering individual stocks.', ko: '시장 전체 환경을 한눈에 파악하는 대시보드입니다. 개별 종목 진입 전 "지금 시장이 매수에 적합한가?"를 먼저 확인하는 화면입니다.' },
  guide2Heading:     { en: 'How to read key indicators', ko: '핵심 지표 읽는 법' },
  guide2Body:        { en: 'Risk Regime score summarizes overall market health. Trend (SPY EMA200 position) and Breadth (RSP vs SPY) show market structure; Credit (HYG/IEF) and Volatility (VIX) indicate risk appetite. Distribution Days are accumulated institutional sell pressure — avoid new entries at 6+.', ko: 'Risk Regime 점수가 전체 건강도를 요약합니다. Trend(SPY EMA200 위치)와 Breadth(RSP vs SPY)가 시장 구조를, Credit(HYG/IEF)과 Volatility(VIX)가 리스크 선호도를 나타냅니다. Distribution Days는 기관 매도 압력의 누적치로, 6일 이상이면 신규 진입을 자제해야 합니다.' },
  guide3Heading:     { en: 'Use it like this', ko: '지금 이렇게 쓰세요' },
  guide3Body:        { en: 'Confirm Risk Regime ≥ 60 → VIX below 20 → Distribution Days ≤ 5 → RSP ≥ SPY in Breadth. If all 4 pass, consider stock entry. Reduce position size if any fails.', ko: 'Risk Regime ≥ 60 확인 → VIX 20 이하 확인 → Distribution Days 5 이하 확인 → Breadth에서 RSP ≥ SPY 확인. 4가지 통과하면 종목 진입 검토. 하나라도 불합격이면 포지션 크기를 줄이세요.' },
  aiHeadline:        { en: "Today's Take — Market Snapshot", ko: '오늘의 한마디 — Market Snapshot' },
  watchPoints:       { en: 'Watch: ', ko: '주시: ' },
  aiDisclaimer:      { en: 'AI opinion — not a trading signal · ', ko: 'AI 의견 — 매매 신호 아님 · ' },
  slotPreOpen:       { en: 'Pre-market', ko: '장 전' },
  slotPostClose:     { en: 'After-hours', ko: '장 후' },
  symbolAiLabel:     { en: 'Symbol AI Analysis', ko: '종목별 AI 분석' },
  analyzing:         { en: 'Preparing analysis', ko: '분석 준비 중' },
  biasBuy:           { en: 'Buy',   ko: '매수' },
  biasHold:          { en: 'Hold',  ko: '보유' },
  biasWatch:         { en: 'Watch', ko: '관망' },
  biasAvoid:         { en: 'Avoid', ko: '회피' },
  earningsTitle:     { en: 'Earnings Calendar', ko: 'Earnings Calendar' },
  earningsAction:    { en: 'Within 30d', ko: '30일 이내' },
  estimateNA:        { en: 'No estimate', ko: '추정치 미형성' },
  tierImminent:      { en: 'Imminent', ko: '임박' },
  tierApproaching:   { en: 'Approaching', ko: '진입권' },
  tierWatching:      { en: 'Watching', ko: '관망' },
  earningsLoading:   { en: 'Loading earnings...', ko: 'Earnings 로딩 중...' },
  earningsNone:      { en: 'No earnings within 30d', ko: '30일 이내 어닝 없음' },
  loading:           { en: 'Loading...', ko: '로딩 중...' },
  regimeDesc_RISK_ON:      { en: 'Trend-following strategies are effective in this bullish environment.', ko: '추세 추종 전략이 유효한 강세 환경입니다.' },
  regimeDesc_CONSTRUCTIVE: { en: 'A favorable environment for selective entries.', ko: '선별적 진입이 가능한 우호적 환경입니다.' },
  regimeDesc_MIXED:        { en: 'Signals are mixed. Reduce position size.', ko: '신호가 혼재합니다. 포지션 사이즈를 축소하세요.' },
  regimeDesc_DEFENSIVE:    { en: 'Bearish signals dominant. Increase cash.', ko: '약세 신호 우세. 현금 비중을 늘리세요.' },
  regimeDesc_RISK_OFF:     { en: 'Risk-off phase. Avoid new buys.', ko: '리스크 오프 국면. 신규 매수를 자제하세요.' },
  regimeDesc_UNKNOWN:      { en: 'Insufficient data to judge.', ko: '데이터 부족으로 판단이 어렵습니다.' },
  aiBriefLoading:    { en: 'AI Brief loading...', ko: 'AI Brief 로딩 중...' },
  riskRegimeTitle:   { en: 'Risk Regime',       ko: 'Risk Regime' },
  mktBreadthTitle:   { en: 'Market Breadth',    ko: '시장 폭' },
  vixTitle:          { en: 'Volatility · VIX',  ko: 'Volatility · VIX' },
  creditTitle:       { en: 'Credit Stress',     ko: 'Credit 스트레스' },
  regimeTrend:       { en: 'Trend',      ko: '추세' },
  regimeBreadth:     { en: 'Breadth',    ko: '폭' },
  regimeCredit:      { en: 'Credit',     ko: '신용' },
  regimeVolatility:  { en: 'Volatility', ko: '변동성' },
  regimeMomentum:    { en: 'Momentum',   ko: '모멘텀' },
  ddAction:          { en: "O'Neil · 25 trading days", ko: "O'Neil · 25거래일" },
  breadthAction:     { en: 'SPY vs RSP', ko: 'SPY vs RSP' },
  breadthMktCap:     { en: 'Mkt Cap', ko: '시가총액' },
  breadthEqual:      { en: 'Equal Wt', ko: '동일가중' },
  narrowRally:       { en: '⚠ RSP < SPY — Mag7-led narrow rally', ko: '⚠ RSP < SPY — Mag7 주도형 협소 랠리' },
  vixNormal:         { en: 'Normal', ko: '정상' },
  vixBackward:       { en: '⚠ Backwardation', ko: '⚠ 백워데이션' },
  creditAction:      { en: 'HYG / IEF 5D', ko: 'HYG / IEF 5D' },
  entryRadarTitle:   { en: 'Entry Radar', ko: '진입 레이더' },
  entryRadarAction:  { en: 'Closest to Entry', ko: 'Entry 근접순' },
  breakout:          { en: 'Breakout', ko: '돌파' },
  entryZone:         { en: '≤5% = Entry Zone', ko: '≤5% = 진입 가능 Zone' },
  convictionTitle:   { en: 'Conviction Leaderboard', ko: 'Conviction 리더보드' },
  convictionAction:  { en: 'By Conviction', ko: '확신도 순' },
  sectorTitle:       { en: 'Sector Momentum', ko: 'Sector Momentum' },
  sectorAction:      { en: '5D Return', ko: '5D 수익률' },
  sectorSemi:        { en: 'Semis', ko: '반도체' },
  sectorEnergy:      { en: 'Energy', ko: '에너지' },
  sectorConsumer:    { en: 'Consumer', ko: '소비재' },
  sectorHome:        { en: 'Homebuilders', ko: '홈빌더' },
  sectorDefense:     { en: 'Defense', ko: '방산' },
  watchlistTitle:    { en: 'Watchlist · Top 3', ko: 'Watchlist · Top 3' },
  watchlistAction:   { en: 'Stage 2 sorted', ko: 'Stage 2 정렬' },
  toneBullish:       { en: 'Bullish', ko: '강세' },
  toneBearish:       { en: 'Bearish', ko: '약세' },
  toneCautious:      { en: 'Cautious', ko: '주의' },
  toneNeutral:       { en: 'Neutral', ko: '중립' },
};

const OVERVIEW_GUIDE = (locale: 'en' | 'ko'): GuideSection[] => [
  { heading: t(S.guide1Heading, locale), body: t(S.guide1Body, locale) },
  { heading: t(S.guide2Heading, locale), body: t(S.guide2Body, locale) },
  { heading: t(S.guide3Heading, locale), body: t(S.guide3Body, locale) },
];

// Minimal freshness badge helper (Phase 4) — uses existing CSS vars + .badge.neutral patterns. No new styles.
function FreshnessBadge({ meta }: { meta?: FreshnessMeta | null }) {
  if (!meta || typeof meta.age_minutes !== 'number') return null;
  const mins = meta.age_minutes;
  const ageStr = mins < 1 ? 'now' : `${Math.round(mins)}m ago`;
  const stale = mins > 90;
  return (
    <span
      style={{
        fontSize: '11px',
        color: stale ? 'var(--warn)' : 'var(--fg-subtle)',
        marginLeft: 6,
        opacity: 0.8,
        fontFamily: 'var(--font-mono, monospace)',
        whiteSpace: 'nowrap',
      }}
      title={`source: ${meta.source || 'github_raw'}`}
    >
      ⏱ {ageStr}
    </span>
  );
}

function findMacro(macro: MacroItem[], sym: string) {
  return macro.find(m => m.symbol === sym);
}

export function OverviewBoard() {
  const { symbol, locale } = useStore();
  const { regimeData } = useRegime();
  const { ddData } = useDistributionDays();
  const { macroData } = useMacro();
  const { watchlist } = useWatchlist();

  const macro = macroData?.macro ?? [];
  const vix   = findMacro(macro, '^VIX');
  const vix9d = findMacro(macro, '^VIX9D');
  const spy   = findMacro(macro, 'SPY');
  const rsp   = findMacro(macro, 'RSP');
  const mags  = findMacro(macro, 'MAGS');
  const iwm   = findMacro(macro, 'IWM');
  const hyg   = findMacro(macro, 'HYG');
  const jnk   = findMacro(macro, 'JNK');
  const lqd   = findMacro(macro, 'LQD');
  const ief   = findMacro(macro, 'IEF');

  const { briefData, briefMeta, isLoading: briefLoading } = useBrief();
  const { earningsData, earningsMeta } = useEarnings();

  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const handler = () => setGuideOpen(true);
    document.addEventListener('guide:open', handler);
    return () => document.removeEventListener('guide:open', handler);
  }, []);

  // 백워데이션: VIX9D(9일) > VIX(30일) — 단기 변동성이 장기보다 높아 역전된 상태
  const backward = vix && vix9d ? vix.price !== null && vix9d.price !== null && (vix9d.price ?? 0) > (vix.price ?? 0) : false;

  const BIAS_LABELS: Record<string, { en: string; ko: string }> = {
    buy:   S.biasBuy,
    hold:  S.biasHold,
    watch: S.biasWatch,
    avoid: S.biasAvoid,
  };

  return (
    <div className="board-wrap">
      <BoardGuidePanel
        title={t(S.guideTitle, locale)}
        sections={OVERVIEW_GUIDE(locale)}
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: 'auto auto auto auto', alignContent: 'start' }}
    >
      {/* AI Insight — span 2 */}
      <div style={{ gridColumn: 'span 2' }} className="mob-order-6">
        <details className="mob-collapse" open>
          <summary>AI Insight — Market Snapshot</summary>
          <div className="mob-collapse-body">
        <div className="ai-card">
          <div className="ai-card__head">
            <div className="ico"><Sparkle /></div>
            <h3>{t(S.aiHeadline, locale)}</h3>
            <small>{new Date().toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}</small>
            <FreshnessBadge meta={briefMeta} />
          </div>
          <div className="ai-card__body">
            {briefLoading ? (
              <div style={{ color: 'var(--fg-muted)' }}>{t(S.aiBriefLoading, locale)}</div>
            ) : briefData?.market_brief ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className={`badge ${
                    briefData.market_brief.tone === 'bullish' ? 'bull' :
                    briefData.market_brief.tone === 'bearish' ? 'bear' :
                    briefData.market_brief.tone === 'cautious' ? 'warn' : 'neutral'
                  }`}>{
                    briefData.market_brief.tone === 'bullish' ? t(S.toneBullish, locale) :
                    briefData.market_brief.tone === 'bearish' ? t(S.toneBearish, locale) :
                    briefData.market_brief.tone === 'cautious' ? t(S.toneCautious, locale) : t(S.toneNeutral, locale)
                  }</span>
                  <span style={{ fontSize: 14 }}>
                    {tField(briefData.market_brief.summary_en, briefData.market_brief.summary_ko, briefData.market_brief.summary, locale)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {(locale === 'en'
                    ? (briefData.market_brief.key_themes_en ?? briefData.market_brief.key_themes ?? [])
                    : (briefData.market_brief.key_themes_ko ?? briefData.market_brief.key_themes ?? [])
                  ).map((theme, i) => (
                    <span key={i} className="badge neutral" style={{ fontSize: 11.5 }}>{theme}</span>
                  ))}
                </div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 12.5 }}>
                  {t(S.watchPoints, locale)}{tField(briefData.market_brief.watch_points_en, briefData.market_brief.watch_points_ko, briefData.market_brief.watch_points, locale)}
                </div>
                <div style={{ color: 'var(--fg-subtle)', fontSize: 11, marginTop: 4 }}>
                  {t(S.aiDisclaimer, locale)}{briefData.slot === 'pre_open' ? t(S.slotPreOpen, locale) : t(S.slotPostClose, locale)}
                </div>
              </>
            ) : regimeData ? (
              <>
                <div style={{ marginBottom: 6 }}>
                  {locale === 'ko' ? (
                    <>
                      현재 Risk Regime은{' '}
                      <strong>{t(REGIME_META[regimeData.regime].label, locale)}</strong>
                      {' '}({regimeData.total ?? '—'}점) —{' '}
                      {regimeData.regime === 'RISK_ON' && t(S.regimeDesc_RISK_ON, locale)}
                      {regimeData.regime === 'CONSTRUCTIVE' && t(S.regimeDesc_CONSTRUCTIVE, locale)}
                      {regimeData.regime === 'MIXED' && t(S.regimeDesc_MIXED, locale)}
                      {regimeData.regime === 'DEFENSIVE' && t(S.regimeDesc_DEFENSIVE, locale)}
                      {regimeData.regime === 'RISK_OFF' && t(S.regimeDesc_RISK_OFF, locale)}
                      {regimeData.regime === 'UNKNOWN' && t(S.regimeDesc_UNKNOWN, locale)}
                    </>
                  ) : (
                    <>
                      Current Risk Regime:{' '}
                      <strong>{t(REGIME_META[regimeData.regime].label, locale)}</strong>
                      {' '}({regimeData.total ?? '—'} pts) —{' '}
                      {regimeData.regime === 'RISK_ON' && t(S.regimeDesc_RISK_ON, locale)}
                      {regimeData.regime === 'CONSTRUCTIVE' && t(S.regimeDesc_CONSTRUCTIVE, locale)}
                      {regimeData.regime === 'MIXED' && t(S.regimeDesc_MIXED, locale)}
                      {regimeData.regime === 'DEFENSIVE' && t(S.regimeDesc_DEFENSIVE, locale)}
                      {regimeData.regime === 'RISK_OFF' && t(S.regimeDesc_RISK_OFF, locale)}
                      {regimeData.regime === 'UNKNOWN' && t(S.regimeDesc_UNKNOWN, locale)}
                    </>
                  )}
                </div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
                  {t(S.regimeTrend, locale)} {(regimeData.components.trend ?? 0).toFixed(1)} ·
                  {t(S.regimeBreadth, locale)} {(regimeData.components.breadth ?? 0).toFixed(1)} ·
                  {t(S.regimeCredit, locale)} {(regimeData.components.credit ?? 0).toFixed(1)} ·
                  {t(S.regimeVolatility, locale)} {(regimeData.components.volatility ?? 0).toFixed(1)} ·
                  {t(S.regimeMomentum, locale)} {(regimeData.components.momentum ?? 0).toFixed(1)}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)' }}>{t(S.aiBriefLoading, locale)}</div>
            )}

            {/* Symbol Briefs — Action Bias 신호강도 미터 */}
            {briefData && (
              <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 10, paddingTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {t(S.symbolAiLabel, locale)}
                </div>
                {(() => {
                  const BIAS_LEVELS = ['avoid', 'watch', 'hold', 'buy'] as const;
                  const BIAS_COLORS = ['var(--bear)', 'var(--warn)', 'var(--teal)', 'var(--bull)'];

                  const briefMap = new Map((briefData.symbol_briefs ?? []).map(sb => [sb.symbol, sb]));
                  // TIER1 11종목 모두 표시 — brief 데이터 없는 종목은 "분석 준비 중" 상태
                  const briefSymbols = TIER1_SYMBOLS;
                  const items: (SymbolBrief | { symbol: string; pending: true })[] = briefSymbols.map(sym =>
                    briefMap.get(sym) ?? { symbol: sym, pending: true as const }
                  );

                  const renderItem = (item: typeof items[number]) => {
                    if ('pending' in item) {
                      return (
                        <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                          <span style={{ fontWeight: 700, width: 42, fontFamily: 'var(--mono)', fontSize: 12, flexShrink: 0 }}>{item.symbol}</span>
                          <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>{t(S.analyzing, locale)}</span>
                        </div>
                      );
                    }
                    const sb = item as SymbolBrief;
                    const gradeColor =
                      sb.setup_quality === 'A+' || sb.setup_quality === 'A' ? 'var(--bull)' :
                      sb.setup_quality === 'B' ? 'var(--teal)' :
                      sb.setup_quality === 'C' ? 'var(--warn)' : 'var(--bear)';
                    const biasIdx = BIAS_LEVELS.indexOf(sb.action_bias as typeof BIAS_LEVELS[number]);
                    const biasColor = BIAS_COLORS[biasIdx] ?? 'var(--fg-subtle)';
                    return (
                      <div key={sb.symbol} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                        <span style={{ fontWeight: 700, width: 42, fontFamily: 'var(--mono)', fontSize: 12, flexShrink: 0 }}>{sb.symbol}</span>
                        <span style={{ fontWeight: 700, fontSize: 12, color: gradeColor, width: 18, flexShrink: 0 }}>{sb.setup_quality}</span>
                        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          {BIAS_LEVELS.map((_, i) => (
                            <div key={i} style={{
                              width: 12, height: 7, borderRadius: 2,
                              background: i <= biasIdx ? BIAS_COLORS[i] : 'var(--bg-subtle)',
                              opacity: i <= biasIdx ? 0.85 : 0.35,
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: biasColor, fontWeight: 600, flexShrink: 0 }}>
                          {t(BIAS_LABELS[sb.action_bias] ?? S.biasWatch, locale)}
                        </span>
                      </div>
                    );
                  };

                  const mid = Math.ceil(items.length / 2);
                  return (
                    <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                        <div>{items.slice(0, mid).map(renderItem)}</div>
                        <div>{items.slice(mid).map(renderItem)}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
          </div>
        </details>
      </div>

      {/* Earnings Calendar */}
      <Card title={t(S.earningsTitle, locale)} action={t(S.earningsAction, locale)} className="mob-order-7">
        {earningsData?.upcoming_earnings && earningsData.upcoming_earnings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {earningsData.upcoming_earnings.map((e: UpcomingEarning) => {
              const rm = EARNINGS_RISK_META[e.risk_level] ?? EARNINGS_RISK_META.med;
              const tierLabel = e.relevance_tier === 'imminent' ? t(S.tierImminent, locale) : e.relevance_tier === 'approaching' ? t(S.tierApproaching, locale) : t(S.tierWatching, locale);
              const tierColor = e.relevance_tier === 'imminent' ? 'var(--bear)' : e.relevance_tier === 'approaching' ? 'var(--warn)' : 'var(--fg-subtle)';
              return (
                <div key={e.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, width: 40, fontFamily: 'var(--mono)' }}>{e.symbol}</span>
                  <span style={{ color: 'var(--fg-muted)', flex: 1 }}>
                    {e.earnings_date.slice(5)} · {e.days_until}{locale === 'ko' ? '일 후' : 'd'}
                  </span>
                  {e.eps_estimate == null && (
                    <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>{t(S.estimateNA, locale)}</span>
                  )}
                  <span style={{ fontSize: 10.5, color: tierColor, fontWeight: 600 }}>{tierLabel}</span>
                  <span className={`badge ${rm.color}`} style={{ fontSize: 11 }}>
                    {rm.dot} {e.risk_level.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
            {earningsData === null ? t(S.earningsLoading, locale) : t(S.earningsNone, locale)}
          </div>
        )}
        {earningsMeta && (
          <div style={{ marginTop: 6, paddingTop: 4, borderTop: '1px solid var(--border-soft)' }}>
            <FreshnessBadge meta={earningsMeta} />
          </div>
        )}
      </Card>

      {/* Regime gauge */}
      <Card title={t(S.riskRegimeTitle, locale)} action={locale === 'ko' ? '5요소 종합' : '5-factor composite'} info={{ term: t(G.risk_regime.term, locale), body: t(G.risk_regime.body, locale) }} className="mob-order-1">
        {regimeData ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RadialGauge value={regimeData.total ?? 0} size={100} label={regimeData.total ?? '—'} sublabel="/ 100" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              <span className={'badge ' + (regimeData.regime === 'CONSTRUCTIVE' ? 'teal' : 'em')} style={{ alignSelf: 'flex-start' }}>
                {t(REGIME_META[regimeData.regime].label, locale)}
              </span>
              {([
                [t(S.regimeTrend,      locale), regimeData.components.trend,      regimeData.diagnostics?.spy_vs_ema200_pct,    'SPY/EMA200',  '%'],
                [t(S.regimeBreadth,   locale), regimeData.components.breadth,    regimeData.diagnostics?.rsp_minus_spy_60d,   'RSP-SPY 60d', '%'],
                [t(S.regimeCredit,    locale), regimeData.components.credit,     regimeData.diagnostics?.hyg_ief_ratio_chg_pct,'HYG/IEF 30d','%'],
                [t(S.regimeVolatility,locale), regimeData.components.volatility, regimeData.diagnostics?.vix_level,           'VIX',         ''],
                [t(S.regimeMomentum,  locale), regimeData.components.momentum,   regimeData.diagnostics?.spy_roc_20d,         'SPY RoC 20d', '%'],
              ] as [string, number | null, number | null | undefined, string, string][]).map(([label, v, raw, rawLabel, unit]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                  <div style={{ width: 64 }}>
                    <div style={{ color: 'var(--fg-subtle)' }}>{label}</div>
                    {raw !== null && raw !== undefined && (
                      <div style={{ fontSize: 10, color: (v ?? 0) === 0 ? 'var(--bear)' : 'var(--fg-subtle)', letterSpacing: '0.01em' }}>
                        {rawLabel} {raw >= 0 ? '+' : ''}{raw.toFixed(1)}{unit}
                      </div>
                    )}
                  </div>
                  <div className="bar" style={{ flex: 1 }}>
                    <div className="bar__fill" style={{
                      width: ((v ?? 0) / 20 * 100) + '%',
                      background: (v ?? 0) === 0 ? 'var(--bear)' : (v ?? 0) < 8 ? 'var(--warn)' : 'var(--em-500)',
                    }} />
                  </div>
                  <span className="mono" style={{ width: 26, textAlign: 'right', color: (v ?? 0) === 0 ? 'var(--bear)' : 'inherit' }}>
                    {(v ?? 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="subtle">{t(S.loading, locale)}</div>
        )}
      </Card>

      {/* Distribution Days */}
      <Card title="Distribution Days" action={t(S.ddAction, locale)} info={{ term: t(G.distribution_days.term, locale), body: t(G.distribution_days.body, locale) }} className="mob-order-7">
        {ddData ? (
          <>
            {(['spy', 'qqq'] as const).map(key => {
              const d = ddData[key];
              const cls = d.level === 'OK' ? 'bull' : d.level === 'WARNING' ? 'warn' : 'bear';
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{key.toUpperCase()}</span>
                    <span className={'badge ' + cls}>{d.count}{locale === 'ko' ? '일' : 'd'}</span>
                    <small style={{ marginLeft: 'auto', color: 'var(--fg-subtle)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.level}</small>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} style={{
                        flex: 1, height: 10, borderRadius: 2,
                        background: i < d.count ? `var(--${cls === 'warn' ? 'warn' : cls})` : 'var(--bg-subtle)',
                        opacity: i < d.count ? (0.5 + (i / Math.max(d.count, 1)) * 0.5) : 1,
                      }} />
                    ))}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', lineHeight: 1.5 }}>
              OK &lt;4 · WARNING 4~5 · DANGER 6+
            </div>
          </>
        ) : (
          <div className="subtle">{t(S.loading, locale)}</div>
        )}
      </Card>

      {/* Market Breadth */}
      <Card title={t(S.mktBreadthTitle, locale)} action={t(S.breadthAction, locale)} info={{ term: t(G.market_breadth_spy_rsp.term, locale), body: t(G.market_breadth_spy_rsp.body, locale) }} className="mob-order-2">
        {([
          ['SPY',  spy,  t(S.breadthMktCap, locale)],
          ['RSP',  rsp,  t(S.breadthEqual, locale)],
          ['MAGS', mags, 'Mag 7'],
          ['IWM',  iwm,  'Small Cap'],
        ] as [string, MacroItem | undefined, string][]).map(([label, m, sub]) => {
          if (!m) return null;
          const up = (m.change_pct_5d ?? 0) >= 0;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 12.5 }}>
              <div style={{ width: 56 }}>
                <div style={{ fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{sub}</div>
              </div>
              <div className="bar grow" style={{ height: 6 }}>
                <div className="bar__fill" style={{ width: Math.min(100, Math.abs(m.change_pct_5d ?? 0) * 30) + '%', background: up ? 'var(--bull)' : 'var(--bear)' }} />
              </div>
              <span className={'mono ' + (up ? 'chg up' : 'chg down')} style={{ width: 52, textAlign: 'right' }}>
                {up ? '+' : ''}{(m.change_pct_5d ?? 0).toFixed(2)}%
              </span>
            </div>
          );
        })}
        {rsp && spy && (rsp.change_pct_5d ?? 0) < (spy.change_pct_5d ?? 0) && (
          <div style={{ fontSize: 11.5, color: 'var(--warn)', marginTop: 8, padding: '4px 8px', background: 'var(--warn-soft)', borderRadius: 6 }}>
            {t(S.narrowRally, locale)}
          </div>
        )}
      </Card>

      {/* VIX Panel */}
      <Card title={t(S.vixTitle, locale)} action={backward ? t(S.vixBackward, locale) : t(S.vixNormal, locale)} info={{ term: t(G.volatility.term, locale), body: t(G.volatility.body, locale) }} className="mob-order-2">
        {vix ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 8 }}>
              {([
                ['^VIX', vix, 'VIX'],
                ['^VIX9D', vix9d, '9d'],
              ] as [string, MacroItem | undefined, string][]).map(([, m, l]) => (
                m ? (
                  <div key={l}>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{(m.price ?? 0).toFixed(2)}</div>
                    <div className={'mono ' + ((m.change_pct_1d ?? 0) >= 0 ? 'chg up' : 'chg down')} style={{ fontSize: 11.5 }}>
                      {(m.change_pct_1d ?? 0) >= 0 ? '+' : ''}{(m.change_pct_1d ?? 0).toFixed(2)}%
                    </div>
                  </div>
                ) : null
              ))}
            </div>
            <div className="rsi-gauge" style={{ height: 18 }}>
              <div className="marker" style={{ left: `${Math.min(100, ((vix.price ?? 0) / 40) * 100)}%` }} />
            </div>
            <div className="rsi-ticks">
              <span>0</span><span>14</span><span>20</span><span>30</span><span>40+</span>
            </div>
          </>
        ) : <div className="subtle">{t(S.loading, locale)}</div>}
      </Card>

      {/* Credit Stress */}
      <Card title={t(S.creditTitle, locale)} action={t(S.creditAction, locale)} info={{ term: t(G.credit.term, locale), body: t(G.credit.body, locale) }} className="mob-order-7">
        {([['HYG', hyg], ['JNK', jnk], ['LQD', lqd], ['IEF', ief]] as [string, MacroItem | undefined][]).map(([label, m]) => {
          if (!m) return null;
          const up = (m.change_pct_5d ?? 0) >= 0;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 12.5 }}>
              <span style={{ width: 36, fontWeight: 600 }}>{label}</span>
              <span style={{ flex: 1, color: 'var(--fg-subtle)', fontSize: 11.5 }}>{m.name}</span>
              <span className="mono" style={{ textAlign: 'right' }}>${(m.price ?? 0).toFixed(2)}</span>
              <span className={'mono ' + (up ? 'chg up' : 'chg down')} style={{ width: 56, textAlign: 'right' }}>
                {up ? '+' : ''}{(m.change_pct_5d ?? 0).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </Card>

      {/* Entry Radar */}
      <Card title={t(S.entryRadarTitle, locale)} action={t(S.entryRadarAction, locale)} className="mob-order-4">
        {watchlist.length === 0 ? (
          <div className="subtle">{t(S.loading, locale)}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 340, overflowY: 'auto' }}>
            {[...watchlist]
              .map(w => ({ ...w, entryDist: w.entry > 0 ? (w.entry - w.price) / w.price * 100 : 999 }))
              .sort((a, b) => a.entryDist - b.entryDist)
              .map(w => {
                const inZone = w.entryDist > 0 && w.entryDist <= 5;
                const broken = w.entryDist <= 0;
                return (
                  <div key={w.symbol} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 8px', borderRadius: 6,
                    background: inZone ? 'var(--em-soft)' : 'transparent',
                  }}>
                    <span style={{ fontWeight: 600, width: 46, fontFamily: 'var(--mono)', fontSize: 12, flexShrink: 0 }}>
                      {w.symbol}
                    </span>
                    <ScorePill score={w.score} />
                    <span style={{ flex: 1 }} />
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: broken ? 'var(--bull)' : inZone ? 'var(--em-500)' : w.entryDist > 15 ? 'var(--fg-subtle)' : 'var(--fg)',
                    }}>
                      {broken
                        ? <span className="badge bull" style={{ fontSize: 11 }}>{t(S.breakout, locale)}</span>
                        : `+${w.entryDist.toFixed(1)}%`}
                    </span>
                  </div>
                );
              })}
            <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border-soft)' }}>
              {t(S.entryZone, locale)}
            </div>
          </div>
        )}
      </Card>

      {/* Conviction Leaderboard */}
      <Card title={t(S.convictionTitle, locale)} action={t(S.convictionAction, locale)} info={{ term: t(G.conviction.term, locale), body: t(G.conviction.body, locale) }} className="mob-order-5">
        {watchlist.length === 0 ? (
          <div className="subtle">{t(S.loading, locale)}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 340, overflowY: 'auto' }}>
            {[...watchlist]
              .sort((a, b) => (b.conviction_score ?? 0) - (a.conviction_score ?? 0))
              .map(w => {
                const s = w.conviction_score ?? 0;
                const color = s >= 65 ? 'var(--bull)' : s >= 50 ? 'var(--teal)' : s >= 35 ? 'var(--warn)' : 'var(--bear)';
                return (
                  <div key={w.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                    <span style={{ fontWeight: 600, width: 46, fontFamily: 'var(--mono)', fontSize: 12, flexShrink: 0 }}>{w.symbol}</span>
                    <div className="bar" style={{ flex: 1 }}>
                      <div className="bar__fill" style={{ width: `${s}%`, background: color }} />
                    </div>
                    <ConvictionBadge score={w.conviction_score ?? undefined} locale={locale} size="sm" />
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* Sector Momentum */}
      <Card title={t(S.sectorTitle, locale)} action={t(S.sectorAction, locale)} info={{ term: t(G.sector_momentum.term, locale), body: t(G.sector_momentum.body, locale) }} className="mob-order-3">
        {(() => {
          const sectors: [string, { en: string; ko: string }][] = [
            ['SMH', S.sectorSemi],
            ['XLE', S.sectorEnergy],
            ['XLY', S.sectorConsumer],
            ['XHB', S.sectorHome],
            ['ITA', S.sectorDefense],
          ];
          const items = sectors.map(([sym, labelObj]) => ({ sym, label: t(labelObj, locale), m: findMacro(macro, sym) })).filter(x => x.m);
          if (items.length === 0) return <div className="subtle">{t(S.loading, locale)}</div>;
          const sorted = [...items].sort((a, b) => (b.m!.change_pct_5d ?? 0) - (a.m!.change_pct_5d ?? 0));
          const maxAbs = Math.max(...sorted.map(x => Math.abs(x.m!.change_pct_5d ?? 0)), 0.1);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {sorted.map(({ sym, label, m }) => {
                const chg = m!.change_pct_5d ?? 0;
                const up = chg >= 0;
                const barW = Math.min(100, (Math.abs(chg) / maxAbs) * 100);
                const aboveEma = m!.above_ema21;
                return (
                  <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 12.5 }}>
                    <div style={{ width: 34, fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 12 }}>{sym}</div>
                    <div style={{ width: 38, fontSize: 11, color: 'var(--fg-subtle)' }}>{label}</div>
                    <div className="bar" style={{ flex: 1, height: 5 }}>
                      <div className="bar__fill" style={{ width: barW + '%', background: up ? 'var(--bull)' : 'var(--bear)' }} />
                    </div>
                    <span className={'mono ' + (up ? 'chg up' : 'chg down')} style={{ width: 50, textAlign: 'right', fontSize: 12 }}>
                      {up ? '+' : ''}{chg.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 10.5, color: aboveEma ? 'var(--bull)' : 'var(--bear)', width: 28, textAlign: 'right' }}>
                      {aboveEma ? '↑EMA' : '↓EMA'}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Card>

      {/* Top watchlist preview */}
      <Card title={t(S.watchlistTitle, locale)} action={t(S.watchlistAction, locale)} className="mob-order-8">
        {watchlist.slice(0, 3).map(w => (
          <div key={w.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <span className="sym-pill__badge" style={{ width: 22, height: 22 }}>{w.symbol[0]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{w.symbol}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 12.5 }}>${w.price.toFixed(2)}</div>
            </div>
            <ScorePill score={w.score} />
            <ConvictionBadge score={w.conviction_score ?? undefined} locale={locale} size="sm" />
          </div>
        ))}
        {watchlist.length === 0 && <div className="subtle">{t(S.loading, locale)}</div>}
      </Card>

    </div>
    </div>
  );
}
