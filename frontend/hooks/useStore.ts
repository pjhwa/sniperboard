import { create } from 'zustand';
import { Tab } from '../app/types';

interface DashboardState {
  symbol: string;
  timeframe: string;
  tab: Tab;
  rrAccount: string;
  rrRiskPct: string;
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
  setTab: (tab: Tab) => void;
  setRrAccount: (val: string) => void;
  setRrRiskPct: (val: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  symbol: 'TSLA',
  timeframe: '5m',
  tab: 'intraday',
  rrAccount: '100000',
  rrRiskPct: '1',
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setTab: (tab) => set({ tab }),
  setRrAccount: (rrAccount) => set({ rrAccount }),
  setRrRiskPct: (rrRiskPct) => set({ rrRiskPct }),
}));
