'use client';

import React from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { Crosshair, Activity, Candles, Eye, Globe, Heart, Bell, Layers, Flask, Target } from '@/components/ui/Icons';
import { t } from '@/app/i18n';

const BOARDS: { id: Board; label: string; ko: string; Icon: () => React.ReactElement }[] = [
  { id: 'overview',  label: 'Overview',  ko: '시장',       Icon: Crosshair },
  { id: 'deepdive',  label: 'Deep Dive', ko: '종합분석',   Icon: Layers },
  { id: 'intraday',  label: 'Intraday',  ko: '단기',       Icon: Activity },
  { id: 'daily',     label: 'Daily',     ko: '일봉',       Icon: Candles },
  { id: 'watchlist', label: 'Watchlist', ko: '워치리스트',  Icon: Eye },
  { id: 'macro',     label: 'Macro',     ko: '매크로',     Icon: Globe },
  { id: 'sentiment', label: 'Sentiment', ko: '심리',       Icon: Heart },
  { id: 'backtest',  label: 'Backtest',  ko: '백테스트',   Icon: Flask },
  { id: 'track',     label: 'Track',     ko: '트래킹',     Icon: Target },
];

export function Rail() {
  const { board, locale, setBoard } = useStore();
  return (
    <aside className="rail hide-mobile">
      <div className="rail__logo" title="SniperBoard">S</div>
      {BOARDS.map(({ id, label, ko, Icon }) => (
        <button
          key={id}
          className={'rail__item ' + (board === id ? 'active' : '')}
          onClick={() => setBoard(id)}
        >
          <Icon />
          <span className="rail__tt">{t({ en: label, ko }, locale)}</span>
        </button>
      ))}
      <div className="rail__spacer" />
      <button className="rail__item">
        <Bell />
        <span className="rail__tt">{locale === 'en' ? 'Alerts' : '알림'}</span>
      </button>
    </aside>
  );
}
