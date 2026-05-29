'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const CLOSE_EVENT = 'info-pop:close-all';

interface Props {
  term: string;
  body: string;
}

export function InfoPopover({ term, body }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean }>({ top: 0, left: 0, above: false });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setOpen(false);
    document.addEventListener(CLOSE_EVENT, handler);
    return () => document.removeEventListener(CLOSE_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      document.dispatchEvent(new Event(CLOSE_EVENT));
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const popWidth = 300;
        const vpWidth = window.innerWidth;
        const vpHeight = window.innerHeight;
        const above = vpHeight - rect.bottom < 220;
        const top = above ? rect.top - 6 : rect.bottom + 6;
        const left = Math.max(10, Math.min(rect.right - popWidth, vpWidth - popWidth - 10));
        setPos({ top, left, above });
      }
    }
    setOpen(o => !o);
  }

  const popup = open && typeof document !== 'undefined' ? createPortal(
    <div
      className="info-pop__body"
      role="tooltip"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        transform: pos.above ? 'translateY(-100%)' : undefined,
      }}
    >
      <div className="info-pop__term">{term}</div>
      <p className="info-pop__text">{body}</p>
    </div>,
    document.body
  ) : null;

  return (
    <div className="info-pop" ref={ref}>
      <button
        className="info-pop__trigger"
        onClick={toggle}
        aria-label={`${term} 설명`}
        aria-expanded={open}
      >
        ⓘ
      </button>
      {popup}
    </div>
  );
}
