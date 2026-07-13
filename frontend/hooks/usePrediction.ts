'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/app/types';

export interface PredictionOutcome {
  label: string;
  probability: number;
  question?: string | null;
  volume_usd?: number | null;
}

export interface NextFomcPrediction {
  event_ticker?: string | null;
  event_title?: string | null;
  meeting_date?: string | null;
  as_of?: string | null;
  probabilities?: Record<string, number> | null;
  outcomes?: PredictionOutcome[] | null;
  dominant_outcome?: string | null;
  dominant_probability?: number | null;
  volume_usd?: number | null;
  liquidity_usd?: number | null;
  url?: string | null;
}

export interface PredictionData {
  generated_at?: string | null;
  schema_version?: string | null;
  slot?: string | null;
  source?: string | null;
  usage?: string | null;
  disclaimer_en?: string | null;
  disclaimer_ko?: string | null;
  next_fomc?: NextFomcPrediction | null;
}

export interface PredictionResponse {
  available: boolean;
  data?: PredictionData | null;
  error?: string | null;
  meta?: { fetched_at?: string; age_minutes?: number; source?: string } | null;
}

export function usePrediction() {
  const { data, isLoading, isError } = useQuery<PredictionResponse>({
    queryKey: ['prediction'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/prediction`);
      if (!res.ok) throw new Error(`prediction fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  return {
    prediction: data?.available ? data.data ?? null : null,
    available: data?.available ?? false,
    error: data?.error ?? null,
    meta: data?.meta ?? null,
    isLoading,
    isError,
  };
}
