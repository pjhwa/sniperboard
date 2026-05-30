'use client';

import React from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { Crosshair, Layers, Globe, Heart } from '@/components/ui/Icons';

const TABS: { id: Board; ko: string; Icon: () => React.ReactElement }[] = [
  { id: 'overview',  ko: '시장',    Icon: Crosshair },
  { id: 'deepdive',  ko: '종합분석', Icon: Layers },
  { id: 'macro',     ko: '매크로',  Icon: Globe },
  { id: 'sentiment', ko: '심리',    Icon: Heart },
];

export function BottomTabs() {
  const { board, setBoard } = useStore();
  return (
    <nav className="bottom-tabs">
      {TABS.map(({ id, ko, Icon }) => (
        <button
          key={id}
          className={'bottom-tabs__item ' + (board === id ? 'active' : '')}
          onClick={() => setBoard(id)}
        >
          <Icon />
          <span>{ko}</span>
        </button>
      ))}
    </nav>
  );
}
