'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Card, ScorePill } from '@/components/ui/Card';
import { ArrowRight } from '@/components/ui/Icons';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
import { G } from '@/app/glossary';

const WATCHLIST_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '워치리스트 종목들의 Stage2 점수를 내림차순으로 보여주는 스크리닝 화면입니다. 가장 좋은 셋업의 종목을 빠르게 찾을 수 있습니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: 'Stage2 점수가 높을수록 기술적 조건이 좋은 종목입니다. Conviction 점수는 기술적(Stage2) + 소셜 심리 + 시장 Regime을 종합합니다. Checks 점 패턴으로 어떤 조건이 미달인지 한눈에 파악할 수 있습니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'Stage2 ≥ 5인 종목 확인 → Conviction ≥ 60 추가 확인 → Entry 가격 근처에서 알람 설정 → DeepDive에서 세부 분석 후 진입 결정.',
  },
];


const STRUCT_COLOR: Record<string, string> = {
  UPTREND: 'bull', DOWNTREND: 'bear', DISTRIBUTION: 'warn', ACCUMULATION: 'info', NEUTRAL: 'neutral',
};

const CHECK_LABELS: [keyof ReturnType<typeof useWatchlist>['watchlist'][number]['checks'], string][] = [
  ['price_above_emas', 'EMA'],
  ['ema200_rising',    '200↑'],
  ['near_52w_high',   '52H'],
  ['above_52w_low',   '52L'],
  ['pullback_shallow','Pull'],
  ['rs_strong',       'RS'],
  ['volume_contracting','Vol'],
];

export function WatchlistBoard() {
  const { symbol, setSymbol, setBoard } = useStore();
  const { watchlist, isLoading } = useWatchlist();
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const handler = () => setGuideOpen(true);
    document.addEventListener('guide:open', handler);
    return () => document.removeEventListener('guide:open', handler);
  }, []);

  // R:R 비교용 최대 편차 계산
  const maxRisk   = Math.max(...watchlist.map(w => w.entry - w.stop), 0.01);
  const maxReward = Math.max(...watchlist.map(w => w.target - w.entry), 0.01);
  const maxRange  = Math.max(maxRisk, maxReward);

  return (
    <div className="board-wrap">
      <BoardGuidePanel title="Watchlist 가이드" sections={WATCHLIST_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    <div className="board fade-in" style={{ gridTemplateColumns: '1fr 1fr 1fr', alignContent: 'start' }}>

      {/* 메인 테이블 — 3컬럼 전체 */}
      <div style={{ gridColumn: 'span 3' }}>
        <Card title="Watchlist · Stage 2 정렬" action={`${watchlist.length} 종목 · 점수 내림차순`}>
          {isLoading ? (
            <div className="subtle">로딩 중...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>Stage2 <InfoPopover term={G.stage2.term} body={G.stage2.body} /></span></th>
                  <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>RS <InfoPopover term={G.rs_score.term} body={G.rs_score.body} /></span></th>
                  <th>52w 고점</th>
                  <th>Entry</th>
                  <th>Stop</th>
                  <th>Target</th>
                  <th>Checks</th>
                  <th>월봉</th>
                  <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>Conviction <InfoPopover term={G.conviction.term} body={G.conviction.body} /></span></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map(w => (
                  <tr
                    key={w.symbol}
                    className={w.symbol === symbol ? 'selected' : ''}
                    onClick={() => { setSymbol(w.symbol); setBoard('deepdive'); }}
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
                    <td className="num" style={{ color: w.rs_score >= 70 ? 'var(--bull)' : w.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)' }}>
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
                      {(() => {
                        const mp = w.monthly_phase ?? 'UNKNOWN';
                        const cfg: Record<string, { short: string; color: string }> = {
                          CONFIRMED_UPTREND: { short: '↑확인', color: 'var(--bull)' },
                          WEAKENING:         { short: '↓약화', color: 'var(--warn)' },
                          NEUTRAL:           { short: '중립',  color: 'var(--fg-muted)' },
                          DOWNTREND:         { short: '↓하락', color: 'var(--bear)' },
                          UNKNOWN:           { short: '—',     color: 'var(--fg-subtle)' },
                        };
                        const c = cfg[mp] ?? cfg.UNKNOWN;
                        return <span style={{ fontSize: 11, fontWeight: 600, color: c.color }}>{c.short}</span>;
                      })()}
                    </td>
                    <td>
                      <ConvictionBadge score={w.conviction_score ?? undefined} label={w.conviction_label} size="sm" />
                    </td>
                    <td>
                      <button
                        className="btn btn--ghost"
                        style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                        onClick={(e) => { e.stopPropagation(); setSymbol(w.symbol); setBoard('deepdive'); }}
                      >
                        분석 <ArrowRight />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* RS Score 순위 바 */}
      <Card title="RS Score" action="SPY 대비 상대강도">
        {watchlist.length === 0 ? <div className="subtle">로딩 중...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[...watchlist].sort((a, b) => b.rs_score - a.rs_score).map(w => {
              const color = w.rs_score >= 70 ? 'var(--bull)' : w.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)';
              return (
                <div key={w.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ width: 44, fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0 }}>{w.symbol}</span>
                  <div className="bar" style={{ flex: 1 }}>
                    <div className="bar__fill" style={{ width: `${w.rs_score}%`, background: color }} />
                  </div>
                  <span className="mono" style={{ width: 36, textAlign: 'right', fontSize: 11, color }}>{w.rs_score.toFixed(1)}</span>
                </div>
              );
            })}
            <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', marginTop: 6 }}>
              <span style={{ color: 'var(--bull)' }}>●</span> ≥70 강세 &nbsp;
              <span style={{ color: 'var(--teal)' }}>●</span> 50~70 보통 &nbsp;
              <span style={{ color: 'var(--bear)' }}>●</span> &lt;50 약세
            </div>
          </div>
        )}
      </Card>

      {/* Stage 2 체크 히트맵 */}
      <Card title="Stage 2 체크 히트맵" action="7개 조건">
        {watchlist.length === 0 ? <div className="subtle">로딩 중...</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: 6, color: 'var(--fg-subtle)', fontWeight: 500, fontSize: 10 }}>심볼</th>
                  {CHECK_LABELS.map(([, label]) => (
                    <th key={label} style={{ textAlign: 'center', paddingBottom: 6, color: 'var(--fg-subtle)', fontWeight: 500, fontSize: 10, width: 32 }}>{label}</th>
                  ))}
                  <th style={{ textAlign: 'right', paddingBottom: 6, color: 'var(--fg-subtle)', fontWeight: 500, fontSize: 10 }}>합계</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map(w => (
                  <tr key={w.symbol}>
                    <td style={{ padding: '4px 0', fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 11 }}>{w.symbol}</td>
                    {CHECK_LABELS.map(([key]) => {
                      const ok = w.checks[key];
                      return (
                        <td key={key} style={{ textAlign: 'center', padding: '4px 0' }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 4, margin: '0 auto',
                            background: ok ? 'var(--bull)' : 'var(--bg-subtle)',
                            border: `1px solid ${ok ? 'var(--bull)' : 'var(--border)'}`,
                            opacity: ok ? 0.85 : 0.5,
                          }} />
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>
                      <ScorePill score={w.score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* R:R 비교 바 */}
      <Card title="Risk / Reward" action="Entry 기준 비교">
        {watchlist.length === 0 ? <div className="subtle">로딩 중...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {watchlist.map(w => {
              const risk   = w.entry - w.stop;
              const reward = w.target - w.entry;
              const riskW   = Math.round((risk   / maxRange) * 100);
              const rewardW = Math.round((reward / maxRange) * 100);
              const ratio = risk > 0 ? (reward / risk).toFixed(1) : '—';
              return (
                <div key={w.symbol} style={{ padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{w.symbol}</span>
                    <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>R:R 1 : {ratio}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {/* Risk 바 (오른쪽→왼쪽, 빨강) */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ width: `${riskW}%`, height: 7, borderRadius: '3px 0 0 3px', background: 'var(--bear)', opacity: 0.75 }} />
                    </div>
                    {/* Entry 중심 */}
                    <div style={{ width: 2, height: 14, background: 'var(--fg-muted)', borderRadius: 1, flexShrink: 0 }} />
                    {/* Reward 바 (왼쪽→오른쪽, 초록) */}
                    <div style={{ flex: 1 }}>
                      <div style={{ width: `${rewardW}%`, height: 7, borderRadius: '0 3px 3px 0', background: 'var(--bull)', opacity: 0.75 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--fg-subtle)', marginTop: 2 }}>
                    <span style={{ color: 'var(--bear)' }}>-${risk.toFixed(2)}</span>
                    <span style={{ color: 'var(--fg-subtle)', fontSize: 9 }}>${w.entry.toFixed(2)}</span>
                    <span style={{ color: 'var(--bull)' }}>+${reward.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

    </div>
    </div>
  );
}
