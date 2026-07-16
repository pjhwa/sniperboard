'use client';

import { useQuery } from '@tanstack/react-query';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface UserAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  symbol?: string | null;
  board?: string | null;
  title_en: string;
  title_ko: string;
  body_en: string;
  body_ko: string;
  days_until?: number;
  earnings_date?: string;
  status?: string;
  stage2_score?: number;
  health_status?: string;
}

export interface AlertsResponse {
  generated_at: string;
  count: number;
  counts_by_type: Record<string, number>;
  counts_by_severity: Record<string, number>;
  alerts: UserAlert[];
  methodology_en?: string;
  methodology_ko?: string;
}

export function useAlerts(maxEarningsDays = 3) {
  return useQuery<AlertsResponse>({
    queryKey: ['alerts', maxEarningsDays],
    queryFn: async () => {
      const res = await fetch(`/api/alerts?max_earnings_days=${maxEarningsDays}`);
      if (!res.ok) throw new Error(`alerts HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}
