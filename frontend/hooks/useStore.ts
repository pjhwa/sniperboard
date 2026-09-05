'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/app/i18n';
import { LAYOUT_VERSION, WORKSPACE_BOARDS, type WorkspaceId } from '@/lib/workspaceLayout';

export type Board = 'overview' | 'intraday' | 'daily' | 'watchlist' | 'macro' | 'sentiment' | 'deepdive' | 'backtest' | 'track' | 'briefing' | 'marketcap' | 'insight';
export type Theme = 'dark' | 'light';
export type { WorkspaceId };

interface StoreState {
  symbol: string;
  timeframe: string;
  board: Board;
  theme: Theme;
  locale: Locale;
  cmdOpen: boolean;
  shortcutsOpen: boolean;
  overlayFocus: 'insider' | null;
  workspace: WorkspaceId;
  layoutVersion: number;
  rrAccount: string;
  rrRiskPct: string;
  /** Phase C4: dismissed alert ids (persisted) */
  dismissedAlertIds: string[];
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
  setBoard: (board: Board) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setCmdOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setOverlayFocus: (focus: 'insider' | null) => void;
  setWorkspace: (id: WorkspaceId) => void;
  setRrAccount: (val: string) => void;
  setRrRiskPct: (val: string) => void;
  dismissAlert: (id: string) => void;
  clearDismissedAlerts: () => void;
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
      shortcutsOpen: false,
      overlayFocus: null,
      workspace: 'trade' as WorkspaceId,
      layoutVersion: LAYOUT_VERSION,
      rrAccount: '100000',
      rrRiskPct: '1',
      dismissedAlertIds: [] as string[],
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setBoard: (board) => set({ board }),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setCmdOpen: (cmdOpen) => set({ cmdOpen }),
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
      setOverlayFocus: (overlayFocus) => set({ overlayFocus }),
      setWorkspace: (workspace) => set({ workspace, board: WORKSPACE_BOARDS[workspace] as Board }),
      setRrAccount: (rrAccount) => set({ rrAccount }),
      setRrRiskPct: (rrRiskPct) => set({ rrRiskPct }),
      dismissAlert: (id) =>
        set((s) => ({
          dismissedAlertIds: s.dismissedAlertIds.includes(id)
            ? s.dismissedAlertIds
            : [...s.dismissedAlertIds, id].slice(-100),
        })),
      clearDismissedAlerts: () => set({ dismissedAlertIds: [] }),
    }),
    {
      name: 'sniperboard',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.layoutVersion !== LAYOUT_VERSION) {
          state.workspace = 'trade';
          state.board = WORKSPACE_BOARDS.trade as Board;
          state.layoutVersion = LAYOUT_VERSION;
        }
      },
    }
  )
);

// backward compat alias
export const useDashboardStore = useStore;
