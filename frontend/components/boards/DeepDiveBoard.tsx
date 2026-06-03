'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useIntraday } from '@/hooks/useIntraday';
import { useDaily } from '@/hooks/useDaily';
import { useSentiment } from '@/hooks/useSentiment';
import { useBrief } from '@/hooks/useBrief';
import { useEarnings } from '@/hooks/useEarnings';
import { useRegime } from '@/hooks/useRegime';
import { usePrePost } from '@/hooks/usePrePost';
import { Card, ScorePill } from '@/components/ui/Card';
import { RadialGauge } from '@/components/ui/RadialGauge';
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
import { Check, X, Sparkle } from '@/components/ui/Icons';
import DailyChart from '@/components/charts/DailyChart';
import {
  TIER1_SYMBOLS, TIER2_SYMBOLS, STAGE2_META, SIGNAL_META, SENTIMENT_META, TREND_META,
  VOLUME_META, SETUP_QUALITY_META, EARNINGS_RISK_META, REGIME_META,
  UpcomingEarning, RecentResult, SymbolBrief, TopNews,
} from '@/app/types';
import { SentimentTrendChart } from './SentimentTrendChart';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { G } from '@/app/glossary';
import { t, tField } from '@/app/i18n';

// ─── Static bilingual strings ───────────────────────────────────────────────

const S = {
  guideTitle:        { en: 'DeepDive Guide', ko: 'DeepDive 가이드' },
  guide1Heading:     { en: 'This screen', ko: '이 화면은' },
  guide1Body:        { en: 'A comprehensive analysis screen for deep review of all analytical indicators for the selected stock on one screen. Use it as the final confirmation screen before making entry decisions.', ko: '선택한 종목의 모든 분석 지표를 한 화면에서 심층 검토하는 종합 분석 화면입니다. 진입 결정 전 최종 확인 화면으로 사용합니다.' },
  guide2Heading:     { en: 'How to read key indicators', ko: '핵심 지표 읽는 법' },
  guide2Body:        { en: 'Row1 badges (Stage2/Conviction/Monthly/Structure) summarize overall quality. Row2 4 KPIs (RS Score, 52W deviation, correction depth, EMA200 slope) are the Stage2 core. Row3 left Institutional Activity shows accumulation status; right R:R shows trade plan.', ko: 'Row1 배지(Stage2/Conviction/월봉/구조)가 전체 품질을 요약합니다. Row2 KPI 4개(RS Score, 52W 이격, 조정폭, EMA200 기울기)가 Stage2 조건의 핵심. Row3 좌측 세력참여도에서 기관 매집 여부를, 우측 R:R에서 트레이드 계획을 확인합니다.' },
  guide3Heading:     { en: 'Use it like this', ko: '지금 이렇게 쓰세요' },
  guide3Body:        { en: 'Confirm Row1 badges → Row2 KPIs (RS≥70, correction≤10%) → Row3 Institutional Activity (score≥60 = accumulation dominant) → Row3 R:R (1:2+) → Row4 AI Brief (confirm catalyst) → Row5 Regime ≥ 60 → Entry.', ko: 'Row1 배지 전체 확인 → Row2 KPI(RS≥70, 조정≤10%) → Row3 세력참여도(세력점수≥60이면 매집 우위) → Row3 R:R(1:2 이상) → Row4 AI Brief(촉매 확인) → Row5 Regime ≥ 60 확인 → 진입.' },
  loading:           { en: 'Loading...', ko: '로딩 중...' },
  noData:            { en: 'No data', ko: '데이터 없음' },
  priceLoading:      { en: 'Loading price...', ko: '시세 로딩 중...' },
  chartLoading:      { en: 'Loading chart...', ko: '차트 로딩 중...' },
  stage2Consider:    { en: 'Consider Entry', ko: '진입 고려' },
  stage2Watch:       { en: 'Watch', ko: '관망' },
  stage2Avoid:       { en: 'Avoid', ko: '회피' },
  monthlyUp:         { en: 'Monthly Uptrend', ko: '월봉 상승확인' },
  monthlyWeak:       { en: 'Monthly Weakening', ko: '월봉 약화중' },
  monthlyNeutral:    { en: 'Monthly Neutral', ko: '월봉 중립' },
  monthlyDown:       { en: 'Monthly Downtrend', ko: '월봉 하락' },
  monthlyUnknown:    { en: 'Monthly ?', ko: '월봉 ?' },
  gcBreakout:        { en: 'GC Breakout', ko: 'GC 돌파' },
  gcRetest:          { en: 'GC Retest', ko: 'GC 리테스트' },
  gcAbove:           { en: 'Above Channel', ko: '채널 위' },
  gcBelow:           { en: 'Below Channel', ko: '채널 아래' },
  institutionalTitle:{ en: 'Institutional Activity', ko: '세력 참여도' },
  instAction20d:     { en: '20d Volume Pattern', ko: '20일 거래량 패턴' },
  instAccumulate:    { en: 'Concentrated Buy', ko: '집중 매수' },
  instBuyBias:       { en: 'Buy Dominant', ko: '매수 우위' },
  instMixed:         { en: 'Mixed', ko: '혼조' },
  instDistribute:    { en: 'Distribution', ko: '분산 매도' },
  instUpDown:        { en: 'Buy/Sell Vol', ko: '매수/매도량' },
  instBuyBiasLabel:  { en: 'Buy dominant', ko: '매수 우위' },
  instSellBiasLabel: { en: 'Sell dominant', ko: '매도 우위' },
  instBalanced:      { en: 'Balanced', ko: '균형' },
  instVolTrend:      { en: 'Volume Trend', ko: '거래량 추세' },
  instVcpShrink:     { en: 'VCP Contraction', ko: 'VCP 수축' },
  instActive:        { en: 'Active', ko: '활발' },
  instNormal:        { en: 'Normal', ko: '보통' },
  instFocusDays:     { en: 'Focus Days (10d)', ko: '집중일 (10일)' },
  instAccDominant:   { en: 'Acc dominant', ko: '매집 우세' },
  instDistDominant:  { en: 'Dist dominant', ko: '분산 우세' },
  instNeutral:       { en: 'Neutral', ko: '중립' },
  instScore:         { en: 'Institutional Score', ko: '세력 점수' },
  inst10d:           { en: '10d Institutional Action', ko: '최근 10일 세력 행동' },
  instAccLegend:     { en: 'Acc', ko: '매집' },
  instDistLegend:    { en: 'Dist', ko: '분산' },
  instNormalLegend:  { en: 'Normal (high vol basis)', ko: '보통 (큰거래량 기준)' },
  instDataInsuff:    { en: 'Insufficient data (< 20d)', ko: '데이터 부족 (20일 미만)' },
  rrTitle:           { en: 'Entry Plan · R:R', ko: '진입 계획 · R:R' },
  rrBasis:           { en: 'Pivot × 1.005 basis', ko: '피벗 × 1.005 기준' },
  positionLabel:     { en: 'Position', ko: '포지션' },
  sharesUnit:        { en: 'sh', ko: '주' },
  socialTitle:       { en: 'Social Sentiment', ko: '소셜 심리' },
  sentDelta:         { en: 'vs prev day', ko: '전일' },
  sentBotSuspect:    { en: '⚠ Bot suspected', ko: '⚠봇 의심' },
  sentConfidence:    { en: 'Confidence', ko: '신뢰도' },
  trendShow:         { en: '▼ Show Trend', ko: '▼ 심리 추이 보기' },
  trendHide:         { en: '▲ Hide Trend', ko: '▲ 추이 숨기기' },
  sentNoData:        { en: 'No sentiment data', ko: '심리 데이터 없음' },
  aiAnalysis:        { en: 'AI Analysis', ko: 'AI 분석' },
  opportunity:       { en: 'Opportunity', ko: '기회' },
  risk:              { en: 'Risk', ko: '리스크' },
  aiDisclaimer:      { en: 'AI opinion · not a trading signal', ko: 'AI 의견 · 매매 신호 아님' },
  aiNoBrief:         { en: 'AI Brief unavailable', ko: 'AI Brief 없음' },
  aiBriefLoading:    { en: 'AI Brief loading...', ko: 'AI Brief 로딩 중...' },
  earningsTitle:     { en: 'Earnings', ko: '실적 발표' },
  earningsDate:      { en: 'Date', ko: '발표일' },
  dDay:              { en: 'D-Day', ko: 'D-Day' },
  dDayUnit:          { en: 'd left', ko: '일 후' },
  epsEstimate:       { en: 'EPS Est.', ko: 'EPS 추정' },
  beatRate:          { en: 'Beat Rate', ko: '과거 Beat율' },
  earningsNone:      { en: 'No earnings within 30d · Recent result:', ko: '30일 이내 예정 실적 없음 · 최근 결과:' },
  surprise:          { en: 'Surprise', ko: '서프라이즈' },
  epsActual:         { en: 'EPS Actual', ko: 'EPS 실제' },
  epsEstShort:       { en: 'EPS Est.', ko: 'EPS 추정' },
  earningsNoData:    { en: 'No earnings data', ko: '실적 데이터 없음' },
  tierImminent:      { en: '⚡ Imminent', ko: '⚡ 임박' },
  tierApproaching:   { en: 'Approaching', ko: '진입권' },
  tierWatching:      { en: 'Watching', ko: '관망' },
  recentResult:      { en: 'Recent Result', ko: '최근 결과' },
  regimeTitle:       { en: 'Risk Regime', ko: 'Risk Regime' },
  regimeTrendOk:     { en: 'Trend following effective', ko: '추세 추종 유효' },
  regimeSelectOk:    { en: 'Selective entry possible', ko: '선별 진입 가능' },
  regimeReduce:      { en: 'Reduce position size', ko: '포지션 축소 권장' },
  regimeCash:        { en: 'Increase cash', ko: '현금 비중 확대' },
  regimeAvoid:       { en: 'Avoid new buys', ko: '신규 매수 자제' },
  regimeNoData:      { en: 'Insufficient data', ko: '데이터 부족' },
  mktSentTitle:      { en: 'Market Sentiment', ko: '시장 전체 심리' },
  mktSentVsPrev:     { en: 'vs yesterday', ko: '전일 대비' },
  mktSentNoData:     { en: 'No sentiment data', ko: '심리 데이터 없음' },
  topNews:           { en: 'Top News', ko: '주요 뉴스' },
  newsSource:        { en: 'Source', ko: '출처' },
  dayChange:         { en: '1D Change', ko: '1D 변화' },
  intradayPos:       { en: 'Intraday Position', ko: '일중 위치' },
  intradayTop:       { en: 'Holding top', ko: '상단 유지' },
  intradayBot:       { en: 'Lower pressure', ko: '하단 압박' },
  intradayMid:       { en: 'Middle', ko: '중간' },
  ema21Dev:          { en: 'EMA21 Deviation', ko: 'EMA21 이격' },
  ema21Overbought:   { en: 'Overheated', ko: '과열권' },
  ema21Support:      { en: 'Near support', ko: '지지 접근' },
  rs52wHigh:         { en: '52W High', ko: '52주 고점' },
  rs52wSub:          { en: 'vs high', ko: '고점 대비' },
  pullback:          { en: 'Recent Correction', ko: '최근 조정' },
  pullbackSub:       { en: 'vs 20d high', ko: '20일 고점 대비' },
  ema200Slope:       { en: 'EMA200 Slope', ko: 'EMA200 기울기' },
  ema200Sub:         { en: '20d slope', ko: '20일 기울기' },
  biasBuy:           { en: 'Buy',   ko: '매수' },
  biasHold:          { en: 'Hold',  ko: '보유' },
  biasWatch:         { en: 'Watch', ko: '관망' },
  biasAvoid:         { en: 'Avoid', ko: '회피' },
};

// ─── 색상 헬퍼 ─────────────────────────────────────────────────────────────────

function csColor(s: number): string {
  if (s >= 1.5) return 'var(--bull)';
  if (s >= 0.5) return 'var(--teal)';
  if (s > -0.5) return 'var(--fg-muted)';
  if (s > -1.5) return 'hsl(20 90% 55%)';
  return 'var(--bear)';
}

// ─── 로컬 메타데이터 ────────────────────────────────────────────────────────────

const MONTHLY_META_KEYS: Record<string, keyof typeof S> = {
  CONFIRMED_UPTREND: 'monthlyUp',
  WEAKENING:         'monthlyWeak',
  NEUTRAL:           'monthlyNeutral',
  DOWNTREND:         'monthlyDown',
  UNKNOWN:           'monthlyUnknown',
};

const MONTHLY_COLORS: Record<string, { color: string; bg: string }> = {
  CONFIRMED_UPTREND: { color: '#fff',            bg: 'var(--bull)' },
  WEAKENING:         { color: '#000',            bg: 'var(--warn)' },
  NEUTRAL:           { color: 'var(--fg)',       bg: 'var(--border)' },
  DOWNTREND:         { color: '#fff',            bg: 'var(--bear)' },
  UNKNOWN:           { color: 'var(--fg-muted)', bg: 'var(--border-soft)' },
};

const STRUCT_CLS: Record<string, string> = {
  UPTREND: 'bull', DOWNTREND: 'bear', DISTRIBUTION: 'warn', ACCUMULATION: 'info', NEUTRAL: 'neutral',
};

const REGIME_KO: Record<string, string> = {
  RISK_ON:      'bull',
  CONSTRUCTIVE: 'teal',
  MIXED:        'warn',
  DEFENSIVE:    'warn',
  RISK_OFF:     'bear',
  UNKNOWN:      'neutral',
};

// ─── 서브 컴포넌트 ──────────────────────────────────────────────────────────────

/** −2~+2 스코어를 중앙 기준 채움 바로 시각화 */
function ScoreBar({ score }: { score: number }) {
  const s = Math.max(-2, Math.min(2, score));
  const pct = ((s + 2) / 4) * 100;   // -2→0%, 0→50%, +2→100%
  const color = csColor(s);
  return (
    <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'var(--border)', margin: '7px 0 4px' }}>
      {/* 중앙 눈금 */}
      <div style={{ position: 'absolute', top: -1, bottom: -1, left: '50%', width: 1, background: 'var(--fg-subtle)', opacity: 0.4, transform: 'translateX(-50%)' }} />
      {/* 채움 */}
      <div style={{
        position: 'absolute', top: 0, height: '100%',
        left: `${s >= 0 ? 50 : pct}%`,
        width: `${s >= 0 ? pct - 50 : 50 - pct}%`,
        borderRadius: 3, background: color, opacity: 0.9,
      }} />
      {/* 현재 위치 도트 */}
      <div style={{
        position: 'absolute', top: '50%', left: `${pct}%`,
        width: 9, height: 9, borderRadius: '50%',
        background: color, border: '2px solid var(--card)',
        transform: 'translate(-50%,-50%)',
        boxShadow: `0 0 5px ${color}`,
      }} />
    </div>
  );
}

function TopNewsBox({ news, locale }: { news: TopNews | null | undefined; locale: 'en' | 'ko' }) {
  if (!news) return null;
  const headline = tField(news.headline_en, news.headline_ko, news.headline, locale);
  const summary  = tField(news.summary_en,  news.summary_ko,  news.summary,  locale);
  return (
    <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--em-soft)', borderLeft: '2px solid var(--em-500)' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)', marginBottom: 2 }}>{t(S.topNews, locale)}</div>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginBottom: 2 }}>{headline}</div>
      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 2 }}>{summary}</div>
      <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{t(S.newsSource, locale)}: {news.source}</div>
    </div>
  );
}

// ─── 가이드 섹션 ────────────────────────────────────────────────────────────────

const DEEPDIVE_GUIDE = (locale: 'en' | 'ko'): GuideSection[] => [
  { heading: t(S.guide1Heading, locale), body: t(S.guide1Body, locale) },
  { heading: t(S.guide2Heading, locale), body: t(S.guide2Body, locale) },
  { heading: t(S.guide3Heading, locale), body: t(S.guide3Body, locale) },
];

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function DeepDiveBoard() {
  const { symbol, setSymbol, timeframe, rrAccount, rrRiskPct, locale } = useStore();
  const [showSentTrend, setShowSentTrend] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const handler = () => setGuideOpen(true);
    document.addEventListener('guide:open', handler);
    return () => document.removeEventListener('guide:open', handler);
  }, []);

  const { ohlcvData }                = useIntraday(symbol, timeframe);
  const { dailyData, isLoading: chartLoading } = useDaily(symbol);
  const { data: sentimentData }      = useSentiment();
  const { briefData }                = useBrief();
  const { earningsData }             = useEarnings();
  const { regimeData }               = useRegime();
  const { prePostData }              = usePrePost(symbol);

  // ── Intraday
  const candles    = ohlcvData?.candles ?? [];
  const signals    = ohlcvData?.signals;
  const indicators = ohlcvData?.indicators;
  const lastIdx    = candles.length - 1;
  const lastCandle = candles[lastIdx];
  const activeSignals = signals
    ? ['sniper','vcp','pullback','strong_trend','overbought','downtrend']
        .filter(k => signals[k as keyof typeof signals][lastIdx])
    : [];

  // ── Daily / Stage2
  const stage2 = dailyData?.stage2;

  // ── R:R
  const entry = stage2?.entry ?? 0;
  const stop  = stage2?.stop  ?? 0;
  const target = stage2?.target ?? 0;
  const accountNum = parseFloat(rrAccount.replace(/,/g, '')) || 100000;
  const riskPct    = parseFloat(rrRiskPct) || 1;
  const qty = stop > 0 && entry > stop
    ? Math.floor(accountNum * (riskPct / 100) / (entry - stop))
    : 0;
  const stopLossPct = entry > 0 ? ((entry - stop) / entry) * 100 : 0;

  // ── 심리/AI/실적
  const symSent  = (sentimentData?.latest?.symbols ?? []).find(s => s.symbol === symbol);
  const mktSent  = sentimentData?.latest?.market;
  const symBrief = (briefData?.symbol_briefs ?? []).find(sb => sb.symbol === symbol) as SymbolBrief | undefined;
  const symEarning = earningsData?.upcoming_earnings?.find(e => e.symbol === symbol) as UpcomingEarning | undefined;
  const symRecent  = earningsData?.recent_results?.find(r => r.symbol === symbol) as RecentResult  | undefined;

  // ── Conviction
  const cv = dailyData?.conviction_score;

  // ── 단축 변수
  const mp     = stage2?.monthly_phase ?? 'UNKNOWN';
  const mpColors = MONTHLY_COLORS[mp] ?? MONTHLY_COLORS.UNKNOWN;
  const mpLabel  = t(S[MONTHLY_META_KEYS[mp] ?? 'monthlyUnknown'], locale);

  const gcBadges:  [string, string][] = [];
  if (stage2?.gc_breakout)           gcBadges.push([t(S.gcBreakout, locale), 'purple']);
  else if (stage2?.gc_retest)        gcBadges.push([t(S.gcRetest, locale),   'purple']);
  else if (stage2?.gc_above)         gcBadges.push([t(S.gcAbove, locale),    'teal']);
  else if (stage2?.gc_below)         gcBadges.push([t(S.gcBelow, locale),    'bear']);

  const patBadges: [string, string][] = [];
  if (stage2?.bear_flag)             patBadges.push(['Bear Flag',   'bear']);
  if (stage2?.rsi_divergence_bullish) patBadges.push(['RSI Bull Div','bull']);
  if (stage2?.rsi_divergence_bearish) patBadges.push(['RSI Bear Div','warn']);

  // ── 세력 참여도 계산 (Row 3L)
  const forceData = (() => {
    const dc = dailyData?.candles;
    if (!dc || dc.length < 20) return null;
    const r20 = dc.slice(-20);
    const r10 = dc.slice(-10);
    const r5  = dc.slice(-5);
    const upVol   = r20.filter(c => c.close >= c.open).reduce((s, c) => s + c.volume, 0);
    const downVol = r20.filter(c => c.close < c.open).reduce((s, c) => s + c.volume, 0);
    const vol20avg = r20.reduce((s, c) => s + c.volume, 0) / 20;
    const vol5avg  = r5.reduce((s, c) => s + c.volume, 0) / 5;
    const volTrendRatio = vol20avg > 0 ? vol5avg / vol20avg : 1;
    const accDays  = r10.filter(c => c.volume > vol20avg && c.close >= c.open).length;
    const distDays = r10.filter(c => c.volume > vol20avg && c.close < c.open).length;
    const udRatio  = downVol > 0 ? upVol / downVol : upVol > 0 ? 9 : 1;
    const udScore    = Math.min(50, Math.max(0, (udRatio - 0.5) / 1.5 * 50));
    const accScore   = Math.min(30, Math.max(0, (accDays - distDays + 5) / 10 * 30));
    const trendScore = volTrendRatio < 0.8 ? 20 : volTrendRatio < 1.0 ? 12 : volTrendRatio < 1.3 ? 8 : 4;
    const forceScore = Math.round(udScore + accScore + trendScore);
    const maxVol = Math.max(...r20.map(c => c.volume), 1);
    return { r20, r10, vol20avg, volTrendRatio, accDays, distDays, udRatio, forceScore, maxVol };
  })();

  const BIAS_LABELS: Record<string, { en: string; ko: string }> = {
    buy:   S.biasBuy,
    hold:  S.biasHold,
    watch: S.biasWatch,
    avoid: S.biasAvoid,
  };

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="board-wrap">
      <BoardGuidePanel title={t(S.guideTitle, locale)} sections={DEEPDIVE_GUIDE(locale)} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '3fr 2fr', alignContent: 'start' }}
    >

      {/* ════════════════════════════════════════════════════════════════
          ROW 1 — Zone 0: 종목 선택 + 가격 + 상황 배지
      ════════════════════════════════════════════════════════════════ */}
      <div className="mob-order-1 mob-symbol-bar" style={{
        gridColumn: 'span 2',
        display: 'flex', alignItems: 'center', gap: 0,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', overflow: 'hidden',
      }}>
        {/* 종목 버튼 (TIER1 + TIER2 그룹) */}
        <div className="mob-symbol-btns" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 12px', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
          {/* TIER 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sky, #38bdf8)', letterSpacing: '0.3px', minWidth: 16 }}>T1</span>
            {TIER1_SYMBOLS.map(s => (
              <button
                key={s}
                onClick={() => { setSymbol(s); setShowSentTrend(false); }}
                style={{
                  padding: '3px 8px', borderRadius: 5,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: symbol === s ? 'var(--em-500)' : 'transparent',
                  border: symbol === s ? '1px solid transparent' : '1px solid var(--border-soft)',
                  color: symbol === s ? '#fff' : 'var(--fg-muted)',
                  transition: 'all 0.1s',
                }}
              >{s}</button>
            ))}
          </div>
          {/* TIER 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple, #a78bfa)', letterSpacing: '0.3px', minWidth: 16 }}>T2</span>
            {TIER2_SYMBOLS.map(s => (
              <button
                key={s}
                onClick={() => { setSymbol(s); setShowSentTrend(false); }}
                style={{
                  padding: '3px 8px', borderRadius: 5,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: symbol === s ? 'var(--purple, #a78bfa)' : 'transparent',
                  border: symbol === s ? '1px solid transparent' : '1px solid var(--border-soft)',
                  color: symbol === s ? '#fff' : 'var(--fg-muted)',
                  transition: 'all 0.1s',
                }}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* 가격 + KPI */}
        <div className="mob-symbol-price" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', flex: 1, minWidth: 0 }}>
          {lastCandle ? (
            <>
              <div style={{ flexShrink: 0 }}>
                {/* 모바일: 선택된 심볼 이름 */}
                <div className="mob-show" style={{ fontSize: 11, fontWeight: 700, color: 'var(--em-500)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>
                  {symbol}
                </div>
                {/* PRE/POST/OVERNIGHT 상태에서는 공식 종가(regular_close) 사용 */}
                {(() => {
                  const ms = prePostData?.market_state;
                  const isPP = ms === 'PRE' || ms === 'POST' || ms === 'OVERNIGHT';
                  const px = isPP && prePostData?.regular_close != null ? prePostData.regular_close : lastCandle.close;
                  return (
                    <div className="mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                      ${px.toFixed(2)}
                    </div>
                  );
                })()}

                {indicators && lastIdx >= 0 && (() => {
                  const rsi = indicators.rsi[lastIdx] ?? 0;
                  return (
                    <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2, whiteSpace: 'nowrap' }}>
                      RSI{' '}
                      <span className="mono" style={{ color: rsi >= 70 ? 'var(--warn)' : rsi <= 35 ? 'var(--bear)' : 'var(--fg)' }}>
                        {rsi.toFixed(0)}
                      </span>
                      {' · '}EMA21{' '}
                      <span className="mono">${(indicators.ema21[lastIdx] ?? 0).toFixed(2)}</span>
                    </div>
                  );
                })()}
                {prePostData && (['PRE', 'POST', 'OVERNIGHT'] as const).includes(prePostData.market_state as 'PRE' | 'POST' | 'OVERNIGHT') && (() => {
                  const ms = prePostData.market_state;
                  let price: number | null = null;
                  let chgPct: number | null = null;
                  let label = '';
                  let bgColor = 'var(--border)';
                  let fgColor = 'var(--fg-muted)';
                  if (ms === 'PRE') {
                    price = prePostData.pre_market_price; chgPct = prePostData.pre_market_change_pct;
                    label = 'PRE'; bgColor = 'var(--em-soft)'; fgColor = 'var(--em-500)';
                  } else if (ms === 'POST') {
                    price = prePostData.post_market_price; chgPct = prePostData.post_market_change_pct;
                    label = 'POST';
                  } else if (ms === 'OVERNIGHT') {
                    price = prePostData.overnight_price; chgPct = prePostData.overnight_change_pct;
                    label = '🌙 OVNT'; bgColor = 'var(--purple-soft, var(--border))'; fgColor = 'var(--purple, var(--fg-muted))';
                  }
                  if (price == null) return null;
                  const up = (chgPct ?? 0) >= 0;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                        padding: '1px 5px', borderRadius: 4,
                        background: bgColor, color: fgColor,
                      }}>
                        {label}
                      </span>
                      <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
                        ${price.toFixed(2)}
                      </span>
                      {chgPct != null && (
                        <span style={{ fontSize: 12, color: up ? 'var(--bull)' : 'var(--bear)' }}>
                          {up ? '+' : ''}{chgPct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              {/* Zone 0 인트라데이 KPI 3개 */}
              {(() => {
                const tiles: { label: string; value: string; color: string; sub?: string }[] = [];

                const dc = dailyData?.candles;
                if (dc && dc.length >= 2) {
                  const chg = ((dc[dc.length - 1].close - dc[dc.length - 2].close) / dc[dc.length - 2].close) * 100;
                  tiles.push({
                    label: t(S.dayChange, locale),
                    value: `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`,
                    color: chg >= 0 ? 'var(--bull)' : 'var(--bear)',
                  });
                }

                if (candles.length > 1) {
                  const slice = candles.slice(-78);
                  const dayHigh = Math.max(...slice.map(c => c.high));
                  const dayLow  = Math.min(...slice.map(c => c.low));
                  const range = dayHigh - dayLow;
                  if (range > 0 && lastCandle) {
                    const pos = ((lastCandle.close - dayLow) / range) * 100;
                    tiles.push({
                      label: t(S.intradayPos, locale),
                      value: `${pos.toFixed(0)}%`,
                      color: pos >= 70 ? 'var(--bull)' : pos <= 30 ? 'var(--bear)' : 'var(--fg)',
                      sub: pos >= 70 ? t(S.intradayTop, locale) : pos <= 30 ? t(S.intradayBot, locale) : t(S.intradayMid, locale),
                    });
                  }
                }

                if (lastCandle && indicators && indicators.ema21[lastIdx]) {
                  const ema21 = indicators.ema21[lastIdx]!;
                  const pct = ((lastCandle.close - ema21) / ema21) * 100;
                  tiles.push({
                    label: t(S.ema21Dev, locale),
                    value: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
                    color: Math.abs(pct) >= 3 ? 'var(--warn)' : pct >= 0 ? 'var(--teal)' : 'var(--fg-muted)',
                    sub: pct >= 3.2 ? t(S.ema21Overbought, locale) : pct <= -2 ? t(S.ema21Support, locale) : undefined,
                  });
                }

                if (tiles.length === 0) return null;
                return (
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    {tiles.map(ti => (
                      <div key={ti.label} style={{
                        padding: '5px 10px', borderRadius: 8,
                        background: 'var(--card-elev)', border: '1px solid var(--border-soft)',
                        minWidth: 68,
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>
                          {ti.label}
                        </div>
                        <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: ti.color, lineHeight: 1.1 }}>
                          {ti.value}
                        </div>
                        {ti.sub && <div style={{ fontSize: 10, color: ti.color, opacity: 0.8, marginTop: 1 }}>{ti.sub}</div>}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="subtle" style={{ fontSize: 13 }}>{t(S.priceLoading, locale)}</div>
          )}

          {/* 우측 배지 그룹 */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {stage2 && <ScorePill score={stage2.score} />}
            <ConvictionBadge score={cv} locale={locale} size="md" />
            <div style={{ padding: '3px 9px', borderRadius: 20, background: mpColors.bg, fontSize: 12, fontWeight: 700, color: mpColors.color, whiteSpace: 'nowrap' }}>
              {mpLabel}
            </div>
            {stage2 && (
              <span
                className={`badge ${STRUCT_CLS[stage2.market_structure] ?? 'neutral'}`}
                title={locale === 'ko' ? '일봉 시장 구조 (Daily)' : 'Daily market structure'}
              >
                {stage2.market_structure}
                <span style={{ opacity: 0.5, fontSize: '0.78em', marginLeft: 3 }}>·D</span>
              </span>
            )}
            {activeSignals.slice(0, 2).map(sig => {
              const CLR: Record<string, string> = { sniper:'bull', vcp:'info', pullback:'warn', strong_trend:'teal', overbought:'warn', downtrend:'bear' };
              return (
                <span key={sig} className={`badge ${CLR[sig] ?? 'neutral'}`}
                      title={locale === 'ko' ? `단기(${timeframe}) 시그널` : `Intraday (${timeframe}) signal`}>
                  ● {SIGNAL_META[sig]?.label}
                  <span style={{ opacity: 0.5, fontSize: '0.78em', marginLeft: 3 }}>·{timeframe}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 2 LEFT — Daily Chart
      ════════════════════════════════════════════════════════════════ */}
      <div className="mob-order-2 mob-wrap">
        <div className="card" style={{ minHeight: 440 }}>
          <div className="card__hd">
            <h3>{symbol} · Daily Chart</h3>
            {stage2 && (
              <span className={`badge ${STRUCT_CLS[stage2.market_structure] ?? 'neutral'}`}
                    title={locale === 'ko' ? '일봉 시장 구조' : 'Daily market structure'}>
                {stage2.market_structure}
                <span style={{ opacity: 0.5, fontSize: '0.78em', marginLeft: 3 }}>·D</span>
              </span>
            )}
            {[...gcBadges, ...patBadges].map(([l, c]) => <span key={l} className={`badge ${c}`}>{l}</span>)}
            <small>1Y · GC · EMA8/21/50/200</small>
          </div>
          <div className="card__bd" style={{ paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}>
            {chartLoading
              ? <div className="subtle" style={{ padding: '32px 16px' }}>{t(S.chartLoading, locale)}</div>
              : dailyData ? <div className="mob-chart-limit"><DailyChart data={dailyData} /></div> : null
            }
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 2 RIGHT — Stage 2 분석
      ════════════════════════════════════════════════════════════════ */}
      <div className="mob-order-4 mob-wrap">
      <div className="card">
        <div className="card__hd">
          <h3>Minervini Stage 2</h3>
          <InfoPopover term={t(G.stage2.term, locale)} body={t(G.stage2.body, locale)} />
          {stage2 && <ScorePill score={stage2.score} />}
          <ConvictionBadge score={cv} locale={locale} size="md" />
          <InfoPopover term={t(G.conviction.term, locale)} body={t(G.conviction.body, locale)} />
          <small>{stage2 ? (stage2.score >= 6 ? t(S.stage2Consider, locale) : stage2.score >= 4 ? t(S.stage2Watch, locale) : t(S.stage2Avoid, locale)) : '—'}</small>
        </div>
        <div className="card__bd">
          {stage2 ? (
            <>
              {/* 7개 체크리스트 — 2컬럼 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px', marginBottom: 10 }}>
                {(Object.keys(STAGE2_META) as (keyof typeof STAGE2_META)[]).map(k => (
                  <div key={k} className={`s2-row ${stage2.checks[k] ? 'pass' : 'fail'}`}>
                    <div className="check">{stage2.checks[k] ? <Check /> : <X />}</div>
                    <div className="s2-label" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {STAGE2_META[k].label}
                    </div>
                  </div>
                ))}
              </div>

              {/* 월봉 배너 */}
              <div style={{ padding: '5px 10px', borderRadius: 6, background: mpColors.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: mpColors.color }}>{mpLabel}</span>
                {stage2.monthly_ema10 != null && (
                  <span className="mono" style={{ fontSize: 11.5, color: mpColors.color, opacity: 0.9 }}>
                    EMA10 ${stage2.monthly_ema10.toFixed(2)}
                    {stage2.pct_from_monthly_ema10 != null && (
                      <> · {stage2.pct_from_monthly_ema10 > 0 ? '+' : ''}{stage2.pct_from_monthly_ema10.toFixed(1)}%</>
                    )}
                  </span>
                )}
              </div>

              {/* KPI 4개 — 2×2 그리드 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  ['RS Score', `${stage2.rs_score}`, stage2.rs_score >= 70 ? 'var(--bull)' : stage2.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)', 'vs SPY 63d', G.rs_score],
                  [t(S.rs52wHigh, locale), `${stage2.pct_from_52w_high.toFixed(1)}%`, stage2.pct_from_52w_high >= -25 ? 'var(--bull)' : 'var(--bear)', t(S.rs52wSub, locale), null],
                  [t(S.pullback, locale), `${stage2.pullback_pct.toFixed(1)}%`, stage2.pullback_pct <= 15 ? 'var(--bull)' : 'var(--bear)', t(S.pullbackSub, locale), null],
                  [t(S.ema200Slope, locale), `${stage2.ema200_slope >= 0 ? '+' : ''}${stage2.ema200_slope.toFixed(3)}`, stage2.ema200_slope >= 0 ? 'var(--bull)' : 'var(--bear)', t(S.ema200Sub, locale), null],
                ] as [string, string, string, string, typeof G.rs_score | null][]).map(([label, val, color, sub, info]) => (
                  <div key={label} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                      {label}{info && <InfoPopover term={t(info.term, locale)} body={t(info.body, locale)} />}
                    </div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1.1 }}>{val}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="subtle">{chartLoading ? t(S.loading, locale) : t(S.noData, locale)}</div>
          )}
        </div>
      </div>
      </div>{/* end mob-order-4 */}

      {/* ════════════════════════════════════════════════════════════════
          ROW 3 LEFT — 세력 참여도 분석
      ════════════════════════════════════════════════════════════════ */}
      <div className="mob-order-5 mob-wrap">
      <div className="card">
        <div className="card__hd">
          <h3>{t(S.institutionalTitle, locale)} · {symbol}</h3>
          <InfoPopover term={t(G.institutional_activity.term, locale)} body={t(G.institutional_activity.body, locale)} />
          {forceData && (() => {
            const { forceScore } = forceData;
            const cls = forceScore >= 70 ? 'bull' : forceScore >= 50 ? 'teal' : forceScore >= 30 ? 'warn' : 'bear';
            const lbl = forceScore >= 70 ? t(S.instAccumulate, locale) : forceScore >= 50 ? t(S.instBuyBias, locale) : forceScore >= 30 ? t(S.instMixed, locale) : t(S.instDistribute, locale);
            return <span className={`badge ${cls}`}>{lbl}</span>;
          })()}
          <small>{t(S.instAction20d, locale)}</small>
        </div>
        <div className="card__bd">
          {forceData ? (() => {
            const { r20, r10, vol20avg, volTrendRatio, accDays, distDays, udRatio, forceScore, maxVol } = forceData;
            const scoreColor = forceScore >= 70 ? 'var(--bull)' : forceScore >= 50 ? 'var(--teal)' : forceScore >= 30 ? 'var(--warn)' : 'var(--bear)';
            return (
              <>
                {/* 섹션 1: 거래량 스파크라인 20봉 */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 52, marginBottom: 10 }}>
                  {r20.map((c, i) => {
                    const up = c.close >= c.open;
                    const h = Math.max(3, (c.volume / maxVol) * 48);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <div style={{ height: h, borderRadius: 2, background: up ? 'var(--bull)' : 'var(--bear)', opacity: 0.75 }} />
                      </div>
                    );
                  })}
                </div>

                {/* 섹션 2: 핵심 지표 3개 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{t(S.instUpDown, locale)}</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: udRatio >= 1.3 ? 'var(--bull)' : udRatio < 0.7 ? 'var(--bear)' : 'var(--fg)' }}>
                      {udRatio >= 9 ? '9+' : udRatio.toFixed(1)}×
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-muted)' }}>
                      {udRatio >= 1.3 ? t(S.instBuyBiasLabel, locale) : udRatio < 0.7 ? t(S.instSellBiasLabel, locale) : t(S.instBalanced, locale)}
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{t(S.instVolTrend, locale)}</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: volTrendRatio < 0.8 ? 'var(--bull)' : volTrendRatio > 1.2 ? 'var(--warn)' : 'var(--fg)' }}>
                      {volTrendRatio < 0.8 ? '▽' : volTrendRatio > 1.2 ? '△' : '→'} {volTrendRatio.toFixed(2)}×
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-muted)' }}>
                      {volTrendRatio < 0.8 ? t(S.instVcpShrink, locale) : volTrendRatio > 1.2 ? t(S.instActive, locale) : t(S.instNormal, locale)}
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{t(S.instFocusDays, locale)}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
                      <span style={{ color: 'var(--bull)' }}>{accDays}acc</span>
                      <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>/</span>
                      <span style={{ color: 'var(--bear)' }}>{distDays}dist</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: accDays > distDays ? 'var(--bull)' : distDays > accDays ? 'var(--bear)' : 'var(--fg-muted)' }}>
                      {accDays > distDays ? t(S.instAccDominant, locale) : distDays > accDays ? t(S.instDistDominant, locale) : t(S.instNeutral, locale)}
                    </div>
                  </div>
                </div>

                {/* 섹션 3: 세력 점수 바 */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t(S.instScore, locale)}</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: scoreColor }}>{forceScore} / 100</span>
                  </div>
                  <div className="bar">
                    <div className="bar__fill" style={{ width: `${forceScore}%`, background: scoreColor }} />
                  </div>
                </div>

                {/* 섹션 4: 최근 10일 acc/dist 미니 그리드 */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t(S.inst10d, locale)}</div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {r10.map((c, i) => {
                      const isAcc  = c.volume > vol20avg && c.close >= c.open;
                      const isDist = c.volume > vol20avg && c.close < c.open;
                      return (
                        <div key={i} style={{
                          flex: 1, height: 14, borderRadius: 3,
                          background: isAcc ? 'var(--bull)' : isDist ? 'var(--bear)' : 'var(--bg-subtle)',
                          border: `1px solid ${isAcc ? 'var(--bull)' : isDist ? 'var(--bear)' : 'var(--border)'}`,
                          opacity: isAcc || isDist ? 0.8 : 0.45,
                        }} />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 10.5, color: 'var(--fg-subtle)' }}>
                    <span><span style={{ color: 'var(--bull)' }}>■</span> {t(S.instAccLegend, locale)}</span>
                    <span><span style={{ color: 'var(--bear)' }}>■</span> {t(S.instDistLegend, locale)}</span>
                    <span>□ {t(S.instNormalLegend, locale)}</span>
                  </div>
                </div>
              </>
            );
          })() : <div className="subtle">{chartLoading ? t(S.loading, locale) : t(S.instDataInsuff, locale)}</div>}
        </div>
      </div>
      </div>{/* end mob-order-5 */}

      {/* ════════════════════════════════════════════════════════════════
          ROW 3 RIGHT — R:R 진입 계획
      ════════════════════════════════════════════════════════════════ */}
      <div className="mob-order-3 mob-wrap">
      <div className="card">
        <div className="card__hd">
          <h3>{t(S.rrTitle, locale)}</h3>
          <InfoPopover term={t(G.rr_ratio.term, locale)} body={t(G.rr_ratio.body, locale)} />
          <small>{t(S.rrBasis, locale)}</small>
        </div>
        <div className="card__bd">
          {stage2 ? (
            <>
              {/* Entry / Stop / Target */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {([
                  ['Entry',  entry.toFixed(2),  'var(--info)',  'var(--info-soft)'],
                  ['Stop',   stop.toFixed(2),   'var(--bear)', 'var(--bear-soft)'],
                  ['Target', target.toFixed(2), 'var(--bull)', 'var(--bull-soft)'],
                ] as [string,string,string,string][]).map(([l,v,c,bg]) => (
                  <div key={l} style={{ padding: '8px 10px', borderRadius: 8, background: bg, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: c, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{l}</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: c }}>${v}</div>
                  </div>
                ))}
              </div>

              {/* R:R 시각 바 (빨강1 : 녹색3) */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
                  <div style={{ flex: 1, background: 'var(--bear)', opacity: 0.7, borderRadius: '6px 0 0 6px' }} />
                  <div style={{ flex: 3, background: 'var(--bull)', opacity: 0.7, borderRadius: '0 6px 6px 0' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 3 }}>
                  <span style={{ color: 'var(--bear)' }}>-{stopLossPct.toFixed(2)}%</span>
                  <span style={{ fontWeight: 600 }}>1 : 3 R:R</span>
                  <span style={{ color: 'var(--bull)' }}>+{(stopLossPct * 3).toFixed(2)}%</span>
                </div>
              </div>

              {/* 포지션 크기 */}
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--em-soft)', border: '1px solid color-mix(in srgb, var(--em-500) 25%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t(S.positionLabel, locale)} ({rrRiskPct}% · ${(accountNum/1000).toFixed(0)}K)
                  </div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--em-500)', lineHeight: 1.1 }}>{qty > 0 ? `${qty} ${t(S.sharesUnit, locale)}` : '—'}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--fg-muted)' }}>
                  <div>Max Loss <span style={{ color: 'var(--bear)', fontWeight: 600 }}>${(accountNum * riskPct / 100).toFixed(0)}</span></div>
                  <div>ATR <span className="mono">{stage2.latest_atr.toFixed(2)}</span></div>
                </div>
              </div>

              {/* 패턴 배지 */}
              {(gcBadges.length > 0 || patBadges.length > 0) && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[...gcBadges, ...patBadges].map(([l, c]) => (
                    <span key={l} className={`badge ${c}`} style={{ fontSize: 11.5 }}>{l}</span>
                  ))}
                </div>
              )}
            </>
          ) : <div className="subtle">{t(S.loading, locale)}</div>}
        </div>
      </div>
      </div>{/* end mob-order-3 */}

      {/* ════════════════════════════════════════════════════════════════
          ROW 4 — 소셜 심리 | AI Brief | 실적 (span 2 → 내부 3등분)
      ════════════════════════════════════════════════════════════════ */}
      <div className="mob-order-6 mob-inner-stack" style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, alignItems: 'stretch' }}>

        {/* 소셜 심리 (종목) */}
        <div className="card">
          <div className="card__hd">
            <h3>{t(S.socialTitle, locale)} · {symbol}</h3>
            {symSent && (
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 17, fontWeight: 700, color: csColor(symSent.composite_score ?? symSent.sentiment_score) }}>
                {(symSent.composite_score ?? symSent.sentiment_score) > 0 ? '+' : ''}
                {symSent.composite_score ?? symSent.sentiment_score}
              </span>
            )}
          </div>
          <div className="card__bd">
            {symSent ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={`badge ${SENTIMENT_META[symSent.sentiment]?.color.replace('text-','').split('-')[0] ?? 'neutral'}`}>
                    {t(SENTIMENT_META[symSent.sentiment]?.label, locale)}
                  </span>
                  {symSent.score_delta != null && (
                    <span style={{ fontSize: 12, color: symSent.score_delta > 0 ? 'var(--bull)' : symSent.score_delta < 0 ? 'var(--bear)' : 'var(--fg-subtle)' }}>
                      {symSent.score_delta > 0 ? '↑' : symSent.score_delta < 0 ? '↓' : '→'} {t(S.sentDelta, locale)} {symSent.score_delta > 0 ? '+' : ''}{symSent.score_delta}
                    </span>
                  )}
                </div>
                <ScoreBar score={symSent.composite_score ?? symSent.sentiment_score} />

                <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.65, margin: '8px 0' }}>
                  {tField(symSent.key_reason_en, symSent.key_reason_ko, symSent.key_reason, locale)}
                </div>
                <TopNewsBox news={symSent.top_news} locale={locale} />

                <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 11.5, flexWrap: 'wrap' }}>
                  <span>{TREND_META[symSent.trend_vs_yesterday]?.icon} {t(TREND_META[symSent.trend_vs_yesterday]?.label, locale)}</span>
                  <span style={{ color: 'var(--fg-subtle)' }}>{t(VOLUME_META[symSent.mention_volume]?.label, locale)}</span>
                  {symSent.bot_suspected === 'yes' && <span style={{ color: 'var(--warn)' }}>{t(S.sentBotSuspect, locale)}</span>}
                  <span style={{ color: 'var(--fg-subtle)' }}>{t(S.sentConfidence, locale)} <strong style={{ color: 'var(--em-500)' }}>{symSent.confidence.toUpperCase()}</strong></span>
                </div>

                <button
                  onClick={() => setShowSentTrend(v => !v)}
                  style={{ marginTop: 10, width: '100%', padding: '5px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer' }}
                >
                  {showSentTrend ? t(S.trendHide, locale) : t(S.trendShow, locale)}
                </button>
                {showSentTrend && <SentimentTrendChart symbol={symbol} locale={locale} />}
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '12px 0' }}>
                {sentimentData?.available === false ? `${symbol} ${t(S.sentNoData, locale)}` : t(S.loading, locale)}
              </div>
            )}
          </div>
        </div>

        {/* AI Brief (종목) */}
        <details className="mob-collapse card" open style={{ position: 'relative', overflow: 'hidden' }}>
          <summary>AI Brief</summary>
          <div className="mob-collapse-body">
          <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 160, height: 160, background: 'radial-gradient(circle, color-mix(in srgb, var(--em-500) 10%, transparent), transparent 70%)', pointerEvents: 'none' }} />
          <div className="card__hd" style={{ position: 'relative' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--em-500)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Sparkle />
            </div>
            <h3>{t(S.aiAnalysis, locale)} · {symbol}</h3>
            {symBrief && (() => {
              const sqm = SETUP_QUALITY_META[symBrief.setup_quality] ?? SETUP_QUALITY_META['B'];
              const BIAS_CLS: Record<string,string> = { buy:'bull', hold:'teal', watch:'warn', avoid:'bear' };
              return (
                <>
                  <span className={`badge ${sqm.color}`}>{sqm.label}</span>
                  <span className={`badge ${BIAS_CLS[symBrief.action_bias] ?? 'neutral'}`}>
                    {t(BIAS_LABELS[symBrief.action_bias] ?? S.biasWatch, locale)}
                  </span>
                </>
              );
            })()}
          </div>
          <div className="card__bd" style={{ position: 'relative' }}>
            {symBrief ? (
              <>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg)', marginBottom: 12 }}>
                  {tField(symBrief.brief_en, symBrief.brief_ko, symBrief.brief, locale)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ padding: '7px 10px', borderRadius: 6, background: 'var(--bull-soft)', borderLeft: '2px solid var(--bull)' }}>
                    <div style={{ fontSize: 10, color: 'var(--bull)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t(S.opportunity, locale)}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{tField(symBrief.key_opportunity_en, symBrief.key_opportunity_ko, symBrief.key_opportunity, locale)}</div>
                  </div>
                  <div style={{ padding: '7px 10px', borderRadius: 6, background: 'var(--bear-soft)', borderLeft: '2px solid var(--bear)' }}>
                    <div style={{ fontSize: 10, color: 'var(--bear)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t(S.risk, locale)}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{tField(symBrief.key_risk_en, symBrief.key_risk_ko, symBrief.key_risk, locale)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--fg-subtle)' }}>{t(S.aiDisclaimer, locale)}</div>
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '12px 0' }}>
                {briefData ? `${symbol} ${t(S.aiNoBrief, locale)}` : t(S.aiBriefLoading, locale)}
              </div>
            )}
          </div>
          </div>
        </details>

        {/* 실적 발표 — 없을 때 최근 결과로 채움 */}
        <div className="card">
          <div className="card__hd">
            <h3>{t(S.earningsTitle, locale)}</h3>
            {symEarning && (() => {
              const rm = EARNINGS_RISK_META[symEarning.risk_level] ?? EARNINGS_RISK_META.med;
              const tierColor = symEarning.relevance_tier === 'imminent' ? 'var(--bear)' : symEarning.relevance_tier === 'approaching' ? 'var(--warn)' : 'var(--fg-subtle)';
              const tierLabel = symEarning.relevance_tier === 'imminent' ? t(S.tierImminent, locale) : symEarning.relevance_tier === 'approaching' ? t(S.tierApproaching, locale) : t(S.tierWatching, locale);
              return (
                <>
                  <span className={`badge ${rm.color}`}>{rm.dot} {symEarning.risk_level.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: tierColor, fontWeight: 600 }}>{tierLabel}</span>
                </>
              );
            })()}
            {!symEarning && symRecent && (
              <span className="badge neutral" style={{ fontSize: 11 }}>{t(S.recentResult, locale)}</span>
            )}
          </div>
          <div className="card__bd">
            {symEarning ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--card-elev)' }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t(S.earningsDate, locale)}</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{symEarning.earnings_date.slice(5)}</div>
                  </div>
                  <div style={{ padding: '7px 10px', borderRadius: 8, background: symEarning.days_until <= 7 ? 'var(--bear-soft)' : 'var(--warn-soft)' }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t(S.dDay, locale)}</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: symEarning.days_until <= 7 ? 'var(--bear)' : 'var(--warn)' }}>{symEarning.days_until}{locale === 'ko' ? '일 후' : 'd'}</div>
                  </div>
                  {symEarning.eps_estimate != null && (
                    <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--card-elev)' }}>
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t(S.epsEstimate, locale)}</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>${symEarning.eps_estimate.toFixed(2)}</div>
                    </div>
                  )}
                  {symEarning.historical_beat_rate != null && (
                    <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--card-elev)' }}>
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t(S.beatRate, locale)}</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal)' }}>{(symEarning.historical_beat_rate * 100).toFixed(0)}%</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.65, marginBottom: 8 }}>{tField(symEarning.ai_summary_en, symEarning.ai_summary_ko, symEarning.ai_summary, locale)}</div>
                <div style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, background: 'var(--warn-soft)', color: 'var(--warn)', fontWeight: 500 }}>
                  ⚡ {tField(symEarning.action_note_en, symEarning.action_note_ko, symEarning.action_note, locale)}
                </div>
              </>
            ) : symRecent ? (
              /* 예정 실적 없음 → 최근 실적 결과 표시 */
              <>
                <div style={{ marginBottom: 8, fontSize: 11.5, color: 'var(--fg-subtle)' }}>{t(S.earningsNone, locale)}</div>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--card-elev)', border: '1px solid var(--border-soft)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{symRecent.report_date}</span>
                    <span className={`badge ${symRecent.surprise_pct >= 0 ? 'bull' : 'bear'}`} style={{ fontSize: 11 }}>
                      {symRecent.surprise_pct >= 0 ? '+' : ''}{symRecent.surprise_pct.toFixed(1)}% {t(S.surprise, locale)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t(S.epsActual, locale)}</div>
                      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: symRecent.eps_actual >= symRecent.eps_estimate ? 'var(--bull)' : 'var(--bear)' }}>
                        ${symRecent.eps_actual.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t(S.epsEstShort, locale)}</div>
                      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-muted)' }}>
                        ${symRecent.eps_estimate.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.65 }}>{tField(symRecent.ai_reaction_en, symRecent.ai_reaction_ko, symRecent.ai_reaction, locale)}</div>
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '12px 0' }}>
                {earningsData ? t(S.earningsNoData, locale) : t(S.loading, locale)}
              </div>
            )}
          </div>
        </div>

      </div>{/* end ROW 4 */}

      {/* ════════════════════════════════════════════════════════════════
          ROW 5 LEFT — Risk Regime (3fr, 가로 레이아웃)
      ════════════════════════════════════════════════════════════════ */}
      <div className="mob-order-7 mob-wrap">
      <div className="card">
        <div className="card__hd">
          <h3>{t(S.regimeTitle, locale)}</h3>
          {regimeData && (
            <span className={`badge ${REGIME_KO[regimeData.regime] ?? 'neutral'}`}>
              {t(REGIME_META[regimeData.regime].label, locale)}
            </span>
          )}
          <small>{regimeData?.total ?? '—'} / 100</small>
        </div>
        <div className="card__bd">
          {regimeData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center' }}>
              {/* 게이지 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <RadialGauge value={regimeData.total ?? 0} size={80} label={regimeData.total ?? '—'} sublabel={locale === 'ko' ? '점수' : 'score'} />
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.4, textAlign: 'center', maxWidth: 90 }}>
                  {regimeData.regime === 'RISK_ON'      && t(S.regimeTrendOk, locale)}
                  {regimeData.regime === 'CONSTRUCTIVE' && t(S.regimeSelectOk, locale)}
                  {regimeData.regime === 'MIXED'        && t(S.regimeReduce, locale)}
                  {regimeData.regime === 'DEFENSIVE'    && t(S.regimeCash, locale)}
                  {regimeData.regime === 'RISK_OFF'     && t(S.regimeAvoid, locale)}
                  {regimeData.regime === 'UNKNOWN'      && t(S.regimeNoData, locale)}
                </div>
              </div>
              {/* 5요소 바 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {([
                  ['Trend',      regimeData.components.trend,      regimeData.diagnostics?.spy_vs_ema200_pct,    'SPY/EMA200'],
                  ['Breadth',    regimeData.components.breadth,    regimeData.diagnostics?.rsp_minus_spy_60d,   'RSP-SPY'],
                  ['Credit',     regimeData.components.credit,     regimeData.diagnostics?.hyg_ief_ratio_chg_pct,'HYG/IEF'],
                  ['Volatility', regimeData.components.volatility, regimeData.diagnostics?.vix_level,           'VIX'],
                  ['Momentum',   regimeData.components.momentum,   regimeData.diagnostics?.spy_roc_20d,         'RoC20d'],
                ] as [string, number|null, number|null|undefined, string][]).map(([label, v, raw, rawLabel]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                    <div style={{ width: 56, flexShrink: 0 }}>
                      <div style={{ color: 'var(--fg-muted)' }}>{label}</div>
                      {raw != null && <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{rawLabel} {raw >= 0 ? '+' : ''}{raw.toFixed(1)}</div>}
                    </div>
                    <div className="bar" style={{ flex: 1 }}>
                      <div className="bar__fill" style={{
                        width: `${((v ?? 0) / 20 * 100).toFixed(1)}%`,
                        background: (v ?? 0) === 0 ? 'var(--bear)' : (v ?? 0) < 8 ? 'var(--warn)' : 'var(--em-500)',
                      }} />
                    </div>
                    <span className="mono" style={{ width: 26, textAlign: 'right', fontSize: 11, color: (v ?? 0) === 0 ? 'var(--bear)' : 'inherit' }}>
                      {(v ?? 0).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="subtle">{t(S.loading, locale)}</div>}
        </div>
      </div>

      </div>{/* end mob-order-7 ROW5 LEFT */}

      {/* ════════════════════════════════════════════════════════════════
          ROW 5 RIGHT — 시장 전체 심리 (2fr)
      ════════════════════════════════════════════════════════════════ */}
      <div className="mob-order-7 mob-wrap">
      <div className="card">
        <div className="card__hd">
          <h3>{t(S.mktSentTitle, locale)}</h3>
          {mktSent && (
            <span className={`badge ${SENTIMENT_META[mktSent.sentiment]?.color.replace('text-','').split('-')[0] ?? 'neutral'}`}>
              {t(SENTIMENT_META[mktSent.sentiment]?.label, locale)}
            </span>
          )}
        </div>
        <div className="card__bd">
          {mktSent ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <div className="mono" style={{ fontSize: 35, fontWeight: 700, color: csColor(mktSent.composite_score ?? mktSent.sentiment_score), lineHeight: 1, flexShrink: 0 }}>
                  {(mktSent.composite_score ?? mktSent.sentiment_score) > 0 ? '+' : ''}
                  {mktSent.composite_score ?? mktSent.sentiment_score}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ScoreBar score={mktSent.composite_score ?? mktSent.sentiment_score} />
                  <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 4 }}>
                    {TREND_META[mktSent.trend_vs_yesterday]?.icon} {t(S.mktSentVsPrev, locale)} {mktSent.trend_vs_yesterday}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.65, marginBottom: 8 }}>
                {tField(mktSent.key_reason_en, mktSent.key_reason_ko, mktSent.key_reason, locale)}
              </div>
              <TopNewsBox news={mktSent.top_news} locale={locale} />
            </>
          ) : <div className="subtle">{t(S.mktSentNoData, locale)}</div>}
        </div>
      </div>
      </div>{/* end mob-order-7 ROW5 RIGHT */}

    </div>
    </div>
  );
}
