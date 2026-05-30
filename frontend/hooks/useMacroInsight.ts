'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE, MacroInsightData } from '@/app/types';

export function useMacroInsight() {
  const { data, isLoading } = useQuery<MacroInsightData>({
    queryKey: ['macroInsight'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/macro/insight`);
      if (!res.ok) throw new Error('macro insight fetch failed');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  return { insightData: data ?? null, insightLoading: isLoading };
}
