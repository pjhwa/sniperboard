'use client';

import React from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { Crosshair, Layers, Globe, Heart, Newspaper } from '@/components/ui/Icons';
import { t } from '@/app/i18n';

const TABS: { id: Board; label: { en: string; ko: string }; Icon: () => React.ReactElement }[] = [
  { id: 'overview',  label: { en: 'Overview',  ko: '시장'    }, Icon: Crosshair },
  { id: 'deepdive',  label: { en: 'Analysis',  ko: '분석'    }, Icon: Layers },
  { id: 'macro',     label: { en: 'Macro',     ko: '매크로'  }, Icon: Globe },
  { id: 'sentiment', label: { en: 'Sentiment', ko: '심리'    }, Icon: Heart },
  { id: 'briefing',  label: { en: 'Briefing',  ko: '브리핑'  }, Icon: Newspaper },
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
