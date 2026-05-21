import { useQuery } from '@tanstack/react-query';
import { API_BASE, RegimeData } from '../app/types';

const fetchRegime = async (): Promise<RegimeData> => {
  const res = await fetch(`${API_BASE}/api/regime`);
  if (!res.ok) throw new Error('Failed to fetch regime data');
  return res.json();
};

export function useRegime() {
  const query = useQuery({
    queryKey: ['regime'],
    queryFn: fetchRegime,
    staleTime: 60000,
    refetchInterval: 300000,
  });

  return {
    regimeData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
