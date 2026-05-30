'use client';

import { useState, useEffect } from 'react';
import { useMacro } from '@/hooks/useMacro';
import { useMacroInsight } from '@/hooks/useMacroInsight';
import { Card } from '@/components/ui/Card';
import { MacroItem } from '@/app/types';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';

const MACRO_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '시장을 움직이는 매크로 자산들(지수·채권·원자재·변동성)의 현황을 한눈에 파악하는 화면입니다. 어떤 자산군에 돈이 몰리는지 파악합니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: '상단 배너의 RISK-ON/MIXED/RISK-OFF 판정을 먼저 확인합니다. 각 카드의 🟢🟡🔴 신호등과 방향 화살표(↗↘)로 그룹별 흐름을 파악합니다. 카드 하단 AI 텍스트는 수집 시점 기준 해석입니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'VIX 🟢 확인 → 신용(HYG/JNK) 🟢 확인 → 강세 섹터 내 종목 탐색 → DXY 약세면 수출·원자재주, 강세면 달러 수혜주 고려.',
  },
];

const SECTOR_SYMS = ['SMH', 'XLY', 'ITA', 'XLE', 'XHB'];
const SECTOR_NAMES: Record<string, string> = {
  SMH: 'Semiconductors', XLY: 'Consumer Disc.', ITA: 'Aerospace/Def.',
  XLE: 'Energy', XHB: 'Homebuilders',
};

const MACRO_GROUPS: { key: string; label: string; subtitle: string; symbols: string[]; infoKey: string }[] = [
  { key: 'volatility',  label: '변동성',       subtitle: 'Fear Gauge',   symbols: ['^VIX', '^VIX9D', '^VVIX'],          infoKey: 'vix_index' },
  { key: 'breadth',     label: '시장 폭',      subtitle: 'Broad Market', symbols: ['SPY', 'RSP', 'MAGS', 'IWM'],        infoKey: 'breadth' },
  { key: 'credit',      label: '신용 스트레스', subtitle: 'Credit',       symbols: ['HYG', 'JNK', 'LQD', 'IEF'],        infoKey: 'credit' },
  { key: 'rates',       label: '달러·금리',    subtitle: 'Rates/USD',    symbols: ['DX-Y.NYB', '^TNX', 'TLT'],          infoKey: 'rates_dollar' },
  { key: 'commodities', label: '원자재',       subtitle: 'Commodities',  symbols: ['CL=F', 'GLD'],                      infoKey: 'commodities' },
  { key: 'sectors',     label: '섹터 ETF',     subtitle: 'Rotation',     symbols: ['SMH', 'XLE', 'XLY', 'XHB', 'ITA'], infoKey: 'sector_momentum' },
];

const JUDGMENT_META: Record<string, { label: string; cls: string }> = {
  RISK_ON:  { label: '매수 우호',  cls: 'bull' },
  MIXED:    { label: '혼조',       cls: 'warn' },
  RISK_OFF: { label: '위험 경계',  cls: 'bear' },
};

const SIGNAL_DOT: Record<string, string> = {
  green: '🟢', yellow: '🟡', red: '🔴',
};

const DIRECTION_ARROW: Record<string, string> = {
  improving: '↗', stable: '→', deteriorating: '↘',
};

function formatAge(minutes: number): string {
  return minutes < 60 ? `${minutes}분 전` : `${Math.floor(minutes / 60)}시간 전`;
}

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

  const { macroData, isLoading } = useMacro();
  const { insightData } = useMacroInsight();
  const macro = macroData?.macro ?? [];

  const sectorItems = SECTOR_SYMS.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as MacroItem[];
  const maxAbs = sectorItems.length
    ? Math.max(...sectorItems.map(s => Math.abs(s.change_pct_1d ?? 0))) || 1
    : 1;

  return (
    <div className="board-wrap">
      <BoardGuidePanel title="Macro 가이드" sections={MACRO_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
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
                className={`badge ${JUDGMENT_META[insightData.overall.judgment]?.cls ?? 'warn'}`}
                style={{ flexShrink: 0, marginTop: 2 }}
              >
                {JUDGMENT_META[insightData.overall.judgment]?.label ?? insightData.overall.judgment}
              </span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {insightData.overall.summary ? (
                  <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                    {insightData.overall.summary}
                  </span>
                ) : (
                  <span className="subtle" style={{ fontSize: '0.82rem' }}>
                    🟢 {insightData.overall.green_count} · 🔴 {insightData.overall.red_count}
                  </span>
                )}
                {insightData.overall.bullets.length > 0 && (
                  <details className="mob-collapse" open>
                    <summary>상세 해석</summary>
                    <div className="mob-collapse-body">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 0', fontSize: '0.72rem', color: 'var(--fg-muted)' }}>
                        {insightData.overall.bullets.map((b, i) => (
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
          <Card title="Sector Rotation · 1D" action="섹터별 상대 강도" info={G.sector_momentum}>
            {isLoading ? (
              <div className="subtle">로딩 중...</div>
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
                {groupInsight.signal === 'green' ? '우호'
               : groupInsight.signal === 'red'   ? '주의'
               : '중립'}
              </span>
              <span>{DIRECTION_ARROW[groupInsight.direction] ?? '→'}</span>
            </span>
          ) : null;

          return (
            <Card key={g.key} title={g.label} action={g.subtitle} info={G[g.infoKey]} extra={signalExtra}>
              <div className="macro-group">
                {items.map(m => {
                  const chg = m.change_pct_1d ?? 0;
                  const cls = chg > 0.1 ? 'up' : chg < -0.1 ? 'down' : 'flat';
                  return (
                    <div key={m.symbol} className="macro-item">
                      <div>
                        <div className="mi-sym">{displaySym(m.symbol)}</div>
                        <div className="mi-name">{m.name}</div>
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
              {groupInsight?.text && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-end', gap: 8,
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>
                    {groupInsight.text}
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
