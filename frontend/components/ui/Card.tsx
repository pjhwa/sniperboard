'use client';

import React from 'react';
import { InfoPopover } from '@/components/ui/InfoPopover';

interface CardInfo {
  term: string;
  body: string;
}

interface CardProps {
  title?: string;
  hint?: string | null;
  action?: string;
  flush?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  info?: CardInfo;
}

export function Card({ title, hint, action, flush, children, style, className = '', info }: CardProps) {
  return (
    <div className={'card ' + className} style={style}>
      {(title || action || hint || info) && (
        <div className="card__hd">
          {title && <h3>{title}</h3>}
          {info && <InfoPopover term={info.term} body={info.body} />}
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
