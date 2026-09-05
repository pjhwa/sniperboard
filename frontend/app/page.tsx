'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/hooks/useStore';
import { Rail } from '@/components/shell/Rail';
import { Topbar } from '@/components/shell/Topbar';
import { MarketStrip } from '@/components/shell/MarketStrip';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { BottomTabs } from '@/components/shell/BottomTabs';
import { ShortcutsOverlay } from '@/components/shell/ShortcutsOverlay';
import { StatusStrip } from '@/components/shell/StatusStrip';

const LoadingBoard = () => (
  <div className="board"><div className="subtle" style={{ padding: 24 }}>Loading…</div></div>
);

const OverviewBoard = dynamic(() => import('@/components/boards/OverviewBoard').then(m => ({ default: m.OverviewBoard })), { loading: LoadingBoard });
const IntradayBoard = dynamic(() => import('@/components/boards/IntradayBoard').then(m => ({ default: m.IntradayBoard })), { loading: LoadingBoard });
const DailyBoard = dynamic(() => import('@/components/boards/DailyBoard').then(m => ({ default: m.DailyBoard })), { loading: LoadingBoard });
const WatchlistBoard = dynamic(() => import('@/components/boards/WatchlistBoard').then(m => ({ default: m.WatchlistBoard })), { loading: LoadingBoard });
const MacroBoard = dynamic(() => import('@/components/boards/MacroBoard').then(m => ({ default: m.MacroBoard })), { loading: LoadingBoard });
const SentimentBoard = dynamic(() => import('@/components/boards/SentimentBoard').then(m => ({ default: m.SentimentBoard })), { loading: LoadingBoard });
const DeepDiveBoard = dynamic(() => import('@/components/boards/DeepDiveBoard').then(m => ({ default: m.DeepDiveBoard })), { loading: LoadingBoard });
const BacktestBoard = dynamic(() => import('@/components/boards/BacktestBoard').then(m => ({ default: m.BacktestBoard })), { loading: LoadingBoard });
const TrackBoard = dynamic(() => import('@/components/boards/TrackBoard').then(m => ({ default: m.TrackBoard })), { loading: LoadingBoard });
const MorningBriefingBoard = dynamic(() => import('@/components/boards/MorningBriefingBoard').then(m => ({ default: m.MorningBriefingBoard })), { loading: LoadingBoard });
const MarketCapBoard = dynamic(() => import('@/components/boards/MarketCapBoard').then(m => ({ default: m.MarketCapBoard })), { loading: LoadingBoard });
const InsightBoard = dynamic(() => import('@/components/boards/InsightBoard').then(m => ({ default: m.InsightBoard })), { loading: LoadingBoard });

export default function Page() {
  const { board, theme, cmdOpen, setCmdOpen, setShortcutsOpen } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(!cmdOpen);
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
        setShortcutsOpen(false);
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          setShortcutsOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdOpen, setCmdOpen, setShortcutsOpen]);

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
        {board === 'track'     && <TrackBoard />}
        {board === 'briefing'  && <MorningBriefingBoard />}
        {board === 'marketcap' && <MarketCapBoard />}
        {board === 'insight'   && <InsightBoard />}
      </main>
      <CommandPalette />
      <ShortcutsOverlay />
      <StatusStrip />
      <BottomTabs />
    </div>
  );
}
