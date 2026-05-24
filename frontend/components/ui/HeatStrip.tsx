'use client';

interface HeatStripProps {
  values: number[];
  cols?: number;
  rows?: number;
}

function HeatCell({ v }: { v: number }) {
  const intensity = Math.min(1, Math.abs(v) / 2.5);
  const up = v >= 0;
  const baseColor = up ? 'var(--bull)' : 'var(--bear)';
  return (
    <div
      className="heat-cell"
      title={`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
      style={{
        background: Math.abs(v) < 0.05
          ? 'var(--bg-subtle)'
          : `color-mix(in srgb, ${baseColor} ${Math.round(15 + intensity * 75)}%, transparent)`,
      }}
    />
  );
}

export function HeatStrip({ values, cols = 20, rows = 1 }: HeatStripProps) {
  const total = cols * rows;
  const all = values.slice(-total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: rows }).map((_, r) => {
        const slice = all.slice(r * cols, (r + 1) * cols);
        return (
          <div key={r} className="heat-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {slice.map((v, i) => <HeatCell key={i} v={v} />)}
          </div>
        );
      })}
    </div>
  );
}
