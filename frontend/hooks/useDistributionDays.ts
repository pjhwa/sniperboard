import { useQuery } from '@tanstack/react-query';
import { API_BASE, DistributionDayData } from '../app/types';

const fetchDistributionDays = async (): Promise<DistributionDayData> => {
  const res = await fetch(`${API_BASE}/api/distribution-days`);
  if (!res.ok) throw new Error('Failed to fetch distribution days');
  return res.json();
};

export function useDistributionDays() {
  const query = useQuery({
    queryKey: ['distribution_days'],
    queryFn: fetchDistributionDays,
    staleTime: 60000,
    refetchInterval: 300000,
  });

  return {
    ddData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
