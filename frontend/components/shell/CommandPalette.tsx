'use client';

import { useState, useEffect } from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { SYMBOLS } from '@/app/types';
import { GLOSSARY } from '@/app/glossary';
import { Bolt, Layers } from '@/components/ui/Icons';

interface Item {
  type: 'symbol' | 'nav' | 'glossary';
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

  const isGlossaryMode = q.startsWith('?');
  const glossaryQ = isGlossaryMode ? q.slice(1).trim().toLowerCase() : '';

  const navItems: Item[] = [
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

  const glossaryItems: Item[] = GLOSSARY
    .filter(e =>
      !glossaryQ ||
      e.term.toLowerCase().includes(glossaryQ) ||
      e.body.toLowerCase().includes(glossaryQ)
    )
    .map(e => ({
      type: 'glossary' as const,
      label: e.term,
      sub: e.body.length > 80 ? e.body.slice(0, 80) + '…' : e.body,
      action: () => setCmdOpen(false),
      meta: '용어',
    }));

  const items = isGlossaryMode ? glossaryItems : (
    q
      ? navItems.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.sub.toLowerCase().includes(q.toLowerCase()))
      : navItems
  );

  return (
    <div className="cmd-overlay" onClick={() => setCmdOpen(false)}>
      <div className="cmd" onClick={e => e.stopPropagation()}>
        <input
          className="cmd__inp"
          placeholder="종목, 보드 검색… (? 입력 시 용어 검색)"
          autoFocus
          value={q}
          onChange={e => { setQ(e.target.value); setSel(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(items.length - 1, s + 1)); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
            if (e.key === 'Enter')     { items[sel]?.action(); }
            if (e.key === 'Escape')    { setCmdOpen(false); }
          }}
        />
        {isGlossaryMode && (
          <div style={{ padding: '4px 16px', fontSize: 10.5, color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border)' }}>
            용어 검색 모드 — {items.length}개 결과
          </div>
        )}
        <div className="cmd__list">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={'cmd__item ' + (idx === sel ? 'sel' : '')}
              onMouseEnter={() => setSel(idx)}
              onClick={item.action}
            >
              <div className="ico">
                {item.type === 'symbol' ? <Bolt /> : item.type === 'glossary' ? <span style={{ fontSize: 12 }}>ⓘ</span> : <Layers />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
              </div>
              <div className="meta">{item.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
