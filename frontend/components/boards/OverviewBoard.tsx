'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useRegime } from '@/hooks/useRegime';
import { useDistributionDays } from '@/hooks/useDistributionDays';
import { useMacro } from '@/hooks/useMacro';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Card, ScorePill } from '@/components/ui/Card';
import { RadialGauge } from '@/components/ui/RadialGauge';
import { Sparkle } from '@/components/ui/Icons';
import { MacroItem, RegimeDiagnostics, UpcomingEarning, EARNINGS_RISK_META, FreshnessMeta, SYMBOLS, SymbolBrief } from '@/app/types';
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
import { useBrief } from '@/hooks/useBrief';
import { useEarnings } from '@/hooks/useEarnings';

const REGIME_LABELS: Record<string, [string, string]> = {
  RISK_ON:      ['Risk-On',      '강세'],
  CONSTRUCTIVE: ['Constructive', '우호적'],
  MIXED:        ['Mixed',        '혼조'],
  DEFENSIVE:    ['Defensive',    '방어적'],
  RISK_OFF:     ['Risk-Off',     '약세'],
  UNKNOWN:      ['Unknown',      '불명'],
};

const OVERVIEW_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '시장 전체 환경을 한눈에 파악하는 대시보드입니다. 개별 종목 진입 전 "지금 시장이 매수에 적합한가?"를 먼저 확인하는 화면입니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: 'Risk Regime 점수가 전체 건강도를 요약합니다. Trend(SPY EMA200 위치)와 Breadth(RSP vs SPY)가 시장 구조를, Credit(HYG/IEF)과 Volatility(VIX)가 리스크 선호도를 나타냅니다. Distribution Days는 기관 매도 압력의 누적치로, 6일 이상이면 신규 진입을 자제해야 합니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'Risk Regime ≥ 60 확인 → VIX 20 이하 확인 → Distribution Days 5 이하 확인 → Breadth에서 RSP ≥ SPY 확인. 4가지 통과하면 종목 진입 검토. 하나라도 불합격이면 포지션 크기를 줄이세요.',
  },
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
        fontSize: '10px',
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
  const { symbol } = useStore();
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

  const { briefData, briefMeta } = useBrief();
  const { earningsData, earningsMeta } = useEarnings();

  const [guideOpen, setGuideOpen] = useState(false);

  // 백워데이션: VIX9D(9일) > VIX(30일) — 단기 변동성이 장기보다 높아 역전된 상태
  const backward = vix && vix9d ? vix.price !== null && vix9d.price !== null && (vix9d.price ?? 0) > (vix.price ?? 0) : false;

  return (
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: 'auto auto auto auto', alignContent: 'start', position: 'relative' }}
    >
      <button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
      {/* AI Insight — span 2 */}
      <div style={{ gridColumn: 'span 2' }}>
        <div className="ai-card">
          <div className="ai-card__head">
            <div className="ico"><Sparkle /></div>
            <h3>오늘의 한마디 — Market Snapshot</h3>
            <small>{new Date().toLocaleDateString('ko-KR')}</small>
            <FreshnessBadge meta={briefMeta} />
          </div>
          <div className="ai-card__body">
            {briefData?.market_brief ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className={`badge ${
                    briefData.market_brief.tone === 'bullish' ? 'bull' :
                    briefData.market_brief.tone === 'bearish' ? 'bear' :
                    briefData.market_brief.tone === 'cautious' ? 'warn' : 'neutral'
                  }`}>{
                    briefData.market_brief.tone === 'bullish' ? '강세' :
                    briefData.market_brief.tone === 'bearish' ? '약세' :
                    briefData.market_brief.tone === 'cautious' ? '주의' : '중립'
                  }</span>
                  <span style={{ fontSize: 13 }}>{briefData.market_brief.summary}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {briefData.market_brief.key_themes.map((theme, i) => (
                    <span key={i} className="badge neutral" style={{ fontSize: 10.5 }}>{theme}</span>
                  ))}
                </div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 11.5 }}>
                  주시: {briefData.market_brief.watch_points}
                </div>
                <div style={{ color: 'var(--fg-subtle)', fontSize: 10, marginTop: 4 }}>
                  AI 의견 — 매매 신호 아님 · {briefData.slot === 'pre_open' ? '장 전' : '장 후'} 기준
                </div>
              </>
            ) : regimeData ? (
              <>
                <div style={{ marginBottom: 6 }}>
                  현재 Risk Regime은{' '}
                  <strong>{REGIME_LABELS[regimeData.regime]?.[0] ?? regimeData.regime}</strong>
                  {' '}({regimeData.total ?? '—'}점) —{' '}
                  {regimeData.regime === 'RISK_ON' && '추세 추종 전략이 유효한 강세 환경입니다.'}
                  {regimeData.regime === 'CONSTRUCTIVE' && '선별적 진입이 가능한 우호적 환경입니다.'}
                  {regimeData.regime === 'MIXED' && '신호가 혼재합니다. 포지션 사이즈를 축소하세요.'}
                  {regimeData.regime === 'DEFENSIVE' && '약세 신호 우세. 현금 비중을 늘리세요.'}
                  {regimeData.regime === 'RISK_OFF' && '리스크 오프 국면. 신규 매수를 자제하세요.'}
                  {regimeData.regime === 'UNKNOWN' && '데이터 부족으로 판단이 어렵습니다.'}
                </div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                  Trend {(regimeData.components.trend ?? 0).toFixed(1)} ·
                  Breadth {(regimeData.components.breadth ?? 0).toFixed(1)} ·
                  Credit {(regimeData.components.credit ?? 0).toFixed(1)} ·
                  Volatility {(regimeData.components.volatility ?? 0).toFixed(1)} ·
                  Momentum {(regimeData.components.momentum ?? 0).toFixed(1)}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)' }}>AI Brief 로딩 중...</div>
            )}

            {/* Symbol Briefs — Action Bias 신호강도 미터 */}
            {briefData && (
              <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 10, paddingTop: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  종목별 AI 분석
                </div>
                {(() => {
                  const BIAS_LEVELS = ['avoid', 'watch', 'hold', 'buy'] as const;
                  const BIAS_COLORS = ['var(--bear)', 'var(--warn)', 'var(--teal)', 'var(--bull)'];
                  const BIAS_LABELS: Record<string, string> = { buy: '매수', hold: '보유', watch: '관망', avoid: '회피' };

                  const briefMap = new Map((briefData.symbol_briefs ?? []).map(sb => [sb.symbol, sb]));
                  const items: (SymbolBrief | { symbol: string; pending: true })[] = SYMBOLS.map(sym =>
                    briefMap.get(sym) ?? { symbol: sym, pending: true as const }
                  );

                  const renderItem = (item: typeof items[number]) => {
                    if ('pending' in item) {
                      return (
                        <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                          <span style={{ fontWeight: 700, width: 42, fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0 }}>{item.symbol}</span>
                          <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>분석 준비 중</span>
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
                        <span style={{ fontWeight: 700, width: 42, fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0 }}>{sb.symbol}</span>
                        <span style={{ fontWeight: 700, fontSize: 11, color: gradeColor, width: 18, flexShrink: 0 }}>{sb.setup_quality}</span>
                        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          {BIAS_LEVELS.map((_, i) => (
                            <div key={i} style={{
                              width: 12, height: 7, borderRadius: 2,
                              background: i <= biasIdx ? BIAS_COLORS[i] : 'var(--bg-subtle)',
                              opacity: i <= biasIdx ? 0.85 : 0.35,
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 10, color: biasColor, fontWeight: 600, flexShrink: 0 }}>
                          {BIAS_LABELS[sb.action_bias]}
                        </span>
                      </div>
                    );
                  };

                  const mid = Math.ceil(items.length / 2);
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                      <div>{items.slice(0, mid).map(renderItem)}</div>
                      <div>{items.slice(mid).map(renderItem)}</div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Earnings Calendar */}
      <Card title="Earnings Calendar" action="30일 이내">
        {earningsData?.upcoming_earnings && earningsData.upcoming_earnings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {earningsData.upcoming_earnings.map((e: UpcomingEarning) => {
              const rm = EARNINGS_RISK_META[e.risk_level] ?? EARNINGS_RISK_META.med;
              const tierLabel = e.relevance_tier === 'imminent' ? '임박' : e.relevance_tier === 'approaching' ? '진입권' : '관망';
              const tierColor = e.relevance_tier === 'imminent' ? 'var(--bear)' : e.relevance_tier === 'approaching' ? 'var(--warn)' : 'var(--fg-subtle)';
              return (
                <div key={e.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, width: 40, fontFamily: 'var(--mono)' }}>{e.symbol}</span>
                  <span style={{ color: 'var(--fg-muted)', flex: 1 }}>
                    {e.earnings_date.slice(5)} · {e.days_until}일 후
                  </span>
                  {e.eps_estimate == null && (
                    <span style={{ fontSize: 9.5, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>추정치 미형성</span>
                  )}
                  <span style={{ fontSize: 9.5, color: tierColor, fontWeight: 600 }}>{tierLabel}</span>
                  <span className={`badge ${rm.color}`} style={{ fontSize: 10 }}>
                    {rm.dot} {e.risk_level.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
            {earningsData === null ? 'Earnings 로딩 중...' : '30일 이내 어닝 없음'}
          </div>
        )}
        {earningsMeta && (
          <div style={{ marginTop: 6, paddingTop: 4, borderTop: '1px solid var(--border-soft)' }}>
            <FreshnessBadge meta={earningsMeta} />
          </div>
        )}
      </Card>

      {/* Regime gauge */}
      <Card title="Risk Regime" action="5요소 종합" info={G.risk_regime}>
        {regimeData ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RadialGauge value={regimeData.total ?? 0} size={100} label={regimeData.total ?? '—'} sublabel="/ 100" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              <span className={'badge ' + (regimeData.regime === 'CONSTRUCTIVE' ? 'teal' : 'em')} style={{ alignSelf: 'flex-start' }}>
                {REGIME_LABELS[regimeData.regime]?.[0]} · {REGIME_LABELS[regimeData.regime]?.[1]}
              </span>
              {([
                ['Trend',      regimeData.components.trend,      regimeData.diagnostics?.spy_vs_ema200_pct,    'SPY/EMA200',  '%'],
                ['Breadth',    regimeData.components.breadth,    regimeData.diagnostics?.rsp_minus_spy_60d,   'RSP-SPY 60d', '%'],
                ['Credit',     regimeData.components.credit,     regimeData.diagnostics?.hyg_ief_ratio_chg_pct,'HYG/IEF 30d','%'],
                ['Volatility', regimeData.components.volatility, regimeData.diagnostics?.vix_level,           'VIX',         ''],
                ['Momentum',   regimeData.components.momentum,   regimeData.diagnostics?.spy_roc_20d,         'SPY RoC 20d', '%'],
              ] as [string, number | null, number | null | undefined, string, string][]).map(([label, v, raw, rawLabel, unit]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5 }}>
                  <div style={{ width: 64 }}>
                    <div style={{ color: 'var(--fg-subtle)' }}>{label}</div>
                    {raw !== null && raw !== undefined && (
                      <div style={{ fontSize: 9, color: (v ?? 0) === 0 ? 'var(--bear)' : 'var(--fg-subtle)', letterSpacing: '0.01em' }}>
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
          <div className="subtle">로딩 중...</div>
        )}
      </Card>

      {/* Distribution Days */}
      <Card title="Distribution Days" action="O'Neil · 25거래일" info={G.distribution_days}>
        {ddData ? (
          <>
            {(['spy', 'qqq'] as const).map(key => {
              const d = ddData[key];
              const cls = d.level === 'OK' ? 'bull' : d.level === 'WARNING' ? 'warn' : 'bear';
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{key.toUpperCase()}</span>
                    <span className={'badge ' + cls}>{d.count}일</span>
                    <small style={{ marginLeft: 'auto', color: 'var(--fg-subtle)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.level}</small>
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
            <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', lineHeight: 1.5 }}>
              OK &lt;4 · WARNING 4~5 · DANGER 6+
            </div>
          </>
        ) : (
          <div className="subtle">로딩 중...</div>
        )}
      </Card>

      {/* Market Breadth */}
      <Card title="Market Breadth" action="SPY vs RSP" info={G.market_breadth_spy_rsp}>
        {([
          ['SPY',  spy,  '시가총액'],
          ['RSP',  rsp,  '동일가중'],
          ['MAGS', mags, 'Mag 7'],
          ['IWM',  iwm,  'Small Cap'],
        ] as [string, MacroItem | undefined, string][]).map(([label, m, sub]) => {
          if (!m) return null;
          const up = (m.change_pct_5d ?? 0) >= 0;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 11.5 }}>
              <div style={{ width: 56 }}>
                <div style={{ fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{sub}</div>
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
          <div style={{ fontSize: 10.5, color: 'var(--warn)', marginTop: 8, padding: '4px 8px', background: 'var(--warn-soft)', borderRadius: 6 }}>
            ⚠ RSP &lt; SPY — Mag7 주도형 협소 랠리
          </div>
        )}
      </Card>

      {/* VIX Panel */}
      <Card title="Volatility · VIX" action={backward ? '⚠ 백워데이션' : '정상'} info={G.volatility}>
        {vix ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 8 }}>
              {([
                ['^VIX', vix, 'VIX'],
                ['^VIX9D', vix9d, '9일'],
              ] as [string, MacroItem | undefined, string][]).map(([, m, l]) => (
                m ? (
                  <div key={l}>
                    <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{(m.price ?? 0).toFixed(2)}</div>
                    <div className={'mono ' + ((m.change_pct_1d ?? 0) >= 0 ? 'chg up' : 'chg down')} style={{ fontSize: 10.5 }}>
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
        ) : <div className="subtle">로딩 중...</div>}
      </Card>

      {/* Credit Stress */}
      <Card title="Credit Stress" action="HYG / IEF 5D" info={G.credit}>
        {([['HYG', hyg], ['JNK', jnk], ['LQD', lqd], ['IEF', ief]] as [string, MacroItem | undefined][]).map(([label, m]) => {
          if (!m) return null;
          const up = (m.change_pct_5d ?? 0) >= 0;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 11.5 }}>
              <span style={{ width: 36, fontWeight: 600 }}>{label}</span>
              <span style={{ flex: 1, color: 'var(--fg-subtle)', fontSize: 10.5 }}>{m.name}</span>
              <span className="mono" style={{ textAlign: 'right' }}>${(m.price ?? 0).toFixed(2)}</span>
              <span className={'mono ' + (up ? 'chg up' : 'chg down')} style={{ width: 56, textAlign: 'right' }}>
                {up ? '+' : ''}{(m.change_pct_5d ?? 0).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </Card>

      {/* 진입 레이더 */}
      <Card title="진입 레이더" action="Entry 근접순">
        {watchlist.length === 0 ? (
          <div className="subtle">로딩 중...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                    <span style={{ fontWeight: 600, width: 46, fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0 }}>
                      {w.symbol}
                    </span>
                    <ScorePill score={w.score} />
                    <span style={{ flex: 1 }} />
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: broken ? 'var(--bull)' : inZone ? 'var(--em-500)' : w.entryDist > 15 ? 'var(--fg-subtle)' : 'var(--fg)',
                    }}>
                      {broken
                        ? <span className="badge bull" style={{ fontSize: 10 }}>돌파</span>
                        : `+${w.entryDist.toFixed(1)}%`}
                    </span>
                  </div>
                );
              })}
            <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border-soft)' }}>
              ≤5% = 진입 가능 Zone
            </div>
          </div>
        )}
      </Card>

      {/* Conviction 리더보드 */}
      <Card title="Conviction 리더보드" action="확신도 순" info={G.conviction}>
        {watchlist.length === 0 ? (
          <div className="subtle">로딩 중...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[...watchlist]
              .sort((a, b) => (b.conviction_score ?? 0) - (a.conviction_score ?? 0))
              .map(w => {
                const s = w.conviction_score ?? 0;
                const color = s >= 65 ? 'var(--bull)' : s >= 50 ? 'var(--teal)' : s >= 35 ? 'var(--warn)' : 'var(--bear)';
                return (
                  <div key={w.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                    <span style={{ fontWeight: 600, width: 46, fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0 }}>{w.symbol}</span>
                    <div className="bar" style={{ flex: 1 }}>
                      <div className="bar__fill" style={{ width: `${s}%`, background: color }} />
                    </div>
                    <ConvictionBadge score={w.conviction_score ?? undefined} label={w.conviction_label} size="sm" />
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* Sector Momentum */}
      <Card title="Sector Momentum" action="5D 수익률" info={G.sector_momentum}>
        {(() => {
          const sectors: [string, string][] = [
            ['SMH', '반도체'],
            ['XLE', '에너지'],
            ['XLY', '소비재'],
            ['XHB', '홈빌더'],
            ['ITA', '방산'],
          ];
          const items = sectors.map(([sym, label]) => ({ sym, label, m: findMacro(macro, sym) })).filter(x => x.m);
          if (items.length === 0) return <div className="subtle">로딩 중...</div>;
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
                  <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 11.5 }}>
                    <div style={{ width: 34, fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 11 }}>{sym}</div>
                    <div style={{ width: 38, fontSize: 10, color: 'var(--fg-subtle)' }}>{label}</div>
                    <div className="bar" style={{ flex: 1, height: 5 }}>
                      <div className="bar__fill" style={{ width: barW + '%', background: up ? 'var(--bull)' : 'var(--bear)' }} />
                    </div>
                    <span className={'mono ' + (up ? 'chg up' : 'chg down')} style={{ width: 50, textAlign: 'right', fontSize: 11 }}>
                      {up ? '+' : ''}{chg.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 9.5, color: aboveEma ? 'var(--bull)' : 'var(--bear)', width: 28, textAlign: 'right' }}>
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
      <Card title="Watchlist · Top 3" action="Stage 2 정렬">
        {watchlist.slice(0, 3).map(w => (
          <div key={w.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <span className="sym-pill__badge" style={{ width: 22, height: 22 }}>{w.symbol[0]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{w.symbol}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 11.5 }}>${w.price.toFixed(2)}</div>
            </div>
            <ScorePill score={w.score} />
            <ConvictionBadge score={w.conviction_score ?? undefined} size="sm" />
          </div>
        ))}
        {watchlist.length === 0 && <div className="subtle">로딩 중...</div>}
      </Card>

      <BoardGuidePanel
        title="Overview 가이드"
        sections={OVERVIEW_GUIDE}
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}
