'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.json();
}

export function useInsider(symbol: string) {
  return useQuery({
    queryKey: ['insider', symbol],
    queryFn: () => getJson<any>(`/api/insider?symbol=${symbol}`),
    enabled: !!symbol,
    staleTime: 15 * 60 * 1000,
  });
}

export function useShortFloat(symbol: string) {
  return useQuery({
    queryKey: ['short-float', symbol],
    queryFn: () => getJson<any>(`/api/short-float?symbol=${symbol}`),
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000,
  });
}

export function useRsHorizons(symbol: string) {
  return useQuery({
    queryKey: ['rs-horizons', symbol],
    queryFn: () => getJson<any>(`/api/rs-horizons?symbol=${symbol}`),
    enabled: !!symbol,
    staleTime: 30 * 60 * 1000,
  });
}

export function useCalendar() {
  return useQuery({
    queryKey: ['calendar'],
    queryFn: () => getJson<any>('/api/calendar'),
    staleTime: 30 * 60 * 1000,
  });
}

export function useOptionsUnusual(symbol: string) {
  return useQuery({
    queryKey: ['options-unusual', symbol],
    queryFn: () => getJson<any>(`/api/options-unusual?symbol=${symbol}`),
    enabled: !!symbol,
    staleTime: 15 * 60 * 1000,
  });
}

export function useSectorQuadrants() {
  return useQuery({
    queryKey: ['sector-quadrants'],
    queryFn: () => getJson<any>('/api/sector-quadrants'),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCorrelation() {
  return useQuery({
    queryKey: ['correlation'],
    queryFn: () => getJson<any>('/api/correlation'),
    staleTime: 30 * 60 * 1000,
  });
}

export function useKelly() {
  return useQuery({
    queryKey: ['kelly'],
    queryFn: () => getJson<any>('/api/kelly'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAppStatus() {
  return useQuery({
    queryKey: ['app-status'],
    queryFn: () => getJson<any>('/api/status'),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useAlertRules() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => getJson<{ rules: any[] }>('/api/alert-rules'),
    staleTime: 30 * 1000,
  });
  const save = useMutation({
    mutationFn: async (rules: any[]) => {
      const res = await fetch('/api/alert-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) throw new Error(`alert-rules HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-rules'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
  return { ...query, save };
}
