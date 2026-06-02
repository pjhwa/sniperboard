'use client';

import { useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { Rail } from '@/components/shell/Rail';
import { Topbar } from '@/components/shell/Topbar';
import { MarketStrip } from '@/components/shell/MarketStrip';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { BottomTabs } from '@/components/shell/BottomTabs';
import { OverviewBoard } from '@/components/boards/OverviewBoard';
import { IntradayBoard } from '@/components/boards/IntradayBoard';
import { DailyBoard } from '@/components/boards/DailyBoard';
import { WatchlistBoard } from '@/components/boards/WatchlistBoard';
import { MacroBoard } from '@/components/boards/MacroBoard';
import { SentimentBoard } from '@/components/boards/SentimentBoard';
import { DeepDiveBoard } from '@/components/boards/DeepDiveBoard';
import { BacktestBoard } from '@/components/boards/BacktestBoard';

export default function Page() {
  const { board, theme, cmdOpen, setCmdOpen } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(!cmdOpen);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdOpen, setCmdOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('sb_theme', theme); } catch (_) {}
  }, [theme]);

  return (
    <div className="app">
      <Rail />
      <Topbar />
      <main className="main">
        <MarketStrip />
        {board === 'overview'  && <OverviewBoard />}
        {board === 'intraday'  && <IntradayBoard />}
        {board === 'daily'     && <DailyBoard />}
        {board === 'watchlist' && <WatchlistBoard />}
        {board === 'macro'     && <MacroBoard />}
        {board === 'sentiment' && <SentimentBoard />}
        {board === 'deepdive'  && <DeepDiveBoard />}
        {board === 'backtest'  && <BacktestBoard />}
      </main>
      <CommandPalette />
      <BottomTabs />
    </div>
  );
}
