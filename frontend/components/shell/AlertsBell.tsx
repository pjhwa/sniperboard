'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore, type Board } from '@/hooks/useStore';
import { useAlerts, type UserAlert } from '@/hooks/useAlerts';
import { Bell } from '@/components/ui/Icons';
import type { Locale } from '@/app/i18n';

const S = {
  title: { en: 'Alerts', ko: '알림' },
  empty: { en: 'No active alerts', ko: '활성 알림 없음' },
  method: {
    en: 'Earnings D-day · open signals · model health · briefing integrity',
    ko: '실적 D-day · 열린 신호 · 모델 헬스 · 브리핑 정합',
  },
  dismiss: { en: 'Dismiss', ko: '닫기' },
  clear: { en: 'Show dismissed', ko: '숨긴 알림 복원' },
  open: { en: 'Open', ko: '열기' },
};

function sevColor(sev: string): string {
  if (sev === 'critical') return 'var(--bear)';
  if (sev === 'high') return 'var(--warn, #d4a017)';
  if (sev === 'medium') return 'var(--em-500)';
  return 'var(--fg-muted)';
}

function AlertRow({
  a,
  locale,
  onOpen,
  onDismiss,
}: {
  a: UserAlert;
  locale: Locale;
  onOpen: (a: UserAlert) => void;
  onDismiss: (id: string) => void;
}) {
  const title = locale === 'ko' ? a.title_ko : a.title_en;
  const body = locale === 'ko' ? a.body_ko : a.body_en;
  return (
    <div
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: sevColor(a.severity),
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>{title}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: sevColor(a.severity),
            letterSpacing: '0.04em',
          }}
        >
          {a.severity}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.45, paddingLeft: 16 }}>
        {body}
      </div>
      <div style={{ display: 'flex', gap: 8, paddingLeft: 16, marginTop: 2 }}>
        <button
          type="button"
          onClick={() => onOpen(a)}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--em-500)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {locale === 'ko' ? S.open.ko : S.open.en}
          {a.symbol ? ` · ${a.symbol}` : ''}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(a.id)}
          style={{
            fontSize: 11,
            color: 'var(--fg-subtle)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {locale === 'ko' ? S.dismiss.ko : S.dismiss.en}
        </button>
      </div>
    </div>
  );
}

export function AlertsBell() {
  const { locale, setBoard, setSymbol, dismissedAlertIds, dismissAlert, clearDismissedAlerts } =
    useStore();
  const { data, isLoading, isError } = useAlerts(3);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const all = data?.alerts ?? [];
  const visible = all.filter((a) => !dismissedAlertIds.includes(a.id));
  const count = visible.length;
  const critical = visible.some((a) => a.severity === 'critical' || a.severity === 'high');

  const onOpen = (a: UserAlert) => {
    if (a.symbol) setSymbol(a.symbol);
    if (a.board) setBoard(a.board as Board);
    setOpen(false);
  };

  const lc = locale as Locale;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="topbar__btn"
        onClick={() => setOpen((o) => !o)}
        title={lc === 'ko' ? S.title.ko : S.title.en}
        style={{ position: 'relative' }}
        aria-label={lc === 'ko' ? S.title.ko : S.title.en}
      >
        <Bell />
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              background: critical ? 'var(--bear)' : 'var(--em-500)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            zIndex: 300,
            width: 340,
            maxHeight: 420,
            overflow: 'auto',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {lc === 'ko' ? S.title.ko : S.title.en}
                {count > 0 ? ` · ${count}` : ''}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 2 }}>
                {lc === 'ko' ? S.method.ko : S.method.en}
              </div>
            </div>
            {dismissedAlertIds.length > 0 && (
              <button
                type="button"
                onClick={() => clearDismissedAlerts()}
                style={{
                  fontSize: 10,
                  color: 'var(--em-500)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {lc === 'ko' ? S.clear.ko : S.clear.en}
              </button>
            )}
          </div>

          {isLoading && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--fg-muted)' }}>…</div>
          )}
          {isError && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--bear)' }}>
              {lc === 'ko' ? '알림을 불러오지 못했습니다' : 'Failed to load alerts'}
            </div>
          )}
          {!isLoading && !isError && visible.length === 0 && (
            <div style={{ padding: 16, fontSize: 12.5, color: 'var(--fg-muted)' }}>
              {lc === 'ko' ? S.empty.ko : S.empty.en}
            </div>
          )}
          {visible.map((a) => (
            <AlertRow
              key={a.id}
              a={a}
              locale={lc}
              onOpen={onOpen}
              onDismiss={dismissAlert}
            />
          ))}
        </div>
      )}
    </div>
  );
}
