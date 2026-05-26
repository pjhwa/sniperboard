/**
 * Formats a UTC ISO string to the browser's local timezone.
 * Example output: "2026-05-26 06:00 KST"
 */

// Intl.DateTimeFormat timeZoneName:'short' returns "GMT+9" on Chrome/macOS
// instead of "KST". Map IANA names to standard abbreviations as fallback.
const IANA_ABBR: Record<string, string> = {
  'Asia/Seoul': 'KST',
  'Asia/Tokyo': 'JST',
  'Asia/Shanghai': 'CST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Singapore': 'SGT',
  'Asia/Kolkata': 'IST',
  'Asia/Dubai': 'GST',
  'Europe/London': 'BST',
  'Europe/Paris': 'CET',
  'Europe/Berlin': 'CET',
  'America/New_York': 'ET',
  'America/Chicago': 'CT',
  'America/Denver': 'MT',
  'America/Los_Angeles': 'PT',
  'Pacific/Auckland': 'NZST',
  'Australia/Sydney': 'AEST',
  'UTC': 'UTC',
};

function getTzAbbr(date: Date): string {
  // Try Intl first — works as "KST" on Firefox/some environments
  const raw = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
    .formatToParts(date)
    .find(p => p.type === 'timeZoneName')?.value ?? '';

  // If it's already a named abbreviation (not a GMT offset), use it
  if (raw && !/^GMT[+-]/.test(raw)) return raw;

  // Fall back to IANA → abbreviation map
  const iana = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (iana && IANA_ABBR[iana]) return IANA_ABBR[iana];

  // Last resort: keep "GMT+9" style as-is
  return raw;
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const datePart = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date); // → "2026-05-26"

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date); // → "06:00"

  return `${datePart} ${timePart} ${getTzAbbr(date)}`.trim();
}
