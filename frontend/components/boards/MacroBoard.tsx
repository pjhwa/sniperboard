'use client';

import { useMacro } from '@/hooks/useMacro';
import { Card } from '@/components/ui/Card';
import { MacroItem } from '@/app/types';

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
  const { macroData, isLoading } = useMacro();
  const macro = macroData?.macro ?? [];

  const sectorItems = SECTOR_SYMS.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as MacroItem[];
  const maxAbs = sectorItems.length ? Math.max(...sectorItems.map(s => Math.abs(s.change_pct_1d ?? 0))) || 1 : 1;

  return (
    <div className="board fade-in" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridAutoRows: 'min-content' }}>
      {/* Sector rotation */}
      <div style={{ gridColumn: 'span 3' }}>
        <Card title="Sector Rotation · 1D" action="섹터별 상대 강도">
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
          <Card key={g.key} title={g.label} action={g.subtitle}>
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
  );
}
