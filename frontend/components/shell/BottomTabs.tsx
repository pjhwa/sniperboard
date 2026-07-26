'use client';

import React, { useState } from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { Crosshair, Layers, Globe, Heart, Newspaper, Eye, Lightbulb, Flask, Target } from '@/components/ui/Icons';
import { t } from '@/app/i18n';

const TABS: { id: Board; label: { en: string; ko: string }; Icon: () => React.ReactElement }[] = [
  { id: 'briefing',  label: { en: 'Briefing',  ko: '브리핑'  }, Icon: Newspaper },
  { id: 'overview',  label: { en: 'Market',    ko: '시장'    }, Icon: Crosshair },
  { id: 'watchlist', label: { en: 'Watch',     ko: '워치'    }, Icon: Eye },
  { id: 'sentiment', label: { en: 'Sentiment', ko: '심리'    }, Icon: Heart },
  { id: 'deepdive',  label: { en: 'Analysis',  ko: '분석'    }, Icon: Layers },
];

const MORE_ITEMS: { id: Board; label: { en: string; ko: string }; Icon: () => React.ReactElement }[] = [
  { id: 'insight',  label: { en: 'Insight',  ko: '통찰'    }, Icon: Lightbulb },
  { id: 'track',    label: { en: 'Track',    ko: '트래킹'  }, Icon: Target },
  { id: 'macro',    label: { en: 'Macro',    ko: '매크로'  }, Icon: Globe },
  { id: 'backtest', label: { en: 'Backtest', ko: '백테스트'}, Icon: Flask },
];

const MORE_BOARD_IDS: Board[] = MORE_ITEMS.map((m) => m.id);

const MoreIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
  </svg>
);

export function BottomTabs() {
  const { board, locale, setBoard } = useStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_BOARD_IDS.includes(board);

  function selectBoard(id: Board) {
    setBoard(id);
    setMoreOpen(false);
  }

  return (
    <>
      {moreOpen && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0,
              zIndex: 199,
              background: 'rgba(0,0,0,0.45)',
            }}
            onClick={() => setMoreOpen(false)}
          />
          <div style={{
            position: 'fixed',
            left: 0, right: 0,
            bottom: `calc(var(--mobile-tabs) + env(safe-area-inset-bottom))`,
            zIndex: 200,
            background: 'var(--card)',
            borderTop: '1px solid var(--border)',
            borderRadius: '14px 14px 0 0',
            padding: '12px 8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
          }}>
            {MORE_ITEMS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => selectBoard(id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, padding: '10px 4px',
                  background: board === id ? 'var(--bg-subtle)' : 'transparent',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  color: board === id ? 'var(--em-500)' : 'var(--fg-muted)',
                  fontSize: 11, fontFamily: 'inherit',
                  minHeight: 64,
                }}
              >
                <Icon />
                <span>{t(label, locale)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <nav className="bottom-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={'bottom-tabs__item ' + (board === id ? 'active' : '')}
            onClick={() => { setMoreOpen(false); setBoard(id); }}
          >
            <Icon />
            <span>{t(label, locale)}</span>
          </button>
        ))}
        <button
          className={'bottom-tabs__item ' + (moreActive || moreOpen ? 'active' : '')}
          onClick={() => setMoreOpen((o) => !o)}
        >
          <MoreIcon />
          <span>{locale === 'ko' ? '더보기' : 'More'}</span>
        </button>
      </nav>
    </>
  );
}
