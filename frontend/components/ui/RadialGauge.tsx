'use client';

import { useRef, useEffect } from 'react';

interface RadialGaugeProps {
  value?: number;
  max?: number;
  size?: number;
  label?: string | number;
  sublabel?: string;
}

export function RadialGauge({ value = 0, max = 100, size = 140, label, sublabel }: RadialGaugeProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cs = getComputedStyle(document.documentElement);
    const border = cs.getPropertyValue('--border').trim();
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const cx = size / 2, cy = size / 2;
    const r = size / 2 - 10;

    ctx.strokeStyle = border;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.stroke();

    const pct = Math.min(1, Math.max(0, value / max));
    const va = startAngle + (endAngle - startAngle) * pct;
    let color = cs.getPropertyValue('--bull').trim();
    if (pct < 0.2) color = cs.getPropertyValue('--bear').trim();
    else if (pct < 0.4) color = 'hsl(20 90% 55%)';
    else if (pct < 0.6) color = cs.getPropertyValue('--warn').trim();
    else if (pct < 0.8) color = cs.getPropertyValue('--teal').trim();

    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, va);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }, [value, max, size]);

  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <canvas ref={ref} />
      <div className="gauge__center">
        <div>
          <div className="gv">{label ?? value}</div>
          {sublabel && <div className="gl">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}
