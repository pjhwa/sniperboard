import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '@/app/types';

export interface BacktestStats {
  label: string;
  n: number;
  wins: number;
  losses: number;
  timeouts: number;
  win_rate: number;
  avg_win_pct: number;
  avg_loss_pct: number;
  avg_win_r: number;
  avg_loss_r: number;
  expectancy_r: number;
  profit_factor: number;
  mdd: number;
  max_consecutive_loss: number;
  avg_bars_held: number;
  equity_curve: { date: string; equity: number }[];
}

export interface BacktestSymbolResult {
  symbol: string;
  total_trades: number;
  all: BacktestStats;
  in_sample: BacktestStats;
  out_of_sample: BacktestStats;
  breakdown_by_score: Record<string, BacktestStats>;
  error?: string;
}

export interface MonteCarloStats {
  p5: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
  mean: number;
  std: number;
}

export interface MonteCarloResult {
  n_simulations: number;
  n_trades: number;
  expectancy_r: MonteCarloStats & { prob_positive: number };
  win_rate: MonteCarloStats;
  profit_factor: MonteCarloStats;
  mdd: MonteCarloStats;
  note?: string;
}

export interface BacktestResult {
  generated_at: string;
  config: {
    symbols: string[];
    stage2_threshold: number;
    rs_threshold?: number;
    use_spy_filter?: boolean;
    stop_atr_mult?: number;
    rr_ratio?: number;
    slippage_pct: number;
    timeout_bars: number;
    entry_window_bars: number;
    cooldown_bars: number;
    in_sample_end: string;
    data_start: string;
  };
  methodology: Record<string, string>;
  monte_carlo?: MonteCarloResult;
  aggregate: {
    all: BacktestStats;
    in_sample: BacktestStats;
    out_of_sample: BacktestStats;
  };
  breakdown_by_score: Record<string, BacktestStats>;
  by_symbol: Record<string, BacktestSymbolResult>;
}

const fetchBacktestResult = async (): Promise<BacktestResult> => {
  const res = await fetch(`${API_BASE}/api/backtest/result`);
  if (!res.ok) throw new Error('NO_CACHE');
  return res.json();
};

export function useBacktest() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['backtest_result'],
    queryFn: fetchBacktestResult,
    staleTime: Infinity,
    retry: false,
  });

  const runBacktest = async () => {
    setIsRunning(true);
    setRunError(null);
    try {
      const res = await fetch(`${API_BASE}/api/backtest/run`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '백테스트 실행 실패');
      }
      await queryClient.invalidateQueries({ queryKey: ['backtest_result'] });
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
    runBacktest,
  };
}
