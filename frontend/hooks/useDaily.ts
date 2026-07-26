import { useQuery } from '@tanstack/react-query';
import { API_BASE, DailyData } from '../app/types';

export class DailyFetchError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail || `Failed to fetch daily analysis (${status})`);
    this.name = 'DailyFetchError';
    this.status = status;
    this.detail = detail;
  }
}

const fetchDailyData = async (symbol: string): Promise<DailyData> => {
  const res = await fetch(`${API_BASE}/api/daily?symbol=${symbol}`);
  if (!res.ok) {
    let detail = `Failed to fetch daily analysis (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch { /* ignore */ }
    throw new DailyFetchError(res.status, detail);
  }
  return res.json();
};

export function useDaily(symbol: string) {
  const query = useQuery({
    queryKey: ['daily_analysis', symbol],
    queryFn: () => fetchDailyData(symbol),
    staleTime: 60000, // 일봉 데이터는 자주 바뀌지 않으므로 1분 캐시 유지
    retry: (count, err) => {
      // Don't thrash retries on known thin-history 404s
      if (err instanceof DailyFetchError && err.status === 404) return false;
      return count < 2;
    },
  });

  const err = query.error;
  const detail = err instanceof DailyFetchError ? err.detail : err ? String(err) : null;
  const insufficientHistory = Boolean(
    detail && /Insufficient historical|Stage2 needs|Insufficient history/i.test(detail),
  );

  return {
    dailyData: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    errorDetail: detail,
    insufficientHistory,
    refetch: query.refetch,
  };
}
