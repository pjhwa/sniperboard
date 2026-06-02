import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '@/app/types';

export interface SweepConfig {
  threshold: number;
  rs_threshold: number;
  use_spy_filter: boolean;
  stop_atr_mult: number;
  rr_ratio: number;
}

export interface SweepStats {
  n: number;
  win_rate: number;
  expectancy_r: number;
  profit_factor: number;
  mdd: number;
  max_consecutive_loss: number;
  avg_bars_held: number;
  equity_curve: { date: string; equity: number }[];
}

export interface SweepEntry {
  label: string;
  config: SweepConfig;
  aggregate: SweepStats;
  in_sample: SweepStats;
  out_of_sample: SweepStats;
}

export interface SweepResult {
  generated_at: string;
  symbols: string[];
  results: SweepEntry[];
}

const fetchSweepResult = async (): Promise<SweepResult> => {
  const res = await fetch(`${API_BASE}/api/backtest/sweep`);
  if (!res.ok) throw new Error('NO_CACHE');
  return res.json();
};

export function useSweep() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['backtest_sweep'],
    queryFn: fetchSweepResult,
    staleTime: Infinity,
    retry: false,
  });

  const runSweep = async () => {
    setIsRunning(true);
    setRunError(null);
    try {
      const res = await fetch(`${API_BASE}/api/backtest/sweep`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '스윕 실행 실패');
      }
      await queryClient.invalidateQueries({ queryKey: ['backtest_sweep'] });
    } catch (e: unknown) {
      setRunError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setIsRunning(false);
    }
  };

  return {
    result: query.data ?? null,
    isLoading: query.isLoading,
    hasCache: !query.isError,
    isRunning,
    runError,
    runSweep,
  };
}
