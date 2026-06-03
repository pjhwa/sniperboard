'use client';

import React from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { Crosshair, Layers, Globe, Heart, Newspaper, Eye } from '@/components/ui/Icons';
import { t } from '@/app/i18n';

const TABS: { id: Board; label: { en: string; ko: string }; Icon: () => React.ReactElement }[] = [
  { id: 'briefing',  label: { en: 'Briefing',  ko: '브리핑'  }, Icon: Newspaper },
  { id: 'overview',  label: { en: 'Market',    ko: '시장'    }, Icon: Crosshair },
  { id: 'watchlist', label: { en: 'Watch',     ko: '워치'    }, Icon: Eye },
  { id: 'sentiment', label: { en: 'Sentiment', ko: '심리'    }, Icon: Heart },
  { id: 'deepdive',  label: { en: 'Analysis',  ko: '분석'    }, Icon: Layers },
];

export function BottomTabs() {
  const { board, locale, setBoard } = useStore();
  return (
    <nav className="bottom-tabs">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={'bottom-tabs__item ' + (board === id ? 'active' : '')}
          onClick={() => setBoard(id)}
        >
          <Icon />
          <span>{t(label, locale)}</span>
        </button>
      ))}
    </nav>
  );
}
