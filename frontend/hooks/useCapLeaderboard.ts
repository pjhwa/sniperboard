import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/app/types';

export interface CapLeaderboardItem {
  rank: number;
  symbol: string;
  company_name: string;
  market_cap: number;
  price: number;
  change_pct_1d: number;
  spark: number[];
  week52_high: number;
  week52_low: number;
  market_structure: string;
  rank_change: number | null;
}

export interface CapLeaderboardResponse {
  items: CapLeaderboardItem[];
  generated_at: string;
  cached: boolean;
}

const fetchCapLeaderboard = async (): Promise<CapLeaderboardResponse> => {
  const res = await fetch(`${API_BASE}/api/cap-leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch cap leaderboard');
  return res.json();
};

export function useCapLeaderboard() {
  const { data, isLoading, isError, refetch } = useQuery<CapLeaderboardResponse>({
    queryKey: ['cap-leaderboard'],
    queryFn: fetchCapLeaderboard,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  return { leaderboard: data, isLoading, isError, refetch };
}
