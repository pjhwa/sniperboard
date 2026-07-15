/**
 * Shared earnings date display — absolute date (SoT) + live relative D-n.
 * Phase A5: Overview / Daily / DeepDive must use the same formatter.
 */

export type EarningsLocale = 'en' | 'ko';

export function formatEarningsRelative(
  daysUntil: number | null | undefined,
  locale: EarningsLocale = 'en',
): string {
  if (daysUntil == null || Number.isNaN(Number(daysUntil))) {
    return locale === 'ko' ? '일정 미정' : 'TBD';
  }
  const d = Number(daysUntil);
  if (d === 0) return locale === 'ko' ? '오늘 발표' : 'reports today';
  if (d === 1) return locale === 'ko' ? '내일 발표' : 'tomorrow';
  if (d < 0) {
    const ago = Math.abs(d);
    return locale === 'ko' ? `${ago}일 전 발표` : `${ago}d ago`;
  }
  return locale === 'ko' ? `D-${d}` : `D-${d}`;
}

/** Full label: "2026-07-16 · D-2" */
export function formatEarningsLabel(
  earningsDate: string | null | undefined,
  daysUntil: number | null | undefined,
  locale: EarningsLocale = 'en',
): string {
  const abs = (earningsDate || '').trim() || (locale === 'ko' ? '날짜 없음' : 'no date');
  return `${abs} · ${formatEarningsRelative(daysUntil, locale)}`;
}

/** Compact banner text for Daily board */
export function formatEarningsBanner(
  daysUntil: number | null | undefined,
  locale: EarningsLocale = 'en',
): string {
  if (daysUntil == null) return locale === 'ko' ? '실적 일정' : 'EARNINGS';
  const d = Number(daysUntil);
  if (d === 0) return locale === 'ko' ? '실적 오늘' : 'EARNINGS TODAY';
  if (d === 1) return locale === 'ko' ? '실적 내일' : 'EARNINGS TOMORROW';
  if (d < 0) return locale === 'ko' ? `실적 ${Math.abs(d)}일 전` : `REPORTED ${Math.abs(d)}D AGO`;
  return locale === 'ko' ? `실적 D-${d}` : `EARNINGS D-${d}`;
}
