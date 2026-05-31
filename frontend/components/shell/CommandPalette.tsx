'use client';

import { useState, useEffect } from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { SYMBOLS } from '@/app/types';
import { GLOSSARY } from '@/app/glossary';
import { Bolt, Layers } from '@/components/ui/Icons';
import { t } from '@/app/i18n';

interface Item {
  type: 'symbol' | 'nav' | 'glossary';
  label: string;
  sub: string;
  action: () => void;
  meta: string;
}

export function CommandPalette() {
  const { cmdOpen, setCmdOpen, setSymbol, setBoard, locale } = useStore();
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
    { type: 'nav', label: 'Overview',  sub: locale === 'en' ? 'Market at a glance'           : '시장 한눈에 보기',         action: () => { setBoard('overview'  as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Intraday',  sub: locale === 'en' ? 'Short-term signals + 5m chart' : '단기 신호 + 5m 차트',      action: () => { setBoard('intraday'  as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Daily',     sub: locale === 'en' ? 'Stage 2 + R:R'                : 'Stage 2 + R:R',           action: () => { setBoard('daily'     as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Watchlist', sub: locale === 'en' ? 'Stage2-sorted table'          : 'Stage2 정렬 테이블',       action: () => { setBoard('watchlist' as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Macro',     sub: locale === 'en' ? 'Macro dashboard'              : '매크로 대시보드',           action: () => { setBoard('macro'     as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Sentiment', sub: locale === 'en' ? 'Social sentiment'             : '소셜 심리',                action: () => { setBoard('sentiment' as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Deep Dive', sub: locale === 'en' ? 'Full analysis'               : '종합분석',                 action: () => { setBoard('deepdive'  as Board); setCmdOpen(false); }, meta: 'Board' },
  ];

  const glossaryItems: Item[] = GLOSSARY
    .filter(e =>
      !glossaryQ ||
      t(e.term, locale).toLowerCase().includes(glossaryQ) ||
      t(e.body, locale).toLowerCase().includes(glossaryQ)
    )
    .map(e => ({
      type: 'glossary' as const,
      label: t(e.term, locale),
      sub: t(e.body, locale).slice(0, 80) + (t(e.body, locale).length > 80 ? '…' : ''),
      action: () => setCmdOpen(false),
      meta: locale === 'en' ? 'Term' : '용어',
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
          placeholder={isGlossaryMode
            ? (locale === 'en' ? '? Term search...' : '? 용어 검색...')
            : (locale === 'en' ? 'Symbol · Board · Signal search' : '종목 · 보드 · 신호 검색')
          }
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
            {locale === 'en' ? `Glossary search mode — ${items.length} results` : `용어 검색 모드 — ${items.length}개 결과`}
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
