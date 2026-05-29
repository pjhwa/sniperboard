'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface HeatCellProps {
  v: number;
  date?: string;
  close?: number;
  onEnter: (text: string, x: number, y: number) => void;
  onLeave: () => void;
}

function HeatCell({ v, date, close, onEnter, onLeave }: HeatCellProps) {
  const intensity = Math.min(1, Math.abs(v) / 2.5);
  const up = v >= 0;
  const baseColor = up ? 'var(--bull)' : 'var(--bear)';
  const pctStr = `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  const tooltipText = date && close != null
    ? `${date}  |  ${pctStr}  |  $${close.toFixed(2)}`
    : pctStr;

  return (
    <div
      className="heat-cell"
      style={{
        background: Math.abs(v) < 0.05
          ? 'var(--bg-subtle)'
          : `color-mix(in srgb, ${baseColor} ${Math.round(15 + intensity * 75)}%, transparent)`,
      }}
      onMouseEnter={e => {
        const r = (e.target as HTMLElement).getBoundingClientRect();
        onEnter(tooltipText, r.left + r.width / 2, r.top - 6);
      }}
      onMouseLeave={onLeave}
    />
  );
}

interface HeatStripProps {
  values: number[];
  cols?: number;
  rows?: number;
  dates?: string[];
  closes?: number[];
}

export function HeatStrip({ values, cols = 20, rows = 1, dates, closes }: HeatStripProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const total = cols * rows;
  const all = values.slice(-total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: rows }).map((_, r) => {
        const slice = all.slice(r * cols, (r + 1) * cols);
        return (
          <div key={r} className="heat-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {slice.map((v, i) => {
              const absIdx = r * cols + i;
              return (
                <HeatCell
                  key={i}
                  v={v}
                  date={dates?.[absIdx]}
                  close={closes?.[absIdx]}
                  onEnter={(text, x, y) => setTooltip({ text, x, y })}
                  onLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        );
      })}
      {tooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="strip__tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.text}
        </div>,
        document.body
      )}
    </div>
  );
}
