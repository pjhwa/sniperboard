'use client';

import { useStore } from '@/hooks/useStore';
import { useCalendar, useSectorQuadrants, useCorrelation } from '@/hooks/useOverlays';
import { Card } from '@/components/ui/Card';

const QCOLOR: Record<string, string> = {
  leading: 'var(--bull)',
  weakening: 'var(--warn, #d4a017)',
  lagging: 'var(--bear)',
  improving: 'var(--info, #38bdf8)',
};

export function MacroOverlays() {
  const { locale } = useStore();
  const cal = useCalendar();
  const sect = useSectorQuadrants();
  const corr = useCorrelation();
  const ref = locale === 'en' ? 'reference only' : '참고용';
  const pending = locale === 'en' ? 'Pending / unavailable' : '수집 대기 · 없음';

  const symbols: string[] = corr.data?.symbols || [];
  const matrix = corr.data?.matrix || {};

  return (
    <>
      <div style={{ gridColumn: 'span 3' }}>
        <Card title={locale === 'en' ? 'US macro calendar' : '미국 매크로 캘린더'} action={ref}>
          {!cal.data?.available ? (
            <div className="subtle">{cal.data?.error || pending}</div>
          ) : (cal.data.events || []).length === 0 ? (
            <div className="subtle">{locale === 'en' ? 'No CPI/FOMC/NFP-class events this week' : '이번 주 CPI/FOMC/NFP급 이벤트 없음'}</div>
          ) : (
            <div style={{ fontSize: 12 }}>
              {cal.data.events.slice(0, 8).map((e: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
                  <span className="mono">{e.date} {e.time}</span>
                  <span style={{ flex: 1 }}>{e.event}</span>
                  <span>{e.impact}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <Card title={locale === 'en' ? 'Sector quadrants' : '섹터 사분면'} action={locale === 'en' ? 'momentum × acceleration' : '모멘텀 × 가속도'}>
          {!sect.data?.available ? (
            <div className="subtle">{sect.data?.error || pending}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
              {(sect.data.sectors || []).map((s: any) => (
                <div key={s.symbol} style={{ border: '1px solid var(--border)', padding: 8, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{s.symbol}</div>
                  <div style={{ fontSize: 11, color: QCOLOR[s.quadrant] }}>{s.quadrant}</div>
                  <div className="mono" style={{ fontSize: 11 }}>{s.momentum > 0 ? '+' : ''}{Number(s.momentum).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <Card title={locale === 'en' ? 'Cross-asset correlation' : '교차자산 상관'} action="SPY QQQ GLD CL DXY TNX VIX">
          {!corr.data?.available || symbols.length === 0 ? (
            <div className="subtle">{corr.data?.error || pending}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th />
                    {symbols.map((s) => <th key={s}>{s.replace('=F', '').replace('^', '')}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((a) => (
                    <tr key={a}>
                      <td>{a.replace('=F', '').replace('^', '')}</td>
                      {symbols.map((b) => {
                        const v = matrix[a]?.[b];
                        return (
                          <td key={b} style={{ color: v > 0.5 ? 'var(--bull)' : v < -0.5 ? 'var(--bear)' : 'inherit' }}>
                            {v == null ? '—' : v.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
