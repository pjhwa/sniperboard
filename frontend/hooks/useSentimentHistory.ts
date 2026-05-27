import { useQuery } from '@tanstack/react-query';
import { API_BASE, SentimentHistoryData } from '../app/types';

async function fetchSentimentHistory(symbol: string, days: number): Promise<SentimentHistoryData> {
  const res = await fetch(`${API_BASE}/api/sentiment/history?symbol=${encodeURIComponent(symbol)}&days=${days}`);
  if (!res.ok) throw new Error(`sentiment history fetch error: ${res.status}`);
  return res.json();
}

export function useSentimentHistory(symbol: string | null, days: number) {
  return useQuery<SentimentHistoryData>({
    queryKey: ['sentimentHistory', symbol, days],
    queryFn: () => fetchSentimentHistory(symbol!, days),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
