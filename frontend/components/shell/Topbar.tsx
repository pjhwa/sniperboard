'use client';

import { useStore } from '@/hooks/useStore';
import { useRegime } from '@/hooks/useRegime';
import { Search, Sun, Moon } from '@/components/ui/Icons';
import { SYMBOLS, REGIME_META } from '@/app/types';
import { t } from '@/app/i18n';

export function Topbar() {
  const { board, symbol, theme, locale, setSymbol, setCmdOpen, setTheme, setLocale } = useStore();
  const { regimeData } = useRegime();

  const BOARD_LABELS: Record<string, { en: string; ko: string }> = {
    overview:  { en: 'Overview',  ko: '시장' },
    deepdive:  { en: 'Deep Dive', ko: '종합분석' },
    intraday:  { en: 'Intraday',  ko: '단기' },
    daily:     { en: 'Daily',     ko: '일봉' },
    watchlist: { en: 'Watchlist', ko: '워치리스트' },
    macro:     { en: 'Macro',     ko: '매크로' },
    sentiment: { en: 'Sentiment', ko: '심리' },
  };

  const current = BOARD_LABELS[board] ?? BOARD_LABELS.overview;

  return (
    <header className="topbar">
      <div className="topbar__title">
        <span style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>SniperBoard</span>
        <span style={{ color: 'var(--fg-faint)' }}>/</span>
        <span>{current[locale]}</span>
        <small>· {current[locale === 'en' ? 'ko' : 'en']}</small>
      </div>

      <div className="topbar__search" onClick={() => setCmdOpen(true)}>
        <Search />
        <input placeholder={locale === 'en' ? 'Symbol · Board · Signal search' : '종목 · 보드 · 신호 검색'} readOnly />
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
                {t(REGIME_META[regimeData.regime].label, locale)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>Risk Regime</div>
            </div>
          </div>
        )}

        {/* EN/KO locale toggle */}
        <div style={{ display: 'flex', gap: 2, padding: '2px', background: 'var(--card-elev)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
          {(['en', 'ko'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              style={{
                height: 24, padding: '0 8px',
                borderRadius: 'var(--r-xs)',
                fontSize: 11, fontWeight: 600,
                background: locale === l ? 'var(--accent)' : 'transparent',
                color: locale === l ? '#fff' : 'var(--fg-muted)',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <button
          className="topbar__btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={locale === 'en' ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : (theme === 'dark' ? '라이트 모드' : '다크 모드')}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </button>
      </div>
    </header>
  );
}
