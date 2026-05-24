'use client';

import { useRef, useEffect } from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
}

export function Sparkline({ values, width = 56, height = 20, color, fill = true, strokeWidth = 1.2 }: SparklineProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !values || !values.length) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const last = values[values.length - 1];
    const first = values[0];
    const up = last >= first;
    const cs = getComputedStyle(document.documentElement);
    const c = color || (up ? cs.getPropertyValue('--bull').trim() : cs.getPropertyValue('--bear').trim());

    const padY = 2;
    const xPos = (i: number) => (i / (values.length - 1)) * (width - 2) + 1;
    const yPos = (v: number) => padY + (1 - (v - min) / range) * (height - padY * 2);

    if (fill) {
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.moveTo(xPos(0), height);
      values.forEach((v, i) => ctx.lineTo(xPos(i), yPos(v)));
      ctx.lineTo(xPos(values.length - 1), height);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = c;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    values.forEach((v, i) => {
      if (i === 0) ctx.moveTo(xPos(i), yPos(v));
      else ctx.lineTo(xPos(i), yPos(v));
    });
    ctx.stroke();

    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(xPos(values.length - 1), yPos(last), 1.6, 0, Math.PI * 2);
    ctx.fill();
  }, [values, width, height, color, fill, strokeWidth]);

  return <canvas ref={ref} className="spark" style={{ width, height }} />;
}
