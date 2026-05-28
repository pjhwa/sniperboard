'use client';

interface ConvictionBadgeProps {
  score: number | null | undefined;
  label?: string | null;
  size?: 'sm' | 'md';
}

function convStyle(s: number): { color: string; bg: string } {
  if (s >= 65) return { color: 'var(--bull)', bg: 'var(--bull-soft)' };
  if (s >= 50) return { color: 'var(--teal)', bg: 'rgba(20,184,166,0.12)' };
  if (s >= 35) return { color: 'var(--warn)', bg: 'var(--warn-soft)' };
  return { color: 'var(--bear)', bg: 'var(--bear-soft)' };
}

export function ConvictionBadge({ score, label, size = 'md' }: ConvictionBadgeProps) {
  if (score == null) return null;
  const { color, bg } = convStyle(score);
  const isSm = size === 'sm';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: isSm ? 4 : 5,
      padding: isSm ? '2px 6px' : '3px 9px',
      borderRadius: 20,
      background: bg,
      border: `1px solid ${color}`,
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: isSm ? 11 : 13, fontWeight: 700, color, lineHeight: 1 }}>
        {Math.round(score)}
      </span>
      {label && (
        <span style={{ fontSize: isSm ? 9 : 10, color, opacity: 0.75, lineHeight: 1 }}>
          {label}
        </span>
      )}
    </div>
  );
}
