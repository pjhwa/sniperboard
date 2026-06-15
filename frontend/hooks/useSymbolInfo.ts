import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/app/types';

export interface SymbolInfo {
  symbol: string;
  market_cap: number | null;
  week52_high: number | null;
  week52_low: number | null;
  sector: string | null;
  industry: string | null;
}

const fetchSymbolInfo = async (symbol: string): Promise<SymbolInfo> => {
  const res = await fetch(`${API_BASE}/api/symbol-info?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error('Failed to fetch symbol info');
  return res.json();
};

export function useSymbolInfo(symbol: string) {
  const { data, isLoading } = useQuery<SymbolInfo>({
    queryKey: ['symbol-info', symbol],
    queryFn: () => fetchSymbolInfo(symbol),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  return { symbolInfo: data, isLoading };
}
