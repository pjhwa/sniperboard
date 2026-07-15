'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/app/types';

export interface MorningMood {
  traffic_light: 'green' | 'yellow' | 'red';
  label_en?: string;
  label_ko?: string;
  score?: number;
  explanation_en?: string;
  explanation_ko?: string;
}

export interface MorningBigPicture {
  summary_en?: string;
  summary_ko?: string;
  vix_note_en?: string;
  vix_note_ko?: string;
  rates_note_en?: string;
  rates_note_ko?: string;
  dollar_note_en?: string;
  dollar_note_ko?: string;
}

export interface MorningSectorAnalysis {
  leaders_en?: string;
  leaders_ko?: string;
  laggards_en?: string;
  laggards_ko?: string;
  rotation_signal_en?: string;
  rotation_signal_ko?: string;
}

export interface GlobalIssue {
  rank: number;
  tier: 'breaking' | 'ongoing';
  category: 'trade_tariff' | 'geopolitical' | 'central_bank' | 'ai_regulation';
  title_en?: string;
  title_ko?: string;
  current_state_en?: string;
  current_state_ko?: string;
  direction?: 'escalating' | 'de-escalating' | 'stable_elevated' | 'stable_fading';
  summary_en?: string;
  summary_ko?: string;
  source_hint?: string;
  /** Phase B2: optional explicit URLs (never invent if absent) */
  source_urls?: string[] | null;
  confidence?: 'confirmed' | 'developing' | 'unverified';
  asymmetric_impact_en?: string;
  asymmetric_impact_ko?: string;
  impact_direction?: 'positive' | 'negative' | 'neutral' | 'watch';
  market_insight_en?: string;
  market_insight_ko?: string;
  /** @deprecated use asymmetric_impact_en */
  us_stock_impact_en?: string;
  /** @deprecated use asymmetric_impact_ko */
  us_stock_impact_ko?: string;
}

export interface GlobalContext {
  fetched_at?: string;
  search_window?: string;
  issues: GlobalIssue[];
  ongoing_no_update?: string[];
  market_paradox_en?: string;
  market_paradox_ko?: string;
  fallback?: boolean;
}

export interface MorningSpotlight {
  symbol: string;
  company: string;
  tier: number;
  why_en?: string;
  why_ko?: string;
  watch_level_en?: string;
  watch_level_ko?: string;
}

export interface MorningWatchlistItem {
  symbol: string;
  company: string;
  tier: number;
  price?: number;
  stage2_score?: number;
  analysis_en?: string;
  analysis_ko?: string;
  sentiment_mood?: string;
  sentiment_score?: number;
  action: 'buy' | 'hold' | 'watch' | 'avoid';
  // v1 compat
  price_trend_en?: string;
  price_trend_ko?: string;
  condition_en?: string;
  condition_ko?: string;
  squeeze_potential?: string;
  correction_risk?: string;
}

export interface MorningBriefingData {
  generated_at?: string;
  schema_version?: string;
  slot?: string;
  headline_en?: string;
  headline_ko?: string;
  executive_bullets_en: string[];
  executive_bullets_ko: string[];
  market_mood?: MorningMood;
  big_picture?: MorningBigPicture;
  sector_analysis?: MorningSectorAnalysis;
  spotlight: MorningSpotlight[];
  watchlist: MorningWatchlistItem[];
  today_checkpoints_en: string[];
  today_checkpoints_ko: string[];
  earnings_alert_en?: string;
  earnings_alert_ko?: string;
  global_context?: GlobalContext;
}

export interface MorningBriefingMeta {
  fetched_at: string;
  age_minutes: number;
  source: string;
}

interface BriefingResponse {
  available: boolean;
  data?: MorningBriefingData;
  error?: string;
  meta?: MorningBriefingMeta;
}

async function fetchBriefing(): Promise<BriefingResponse> {
  const res = await fetch(`${API_BASE}/api/morning-briefing`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useMorningBriefing() {
  const { data, isLoading, error } = useQuery<BriefingResponse>({
    queryKey: ['morning-briefing'],
    queryFn: fetchBriefing,
    staleTime: 10 * 60 * 1000,  // 10분 — 하루 1회 갱신
    retry: 1,
  });

  return {
    briefingData: data?.data ?? null,
    briefingMeta: data?.meta ?? null,
    available: data?.available ?? false,
    isLoading,
    error: data?.error ?? (error ? String(error) : null),
  };
}
