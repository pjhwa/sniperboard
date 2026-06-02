'use client';

import { useState, useEffect } from 'react';
import { useMacro } from '@/hooks/useMacro';
import { useMacroInsight } from '@/hooks/useMacroInsight';
import { useStore } from '@/hooks/useStore';
import { Card } from '@/components/ui/Card';
import { MacroItem, MACRO_SYMBOL_NAMES } from '@/app/types';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
import { t, tField } from '@/app/i18n';
import type { BiLang } from '@/app/i18n';

const S: Record<string, BiLang> = {
  guideTitle:    { en: 'Macro Guide', ko: 'Macro 가이드' },
  guide1Heading: { en: 'About this screen', ko: '이 화면은' },
  guide1Body:    { en: 'A dashboard to see the status of macro assets (indices, bonds, commodities, volatility) that move markets at a glance. Identifies which asset classes money is flowing into.', ko: '시장을 움직이는 매크로 자산들(지수·채권·원자재·변동성)의 현황을 한눈에 파악하는 화면입니다. 어떤 자산군에 돈이 몰리는지 파악합니다.' },
  guide2Heading: { en: 'How to read key indicators', ko: '핵심 지표 읽는 법' },
  guide2Body:    { en: 'First check the RISK-ON/MIXED/RISK-OFF verdict in the top banner. Use the 🟢🟡🔴 signal lights and direction arrows (↗↘) in each card to understand group-level flows. AI text at the bottom of each card is an interpretation as of the collection time.', ko: '상단 배너의 RISK-ON/MIXED/RISK-OFF 판정을 먼저 확인합니다. 각 카드의 🟢🟡🔴 신호등과 방향 화살표(↗↘)로 그룹별 흐름을 파악합니다. 카드 하단 AI 텍스트는 수집 시점 기준 해석입니다.' },
  guide3Heading: { en: 'How to use now', ko: '지금 이렇게 쓰세요' },
  guide3Body:    { en: 'VIX 🟢 → Credit (HYG/JNK) 🟢 → Search stocks in bullish sectors → Weak DXY = commodities/exporters, Strong DXY = dollar beneficiaries.', ko: 'VIX 🟢 확인 → 신용(HYG/JNK) 🟢 확인 → 강세 섹터 내 종목 탐색 → DXY 약세면 수출·원자재주, 강세면 달러 수혜주 고려.' },
  loading:       { en: 'Loading...', ko: '로딩 중...' },
  detailAnalysis: { en: 'Detailed Analysis', ko: '상세 해석' },
  // group labels
  volatility:    { en: 'Volatility',      ko: '변동성' },
  breadth:       { en: 'Market Breadth',  ko: '시장 폭' },
  credit:        { en: 'Credit Stress',   ko: '신용 스트레스' },
  rates:         { en: 'Rates / USD',     ko: '달러·금리' },
  commodities:   { en: 'Commodities',     ko: '원자재' },
  sectors:       { en: 'Sector ETFs',     ko: '섹터 ETF' },
  // signal text
  signalFriendly: { en: 'Favorable', ko: '우호' },
  signalCaution:  { en: 'Caution',   ko: '주의' },
  signalNeutral:  { en: 'Neutral',   ko: '중립' },
  // judgment labels
  riskOn:        { en: 'Buy-Favorable', ko: '매수 우호' },
  mixed:         { en: 'Mixed',         ko: '혼조' },
  riskOff:       { en: 'Risk Alert',    ko: '위험 경계' },
  // sector rotation
  sectorTitle:   { en: 'Sector Rotation · 1D', ko: 'Sector Rotation · 1D' },
  sectorAction:  { en: 'Relative Strength by Sector', ko: '섹터별 상대 강도' },
  agoMin:        { en: 'min ago', ko: '분 전' },
  agoHour:       { en: 'hr ago',  ko: '시간 전' },
};

const SECTOR_SYMS = ['SMH', 'XLY', 'ITA', 'XLE', 'XHB'];
const SECTOR_NAMES: Record<string, string> = {
  SMH: 'Semiconductors', XLY: 'Consumer Disc.', ITA: 'Aerospace/Def.',
  XLE: 'Energy', XHB: 'Homebuilders',
};

const GROUP_LABEL_KEY: Record<string, keyof typeof S> = {
  volatility:  'volatility',
  breadth:     'breadth',
  credit:      'credit',
  rates:       'rates',
  commodities: 'commodities',
  sectors:     'sectors',
};

const MACRO_GROUPS: { key: string; subtitle: string; symbols: string[]; infoKey: string }[] = [
  { key: 'volatility',  subtitle: 'Fear Gauge',   symbols: ['^VIX', '^VIX9D', '^VVIX'],          infoKey: 'vix_index' },
  { key: 'breadth',     subtitle: 'Broad Market', symbols: ['SPY', 'RSP', 'MAGS', 'IWM'],        infoKey: 'breadth' },
  { key: 'credit',      subtitle: 'Credit',       symbols: ['HYG', 'JNK', 'LQD', 'IEF'],        infoKey: 'credit' },
  { key: 'rates',       subtitle: 'Rates/USD',    symbols: ['DX-Y.NYB', '^TNX', 'TLT'],          infoKey: 'rates_dollar' },
  { key: 'commodities', subtitle: 'Commodities',  symbols: ['CL=F', 'GLD', 'BTC-USD'],            infoKey: 'commodities' },
  { key: 'sectors',     subtitle: 'Rotation',     symbols: ['SMH', 'XLE', 'XLY', 'XHB', 'ITA'], infoKey: 'sector_momentum' },
];

const JUDGMENT_CLS: Record<string, string> = {
  RISK_ON: 'bull', MIXED: 'warn', RISK_OFF: 'bear',
};

const SIGNAL_DOT: Record<string, string> = {
  green: '🟢', yellow: '🟡', red: '🔴',
};

const DIRECTION_ARROW: Record<string, string> = {
  improving: '↗', stable: '→', deteriorating: '↘',
};

function displaySym(s: string) {
  return s.replace('^', '').replace('-Y.NYB', 'Y');
}

export function MacroBoard() {
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    const handler = () => setGuideOpen(true);
    document.addEventListener('guide:open', handler);
    return () => document.removeEventListener('guide:open', handler);
  }, []);

  const { locale } = useStore();
  const { macroData, isLoading } = useMacro();
  const { insightData } = useMacroInsight();
  const macro = macroData?.macro ?? [];

  const sectorItems = SECTOR_SYMS.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as MacroItem[];
  const maxAbs = sectorItems.length
    ? Math.max(...sectorItems.map(s => Math.abs(s.change_pct_1d ?? 0))) || 1
    : 1;

  function formatAge(minutes: number): string {
    return minutes < 60
      ? `${minutes} ${t(S.agoMin, locale)}`
      : `${Math.floor(minutes / 60)} ${t(S.agoHour, locale)}`;
  }

  const MACRO_GUIDE = (): GuideSection[] => [
    { heading: t(S.guide1Heading, locale), body: t(S.guide1Body, locale) },
    { heading: t(S.guide2Heading, locale), body: t(S.guide2Body, locale) },
    { heading: t(S.guide3Heading, locale), body: t(S.guide3Body, locale) },
  ];

  const JUDGMENT_LABEL: Record<string, string> = {
    RISK_ON:  t(S.riskOn, locale),
    MIXED:    t(S.mixed, locale),
    RISK_OFF: t(S.riskOff, locale),
  };

  return (
    <div className="board-wrap">
      <BoardGuidePanel title={t(S.guideTitle, locale)} sections={MACRO_GUIDE()} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridAutoRows: 'min-content' }}>

        {/* Overall Insight Banner */}
        {insightData && (
          <div style={{ gridColumn: 'span 3' }} className="mob-order-1">
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 14px', marginBottom: 4,
              background: 'var(--card-elev)', borderRadius: 'var(--r)',
              border: '1px solid var(--border)',
            }}>
              <span
                className={`badge ${JUDGMENT_CLS[insightData.overall.judgment] ?? 'warn'}`}
                style={{ flexShrink: 0, marginTop: 2 }}
              >
                {JUDGMENT_LABEL[insightData.overall.judgment] ?? insightData.overall.judgment}
              </span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(insightData.overall.summary_en || insightData.overall.summary) ? (
                  <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                    {tField(insightData.overall.summary_en, insightData.overall.summary_ko, insightData.overall.summary, locale)}
                  </span>
                ) : (
                  <span className="subtle" style={{ fontSize: '0.82rem' }}>
                    🟢 {insightData.overall.green_count} · 🔴 {insightData.overall.red_count}
                  </span>
                )}
                {(insightData.overall.bullets_en?.length || insightData.overall.bullets_ko?.length || insightData.overall.bullets.length) > 0 && (
                  <details className="mob-collapse" open>
                    <summary>{t(S.detailAnalysis, locale)}</summary>
                    <div className="mob-collapse-body">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 0', fontSize: '0.72rem', color: 'var(--fg-muted)' }}>
                        {(locale === 'ko'
                          ? (insightData.overall.bullets_ko?.length ? insightData.overall.bullets_ko : insightData.overall.bullets)
                          : (insightData.overall.bullets_en?.length ? insightData.overall.bullets_en : insightData.overall.bullets)
                        ).map((b, i) => (
                          <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
                            {i > 0 && <span style={{ margin: '0 6px', color: 'var(--fg-faint)' }}>·</span>}
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
              {insightData.ai_meta && (
                <span className="subtle" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                  ⏱ {formatAge(insightData.ai_meta.age_minutes)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sector Rotation */}
        <div style={{ gridColumn: 'span 3' }} className="mob-order-3">
          <Card title={t(S.sectorTitle, locale)} action={t(S.sectorAction, locale)} info={{ term: t(G.sector_momentum.term, locale), body: t(G.sector_momentum.body, locale) }}>
            {isLoading ? (
              <div className="subtle">{t(S.loading, locale)}</div>
            ) : (
              <div>
                {[...sectorItems]
                  .sort((a, b) => (b.change_pct_1d ?? 0) - (a.change_pct_1d ?? 0))
                  .map(s => {
                    const chg = s.change_pct_1d ?? 0;
                    return (
                      <div key={s.symbol} className="sector-bar">
                        <span className="sb-sym">{displaySym(s.symbol)}</span>
                        <span className="sb-name">{SECTOR_NAMES[s.symbol] ?? s.name}</span>
                        <div className="sb-track">
                          {chg >= 0
                            ? <div className="fill-pos" style={{ width: `${(chg / maxAbs) * 48}%` }} />
                            : <div className="fill-neg" style={{ width: `${(Math.abs(chg) / maxAbs) * 48}%` }} />
                          }
                        </div>
                        <span className={'sb-val ' + (chg >= 0 ? 'chg up' : 'chg down')}>
                          {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>

        {/* Macro Groups */}
        <div className="mob-order-2 mob-macro-groups">
        {MACRO_GROUPS.map(g => {
          const items = g.symbols.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as MacroItem[];
          const groupInsight = insightData?.groups[g.key];
          const groupLabelKey = GROUP_LABEL_KEY[g.key];
          const groupLabel = groupLabelKey ? t(S[groupLabelKey], locale) : g.key;

          const signalText = groupInsight
            ? (groupInsight.signal === 'green' ? t(S.signalFriendly, locale)
               : groupInsight.signal === 'red' ? t(S.signalCaution, locale)
               : t(S.signalNeutral, locale))
            : null;

          const signalExtra = groupInsight ? (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--fg-muted)',
            }}>
              {SIGNAL_DOT[groupInsight.signal]}
              <span style={{
                color: groupInsight.signal === 'green' ? 'var(--bull)'
                     : groupInsight.signal === 'red'   ? 'var(--bear)'
                     : 'var(--warn)',
              }}>
                {signalText}
              </span>
              <span>{DIRECTION_ARROW[groupInsight.direction] ?? '→'}</span>
            </span>
          ) : null;

          return (
            <Card key={g.key} title={groupLabel} action={g.subtitle} info={{ term: t(G[g.infoKey].term, locale), body: t(G[g.infoKey].body, locale) }} extra={signalExtra}>
              <div className="macro-group">
                {items.map(m => {
                  const chg = m.change_pct_1d ?? 0;
                  const cls = chg > 0.1 ? 'up' : chg < -0.1 ? 'down' : 'flat';
                  return (
                    <div key={m.symbol} className="macro-item">
                      <div>
                        <div className="mi-sym">{displaySym(m.symbol)}</div>
                        <div className="mi-name">{t(MACRO_SYMBOL_NAMES[m.symbol] ?? { en: m.name, ko: m.name }, locale)}</div>
                      </div>
                      <div className="mi-price">
                        {m.price != null
                          ? m.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : '—'}
                      </div>
                      <div className={'chg-cell ' + cls}>
                        {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
              {(groupInsight?.text_en || groupInsight?.text) && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-end', gap: 8,
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>
                    {tField(groupInsight.text_en, groupInsight.text_ko, groupInsight.text, locale)}
                  </span>
                  {insightData?.ai_meta && (
                    <span className="subtle" style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                      ⏱ {formatAge(insightData.ai_meta.age_minutes)}
                    </span>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        </div>

      </div>
    </div>
  );
}
