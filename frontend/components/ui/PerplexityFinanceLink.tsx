'use client';

import type { CSSProperties } from 'react';
import type { Locale } from '@/app/i18n';
import { perplexityFinanceUrl, type PerplexityFinancePage } from '@/lib/perplexityFinance';

const LABEL = {
  quote: {
    full: { en: 'Open on Perplexity Finance', ko: 'Perplexity Finance에서 보기' },
    compact: { en: 'Perplexity ↗', ko: 'Perplexity ↗' },
  },
  earnings: {
    full: { en: 'Open earnings on Perplexity', ko: 'Perplexity 실적에서 보기' },
    compact: { en: 'Earnings ↗', ko: '실적 ↗' },
  },
} as const;

export function PerplexityFinanceLink({
  symbol,
  locale,
  page = 'quote',
  compact = false,
  style,
}: {
  symbol: string;
  locale: Locale;
  page?: PerplexityFinancePage;
  compact?: boolean;
  style?: CSSProperties;
}) {
  const href = perplexityFinanceUrl(symbol, page);
  if (!href) return null;

  const pack = LABEL[page];
  const text = (compact ? pack.compact : pack.full)[locale] ?? pack.full.en;
  const title = pack.full[locale] ?? pack.full.en;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      style={{
        fontSize: compact ? 11 : 11.5,
        fontWeight: 600,
        color: 'var(--sky, #38bdf8)',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </a>
  );
}
