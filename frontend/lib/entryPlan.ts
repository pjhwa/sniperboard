/**
 * Entry Plan helpers — pure, testable.
 *
 * Pivot Entry/Stop/Target remain engine-owned (20d high × 1.005, ATR stop, 1:3).
 * These helpers only classify setup status, distance, and a non-system
 * "market entry now" reference scenario.
 */

export type SetupStatus = 'ready' | 'watch' | 'invalid';

/** % the price must move from *here* to hit Entry. Positive = still below Entry. */
export function distanceToEntryPct(price: number, entry: number): number | null {
  if (!Number.isFinite(price) || !Number.isFinite(entry) || price <= 0 || entry <= 0) {
    return null;
  }
  return ((entry - price) / price) * 100;
}

/** % below Entry relative to Entry itself (for deep-drawdown thresholds). */
export function pctBelowEntry(price: number, entry: number): number | null {
  if (!Number.isFinite(price) || !Number.isFinite(entry) || entry <= 0) {
    return null;
  }
  return ((entry - price) / entry) * 100;
}

export interface ClassifySetupInput {
  price: number;
  entry: number;
  stage2Score: number;
  /** Correction from 20d high (%). Optional; when >15 reinforces Invalid. */
  pullbackPct?: number | null;
}

/**
 * Classify whether the pivot Entry plan is actionable now.
 *
 * - ready: Stage2 ≥ 5 and price within ~5% below Entry (or already above)
 * - watch: mid-distance / partial Stage2 — not an active buy cue
 * - invalid: far below Entry (>15% of Entry) and/or weak Stage2 — not a buy signal
 */
export function classifySetupStatus(input: ClassifySetupInput): SetupStatus {
  const { price, entry, stage2Score } = input;
  const pullbackPct = input.pullbackPct ?? null;

  if (!Number.isFinite(price) || !Number.isFinite(entry) || price <= 0 || entry <= 0) {
    return 'invalid';
  }
  if (!Number.isFinite(stage2Score)) {
    return 'invalid';
  }

  const below = pctBelowEntry(price, entry);
  if (below == null) return 'invalid';

  const farBelow = below > 15;
  const deepPullback = pullbackPct != null && pullbackPct > 15;
  const nearOrAbove = below <= 5; // within 5% of Entry or already through it

  if (farBelow || (deepPullback && below > 10)) {
    return 'invalid';
  }
  if (stage2Score <= 3 && below > 5) {
    return 'invalid';
  }
  if (stage2Score >= 5 && nearOrAbove) {
    return 'ready';
  }
  // Mid zone: Stage2 partial or still some distance
  if (stage2Score >= 4 || below <= 10) {
    return 'watch';
  }
  return 'invalid';
}

export function isDeepBreakdown(
  price: number,
  entry: number,
  pullbackPct?: number | null,
): boolean {
  const below = pctBelowEntry(price, entry);
  if (below != null && below > 15) return true;
  if (pullbackPct != null && pullbackPct > 15) return true;
  return false;
}

export interface MarketNowLevels {
  entry: number;
  stop: number;
  target: number;
  riskPerShare: number;
}

/**
 * Reference-only market-entry levels (current price + 2×ATR stop, 1:3 target).
 * Not the system pivot plan — for comparison only.
 */
export function marketNowLevels(price: number, atr: number): MarketNowLevels | null {
  if (!Number.isFinite(price) || !Number.isFinite(atr) || price <= 0 || atr <= 0) {
    return null;
  }
  const entry = Math.round(price * 100) / 100;
  const stop = Math.round((entry - 2 * atr) * 100) / 100;
  const risk = entry - stop;
  if (risk <= 0) return null;
  const target = Math.round((entry + 3 * risk) * 100) / 100;
  return { entry, stop, target, riskPerShare: Math.round(risk * 10000) / 10000 };
}

/** UI metadata for setup status badges (BiLang-ready plain maps). */
export const SETUP_STATUS_META: Record<
  SetupStatus,
  {
    label: { en: string; ko: string };
    hint: { en: string; ko: string };
    /** CSS badge tone used by boards */
    tone: 'bull' | 'warn' | 'bear' | 'neutral';
  }
> = {
  ready: {
    label: { en: 'Setup Ready', ko: '셋업 준비' },
    hint: {
      en: 'Stage2 strong and price near pivot Entry — plan is actionable on breakout.',
      ko: 'Stage2 강하고 피벗 Entry 근접 — 돌파 시 계획이 유효합니다.',
    },
    tone: 'bull',
  },
  watch: {
    label: { en: 'Watch', ko: '관망' },
    hint: {
      en: 'Not ready yet — wait for closer approach to Entry and/or stronger Stage2.',
      ko: '아직 준비 전 — Entry 근접 또는 Stage2 개선을 기다리세요.',
    },
    tone: 'warn',
  },
  invalid: {
    label: { en: 'Invalid · Avoid', ko: '셋업 무효 · 회피' },
    hint: {
      en: 'Not an active buy signal. Pivot levels are informational only until a new base forms.',
      ko: '지금 매수 신호가 아닙니다. 새 베이스가 잡힐 때까지 피벗 수치는 참고용입니다.',
    },
    tone: 'bear',
  },
};

export const DEEP_BREAKDOWN_COPY = {
  en: 'Deep drawdown from pivot — plan is not live. Wait for a new base and a fresh 20-day high before treating Entry as actionable.',
  ko: '피벗 대비 깊은 조정 — 계획이 살아 있지 않습니다. 새 베이스와 새로운 20일 고점이 잡힐 때까지 Entry를 진입 지시로 보지 마세요.',
};
