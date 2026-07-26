import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/app/types';

export interface InsightReturnStats {
  n: number;
  avg_return: number | null;
  median_return: number | null;
  hit_rate: number | null;
  confidence: string;
  honest_gap_en?: string | null;
  honest_gap_ko?: string | null;
}

export interface InsightPayload {
  available: boolean;
  generated_at?: string;
  window_days: number;
  action_horizon_days: number;
  source: {
    insight_data_root?: string | null;
    sentiment_snapshots: number;
    brief_snapshots: number;
    macro_snapshots: number;
    briefing_snapshots: number;
    price_symbols: number;
    build_ms: number;
  };
  disclaimer_en: string;
  disclaimer_ko: string;
  mvp1_divergence: {
    methodology_en: string;
    methodology_ko: string;
    horizons: number[];
    n_total_events: number;
    groups: {
      divergence: string;
      n_events: number;
      horizons: Record<string, InsightReturnStats>;
      interpretation_en: string;
      interpretation_ko: string;
    }[];
    contrast_bullish_vs_none_5d: {
      avg_a: number | null;
      avg_b: number | null;
      delta_a_minus_b: number | null;
      n_a: number;
      n_b: number;
      note_en: string;
      note_ko: string;
    };
  };
  mvp2_actions: {
    brief: {
      horizon_days: number;
      methodology_en: string;
      methodology_ko: string;
      n_events: number;
      by_action: {
        action: string;
        n: number;
        avg_return: number | null;
        median_return: number | null;
        positive_rate: number | null;
        directional_hit_rate: number | null;
        confidence: string;
        honest_gap_en?: string | null;
        honest_gap_ko?: string | null;
        scored_directionally: boolean;
      }[];
    };
    briefing: {
      horizon_days: number;
      methodology_en: string;
      methodology_ko: string;
      n_events: number;
      by_action: {
        action: string;
        n: number;
        avg_return: number | null;
        median_return: number | null;
        positive_rate: number | null;
        directional_hit_rate: number | null;
        confidence: string;
        honest_gap_en?: string | null;
        honest_gap_ko?: string | null;
        scored_directionally: boolean;
      }[];
    };
  };
  mvp3_themes: {
    methodology_en: string;
    methodology_ko: string;
    n_theme_days: number;
    themes: {
      theme: string;
      count_days: number;
      max_streak_days: number;
      first_date: string;
      last_date: string;
      spy_same_day_stats?: InsightReturnStats | null;
    }[];
  };
  mvp4_macro: {
    methodology_en: string;
    methodology_ko: string;
    current_judgment: string | null;
    n_days: number;
    dwell_days: Record<string, number>;
    transitions: {
      date: string;
      from: string;
      to: string;
      market_composite: number | null;
      composite_delta_vs_prev: number | null;
    }[];
    n_transitions: number;
  };
  mvp4_pre_post: {
    methodology_en: string;
    methodology_ko: string;
    n_days: number;
    avg_delta: number | null;
    median_delta: number | null;
    improved_rate: number | null;
    confidence: string;
    honest_gap_en?: string | null;
    honest_gap_ko?: string | null;
    recent: { date: string; pre: number; post: number; delta: number }[];
  };
  integrity: {
    passed: boolean;
    fail_count: number;
    warn_count: number;
    issues: {
      code: string;
      severity: string;
      message_en: string;
      message_ko: string;
    }[];
  };
}

async function fetchInsight(days: number, horizon: number): Promise<InsightPayload> {
  const res = await fetch(`${API_BASE}/api/insight?days=${days}&horizon=${horizon}`);
  if (!res.ok) throw new Error(`Insight fetch failed: ${res.status}`);
  return res.json();
}

export function useInsight(days = 60, horizon = 5) {
  const query = useQuery({
    queryKey: ['insight', days, horizon],
    queryFn: () => fetchInsight(days, horizon),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
