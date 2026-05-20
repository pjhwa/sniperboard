import { useQuery } from '@tanstack/react-query';
import { API_BASE, DailyData } from '../app/types';

const fetchDailyData = async (symbol: string): Promise<DailyData> => {
  const res = await fetch(`${API_BASE}/api/daily?symbol=${symbol}`);
  if (!res.ok) throw new Error('Failed to fetch daily analysis');
  return res.json();
};

export function useDaily(symbol: string) {
  const query = useQuery({
    queryKey: ['daily_analysis', symbol],
    queryFn: () => fetchDailyData(symbol),
    staleTime: 60000, // 일봉 데이터는 자주 바뀌지 않으므로 1분 캐시 유지
  });

  return {
    dailyData: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
  };
}
