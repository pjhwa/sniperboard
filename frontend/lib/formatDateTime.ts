/**
 * Formats a UTC ISO string to the browser's local timezone.
 * Example output: "2026-05-26 06:00 KST"
 */
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

  const tzPart = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short',
  }).formatToParts(date).find(p => p.type === 'timeZoneName')?.value ?? ''; // → "KST"

  return `${datePart} ${timePart} ${tzPart}`.trim();
}
