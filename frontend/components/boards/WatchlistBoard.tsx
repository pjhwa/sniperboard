'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useBrief } from '@/hooks/useBrief';
import { Card, ScorePill } from '@/components/ui/Card';
import { ArrowRight } from '@/components/ui/Icons';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
import { G } from '@/app/glossary';
import { t } from '@/app/i18n';
import type { BiLang } from '@/app/i18n';

const S: Record<string, BiLang> = {
  guideTitle:     { en: 'Watchlist Guide', ko: 'Watchlist 가이드' },
  guide1Heading:  { en: 'About this screen', ko: '이 화면은' },
  guide1Body:     { en: 'A screening screen showing watchlist symbols sorted descending by Stage2 score. You can quickly find the best-setup symbols.', ko: '워치리스트 종목들의 Stage2 점수를 내림차순으로 보여주는 스크리닝 화면입니다. 가장 좋은 셋업의 종목을 빠르게 찾을 수 있습니다.' },
  guide2Heading:  { en: 'How to read key indicators', ko: '핵심 지표 읽는 법' },
  guide2Body:     { en: 'Higher Stage2 score means better technical conditions. Conviction score combines technical (Stage2) + social sentiment + market Regime. The check dot pattern lets you see at a glance which conditions are failing.', ko: 'Stage2 점수가 높을수록 기술적 조건이 좋은 종목입니다. Conviction 점수는 기술적(Stage2) + 소셜 심리 + 시장 Regime을 종합합니다. Checks 점 패턴으로 어떤 조건이 미달인지 한눈에 파악할 수 있습니다.' },
  guide3Heading:  { en: 'How to use now', ko: '지금 이렇게 쓰세요' },
  guide3Body:     { en: 'Check symbols with Stage2 ≥ 5 → Additional check Conviction ≥ 60 → Set alert near Entry price → Make entry decision after detailed analysis in DeepDive.', ko: 'Stage2 ≥ 5인 종목 확인 → Conviction ≥ 60 추가 확인 → Entry 가격 근처에서 알람 설정 → DeepDive에서 세부 분석 후 진입 결정.' },
  loading:        { en: 'Loading...', ko: '로딩 중...' },
  tableTitle:     { en: 'Watchlist · Stage 2 Sorted', ko: 'Watchlist · Stage 2 정렬' },
  tableAction:    { en: '{n} symbols · Score descending', ko: '{n} 종목 · 점수 내림차순' },
  col52wHigh:     { en: '52w High', ko: '52w 고점' },
  colChecks:      { en: 'Checks', ko: 'Checks' },
  colMonthly:     { en: 'Monthly', ko: '월봉' },
  analyzeBtn:     { en: 'Analyze', ko: '분석' },
  // monthly phase short labels
  mpUptrend:      { en: '↑OK', ko: '↑확인' },
  mpWeakening:    { en: '↓Weak', ko: '↓약화' },
  mpNeutral:      { en: 'Neutral', ko: '중립' },
  mpDowntrend:    { en: '↓Down', ko: '↓하락' },
  mpUnknown:      { en: '—', ko: '—' },
  // RS score card
  rsTitle:        { en: 'RS Score', ko: 'RS Score' },
  rsAction:       { en: 'Relative Strength vs SPY', ko: 'SPY 대비 상대강도' },
  rsStrong:       { en: '≥70 Strong', ko: '≥70 강세' },
  rsMid:          { en: '50-70 Normal', ko: '50~70 보통' },
  rsWeak:         { en: '<50 Weak', ko: '<50 약세' },
  // Stage 2 heatmap card
  heatTitle:      { en: 'Stage 2 Check Heatmap', ko: 'Stage 2 체크 히트맵' },
  heatAction:     { en: '7 conditions', ko: '7개 조건' },
  heatSymCol:     { en: 'Symbol', ko: '심볼' },
  heatTotalCol:   { en: 'Total', ko: '합계' },
  // R:R card
  rrTitle:        { en: 'Risk / Reward', ko: 'Risk / Reward' },
  rrAction:       { en: 'Entry-based Comparison', ko: 'Entry 기준 비교' },
};

const STRUCT_COLOR: Record<string, string> = {
  UPTREND: 'bull', DOWNTREND: 'bear', DISTRIBUTION: 'warn', ACCUMULATION: 'info', NEUTRAL: 'neutral',
};

const CHECK_LABELS: [keyof ReturnType<typeof useWatchlist>['watchlist'][number]['checks'], string][] = [
  ['price_above_emas', 'EMA'],
  ['ema200_rising',    '200↑'],
  ['near_52w_high',   '52H'],
  ['above_52w_low',   '52L'],
  ['pullback_shallow','Pull'],
  ['rs_strong',       'RS'],
  ['volume_contracting','Vol'],
];

export function WatchlistBoard() {
  const { symbol, setSymbol, setBoard, locale } = useStore();
  const { watchlist, isLoading } = useWatchlist();
  const { briefData } = useBrief();
  const briefMap = new Map(
    (briefData?.symbol_briefs ?? []).map(sb => [sb.symbol, sb])
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const [openTier, setOpenTier] = useState<1 | 2>(1);

  useEffect(() => {
    const handler = () => setGuideOpen(true);
    document.addEventListener('guide:open', handler);
    return () => document.removeEventListener('guide:open', handler);
  }, []);

  // Max deviation for R:R comparison
  const maxRisk   = Math.max(...watchlist.map(w => w.entry - w.stop), 0.01);
  const maxReward = Math.max(...watchlist.map(w => w.target - w.entry), 0.01);
  const maxRange  = Math.max(maxRisk, maxReward);

  const WATCHLIST_GUIDE = (): GuideSection[] => [
    { heading: t(S.guide1Heading, locale), body: t(S.guide1Body, locale) },
    { heading: t(S.guide2Heading, locale), body: t(S.guide2Body, locale) },
    { heading: t(S.guide3Heading, locale), body: t(S.guide3Body, locale) },
  ];

  // Monthly phase short label lookup
  const MP_SHORT: Record<string, BiLang> = {
    CONFIRMED_UPTREND: S.mpUptrend,
    WEAKENING:         S.mpWeakening,
    NEUTRAL:           S.mpNeutral,
    DOWNTREND:         S.mpDowntrend,
    UNKNOWN:           S.mpUnknown,
  };
  const MP_COLOR: Record<string, string> = {
    CONFIRMED_UPTREND: 'var(--bull)',
    WEAKENING:         'var(--warn)',
    NEUTRAL:           'var(--fg-muted)',
    DOWNTREND:         'var(--bear)',
    UNKNOWN:           'var(--fg-subtle)',
  };

  void STRUCT_COLOR; // suppress unused warning

  return (
    <div className="board-wrap">
      <BoardGuidePanel title={t(S.guideTitle, locale)} sections={WATCHLIST_GUIDE()} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    <div className="board fade-in" style={{ gridTemplateColumns: '1fr 1fr 1fr', alignContent: 'start' }}>

      {/* ── 모바일 전용: 2줄 카드 뷰 ────────────────────────────── */}
      <Card title={t(S.tableTitle, locale)} action={t(S.tableAction, locale).replace('{n}', String(watchlist.length))} flush className="mob-show" style={{ gridColumn: 'span 3' }}>
        <div className="mob-watchlist-cards">
          {[...watchlist]
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .map(w => {
              const sb = briefMap.get(w.symbol);
              const entryDist = w.entry > 0 ? (w.entry - w.price) / w.price * 100 : null;
              const inZone = entryDist !== null && entryDist > 0 && entryDist <= 5;
              const broken = entryDist !== null && entryDist <= 0;
              const conviction = w.conviction_score ?? 0;
              const convColor = conviction >= 65 ? 'var(--bull)' : conviction >= 50 ? 'var(--teal)' : conviction >= 35 ? 'var(--warn)' : 'var(--bear)';
              const actionCls = sb?.action_bias === 'buy' ? 'bull' : sb?.action_bias === 'avoid' ? 'bear' : sb?.action_bias === 'hold' ? 'teal' : 'neutral';
              const actionLabel = sb?.action_bias === 'buy' ? (locale === 'ko' ? '매수' : 'BUY')
                : sb?.action_bias === 'avoid' ? (locale === 'ko' ? '회피' : 'AVOID')
                : sb?.action_bias === 'hold' ? (locale === 'ko' ? '보유' : 'HOLD')
                : (locale === 'ko' ? '관망' : 'WATCH');
              const gradeColor = sb?.setup_quality === 'A+' || sb?.setup_quality === 'A' ? 'var(--bull)'
                : sb?.setup_quality === 'B' ? 'var(--teal)'
                : sb?.setup_quality === 'C' ? 'var(--warn)' : 'var(--fg-subtle)';

              return (
                <div
                  key={w.symbol}
                  className="mob-watchlist-card"
                  style={{
                    background: broken ? 'var(--bull-soft)' : inZone ? 'var(--em-soft)' : 'transparent',
                  }}
                >
                  {/* 1행: 심볼 + 가격 + Action Bias + Setup Quality */}
                  <div className="mob-watchlist-card__row1">
                    <span className="mob-watchlist-card__sym">{w.symbol}</span>
                    <span className="mob-watchlist-card__price">${w.price.toFixed(2)}</span>
                    {sb && (
                      <span className={`badge ${actionCls}`} style={{ fontSize: 13 }}>
                        {actionLabel}
                      </span>
                    )}
                    {sb?.setup_quality && (
                      <span style={{ fontWeight: 700, fontSize: 14, color: gradeColor }}>
                        {sb.setup_quality}
                      </span>
                    )}
                  </div>
                  {/* 2행: 진입 거리 + Conviction 바 + 점수 */}
                  <div className="mob-watchlist-card__row2">
                    <span
                      className="mob-watchlist-card__dist"
                      style={{
                        color: broken ? 'var(--bull)' : inZone ? 'var(--em-500)' : entryDist && entryDist > 15 ? 'var(--fg-subtle)' : 'var(--fg)',
                      }}
                    >
                      {broken
                        ? (locale === 'ko' ? '✓ 돌파' : '✓ Break')
                        : entryDist !== null
                        ? `+${entryDist.toFixed(1)}%`
                        : '—'}
                    </span>
                    <div className="mob-watchlist-card__bar">
                      <div
                        className="mob-watchlist-card__bar-fill"
                        style={{ width: `${conviction}%`, background: convColor }}
                      />
                    </div>
                    <ConvictionBadge score={w.conviction_score ?? undefined} locale={locale} size="sm" />
                  </div>
                </div>
              );
            })}
        </div>
      </Card>

      {/* Desktop-only content ── */}
      <div className="mob-hide mob-wrap">

      {/* Main table — full 3 columns */}
      <div style={{ gridColumn: 'span 3' }}>
        <Card title={t(S.tableTitle, locale)} action={t(S.tableAction, locale).replace('{n}', String(watchlist.length))}>
          {isLoading ? (
            <div className="subtle">{t(S.loading, locale)}</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>Stage2 <InfoPopover term={t(G.stage2.term, locale)} body={t(G.stage2.body, locale)} /></span></th>
                  <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>RS <InfoPopover term={t(G.rs_score.term, locale)} body={t(G.rs_score.body, locale)} /></span></th>
                  <th>{t(S.col52wHigh, locale)}</th>
                  <th>Entry</th>
                  <th>Stop</th>
                  <th>Target</th>
                  <th>{t(S.colChecks, locale)}</th>
                  <th>{t(S.colMonthly, locale)}</th>
                  <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>Conviction <InfoPopover term={t(G.conviction.term, locale)} body={t(G.conviction.body, locale)} /></span></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const tier1 = watchlist.filter(w => (w.tier ?? 1) === 1);
                  const tier2 = watchlist.filter(w => (w.tier ?? 1) === 2);

                  const renderRow = (w: typeof watchlist[number]) => (
                    <tr
                      key={w.symbol}
                      className={w.symbol === symbol ? 'selected' : ''}
                      onClick={() => { setSymbol(w.symbol); setBoard('deepdive'); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="sym-pill__badge" style={{ width: 22, height: 22, fontSize: 11 }}>{w.symbol[0]}</span>
                          <span style={{ fontWeight: 600 }}>{w.symbol}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 3px', borderRadius: 2,
                            background: (w.tier ?? 1) === 1 ? 'rgba(56,189,248,0.15)' : 'rgba(167,139,250,0.15)',
                            color: (w.tier ?? 1) === 1 ? 'var(--sky, #38bdf8)' : 'var(--purple, #a78bfa)',
                          }}>T{w.tier ?? 1}</span>
                        </div>
                      </td>
                      <td className="num">${w.price.toFixed(2)}</td>
                      <td><ScorePill score={w.score} /></td>
                      <td className="num" style={{ color: w.rs_score >= 70 ? 'var(--bull)' : w.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)' }}>
                        {w.rs_score}
                      </td>
                      <td className="num">{w.pct_from_52w_high.toFixed(1)}%</td>
                      <td className="num" style={{ color: 'var(--info)' }}>${w.entry.toFixed(2)}</td>
                      <td className="num" style={{ color: 'var(--bear)' }}>${w.stop.toFixed(2)}</td>
                      <td className="num" style={{ color: 'var(--bull)' }}>${w.target.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {Object.values(w.checks).map((c, i) => (
                            <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: c ? 'var(--bull)' : 'var(--border)' }} />
                          ))}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const mp = w.monthly_phase ?? 'UNKNOWN';
                          const label = MP_SHORT[mp] ?? MP_SHORT.UNKNOWN;
                          const color = MP_COLOR[mp] ?? MP_COLOR.UNKNOWN;
                          return <span style={{ fontSize: 12, fontWeight: 600, color }}>{t(label, locale)}</span>;
                        })()}
                      </td>
                      <td>
                        <ConvictionBadge score={w.conviction_score ?? undefined} locale={locale} size="sm" />
                      </td>
                      <td>
                        <button
                          className="btn btn--ghost"
                          style={{ height: 24, padding: '0 8px', fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); setSymbol(w.symbol); setBoard('deepdive'); }}
                        >
                          {t(S.analyzeBtn, locale)} <ArrowRight />
                        </button>
                      </td>
                    </tr>
                  );

                  const tierLabel = (tier: 1 | 2, label: string, color: string) => (
                    <tr
                      key={`tier-${tier}`}
                      onClick={() => setOpenTier(tier)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td colSpan={12} style={{ padding: '6px 8px 2px', fontSize: 11, fontWeight: 700, color, letterSpacing: '0.5px', borderTop: '1px solid var(--border-soft)', background: 'rgba(0,0,0,0.03)', userSelect: 'none' }}>
                        <span style={{ marginRight: 5, fontSize: 9 }}>{openTier === tier ? '▼' : '▶'}</span>
                        {label}
                      </td>
                    </tr>
                  );

                  return [
                    tierLabel(
                      1,
                      locale === 'ko' ? 'TIER 1 — 빅테크/대형주 (개별 심층 분석, 백테스트 포함)' : 'TIER 1 — Large Cap (Deep Analysis, Backtested)',
                      'var(--sky, #38bdf8)',
                    ),
                    ...(openTier === 1 ? tier1.map(renderRow) : []),
                    ...(tier2.length > 0 ? [
                      tierLabel(
                        2,
                        locale === 'ko' ? 'TIER 2 — 모멘텀/테마주 (배치 분석, 백테스트 제외)' : 'TIER 2 — Momentum/Theme (Batch Analysis, Not Backtested)',
                        'var(--purple, #a78bfa)',
                      ),
                      ...(openTier === 2 ? tier2.map(renderRow) : []),
                    ] : []),
                  ].filter(Boolean);
                })()}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* RS Score ranking bar */}
      <Card title={t(S.rsTitle, locale)} action={t(S.rsAction, locale)}>
        {watchlist.length === 0 ? <div className="subtle">{t(S.loading, locale)}</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[...watchlist].sort((a, b) => b.rs_score - a.rs_score).map(w => {
              const color = w.rs_score >= 70 ? 'var(--bull)' : w.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)';
              return (
                <div key={w.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ width: 44, fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 12, flexShrink: 0 }}>{w.symbol}</span>
                  <div className="bar" style={{ flex: 1 }}>
                    <div className="bar__fill" style={{ width: `${w.rs_score}%`, background: color }} />
                  </div>
                  <span className="mono" style={{ width: 36, textAlign: 'right', fontSize: 12, color }}>{w.rs_score.toFixed(1)}</span>
                </div>
              );
            })}
            <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 6 }}>
              <span style={{ color: 'var(--bull)' }}>●</span> {t(S.rsStrong, locale)} &nbsp;
              <span style={{ color: 'var(--teal)' }}>●</span> {t(S.rsMid, locale)} &nbsp;
              <span style={{ color: 'var(--bear)' }}>●</span> {t(S.rsWeak, locale)}
            </div>
          </div>
        )}
      </Card>

      {/* Stage 2 check heatmap */}
      <Card title={t(S.heatTitle, locale)} action={t(S.heatAction, locale)}>
        {watchlist.length === 0 ? <div className="subtle">{t(S.loading, locale)}</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: 6, color: 'var(--fg-subtle)', fontWeight: 500, fontSize: 11 }}>{t(S.heatSymCol, locale)}</th>
                  {CHECK_LABELS.map(([, label]) => (
                    <th key={label} style={{ textAlign: 'center', paddingBottom: 6, color: 'var(--fg-subtle)', fontWeight: 500, fontSize: 11, width: 32 }}>{label}</th>
                  ))}
                  <th style={{ textAlign: 'right', paddingBottom: 6, color: 'var(--fg-subtle)', fontWeight: 500, fontSize: 11 }}>{t(S.heatTotalCol, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map(w => (
                  <tr key={w.symbol}>
                    <td style={{ padding: '4px 0', fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 12 }}>{w.symbol}</td>
                    {CHECK_LABELS.map(([key]) => {
                      const ok = w.checks[key];
                      return (
                        <td key={key} style={{ textAlign: 'center', padding: '4px 0' }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 4, margin: '0 auto',
                            background: ok ? 'var(--bull)' : 'var(--bg-subtle)',
                            border: `1px solid ${ok ? 'var(--bull)' : 'var(--border)'}`,
                            opacity: ok ? 0.85 : 0.5,
                          }} />
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>
                      <ScorePill score={w.score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* R:R comparison bar */}
      <Card title={t(S.rrTitle, locale)} action={t(S.rrAction, locale)}>
        {watchlist.length === 0 ? <div className="subtle">{t(S.loading, locale)}</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {watchlist.map(w => {
              const risk   = w.entry - w.stop;
              const reward = w.target - w.entry;
              const riskW   = Math.round((risk   / maxRange) * 100);
              const rewardW = Math.round((reward / maxRange) * 100);
              const ratio = risk > 0 ? (reward / risk).toFixed(1) : '—';
              return (
                <div key={w.symbol} style={{ padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{w.symbol}</span>
                    <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>R:R 1 : {ratio}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {/* Risk bar (right→left, red) */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ width: `${riskW}%`, height: 7, borderRadius: '3px 0 0 3px', background: 'var(--bear)', opacity: 0.75 }} />
                    </div>
                    {/* Entry center */}
                    <div style={{ width: 2, height: 14, background: 'var(--fg-muted)', borderRadius: 1, flexShrink: 0 }} />
                    {/* Reward bar (left→right, green) */}
                    <div style={{ flex: 1 }}>
                      <div style={{ width: `${rewardW}%`, height: 7, borderRadius: '0 3px 3px 0', background: 'var(--bull)', opacity: 0.75 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 2 }}>
                    <span style={{ color: 'var(--bear)' }}>-${risk.toFixed(2)}</span>
                    <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>${w.entry.toFixed(2)}</span>
                    <span style={{ color: 'var(--bull)' }}>+${reward.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      </div>{/* end mob-hide */}

    </div>
    </div>
  );
}
