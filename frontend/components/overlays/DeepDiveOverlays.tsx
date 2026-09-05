'use client';

import { useStore } from '@/hooks/useStore';
import { useInsider, useShortFloat, useRsHorizons, useOptionsUnusual } from '@/hooks/useOverlays';
import { Card } from '@/components/ui/Card';

export function DeepDiveOverlays({ symbol }: { symbol: string }) {
  const { locale, overlayFocus } = useStore();
  const insider = useInsider(symbol);
  const shortf = useShortFloat(symbol);
  const rs = useRsHorizons(symbol);
  const opts = useOptionsUnusual(symbol);
  const pending = locale === 'en' ? 'Pending / unavailable' : '수집 대기 · 없음';
  const ref = locale === 'en' ? 'reference only — not in Conviction' : '참고용 — Conviction 미반영';

  return (
    <div
      id="overlay-insider"
      className="mob-inner-stack"
      style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}
    >
      <Card title={locale === 'en' ? 'Insider Form 4' : '내부자 Form 4'} action={ref}>
        {!insider.data?.available ? (
          <div className="subtle">{insider.data?.error || pending}</div>
        ) : (
          <>
            <div style={{ fontSize: 12, marginBottom: 6 }}>
              {insider.data.cluster_buy
                ? (locale === 'en' ? 'Cluster buy (7d, 2+ buyers)' : '클러스터 매수 (7일, 2인+)')
                : (locale === 'en' ? 'No 7d cluster buy' : '7일 클러스터 매수 없음')}
            </div>
            <div style={{ maxHeight: 140, overflow: 'auto', fontSize: 11 }}>
              {(insider.data.trades || []).slice(0, 8).map((t: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '2px 0' }}>
                  <span>{t.owner || '—'}</span>
                  <span className="mono">{t.txn_type} {t.date}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {overlayFocus === 'insider' && <div className="subtle" style={{ marginTop: 6 }}>GO INSIDER</div>}
      </Card>
      <Card title={locale === 'en' ? 'Short % float' : '공매도 비중'} action={ref}>
        {shortf.data?.short_percent_of_float == null ? (
          <div className="subtle">{shortf.data?.error || pending}</div>
        ) : (
          <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{shortf.data.short_percent_of_float.toFixed(2)}%</div>
        )}
      </Card>
      <Card title={locale === 'en' ? 'RS horizons' : 'RS 멀티기간'} action={ref}>
        {!rs.data?.horizons ? (
          <div className="subtle">{rs.data?.error || pending}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
            {(['1m', '3m', '6m', '12m'] as const).map((k) => (
              <div key={k}>
                {k}{' '}
                <b className={rs.data.horizons[k] >= 0 ? 'chg up' : 'chg down'}>
                  {rs.data.horizons[k] == null ? '—' : `${rs.data.horizons[k] > 0 ? '+' : ''}${rs.data.horizons[k].toFixed(1)}%`}
                </b>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title={locale === 'en' ? 'Unusual options' : '이상 옵션'} action={ref}>
        {!opts.data?.available ? (
          <div className="subtle">{opts.data?.error || pending}</div>
        ) : (opts.data.contracts || []).length === 0 ? (
          <div className="subtle">{locale === 'en' ? 'No unusual contracts' : '이상 계약 없음'}</div>
        ) : (
          <div style={{ maxHeight: 140, overflow: 'auto', fontSize: 11 }}>
            {opts.data.contracts.slice(0, 6).map((c: any, i: number) => (
              <div key={i} className="mono">
                {c.type} {c.strike} vol {c.volume} OI {c.open_interest}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
