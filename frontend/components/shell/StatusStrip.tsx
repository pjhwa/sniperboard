'use client';

import { useStore } from '@/hooks/useStore';
import { useAppStatus } from '@/hooks/useOverlays';

export function StatusStrip() {
  const { locale } = useStore();
  const { data, isError, dataUpdatedAt } = useAppStatus();
  const ageSec = dataUpdatedAt ? Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 1000)) : null;
  const conn = isError ? 'down' : (data?.connection === 'ok' ? 'ok' : '…');
  const health = data?.model_health || '—';
  return (
    <footer className="status-strip" aria-label="status">
      <span>
        {locale === 'en' ? 'CONN' : '연결'}{' '}
        <b style={{ color: conn === 'ok' ? 'var(--bull)' : conn === 'down' ? 'var(--bear)' : 'var(--fg-muted)' }}>{conn}</b>
      </span>
      <span>
        {locale === 'en' ? 'DATA' : '데이터'}{' '}
        <b>{ageSec == null ? '—' : `${ageSec}s`}</b>
      </span>
      <span>
        {locale === 'en' ? 'HEALTH' : '헬스'}{' '}
        <b>{health}</b>
        {data?.n_closed != null && <span className="subtle"> n={data.n_closed}</span>}
      </span>
    </footer>
  );
}
