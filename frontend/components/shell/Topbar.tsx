'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useRegime } from '@/hooks/useRegime';
import { Search, Sun, Moon } from '@/components/ui/Icons';
import { TIER1_SYMBOLS, TIER2_SYMBOLS, SYMBOL_NAMES, REGIME_META } from '@/app/types';
import { t, type Locale } from '@/app/i18n';

// ── Symbol Picker Dropdown ────────────────────────────────────────────────────

function SymbolPicker({ symbol, setSymbol, locale }: {
  symbol: string; setSymbol: (s: string) => void; locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (s: string) => { setSymbol(s); setOpen(false); };

  const tierBtn = (s: string) => (
    <button
      key={s}
      onClick={() => pick(s)}
      title={SYMBOL_NAMES[s]?.[locale] ?? s}
      style={{
        height: 26, padding: '0 8px', borderRadius: 'var(--r-xs)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        background: symbol === s ? 'var(--accent)' : 'var(--card-elev)',
        border: symbol === s ? '1px solid var(--accent)' : '1px solid var(--border)',
        color: symbol === s ? '#fff' : 'var(--fg)',
      }}
    >{s}</button>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* 트리거 버튼: 현재 심볼 + 티어 배지 */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          height: 28, padding: '0 10px', borderRadius: 'var(--r-sm)',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--card-elev)', border: '1px solid var(--border)', color: 'var(--fg)',
        }}
      >
        {symbol}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
          background: TIER1_SYMBOLS.includes(symbol) ? 'rgba(56,189,248,0.2)' : 'rgba(167,139,250,0.2)',
          color: TIER1_SYMBOLS.includes(symbol) ? 'var(--sky, #38bdf8)' : 'var(--purple, #a78bfa)',
        }}>
          T{TIER1_SYMBOLS.includes(symbol) ? '1' : '2'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 1 }}>▾</span>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
          padding: '10px 12px', minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {/* TIER 1 */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sky, #38bdf8)', letterSpacing: '0.5px' }}>TIER 1</span>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                {locale === 'ko' ? '빅테크/대형주 · 개별 심층 분석' : 'Large Cap · Deep Analysis'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {TIER1_SYMBOLS.map(tierBtn)}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

          {/* TIER 2 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple, #a78bfa)', letterSpacing: '0.5px' }}>TIER 2</span>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                {locale === 'ko' ? '모멘텀/테마주 · 배치 분석' : 'Momentum/Theme · Batch Analysis'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {TIER2_SYMBOLS.map(tierBtn)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────

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
    backtest:  { en: 'Backtest',  ko: '백테스트' },
    track:     { en: 'Signal Tracker', ko: '신호 트래커' },
    briefing:  { en: 'Morning Briefing', ko: '아침 브리핑' },
    marketcap: { en: 'Market Cap TOP 15', ko: '시총 TOP 15' },
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
        {/* 심볼 픽커 (21종목 드롭다운) */}
        <div className="topbar__symbols">
          <SymbolPicker symbol={symbol} setSymbol={setSymbol} locale={locale as Locale} />
        </div>

        <div className="topbar__sep" style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

        {regimeData && (
          <div className="regime-mini topbar__regime">
            <div className={'regime-mini__dot ' + regimeData.regime}>
              {regimeData.total ?? '—'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                {t(REGIME_META[regimeData.regime].label, locale as Locale)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Risk Regime</div>
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
                fontSize: 12, fontWeight: 600,
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
