import { useQuery } from '@tanstack/react-query';
import { API_BASE, SentimentData } from '../app/types';

async function fetchSentiment(): Promise<SentimentData> {
  const res = await fetch(`${API_BASE}/api/sentiment`);
  if (!res.ok) throw new Error(`sentiment fetch error: ${res.status}`);
  return res.json();
}

export function useSentiment() {
  return useQuery<SentimentData>({
    queryKey: ['sentiment'],
    queryFn: fetchSentiment,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
  });
}
