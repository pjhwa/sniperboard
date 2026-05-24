'use client';

import { useState, useEffect } from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { SYMBOLS } from '@/app/types';
import { Bolt, Layers } from '@/components/ui/Icons';

interface Item {
  type: 'symbol' | 'nav';
  label: string;
  sub: string;
  action: () => void;
  meta: string;
}

export function CommandPalette() {
  const { cmdOpen, setCmdOpen, setSymbol, setBoard } = useStore();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  useEffect(() => { if (cmdOpen) { setQ(''); setSel(0); } }, [cmdOpen]);

  if (!cmdOpen) return null;

  const items: Item[] = [
    ...SYMBOLS.map(s => ({
      type: 'symbol' as const,
      label: s,
      sub: s,
      action: () => { setSymbol(s); setCmdOpen(false); },
      meta: 'Symbol',
    })),
    { type: 'nav', label: 'Overview',  sub: '시장 한눈에 보기',         action: () => { setBoard('overview'  as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Intraday',  sub: '단기 신호 + 5m 차트',     action: () => { setBoard('intraday'  as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Daily',     sub: 'Stage 2 + R:R',          action: () => { setBoard('daily'     as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Watchlist', sub: 'Stage2 정렬 테이블',      action: () => { setBoard('watchlist' as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Macro',     sub: '섹터 로테이션 + 21개',    action: () => { setBoard('macro'     as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Sentiment', sub: '시장 심리 + 종목별 점수', action: () => { setBoard('sentiment' as Board); setCmdOpen(false); }, meta: 'Board' },
  ];

  const filtered = q
    ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.sub.toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <div className="cmd-overlay" onClick={() => setCmdOpen(false)}>
      <div className="cmd" onClick={e => e.stopPropagation()}>
        <input
          className="cmd__inp"
          placeholder="종목, 보드, 신호 검색..."
          autoFocus
          value={q}
          onChange={e => { setQ(e.target.value); setSel(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(filtered.length - 1, s + 1)); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
            if (e.key === 'Enter')     { filtered[sel]?.action(); }
            if (e.key === 'Escape')    { setCmdOpen(false); }
          }}
        />
        <div className="cmd__list">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className={'cmd__item ' + (idx === sel ? 'sel' : '')}
              onMouseEnter={() => setSel(idx)}
              onClick={item.action}
            >
              <div className="ico">
                {item.type === 'symbol' ? <Bolt /> : <Layers />}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{item.sub}</div>
              </div>
              <div className="meta">{item.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
