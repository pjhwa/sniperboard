'use client';

import type { Locale } from '@/app/i18n';

export interface SourceResolved {
  display?: string | null;
  urls?: string[] | null;
  kind?: string | null;
  outlet?: string | null;
  note_en?: string | null;
  note_ko?: string | null;
}

function hostLabel(url: string): string {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, '');
    if (h.includes('news.google')) return 'Google News';
    if (h.includes('x.com') || h.includes('twitter.com')) return `@${u.pathname.replace(/^\//, '').split('/')[0]}`;
    return h.slice(0, 28);
  } catch {
    return url.slice(0, 32);
  }
}

/** Phase P2+ shared citation row — never invents links; only renders provided URLs. */
export function SourceCite({
  locale,
  sourceLabel,
  sourceText,
  sourceUrls,
  resolved,
  compact = false,
}: {
  locale: Locale;
  sourceLabel: string;
  sourceText?: string | null;
  sourceUrls?: string[] | null;
  resolved?: SourceResolved | null;
  compact?: boolean;
}) {
  const urls = (sourceUrls && sourceUrls.length
    ? sourceUrls
    : resolved?.urls) || [];
  const display = sourceText || resolved?.display || null;
  const note = locale === 'ko' ? (resolved?.note_ko || null) : (resolved?.note_en || null);

  if (!display && urls.length === 0) return null;

  return (
    <div style={{ marginTop: compact ? 2 : 4 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {display && (
          <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
            {sourceLabel} {display}
          </span>
        )}
        {urls.filter(Boolean).map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={note || url}
            style={{
              fontSize: 10,
              color: 'var(--em-500)',
              fontFamily: 'var(--font-mono)',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            ↗ {hostLabel(url)}
          </a>
        ))}
      </div>
      {!compact && note && urls.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--fg-faint)', marginTop: 2, lineHeight: 1.4 }}>
          {note}
        </div>
      )}
    </div>
  );
}
