'use client';

import { useStore } from '@/hooks/useStore';
import { SHORTCUTS } from '@/lib/shortcuts';

export function ShortcutsOverlay() {
  const { shortcutsOpen, setShortcutsOpen, locale } = useStore();
  if (!shortcutsOpen) return null;
  return (
    <div className="cmd-overlay" onClick={() => setShortcutsOpen(false)}>
      <div className="cmd" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <strong>{locale === 'en' ? 'Keyboard shortcuts' : '키보드 단축키'}</strong>
          <kbd>Esc</kbd>
        </div>
        <div className="cmd__list">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="cmd__item" style={{ cursor: 'default' }}>
              <div style={{ flex: 1 }}>{locale === 'en' ? s.descEn : s.descKo}</div>
              <div className="meta"><kbd>{s.keys}</kbd></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
