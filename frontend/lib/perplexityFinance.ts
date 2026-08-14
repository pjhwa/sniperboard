/** Public Perplexity Finance URLs. No API — deep links only. */

const TICKER_RE = /^[A-Z][A-Z0-9.]{0,9}$/;
const FINANCE_ORIGIN = 'https://www.perplexity.ai/finance';

export type PerplexityFinancePage = 'quote' | 'earnings';

/** Normalize a user/store ticker. Rejects indices/futures (^VIX, CL=F, KRW=X). */
export function normalizeFinanceTicker(symbol: string): string | null {
  const ticker = symbol.trim().toUpperCase();
  if (!TICKER_RE.test(ticker)) return null;
  return ticker;
}

export function perplexityFinanceUrl(
  symbol: string,
  page: PerplexityFinancePage = 'quote',
): string | null {
  const ticker = normalizeFinanceTicker(symbol);
  if (!ticker) return null;
  const base = `${FINANCE_ORIGIN}/${encodeURIComponent(ticker)}`;
  return page === 'earnings' ? `${base}/earnings` : base;
}
