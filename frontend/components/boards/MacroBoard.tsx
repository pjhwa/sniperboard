'use client';

import { useState } from 'react';
import { useMacro } from '@/hooks/useMacro';
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
    body: '섹터 모멘텀 바에서 강세 섹터를 먼저 확인합니다. 변동성(VIX), 신용(HYG/IEF), 금리(TNX), 달러(DXY) 순으로 읽으면서 전체 리스크 선호도를 파악합니다. 구조 라벨(UPTREND/DOWNTREND 등)이 각 심볼의 기술적 위치를 요약합니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'VIX 20 이하 확인 → HYG/JNK 상승 추세(Risk-On) 확인 → 강세 섹터 내 종목 탐색 → DXY 약세면 수출·원자재주, 강세면 달러 수혜주 고려.',
  },
];

const SECTOR_SYMS = ['SMH', 'XLY', 'ITA', 'XLE', 'XHB'];
const SECTOR_NAMES: Record<string, string> = {
  SMH: 'Semiconductors', XLY: 'Consumer Disc.', ITA: 'Aerospace/Def.',
  XLE: 'Energy', XHB: 'Homebuilders',
};

const MACRO_GROUPS: { key: string; label: string; subtitle: string; symbols: string[] }[] = [
  { key: 'volatility', label: '변동성',    subtitle: 'Fear Gauge',   symbols: ['^VIX', '^VIX9D', '^VVIX'] },
  { key: 'breadth',    label: '시장 폭',   subtitle: 'Broad Market', symbols: ['SPY', 'RSP', 'MAGS', 'IWM'] },
  { key: 'credit',     label: '신용 스트레스', subtitle: 'Credit',  symbols: ['HYG', 'JNK', 'LQD', 'IEF'] },
  { key: 'rates',      label: '달러·금리', subtitle: 'Rates/USD',   symbols: ['DX-Y.NYB', '^TNX', 'TLT'] },
  { key: 'commodities',label: '원자재',    subtitle: 'Commodities',  symbols: ['CL=F', 'GLD'] },
  { key: 'sectors',    label: '섹터 ETF',  subtitle: 'Rotation',     symbols: ['SMH', 'XLE', 'XLY', 'XHB', 'ITA'] },
];

function displaySym(s: string) {
  return s.replace('^', '').replace('-Y.NYB', 'Y');
}

export function MacroBoard() {
  const [guideOpen, setGuideOpen] = useState(false);
  const { macroData, isLoading } = useMacro();
  const macro = macroData?.macro ?? [];

  const sectorItems = SECTOR_SYMS.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as MacroItem[];
  const maxAbs = sectorItems.length ? Math.max(...sectorItems.map(s => Math.abs(s.change_pct_1d ?? 0))) || 1 : 1;

  return (
    <div className="board-wrap">
      <button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
      <BoardGuidePanel title="Macro 가이드" sections={MACRO_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    <div className="board fade-in" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridAutoRows: 'min-content' }}>
      {/* Sector rotation */}
      <div style={{ gridColumn: 'span 3' }}>
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

      {/* Macro groups */}
      {MACRO_GROUPS.map(g => {
        const items = g.symbols.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as MacroItem[];
        return (
          <Card key={g.key} title={g.label} action={g.subtitle} info={g.key === 'volatility' ? G.vix_index : undefined}>
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
                      {m.price != null ? m.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                    </div>
                    <div className={'chg-cell ' + cls}>
                      {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

    </div>
    </div>
  );
}
