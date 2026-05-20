import { useQuery } from '@tanstack/react-query';
import { API_BASE, WatchlistItem } from '../app/types';

interface WatchlistFetchResult {
  watchlist: WatchlistItem[];
}

const fetchWatchlistData = async (): Promise<WatchlistFetchResult> => {
  const res = await fetch(`${API_BASE}/api/watchlist`);
  if (!res.ok) throw new Error('Failed to fetch watchlist');
  return res.json();
};

export function useWatchlist() {
  const query = useQuery({
    queryKey: ['watchlist_analysis'],
    queryFn: fetchWatchlistData,
    staleTime: 60000, // 워치리스트 데이터 캐시 유지
  });

  return {
    watchlist: query.data?.watchlist ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
  };
}
