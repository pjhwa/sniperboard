import { useQuery } from '@tanstack/react-query';
import { API_BASE, PrePostData } from '../app/types';

const fetchPrePost = async (symbol: string): Promise<PrePostData> => {
  const res = await fetch(`${API_BASE}/api/prepost?symbol=${symbol}`);
  if (!res.ok) throw new Error('Failed to fetch pre/post market data');
  return res.json();
};

export function usePrePost(symbol: string) {
  const { data, isLoading, isError, isRefetching, error } = useQuery<PrePostData>({
    queryKey: ['prepost', symbol],
    queryFn: () => fetchPrePost(symbol),
    refetchInterval: 60_000,
    staleTime: 55_000,
    retry: 2,
  });

  return { prePostData: data, isLoading, isError, isRefetching, error };
}
