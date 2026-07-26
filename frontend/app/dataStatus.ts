/**
 * Watchlist / Stage2 data-availability helpers.
 * Thin-history IPOs (e.g. SPCX) must not look like Stage2 0/7 failures.
 */

export interface HistoryAwareItem {
  data_status?: string | null;
  entry?: number | null;
  score?: number | null;
  conviction_notes?: string[] | null;
  bars_available?: number | null;
  bars_needed?: number | null;
}

export function isInsufficientHistory(item: HistoryAwareItem | null | undefined): boolean {
  if (!item) return false;
  if (item.data_status === 'insufficient_history') return true;
  const notes = item.conviction_notes ?? [];
  if (notes.some((n) => /Insufficient historical|Stage2 needs|데이터 부족|recent IPO/i.test(n))) {
    return true;
  }
  // Fallback: zeroed Stage2 shell used for thin history
  if ((item.entry ?? 0) === 0 && (item.score ?? 0) === 0 && notes.length > 0) {
    return true;
  }
  return false;
}

export function thinHistoryLabel(
  item: HistoryAwareItem,
  locale: 'en' | 'ko',
): string {
  const have = item.bars_available;
  const need = item.bars_needed;
  if (have != null && need != null) {
    return locale === 'ko'
      ? `데이터 부족 (${have}/${need}일)`
      : `Limited data (${have}/${need}d)`;
  }
  return locale === 'ko' ? '데이터 부족' : 'Limited data';
}

export function thinHistoryHint(locale: 'en' | 'ko'): string {
  return locale === 'ko'
    ? '최근 상장·히스토리 부족 — Stage2/진입가 산출 전'
    : 'Recent IPO / short history — Stage2 & entry not computed yet';
}
