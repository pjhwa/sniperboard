'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/app/i18n';

export type Board = 'overview' | 'intraday' | 'daily' | 'watchlist' | 'macro' | 'sentiment' | 'deepdive' | 'backtest' | 'track' | 'briefing' | 'marketcap';
export type Theme = 'dark' | 'light';

interface StoreState {
  symbol: string;
  timeframe: string;
  board: Board;
  theme: Theme;
  locale: Locale;
  cmdOpen: boolean;
  rrAccount: string;
  rrRiskPct: string;
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
  setBoard: (board: Board) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setCmdOpen: (open: boolean) => void;
  setRrAccount: (val: string) => void;
  setRrRiskPct: (val: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      symbol: 'TSLA',
      timeframe: '5m',
      board: 'briefing' as Board,
      theme: 'dark' as Theme,
      locale: 'ko' as Locale,
      cmdOpen: false,
      rrAccount: '100000',
      rrRiskPct: '1',
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setBoard: (board) => set({ board }),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setCmdOpen: (cmdOpen) => set({ cmdOpen }),
      setRrAccount: (rrAccount) => set({ rrAccount }),
      setRrRiskPct: (rrRiskPct) => set({ rrRiskPct }),
    }),
    {
      name: 'sniperboard',
    }
  )
);

// backward compat alias
export const useDashboardStore = useStore;
