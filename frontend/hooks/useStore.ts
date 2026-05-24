'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Board = 'overview' | 'intraday' | 'daily' | 'watchlist' | 'macro' | 'sentiment';
export type Theme = 'dark' | 'light';

interface StoreState {
  symbol: string;
  timeframe: string;
  board: Board;
  theme: Theme;
  cmdOpen: boolean;
  rrAccount: string;
  rrRiskPct: string;
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
  setBoard: (board: Board) => void;
  setTheme: (theme: Theme) => void;
  setCmdOpen: (open: boolean) => void;
  setRrAccount: (val: string) => void;
  setRrRiskPct: (val: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      symbol: 'TSLA',
      timeframe: '5m',
      board: 'overview' as Board,
      theme: 'dark' as Theme,
      cmdOpen: false,
      rrAccount: '100000',
      rrRiskPct: '1',
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setBoard: (board) => set({ board }),
      setTheme: (theme) => set({ theme }),
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
