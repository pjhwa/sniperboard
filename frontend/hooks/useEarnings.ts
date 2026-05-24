import { useQuery } from '@tanstack/react-query';
import { API_BASE, EarningsResponse } from '../app/types';

async function fetchEarnings(): Promise<EarningsResponse> {
  const res = await fetch(`${API_BASE}/api/earnings`);
  if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
  return res.json();
}

export function useEarnings() {
  const { data, isLoading, error } = useQuery<EarningsResponse>({
    queryKey: ['earnings'],
    queryFn: fetchEarnings,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 2,
  });

  return {
    earningsData: data?.available ? data.data : null,
    isLoading,
    error: data?.error ?? (error ? String(error) : null),
  };
}
