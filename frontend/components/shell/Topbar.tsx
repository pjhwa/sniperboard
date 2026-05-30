'use client';

import { useStore } from '@/hooks/useStore';
import { useRegime } from '@/hooks/useRegime';
import { Search, Sun, Moon } from '@/components/ui/Icons';
import { SYMBOLS } from '@/app/types';

const BOARD_LABELS: Record<string, { label: string; ko: string }> = {
  overview:  { label: 'Overview',  ko: '시장' },
  deepdive:  { label: 'Deep Dive', ko: '종합분석' },
  intraday:  { label: 'Intraday',  ko: '단기' },
  daily:     { label: 'Daily',     ko: '일봉' },
  watchlist: { label: 'Watchlist', ko: '워치리스트' },
  macro:     { label: 'Macro',     ko: '매크로' },
  sentiment: { label: 'Sentiment', ko: '심리' },
};

const REGIME_KO: Record<string, string> = {
  RISK_ON: '강세', CONSTRUCTIVE: '우호적', MIXED: '혼조', DEFENSIVE: '방어적', RISK_OFF: '약세', UNKNOWN: '불명',
};

export function Topbar() {
  const { board, symbol, theme, setSymbol, setCmdOpen, setTheme } = useStore();
  const { regimeData } = useRegime();
  const current = BOARD_LABELS[board] || BOARD_LABELS.overview;

  return (
    <header className="topbar">
      <div className="topbar__title">
        <span style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>SniperBoard</span>
        <span style={{ color: 'var(--fg-faint)' }}>/</span>
        <span>{current.label}</span>
        <small>· {current.ko}</small>
      </div>

      <div className="topbar__search" onClick={() => setCmdOpen(true)}>
        <Search />
        <input placeholder="종목 · 보드 · 신호 검색" readOnly />
        <kbd>⌘K</kbd>
      </div>

      <div className="topbar__right">
        <div className="topbar__symbols" style={{ display: 'flex', gap: 4 }}>
          {SYMBOLS.map(s => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              style={{
                height: 28, padding: '0 10px',
                borderRadius: 'var(--r-sm)',
                fontSize: 11, fontWeight: 600,
                background: symbol === s ? 'var(--card-elev)' : 'transparent',
                border: symbol === s ? '1px solid var(--border)' : '1px solid transparent',
                color: symbol === s ? 'var(--fg)' : 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="topbar__sep" style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

        {regimeData && (
          <div className="regime-mini topbar__regime">
            <div className={'regime-mini__dot ' + regimeData.regime}>
              {regimeData.total ?? '—'}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                {REGIME_KO[regimeData.regime] ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>Risk Regime</div>
            </div>
          </div>
        )}

        <button
          className="topbar__btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </button>
      </div>
    </header>
  );
}
