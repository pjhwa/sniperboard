'use client';

import React, { useState, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { useMorningBriefing, MorningWatchlistItem, MorningSpotlight, GlobalIssue, GlobalContext } from '@/hooks/useMorningBriefing';
import { Card } from '@/components/ui/Card';
import { Sparkle } from '@/components/ui/Icons';
import { tField } from '@/app/i18n';
import type { Locale } from '@/app/i18n';
import { GLOSSARY } from '@/app/glossary';

// ── 정적 문자열 ──────────────────────────────────────────────────────────────
const S: Record<string, { en: string; ko: string }> = {
  loading:      { en: 'Loading morning briefing…',          ko: '아침 브리핑 로딩 중…' },
  noData:       { en: 'Morning briefing not yet available', ko: '아침 브리핑이 아직 생성되지 않았습니다' },
  noDataSub:    { en: 'Generated daily at 07:30 KST',       ko: '매일 오전 07:30 KST에 자동 생성됩니다' },
  headline:     { en: "Today's Market Briefing",            ko: '오늘의 시장 브리핑' },
  moodTitle:    { en: 'Market Mood',                        ko: '시장 분위기' },
  highlights:   { en: "Today's Key Points",                 ko: '오늘의 핵심 요약' },
  checkpoints:  { en: "Watch Points",                       ko: '오늘 주의사항' },
  earnings:     { en: 'Earnings Alert',                     ko: '실적 알림' },
  bigPicture:   { en: 'Big Picture — Macro',                ko: '큰 그림 — 거시환경' },
  sectors:      { en: 'Sector Analysis',                    ko: '섹터 동향' },
  leaderTag:    { en: '▲ Leading',                          ko: '▲ 강세 업종' },
  laggardTag:   { en: '▼ Lagging',                          ko: '▼ 약세 업종' },
  rotationTag:  { en: '↔ Rotation',                         ko: '↔ 자금 이동' },
  spotlight:    { en: 'Spotlight — Worth Watching Today',   ko: '오늘의 주목 종목' },
  watchLevel:   { en: 'Price to Watch',                     ko: '주시 레벨' },
  tier1Sec:     { en: 'TIER 1 — Large Cap Analysis',        ko: 'TIER 1 — 빅테크/대형주 분석' },
  tier2Sec:     { en: 'TIER 2 — Momentum / Theme',          ko: 'TIER 2 — 모멘텀/테마주' },
  analysis:     { en: 'Analysis',                           ko: '분석' },
  sentLabel:    { en: 'Social Mood',                        ko: '소셜 심리' },
  glossaryTitle:{ en: 'Investment Terms Glossary',          ko: '투자 용어 쉽게 이해하기' },
  glossaryHint: { en: 'Key terms used in this briefing explained in plain language',
                  ko: '이 브리핑에 등장하는 용어를 쉽게 풀어서 설명합니다' },
  snsTitle:     { en: 'Share Full Briefing Text',           ko: '전체 브리핑 복사 · 공유' },
  snsCopy:      { en: 'Copy Text',                          ko: '텍스트 복사' },
  snsCopied:    { en: '✓ Copied!',                          ko: '✓ 복사됨!' },
  snsHint:      { en: 'Paste to X, KakaoTalk, Telegram…',  ko: 'X·카카오톡·텔레그램 등에 붙여넣기' },
  vix:          { en: 'VIX · Fear Gauge',                   ko: 'VIX · 공포지수' },
  rates:        { en: '10Y Yield',                          ko: '미국 10년 금리' },
  dollar:       { en: 'Dollar (DXY)',                       ko: '달러 (DXY)' },
  btc:          { en: 'Bitcoin (BTC)',                      ko: '비트코인 (BTC)' },
  globalTitle:      { en: '🌐 Global Macro & Geopolitical Context', ko: '🌐 글로벌 매크로 · 지정학 리스크' },
  breaking:         { en: 'BREAKING',       ko: '속보' },
  ongoing:          { en: 'ONGOING',        ko: '지속 리스크' },
  developing:       { en: 'DEVELOPING',     ko: '진행중' },
  unverified:       { en: 'UNVERIFIED',     ko: '미확인' },
  sourceLabel:      { en: 'Source',         ko: '출처' },
  usImpact:         { en: 'US Stock Impact', ko: '미국 주식 영향' },
  asymmetricImpact: { en: 'Asymmetric Impact', ko: '종목별 비대칭 영향' },
  currentState:     { en: 'Current State',  ko: '현재 상태' },
  marketInsight:    { en: 'Investor Action', ko: '투자자 대응' },
  marketParadox:    { en: '⚠ Market Paradox', ko: '⚠ 시장 역설' },
  noUpdate:         { en: 'No significant update in 48h', ko: '48시간 내 주요 변동 없음' },
  dirEscalating:    { en: 'ESCALATING',     ko: '악화중' },
  dirDeEscalating:  { en: 'DE-ESCALATING',  ko: '완화중' },
  dirStableHigh:    { en: 'STABLE↑RISK',    ko: '안정·고위험' },
  dirStableFading:  { en: 'STABLE↓RISK',    ko: '안정·리스크소멸' },
};
const t = (o: { en: string; ko: string }, l: Locale) => o[l];

// ── 배지 헬퍼 ─────────────────────────────────────────────────────────────────
function actionCls(v: string) {
  return v === 'buy' ? 'bull' : v === 'avoid' ? 'bear' : v === 'hold' ? 'teal' : 'neutral';
}
function actionLabel(v: string, locale: Locale) {
  const M: Record<string, { en: string; ko: string }> = {
    buy:   { en: 'BUY',   ko: '매수 검토' },
    hold:  { en: 'HOLD',  ko: '보유' },
    watch: { en: 'WATCH', ko: '관망' },
    avoid: { en: 'AVOID', ko: '회피' },
  };
  return t(M[v] ?? M.watch, locale);
}
function sentimentCls(mood?: string) {
  if (!mood) return 'neutral';
  if (mood === 'euphoric' || mood === 'optimistic') return 'bull';
  if (mood === 'fearful') return 'bear';
  if (mood === 'cautious') return 'warn';
  return 'neutral';
}
function sentimentLabel(mood: string | undefined, locale: Locale) {
  const M: Record<string, { en: string; ko: string }> = {
    euphoric:   { en: 'Euphoric 🔥',  ko: '도취 🔥' },
    optimistic: { en: 'Optimistic',   ko: '낙관적' },
    cautious:   { en: 'Cautious',     ko: '신중' },
    neutral:    { en: 'Neutral',      ko: '중립' },
    fearful:    { en: 'Fearful',      ko: '공포' },
  };
  return t(M[mood ?? 'neutral'] ?? M.neutral, locale);
}
function trafficColor(l: string) {
  return l === 'green' ? 'var(--bull)' : l === 'red' ? 'var(--bear)' : 'var(--warn)';
}

function categoryColor(cat?: string): string {
  switch (cat) {
    case 'trade_tariff':  return 'var(--warn)';
    case 'geopolitical':  return 'var(--bear)';
    case 'central_bank':  return 'var(--info)';
    case 'ai_regulation': return 'var(--purple)';
    default:              return 'var(--fg-subtle)';
  }
}

function categoryLabel(cat?: string, locale?: Locale): string {
  const M: Record<string, { en: string; ko: string }> = {
    trade_tariff:  { en: 'Trade / Tariff', ko: '무역 · 관세' },
    geopolitical:  { en: 'Geopolitical',   ko: '지정학' },
    central_bank:  { en: 'Central Bank',   ko: '중앙은행' },
    ai_regulation: { en: 'AI / Regulation',ko: 'AI · 규제' },
  };
  const entry = M[cat ?? ''];
  return entry ? t(entry, locale ?? 'en') : (cat ?? '');
}

function impactCls(dir?: string): string {
  if (dir === 'positive') return 'bull';
  if (dir === 'negative') return 'bear';
  if (dir === 'watch')    return 'warn';
  return 'neutral';
}

function confidenceCls(conf?: string): string {
  if (conf === 'developing') return 'warn';
  if (conf === 'unverified') return 'bear';
  return 'neutral';
}

// ── 공유 텍스트 생성 ──────────────────────────────────────────────────────────
function buildShareText(
  d: NonNullable<ReturnType<typeof useMorningBriefing>['briefingData']>,
  locale: Locale,
): string {
  const ko = locale === 'ko';
  const hl  = ko ? d.headline_ko    : d.headline_en;
  const bul = ko ? d.executive_bullets_ko : d.executive_bullets_en;
  const mood = d.market_mood;
  const bp   = d.big_picture;
  const sa   = d.sector_analysis;
  const chk  = ko ? d.today_checkpoints_ko : d.today_checkpoints_en;
  const earn = ko ? d.earnings_alert_ko : d.earnings_alert_en;
  const date = d.generated_at
    ? new Date(d.generated_at).toLocaleDateString(ko ? 'ko-KR' : 'en-US',
        { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const sep = '━━━━━━━━━━━━━━━━━━━━';

  const moodEmoji = mood?.traffic_light === 'green' ? '🟢' : mood?.traffic_light === 'red' ? '🔴' : '🟡';
  const moodLine = mood
    ? `${moodEmoji} ${ko ? mood.label_ko : mood.label_en} (${mood.score ?? ''}pt)\n${ko ? mood.explanation_ko : mood.explanation_en}`
    : '';

  const bpLines = [
    bp?.summary_en ? (ko ? bp.summary_ko : bp.summary_en) : '',
    bp?.vix_note_en ? `· VIX: ${ko ? bp.vix_note_ko : bp.vix_note_en}` : '',
    bp?.rates_note_en ? `· ${ko ? '금리' : 'Rates'}: ${ko ? bp.rates_note_ko : bp.rates_note_en}` : '',
    bp?.dollar_note_en ? `· ${ko ? '달러' : 'Dollar'}: ${ko ? bp.dollar_note_ko : bp.dollar_note_en}` : '',
    (bp as any)?.btc_note_en ? `· ${ko ? '비트코인' : 'BTC'}: ${ko ? (bp as any).btc_note_ko : (bp as any).btc_note_en}` : '',
  ].filter(Boolean).join('\n');

  const gc = d.global_context;
  const gcLines = gc && gc.issues && gc.issues.length > 0
    ? gc.issues.map(iss => {
        const title  = ko ? iss.title_ko  : iss.title_en;
        const impact = ko ? iss.us_stock_impact_ko : iss.us_stock_impact_en;
        const dir = iss.impact_direction === 'positive' ? '▲'
                  : iss.impact_direction === 'negative' ? '▼'
                  : iss.impact_direction === 'watch'    ? '⚠' : '—';
        return `[${dir}] ${title ?? ''}${impact ? `\n  → ${impact}` : ''}`;
      }).join('\n')
    : '';

  const saLines = [
    sa?.leaders_en  ? `▲ ${ko ? sa.leaders_ko  : sa.leaders_en}`  : '',
    sa?.laggards_en ? `▼ ${ko ? sa.laggards_ko : sa.laggards_en}` : '',
    sa?.rotation_signal_en ? `↔ ${ko ? sa.rotation_signal_ko : sa.rotation_signal_en}` : '',
  ].filter(Boolean).join('\n');

  const spotLines = d.spotlight.map(s => {
    const why   = ko ? s.why_ko   : s.why_en;
    const watch = ko ? s.watch_level_ko : s.watch_level_en;
    return `[${s.symbol}] ${s.company}\n${why ?? ''}${watch ? `\n📍 ${watch}` : ''}`;
  }).join('\n\n');

  const tier1 = d.watchlist.filter(w => w.tier === 1);
  const tier2 = d.watchlist.filter(w => w.tier === 2);

  const tier1Lines = tier1.map(w => {
    const analysis = ko ? w.analysis_ko : w.analysis_en;
    const sentLbl = sentimentLabel(w.sentiment_mood, locale);
    return `[${w.symbol}] ${w.company} — ${actionLabel(w.action, locale)} | ${ko ? '소셜심리' : 'Mood'}: ${sentLbl}\n${analysis ?? ''}`;
  }).join('\n\n');

  const tier2Lines = tier2.map(w => {
    const analysis = ko ? w.analysis_ko : w.analysis_en;
    return `[${w.symbol}] ${w.company} — ${actionLabel(w.action, locale)} | ${sentimentLabel(w.sentiment_mood, locale)}\n${analysis ?? ''}`;
  }).join('\n\n');

  return [
    `📰 ${ko ? '시장 브리핑' : 'Market Briefing'} · ${date}`,
    sep,
    hl ?? '',
    '',
    `📊 ${ko ? '시장 분위기' : 'Market Mood'}`,
    moodLine,
    '',
    `🔑 ${ko ? '오늘의 핵심' : "Today's Key Points"}`,
    bul.map(b => `• ${b}`).join('\n'),
    '',
    `🌍 ${ko ? '거시환경' : 'Macro'}`,
    bpLines,
    '',
    gcLines ? `🌐 ${ko ? '글로벌 이슈' : 'Global Issues'}\n${gcLines}` : '',
    '',
    `📈 ${ko ? '섹터 동향' : 'Sectors'}`,
    saLines,
    '',
    `⚡ ${ko ? '주목 종목' : 'Spotlight'}`,
    spotLines,
    '',
    `📋 TIER 1 ${ko ? '감시종목' : 'Watchlist'}`,
    tier1Lines,
    '',
    `📋 TIER 2 ${ko ? '감시종목' : 'Watchlist'}`,
    tier2Lines,
    chk.length ? `\n📌 ${ko ? '오늘 주의사항' : "Today's Watch Points"}\n${chk.map(c => `· ${c}`).join('\n')}` : '',
    earn ? `📅 ${earn}` : '',
    '',
    sep,
    `SniperBoard · Powered by Grok AI`,
    `#${ko ? '미국주식' : 'USStocks'} #SniperBoard`,
  ].filter(s => s !== null && s !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');
}

// ── 서브컴포넌트: 신선도 ──────────────────────────────────────────────────────
function AgeBadge({ minutes }: { minutes: number }) {
  const stale = minutes > 180;
  const label = minutes < 60 ? `${Math.round(minutes)}m ago` : `${Math.round(minutes / 60)}h ago`;
  return (
    <span style={{ fontSize: 11, color: stale ? 'var(--warn)' : 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
      ⏱ {label}
    </span>
  );
}

// ── 서브컴포넌트: 섹션 구분선 ─────────────────────────────────────────────────
function SectionDivider({ label, color = 'var(--fg-muted)' }: { label: string; color?: string }) {
  return (
    <div style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// ── 서브컴포넌트: 스포트라이트 카드 ──────────────────────────────────────────
function SpotlightCard({ item, locale }: { item: MorningSpotlight; locale: Locale }) {
  const why   = tField(item.why_en,   item.why_ko,   '', locale);
  const watch = tField(item.watch_level_en, item.watch_level_ko, '', locale);
  const tierCls = item.tier === 1 ? 'info' : 'purple';
  return (
    <div className="card" style={{ borderTop: `2px solid var(--${tierCls})` }}>
      <div className="card__hd">
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>{item.symbol}</span>
        <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 2 }}>{item.company}</span>
        <span className={`badge ${tierCls}`} style={{ marginLeft: 'auto', fontSize: 10 }}>T{item.tier}</span>
      </div>
      <div className="card__bd" style={{ paddingTop: 4 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7 }}>{why}</p>
        {watch && (
          <div style={{ padding: '6px 10px', borderRadius: 'var(--r-sm)', background: 'var(--warn-soft)', fontSize: 12, fontWeight: 600, color: 'var(--warn)' }}>
            📍 {watch}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 서브컴포넌트: TIER1 카드 ──────────────────────────────────────────────────
function Tier1Card({ item, locale }: { item: MorningWatchlistItem; locale: Locale }) {
  const analysis = tField(item.analysis_en, item.analysis_ko, '', locale);
  return (
    <div className="card">
      {/* 헤더 */}
      <div className="card__hd" style={{ paddingBottom: 6 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{item.symbol}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, lineHeight: 1.2 }}>{item.company}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <span className={`badge ${actionCls(item.action)}`} style={{ fontSize: 11 }}>
            {actionLabel(item.action, locale)}
          </span>
          {item.price && (
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>
              ${item.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* 소셜심리 + stage2 배지 행 */}
      <div style={{ padding: '0 14px 8px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {item.sentiment_mood && (
          <span className={`badge ${sentimentCls(item.sentiment_mood)}`} style={{ fontSize: 10 }}>
            {t(S.sentLabel, locale)} {sentimentLabel(item.sentiment_mood, locale)}
            {item.sentiment_score !== undefined && item.sentiment_score !== null
              ? ` (${item.sentiment_score > 0 ? '+' : ''}${item.sentiment_score})`
              : ''}
          </span>
        )}
        {item.stage2_score !== undefined && (
          <span className="badge neutral" style={{ fontSize: 10 }}>Stage2 {item.stage2_score}/7</span>
        )}
      </div>

      {/* 분석 본문 */}
      <div className="card__bd" style={{ paddingTop: 0 }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: 'var(--fg)' }}>{analysis}</p>
      </div>
    </div>
  );
}

// ── 서브컴포넌트: TIER2 행 (클릭 확장) ───────────────────────────────────────
function Tier2Row({ item, locale }: { item: MorningWatchlistItem; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const analysis = tField(item.analysis_en, item.analysis_ko, '', locale);
  return (
    <div style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, minWidth: 50 }}>{item.symbol}</span>
        <span style={{ fontSize: 11.5, color: 'var(--fg-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.company}
        </span>
        {item.sentiment_mood && (
          <span className={`badge ${sentimentCls(item.sentiment_mood)}`} style={{ fontSize: 10 }}>
            {sentimentLabel(item.sentiment_mood, locale)}
          </span>
        )}
        <span className={`badge ${actionCls(item.action)}`} style={{ fontSize: 10 }}>
          {actionLabel(item.action, locale)}
        </span>
        <span style={{ fontSize: 10, color: 'var(--fg-faint)', marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && analysis && (
        <div style={{ padding: '2px 14px 12px' }}>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: 'var(--fg-muted)' }}>{analysis}</p>
        </div>
      )}
    </div>
  );
}

// ── 서브컴포넌트: 글로벌 컨텍스트 카드 ───────────────────────────────────────
function directionLabel(dir: GlobalIssue['direction'], locale: Locale): string {
  if (dir === 'escalating')    return t(S.dirEscalating,   locale);
  if (dir === 'de-escalating') return t(S.dirDeEscalating, locale);
  if (dir === 'stable_elevated') return t(S.dirStableHigh, locale);
  if (dir === 'stable_fading') return t(S.dirStableFading, locale);
  return '';
}
function directionCls(dir: GlobalIssue['direction']): string {
  if (dir === 'escalating')    return 'bear';
  if (dir === 'de-escalating') return 'bull';
  return 'neutral';
}

function GlobalIssueCard({ issue, locale }: { issue: GlobalIssue; locale: Locale }) {
  const title        = tField(issue.title_en,            issue.title_ko,            '', locale);
  const currentState = tField(issue.current_state_en,    issue.current_state_ko,    '', locale);
  const summary      = tField(issue.summary_en,          issue.summary_ko,          '', locale);
  // prefer new asymmetric_impact; fall back to legacy us_stock_impact
  const impact       = tField(
    issue.asymmetric_impact_en ?? issue.us_stock_impact_en,
    issue.asymmetric_impact_ko ?? issue.us_stock_impact_ko,
    '', locale
  );
  const insight      = tField(issue.market_insight_en,   issue.market_insight_ko,   '', locale);
  const impactLabel  = issue.asymmetric_impact_en ? t(S.asymmetricImpact, locale) : t(S.usImpact, locale);
  const catColor = categoryColor(issue.category);

  return (
    <div className="card" style={{ borderTop: `2px solid ${catColor}` }}>
      <div className="card__hd" style={{ flexWrap: 'wrap', gap: 5 }}>
        <span className="badge neutral" style={{ fontSize: 10, borderColor: catColor, color: catColor }}>
          {categoryLabel(issue.category, locale)}
        </span>
        <span className={`badge ${issue.tier === 'breaking' ? 'bull' : 'neutral'}`} style={{ fontSize: 10 }}>
          {issue.tier === 'breaking' ? t(S.breaking, locale) : t(S.ongoing, locale)}
        </span>
        {issue.direction && (
          <span className={`badge ${directionCls(issue.direction)}`} style={{ fontSize: 10 }}>
            {directionLabel(issue.direction, locale)}
          </span>
        )}
        {issue.confidence && issue.confidence !== 'confirmed' && (
          <span className={`badge ${confidenceCls(issue.confidence)}`} style={{ fontSize: 10 }}>
            {issue.confidence === 'developing' ? t(S.developing, locale) : t(S.unverified, locale)}
          </span>
        )}
        <span className={`badge ${impactCls(issue.impact_direction)}`} style={{ fontSize: 10, marginLeft: 'auto' }}>
          {issue.impact_direction === 'positive' ? '▲'
            : issue.impact_direction === 'negative' ? '▼'
            : issue.impact_direction === 'watch'    ? '⚠' : '—'} {issue.impact_direction}
        </span>
      </div>

      <div className="card__bd" style={{ paddingTop: 6 }}>
        <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{title}</p>
        {currentState && (
          <p style={{ margin: '0 0 6px', fontSize: 12, lineHeight: 1.6, color: 'var(--fg)', fontStyle: 'italic' }}>
            {currentState}
          </p>
        )}
        <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.7, color: 'var(--fg-muted)' }}>{summary}</p>
        {impact && (
          <div style={{ padding: '6px 10px', borderRadius: 'var(--r-sm)', background: 'var(--bg-subtle)', fontSize: 12, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, color: catColor, marginRight: 6 }}>{impactLabel}:</span>
            <span style={{ color: 'var(--fg)' }}>{impact}</span>
          </div>
        )}
        {insight && (
          <div style={{ padding: '5px 10px', borderRadius: 'var(--r-sm)', background: 'var(--bg-em-faint)', fontSize: 12, borderLeft: `3px solid var(--em-500)` }}>
            <span style={{ fontWeight: 700, color: 'var(--em-500)', marginRight: 6 }}>{t(S.marketInsight, locale)}:</span>
            <span style={{ color: 'var(--fg)' }}>{insight}</span>
          </div>
        )}
        {issue.source_hint && (
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
            {t(S.sourceLabel, locale)}: {issue.source_hint}
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalContextSection({ ctx, locale }: { ctx: GlobalContext; locale: Locale }) {
  if (!ctx.issues || ctx.issues.length === 0) return null;
  const paradox = locale === 'ko' ? ctx.market_paradox_ko : ctx.market_paradox_en;

  return (
    <>
      <SectionDivider label={t(S.globalTitle, locale)} color="var(--em-500)" />
      {paradox && (
        <div style={{
          gridColumn: 'span 4',
          padding: '8px 14px',
          borderRadius: 'var(--r-sm)',
          background: 'var(--bg-warn-faint)',
          borderLeft: '3px solid var(--warn-500)',
          fontSize: 12.5,
          lineHeight: 1.6,
          marginBottom: 4,
        }}>
          <span style={{ fontWeight: 700, color: 'var(--warn-500)', marginRight: 8 }}>{t(S.marketParadox, locale)}:</span>
          <span>{paradox}</span>
        </div>
      )}
      <div style={{ gridColumn: 'span 4', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {ctx.issues.map(issue => (
          <GlobalIssueCard key={issue.rank} issue={issue} locale={locale} />
        ))}
      </div>
      {ctx.ongoing_no_update && ctx.ongoing_no_update.length > 0 && (
        <div style={{ gridColumn: 'span 4', fontSize: 11, color: 'var(--fg-faint)', paddingTop: 2 }}>
          {t(S.noUpdate, locale)}: {ctx.ongoing_no_update.join(', ')}
        </div>
      )}
    </>
  );
}

// ── 용어 설명 데이터 (GLOSSARY에서 브리핑 관련 항목 필터) ─────────────────────
const BRIEFING_TERM_KEYS = [
  'risk_regime',
  'distribution_days',
  'volatility',
  'stage2',
  'rs_score',
  'monthly_phase',
  'gc_status',
  'conviction',
  'rr_ratio',
  'breadth',
  'signal_vcp',
];

// 브리핑에서 자주 쓰이는 추가 용어 (GLOSSARY에 없는 것)
const EXTRA_TERMS = [
  {
    key: 'confirmed_uptrend',
    term: { en: 'Confirmed Uptrend', ko: '확인된 상승 추세 (Confirmed Uptrend)' },
    body: {
      en: 'When the monthly chart is above its 10-month moving average AND the average is rising. This means the "big picture" trend is up — short-term signals are more reliable in this state.',
      ko: '월봉(매달 주가 차트)이 10개월 이동평균선 위에 있고, 그 평균선이 올라가고 있는 상태입니다. "큰 그림"에서 상승 흐름이 확인된 것으로, 이 상태의 종목은 단기 매수 신호가 훨씬 더 믿을 만합니다.',
    },
  },
  {
    key: 'social_sentiment',
    term: { en: 'Social Sentiment Score (−2 ~ +2)', ko: '소셜 심리 점수 (−2 ~ +2)' },
    body: {
      en: 'AI-analyzed score of what retail investors are saying on Reddit, X(Twitter), and news. +2 = euphoric (buy caution), −2 = extreme fear (contrarian buy opportunity). It is a supplementary signal — always cross-check with technical analysis.',
      ko: 'Reddit, X(트위터), 뉴스에서 개인 투자자들이 무슨 말을 하는지 AI가 분석한 점수입니다. +2에 가까울수록 과열(주의), −2에 가까울수록 극도 공포(역발상 매수 기회). 단독 지표가 아니라 기술적 분석과 함께 보는 보조 지표입니다.',
    },
  },
  {
    key: 'ema',
    term: { en: 'Moving Average (EMA)', ko: '이동평균선 (EMA · 지수이동평균)' },
    body: {
      en: 'A line that tracks the average price over a set period, giving more weight to recent prices. EMA21 = 21-day average, EMA200 = 200-day (long-term trend indicator). Price above all EMAs = technically strong setup.',
      ko: '최근 주가 평균을 선으로 이은 것으로, 최근 주가에 더 많은 가중치를 둡니다. EMA21 = 21일 평균, EMA200 = 200일 평균(장기 추세 지표). 주가가 모든 이평선 위에 있으면 기술적으로 강한 상태입니다.',
    },
  },
];

// ── 서브컴포넌트: 용어 설명 ───────────────────────────────────────────────────
function GlossarySection({ locale }: { locale: Locale }) {
  const terms = [
    ...GLOSSARY.filter(e => BRIEFING_TERM_KEYS.includes(e.key)),
    ...EXTRA_TERMS,
  ].sort((a, b) => {
    const ai = BRIEFING_TERM_KEYS.indexOf(a.key);
    const bi = BRIEFING_TERM_KEYS.indexOf(b.key);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return 0;
  });

  return (
    <details style={{ gridColumn: 'span 4' }}>
      <summary style={{
        cursor: 'pointer', userSelect: 'none',
        listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 600,
      }}>
        <span style={{ fontSize: 16 }}>📖</span>
        <span>{t(S.glossaryTitle, locale)}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 400 }}>
          {t(S.glossaryHint, locale)}
        </span>
      </summary>

      <div style={{ marginTop: 6, padding: '14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {terms.map(entry => (
            <div
              key={entry.key}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--em-500)',
                borderRadius: 'var(--r-md)',
                padding: '10px 12px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--em-600)' }}>
                {t(entry.term, locale)}
              </div>
              <p style={{
                margin: 0, fontSize: 12.5, lineHeight: 1.7,
                color: 'var(--fg-muted)', whiteSpace: 'pre-line',
              }}>
                {t(entry.body, locale)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

// ── 서브컴포넌트: SNS 공유 ────────────────────────────────────────────────────
function ShareSection({ text, locale, forceOpen = false }: { text: string; locale: Locale; forceOpen?: boolean }) {
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const markCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const copy = () => {
    // 1차: Clipboard API (HTTPS / localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(markCopied).catch(fallback);
      return;
    }
    fallback();
  };

  const fallback = () => {
    // 2차: textarea select + execCommand (HTTP 환경 등 모든 브라우저 지원)
    const ta = taRef.current;
    if (!ta) return;
    ta.removeAttribute('readonly');
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    try {
      document.execCommand('copy');
      markCopied();
    } catch {
      // 3차: 아무것도 안 되면 선택만 해줘서 사용자가 Ctrl+C 할 수 있게
    } finally {
      ta.setAttribute('readonly', '');
      window.getSelection()?.removeAllRanges();
    }
  };

  const inner = (
    <div style={{ padding: '12px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>📤</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{t(S.snsTitle, locale)}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-subtle)' }}>
          {t(S.snsHint, locale)}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={copy}
          className={`badge ${copied ? 'bull' : 'neutral'}`}
          style={{ cursor: 'pointer', border: 'none', padding: '5px 16px', fontSize: 12, fontWeight: 600 }}
        >
          {copied ? t(S.snsCopied, locale) : t(S.snsCopy, locale)}
        </button>
      </div>
      <textarea
        ref={taRef}
        readOnly value={text}
        style={{
          width: '100%', height: 340,
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)', padding: '10px 12px',
          fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7,
          color: 'var(--fg)', resize: 'vertical', outline: 'none',
        }}
      />
    </div>
  );

  if (forceOpen) {
    return <div style={{ width: '100%' }}>{inner}</div>;
  }

  return (
    <details style={{ gridColumn: 'span 4' }}>
      <summary style={{
        cursor: 'pointer', userSelect: 'none',
        listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 600,
      }}>
        <span style={{ fontSize: 16 }}>📤</span>
        <span>{t(S.snsTitle, locale)}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 400 }}>
          {t(S.snsHint, locale)}
        </span>
      </summary>
      <div style={{ marginTop: 6 }}>{inner}</div>
    </details>
  );
}

// ── 메인 보드 ─────────────────────────────────────────────────────────────────
export function MorningBriefingBoard() {
  const { locale } = useStore();
  const { briefingData, briefingMeta, available, isLoading, error } = useMorningBriefing();

  if (isLoading) {
    return (
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr', alignContent: 'start' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ color: 'var(--fg-muted)', margin: 0 }}>{t(S.loading, locale)}</p>
        </div>
      </div>
    );
  }

  if (!available || !briefingData || error) {
    return (
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr', alignContent: 'center', minHeight: 400 }}>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📰</div>
          <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>{t(S.noData, locale)}</p>
          <p style={{ color: 'var(--fg-muted)', fontSize: 13, margin: 0 }}>{t(S.noDataSub, locale)}</p>
          {error && <p style={{ color: 'var(--bear)', fontSize: 12, marginTop: 8 }}>{error}</p>}
        </div>
      </div>
    );
  }

  const d = briefingData;
  const mood  = d.market_mood;
  const bp    = d.big_picture;
  const sa    = d.sector_analysis;
  const tier1 = d.watchlist.filter(w => w.tier === 1);
  const tier2 = d.watchlist.filter(w => w.tier === 2);
  const shareText = buildShareText(d, locale);
  const dateStr = d.generated_at
    ? new Date(d.generated_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
        timeZone: 'Asia/Seoul', month: 'short', day: 'numeric',
      })
    : '';

  return (
    <div className="board fade-in" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', alignContent: 'start' }}>

      {/* ── 모바일 히어로 카드 (데스크톱에서는 mob-show CSS로 숨김) ── */}
      {mood && (
        <div
          className="mob-hero mob-show mob-order-1"
          style={{
            background: mood.traffic_light === 'green'
              ? 'var(--bull-soft)'
              : mood.traffic_light === 'red'
              ? 'var(--bear-soft)'
              : 'var(--warn-soft)',
          }}
        >
          <div className="mob-hero__top">
            <span className={`badge mob-hero__tone ${
              mood.traffic_light === 'green' ? 'bull'
              : mood.traffic_light === 'red' ? 'bear'
              : 'warn'
            }`}>
              {tField(mood.label_en, mood.label_ko, '', locale)}
            </span>
            <span className="mob-hero__date">
              {dateStr}
              {briefingMeta && <AgeBadge minutes={briefingMeta.age_minutes} />}
            </span>
          </div>
          <p className="mob-hero__headline">
            {tField(d.headline_en, d.headline_ko, '', locale)}
          </p>
        </div>
      )}

      {/* ── 헤드라인 — span 4 ── */}
      <div style={{ gridColumn: 'span 4' }} className="mob-hide">
        <div className="ai-card">
          <div className="ai-card__head">
            <div className="ico"><Sparkle /></div>
            <h3>{t(S.headline, locale)}</h3>
            <small>{dateStr}</small>
            {briefingMeta && <AgeBadge minutes={briefingMeta.age_minutes} />}
          </div>
          <div className="ai-card__body">
            {tField(d.headline_en, d.headline_ko, '', locale)}
          </div>
        </div>
      </div>

      {/* ── Row 2: 시장분위기(span 2) + 핵심요약(span 2) ── */}

      {/* 시장 분위기 — span 2 (넓게 줘서 텍스트가 잘리지 않음) */}
      {mood && (
        <div style={{ gridColumn: 'span 2' }} className="mob-hide">
          <Card title={t(S.moodTitle, locale)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: trafficColor(mood.traffic_light),
                boxShadow: `0 0 20px ${trafficColor(mood.traffic_light)}44`,
              }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                  {tField(mood.label_en, mood.label_ko, '', locale)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                  {mood.score ?? '—'} / 100
                </div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.75, color: 'var(--fg)' }}>
              {tField(mood.explanation_en, mood.explanation_ko, '', locale)}
            </p>
          </Card>
        </div>
      )}

      {/* 핵심요약 — span 2 */}
      <div style={{ gridColumn: 'span 2' }} className="mob-order-2">
        <Card title={t(S.highlights, locale)}>
          <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(locale === 'ko' ? d.executive_bullets_ko : d.executive_bullets_en).map((b, i) => (
              <li key={i} style={{ fontSize: 13.5, lineHeight: 1.7 }}>{b}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── Row 3: 큰 그림(span 2) + 섹터(span 1) + 주의사항(span 1) ── */}

      {/* 큰 그림 — span 2 */}
      {bp && (
        <details className="mob-collapse mob-order-7" style={{ gridColumn: 'span 2' }}>
          <summary>{t(S.bigPicture, locale)}</summary>
          <div className="mob-collapse-body">
            <Card title={t(S.bigPicture, locale)}>
              {(bp.summary_en || bp.summary_ko) && (
                <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.7 }}>
                  {tField(bp.summary_en, bp.summary_ko, '', locale)}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {([
                  { key: 'vix',   en: bp.vix_note_en,        ko: bp.vix_note_ko,        color: 'var(--warn)' },
                  { key: 'rates', en: bp.rates_note_en,      ko: bp.rates_note_ko,      color: 'var(--info)' },
                  { key: 'dollar',en: bp.dollar_note_en,     ko: bp.dollar_note_ko,     color: 'var(--teal)' },
                  { key: 'btc',   en: (bp as any).btc_note_en, ko: (bp as any).btc_note_ko, color: 'var(--bull)' },
                ]).filter(r => r.en || r.ko).map(row => (
                  <div key={row.key} style={{ display: 'flex', gap: 10, padding: '7px 10px', borderRadius: 'var(--r-sm)', background: 'var(--bg-subtle)' }}>
                    <div style={{ width: 3, borderRadius: 2, background: row.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: row.color, marginBottom: 2 }}>
                        {t(S[row.key as 'vix' | 'rates' | 'dollar' | 'btc'], locale)}
                      </div>
                      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--fg-muted)' }}>
                        {tField(row.en, row.ko, '', locale)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </details>
      )}

      {/* 섹터 분석 — span 1 */}
      {sa && (
        <div className="mob-order-3">
          <Card title={t(S.sectors, locale)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                { key: 'leaderTag',  en: sa.leaders_en,   ko: sa.leaders_ko,   color: 'var(--bull)' },
                { key: 'laggardTag', en: sa.laggards_en,  ko: sa.laggards_ko,  color: 'var(--bear)' },
                { key: 'rotationTag',en: sa.rotation_signal_en, ko: sa.rotation_signal_ko, color: 'var(--fg-subtle)' },
              ] as const).filter(r => r.en || r.ko).map(row => (
                <div key={row.key}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: row.color, marginBottom: 4 }}>
                    {t(S[row.key as keyof typeof S], locale)}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>
                    {tField(row.en, row.ko, '', locale)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 주의사항 + 실적 — span 1 */}
      <details className="mob-collapse mob-order-5">
        <summary>{t(S.checkpoints, locale)}</summary>
        <div className="mob-collapse-body">
          <Card title={t(S.checkpoints, locale)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(locale === 'ko' ? d.today_checkpoints_ko : d.today_checkpoints_en).map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, padding: '4px 0', borderBottom: i < d.today_checkpoints_en.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <span style={{ color: 'var(--em-500)', fontSize: 14, lineHeight: 1.2, flexShrink: 0 }}>·</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.6 }}>{c}</span>
                </div>
              ))}
            </div>
            {(d.earnings_alert_en || d.earnings_alert_ko) && (
              <div style={{ marginTop: 12, padding: '7px 10px', borderRadius: 'var(--r-sm)', background: 'var(--info-soft)', fontSize: 12, color: 'var(--info)', lineHeight: 1.5 }}>
                📅 {tField(d.earnings_alert_en, d.earnings_alert_ko, '', locale)}
              </div>
            )}
          </Card>
        </div>
      </details>

      {/* ── 글로벌 컨텍스트 ── */}
      {d.global_context && !d.global_context.fallback && (
        <details className="mob-collapse mob-order-6" style={{ gridColumn: 'span 4' }}>
          <summary>🌐 {locale === 'ko' ? '글로벌 매크로 · 리스크' : 'Global Macro & Risk'}</summary>
          <div className="mob-collapse-body">
            <GlobalContextSection ctx={d.global_context} locale={locale} />
          </div>
        </details>
      )}

      {/* ── Spotlight ── */}
      {d.spotlight.length > 0 && (
        <div className="mob-order-4" style={{ gridColumn: 'span 4' }}>
          <SectionDivider label={`⚡ ${t(S.spotlight, locale)}`} color="var(--em-500)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {d.spotlight.map(item => <SpotlightCard key={item.symbol} item={item} locale={locale} />)}
          </div>
        </div>
      )}

      {/* ── TIER 1 상세 분석 ── */}
      <div className="mob-hide" style={{ gridColumn: 'span 4' }}>
        <SectionDivider label={t(S.tier1Sec, locale)} color="var(--info)" />
      </div>
      <details className="mob-collapse mob-order-8" style={{ gridColumn: 'span 4' }}>
        <summary>{t(S.tier1Sec, locale)}</summary>
        <div className="mob-collapse-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {tier1.map(item => <Tier1Card key={item.symbol} item={item} locale={locale} />)}
          </div>
        </div>
      </details>

      {/* ── TIER 2 컴팩트 ── */}
      <div className="mob-hide" style={{ gridColumn: 'span 4' }}>
        <SectionDivider label={t(S.tier2Sec, locale)} color="var(--purple)" />
      </div>
      <details className="mob-collapse mob-order-9" style={{ gridColumn: 'span 4' }}>
        <summary>{t(S.tier2Sec, locale)}</summary>
        <div className="mob-collapse-body">
          <div className="card">
            <div style={{
              display: 'flex', gap: 10, padding: '7px 14px', borderBottom: '1px solid var(--border)',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-subtle)',
            }}>
              <span style={{ minWidth: 50 }}>{locale === 'ko' ? '종목' : 'Symbol'}</span>
              <span style={{ flex: 1 }}>{locale === 'ko' ? '회사' : 'Company'}</span>
              <span style={{ minWidth: 90 }}>{t(S.sentLabel, locale)}</span>
              <span style={{ minWidth: 70 }}>{t(S.analysis, locale)}</span>
              <span style={{ minWidth: 20 }} />
            </div>
            {tier2.map(item => <Tier2Row key={item.symbol} item={item} locale={locale} />)}
          </div>
        </div>
      </details>

      {/* ── 용어 설명 ── */}
      <div className="mob-hide" style={{ gridColumn: 'span 4' }}>
        <GlossarySection locale={locale} />
      </div>

      {/* ── SNS 공유 ── */}
      <div className="mob-order-10" style={{ gridColumn: 'span 4' }}>
        <ShareSection text={shareText} locale={locale} />
      </div>

    </div>
  );
}
