/**
 * Shared earnings date display — absolute calendar date only (YYYY-MM-DD).
 * Relative phrases ("D-2", "3일 후", "tomorrow") are never shown in the UI.
 * days_until remains an internal sort/tier field; do not surface it as copy.
 */

export type EarningsLocale = 'en' | 'ko';

/** Absolute earnings date (source of truth). */
export function formatEarningsAbsolute(
  earningsDate: string | null | undefined,
  locale: EarningsLocale = 'en',
): string {
  const abs = (earningsDate || '').trim().slice(0, 10);
  if (!abs) return locale === 'ko' ? '날짜 없음' : 'no date';
  return abs;
}

/**
 * @deprecated Relative day language is disabled — returns absolute date when available,
 * otherwise empty. Prefer formatEarningsAbsolute.
 */
export function formatEarningsRelative(
  _daysUntil: number | null | undefined,
  locale: EarningsLocale = 'en',
  earningsDate?: string | null,
): string {
  if (earningsDate) return formatEarningsAbsolute(earningsDate, locale);
  return locale === 'ko' ? '일정 미정' : 'TBD';
}

/** Full label: absolute date only (e.g. "2026-07-16"). */
export function formatEarningsLabel(
  earningsDate: string | null | undefined,
  _daysUntil?: number | null,
  locale: EarningsLocale = 'en',
): string {
  return formatEarningsAbsolute(earningsDate, locale);
}

/** Compact banner: "실적 2026-07-16" / "EARNINGS 2026-07-16". */
export function formatEarningsBanner(
  earningsDate: string | null | undefined,
  locale: EarningsLocale = 'en',
  _daysUntil?: number | null,
): string {
  const abs = formatEarningsAbsolute(earningsDate, locale);
  if (!earningsDate) return locale === 'ko' ? '실적 일정' : 'EARNINGS';
  return locale === 'ko' ? `실적 ${abs}` : `EARNINGS ${abs}`;
}
