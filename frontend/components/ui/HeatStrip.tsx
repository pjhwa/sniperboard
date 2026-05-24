'use client';

interface HeatStripProps {
  values: number[];
  cols?: number;
}

export function HeatStrip({ values, cols = 20 }: HeatStripProps) {
  const cells = values.slice(-cols);
  return (
    <div className="heat-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {cells.map((v, i) => {
        const intensity = Math.min(1, Math.abs(v) / 2.5);
        const up = v >= 0;
        const baseColor = up ? 'var(--bull)' : 'var(--bear)';
        return (
          <div
            key={i}
            className="heat-cell"
            title={`${v.toFixed(2)}%`}
            style={{
              background: v === 0
                ? 'var(--bg-subtle)'
                : `color-mix(in srgb, ${baseColor} ${Math.round(15 + intensity * 75)}%, transparent)`,
            }}
          />
        );
      })}
    </div>
  );
}
