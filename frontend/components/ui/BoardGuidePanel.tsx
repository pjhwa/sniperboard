'use client';

import { useEffect } from 'react';

export interface GuideSection {
  heading: string;
  body: string;
}

interface Props {
  title: string;
  sections: GuideSection[];
  isOpen: boolean;
  onClose: () => void;
}

export function BoardGuidePanel({ title, sections, isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="guide-overlay" onClick={onClose} />
      <div className="guide-panel">
        <div className="guide-panel__header">
          <span className="guide-panel__title">{title}</span>
          <button className="guide-panel__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="guide-panel__body">
          {sections.map((s, i) => (
            <div key={i} className="guide-panel__section">
              <div className="guide-panel__heading">{s.heading}</div>
              <p className="guide-panel__text">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
