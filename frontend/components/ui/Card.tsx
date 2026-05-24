'use client';

import React from 'react';

interface CardProps {
  title?: string;
  hint?: string | null;
  action?: string;
  flush?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Card({ title, hint, action, flush, children, style, className = '' }: CardProps) {
  return (
    <div className={'card ' + className} style={style}>
      {(title || action || hint) && (
        <div className="card__hd">
          {title && <h3>{title}</h3>}
          {hint && <span className="card-flag live">{hint}</span>}
          {action && <small>{action}</small>}
        </div>
      )}
      <div className={'card__bd ' + (flush ? 'card__bd--flush' : '')}>
        {children}
      </div>
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const cls = score >= 6 ? 's-high' : score >= 4 ? 's-mid' : 's-low';
  return <span className={'score-pill ' + cls}>{score}/7</span>;
}
