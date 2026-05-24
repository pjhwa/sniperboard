import { useQuery } from '@tanstack/react-query';
import { API_BASE, BriefResponse } from '../app/types';

async function fetchBrief(): Promise<BriefResponse> {
  const res = await fetch(`${API_BASE}/api/brief`);
  if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
  return res.json();
}

export function useBrief() {
  const { data, isLoading, error } = useQuery<BriefResponse>({
    queryKey: ['brief'],
    queryFn: fetchBrief,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 2,
  });

  return {
    briefData: data?.available ? data.data : null,
    isLoading,
    error: data?.error ?? (error ? String(error) : null),
  };
}
