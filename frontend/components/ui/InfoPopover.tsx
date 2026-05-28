'use client';

import { useState, useEffect, useRef } from 'react';

const CLOSE_EVENT = 'info-pop:close-all';

interface Props {
  term: string;
  body: string;
}

export function InfoPopover({ term, body }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
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
        const top = rect.bottom + 6;
        const left = Math.max(10, Math.min(rect.right - popWidth, vpWidth - popWidth - 10));
        setPos({ top, left });
      }
    }
    setOpen(o => !o);
  }

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
      {open && (
        <div
          className="info-pop__body"
          role="tooltip"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
        >
          <div className="info-pop__term">{term}</div>
          <p className="info-pop__text">{body}</p>
        </div>
      )}
    </div>
  );
}
