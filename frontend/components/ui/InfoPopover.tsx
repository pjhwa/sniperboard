'use client';

import { useState, useEffect, useRef } from 'react';

const CLOSE_EVENT = 'info-pop:close-all';

interface Props {
  term: string;
  body: string;
}

export function InfoPopover({ term, body }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when another popover opens
  useEffect(() => {
    const handler = () => setOpen(false);
    document.addEventListener(CLOSE_EVENT, handler);
    return () => document.removeEventListener(CLOSE_EVENT, handler);
  }, []);

  // Outside click + Escape when open
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
    if (!open) document.dispatchEvent(new Event(CLOSE_EVENT));
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
        <div className="info-pop__body" role="tooltip">
          <div className="info-pop__term">{term}</div>
          <p className="info-pop__text">{body}</p>
        </div>
      )}
    </div>
  );
}
