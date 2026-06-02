'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type SignalStatus = 'PENDING' | 'ACTIVE' | 'WIN' | 'LOSS' | 'TIMEOUT' | 'CANCELLED';

export interface SignalLogEntry {
  id: number;
  symbol: string;
  signal_date: string;
  stage2_score: number;
  rs_score: number | null;
  entry: number;
  stop: number;
  target: number;
  status: SignalStatus;
  entry_date: string | null;
  entry_price: number | null;
  exit_date: string | null;
  exit_price: number | null;
  r_multiple: number | null;
  bars_held: number | null;
  regime: string | null;
  created_at: string | null;
}

export interface RegimeBreakdownItem {
  n: number;
  win_rate: number | null;
  expectancy_r: number | null;
}

export interface EquityCurvePoint {
  date: string;
  equity: number;
  trade_n: number;
}

export interface SignalLogStats {
  n_closed: number;
  n_active: number;
  n_pending: number;
  n_total: number;
  wins: number;
  losses: number;
  timeouts: number;
  win_rate: number | null;
  expectancy_r: number | null;
  profit_factor: number | null;
  mdd: number | null;
  avg_win_r: number | null;
  avg_loss_r: number | null;
  equity_curve: EquityCurvePoint[];
  regime_breakdown: Record<string, RegimeBreakdownItem>;
  pipeline: SignalLogEntry[];
  health: {
    status: 'ON_TRACK' | 'WATCH' | 'UNDERPERFORMING' | 'INSUFFICIENT_DATA';
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    expectancy_delta: number | null;
    win_rate_delta: number | null;
  };
  backtest_baseline: {
    expectancy_r: number;
    win_rate: number;
    profit_factor: number;
    n: number;
    oos_expectancy_r: number;
  };
}

export function useSignalLog(symbol?: string) {
  const params = symbol ? `?symbol=${symbol}` : '';
  return useQuery<{ entries: SignalLogEntry[]; total: number }>({
    queryKey: ['signal-log', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/signal-log${params}`);
      if (!res.ok) throw new Error('Failed to fetch signal log');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useSignalLogStats() {
  return useQuery<SignalLogStats>({
    queryKey: ['signal-log-stats'],
    queryFn: async () => {
      const res = await fetch('/api/signal-log/stats');
      if (!res.ok) throw new Error('Failed to fetch signal log stats');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useRefreshSignalLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/signal-log/refresh', { method: 'POST' });
      if (!res.ok) throw new Error('Refresh failed');
      return res.json();
    },
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['signal-log'] });
        qc.invalidateQueries({ queryKey: ['signal-log-stats'] });
      }, 3000);
    },
  });
}
