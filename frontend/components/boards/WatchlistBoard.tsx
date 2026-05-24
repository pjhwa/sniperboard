'use client';

import { useStore } from '@/hooks/useStore';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Card, ScorePill } from '@/components/ui/Card';
import { ArrowRight } from '@/components/ui/Icons';

const STRUCT_COLOR: Record<string, string> = {
  UPTREND: 'bull', DOWNTREND: 'bear', DISTRIBUTION: 'warn', ACCUMULATION: 'info', NEUTRAL: 'neutral',
};

export function WatchlistBoard() {
  const { symbol, setSymbol } = useStore();
  const { watchlist, isLoading } = useWatchlist();

  return (
    <div className="board fade-in" style={{ gridTemplateColumns: '1fr' }}>
      <Card title="Watchlist · Stage 2 정렬" action={`${watchlist.length} 종목 · 점수 내림차순`}>
        {isLoading ? (
          <div className="subtle">로딩 중...</div>
        ) : (
          <div className="scroll" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Stage 2</th>
                  <th>RS</th>
                  <th>52w 고점</th>
                  <th>Entry</th>
                  <th>Stop</th>
                  <th>Target</th>
                  <th>Checks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map(w => (
                  <tr
                    key={w.symbol}
                    className={w.symbol === symbol ? 'selected' : ''}
                    onClick={() => setSymbol(w.symbol)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="sym-pill__badge" style={{ width: 22, height: 22, fontSize: 10 }}>{w.symbol[0]}</span>
                        <span style={{ fontWeight: 600 }}>{w.symbol}</span>
                      </div>
                    </td>
                    <td className="num">${w.price.toFixed(2)}</td>
                    <td><ScorePill score={w.score} /></td>
                    <td
                      className="num"
                      style={{ color: w.rs_score >= 70 ? 'var(--bull)' : w.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)' }}
                    >
                      {w.rs_score}
                    </td>
                    <td className="num">{w.pct_from_52w_high.toFixed(1)}%</td>
                    <td className="num" style={{ color: 'var(--info)' }}>${w.entry.toFixed(2)}</td>
                    <td className="num" style={{ color: 'var(--bear)' }}>${w.stop.toFixed(2)}</td>
                    <td className="num" style={{ color: 'var(--bull)' }}>${w.target.toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Object.values(w.checks).map((c, i) => (
                          <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: c ? 'var(--bull)' : 'var(--border)' }} />
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className="btn btn--ghost" style={{ height: 24, padding: '0 8px', fontSize: 11 }}>
                        분석 <ArrowRight />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
