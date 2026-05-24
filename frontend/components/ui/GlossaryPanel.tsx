'use client';

import { useState } from 'react';

export interface GlossaryItem {
  term: string;
  plain: string;
  color?: string;
}

interface GlossaryPanelProps {
  items: GlossaryItem[];
  defaultOpen?: boolean;
}

export function GlossaryPanel({ items, defaultOpen = false }: GlossaryPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glossary">
      <button className="glossary__toggle" onClick={() => setOpen(o => !o)}>
        <span className="glossary__icon">?</span>
        <span>이 화면 데이터 설명</span>
        <span className="glossary__arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="glossary__body">
          {items.map((item, i) => (
            <div key={i} className="glossary__item">
              <div
                className="glossary__term"
                style={item.color ? { color: item.color } : undefined}
              >
                {item.term}
              </div>
              <div className="glossary__plain">{item.plain}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
