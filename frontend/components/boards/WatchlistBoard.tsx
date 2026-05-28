'use client';

import { useStore } from '@/hooks/useStore';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Card, ScorePill } from '@/components/ui/Card';
import { ArrowRight } from '@/components/ui/Icons';
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';

const WATCHLIST_GLOSSARY: GlossaryItem[] = [
  { term: 'Symbol', plain: '종목 코드. 예) TSLA = Tesla, AAPL = Apple. 미국 주식 시장에서 각 회사를 식별하는 짧은 이름입니다.' },
  { term: 'Price (현재가)', plain: '지금 이 주식을 살 수 있는 가격(달러)입니다.' },
  { term: 'Stage 2 점수 (0~7)', plain: 'Minervini의 7가지 기준을 몇 개 충족하는지 나타냅니다. 6~7점이면 "지금 사기 좋은 조건", 3점 이하면 "아직 시기상조"를 의미합니다.', color: 'var(--bull)' },
  { term: 'RS Score (상대 강도)', plain: 'S&P500 지수(미국 전체 시장)와 비교해 이 주식이 얼마나 강한지 0~100으로 나타냅니다. 70 이상이면 시장 대부분의 주식보다 강하다는 뜻입니다.' },
  { term: '52W 고점 이격', plain: '최근 1년 중 가장 높았던 가격과 현재 가격의 차이(%)입니다. -10% 이내면 신고가 근처에 있어 강세 구간이고, -40% 이하면 많이 하락한 상태입니다.' },
  { term: 'Entry (피벗 진입가)', plain: '이 가격을 돌파하면 매수하라는 신호입니다. 최근 20일 최고가보다 0.5% 높게 설정되어, 돌파 확인 후 진입하는 방식입니다.', color: 'var(--info)' },
  { term: 'Stop (손절가)', plain: '이 가격 아래로 내려가면 손실을 제한하기 위해 팔아야 하는 가격입니다. 주가 변동폭(ATR)의 2배를 기준으로 설정합니다.', color: 'var(--bear)' },
  { term: 'Target (목표가 3R)', plain: '목표 수익 가격입니다. 리스크(손절폭)의 3배만큼 수익을 노리는 1:3 전략입니다. 예) 손절폭이 5달러면 목표 수익은 15달러.', color: 'var(--bull)' },
  { term: 'Checks (7개 점)', plain: '초록색 점은 조건 충족, 회색 점은 미달입니다. 7가지 조건: ① 모든 이평선 위 ② EMA200 상승 ③ 52주 고점 근처 ④ 52주 저점 위 ⑤ 조정 폭 작음 ⑥ RS 강세 ⑦ 거래량 수축' },
  { term: 'Conviction (확신 점수)', plain: 'Stage2 + 시장 심리 + Regime을 40/30/30으로 종합한 0~100 확신 점수. 높을수록 기술적·심리적으로 강한 구간. (Phase 1 실험적 기능)', color: 'var(--bull)' },
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

  // R:R 비교용 최대 편차 계산
  const maxRisk   = Math.max(...watchlist.map(w => w.entry - w.stop), 0.01);
  const maxReward = Math.max(...watchlist.map(w => w.target - w.entry), 0.01);
  const maxRange  = Math.max(maxRisk, maxReward);

  return (
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
                  <th>Stage 2</th>
                  <th>RS</th>
                  <th>52w 고점</th>
                  <th>Entry</th>
                  <th>Stop</th>
                  <th>Target</th>
                  <th>Checks</th>
                  <th>월봉</th>
                  <th>Conviction</th>
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
                      {(() => {
                        const s = w.conviction_score ?? 0;
                        const c = s >= 65 ? 'var(--bull)'
                                : s >= 50 ? 'var(--teal)'
                                : s >= 35 ? 'var(--warn)'
                                : 'var(--bear)';
                        const bg = s >= 65 ? 'var(--bull-soft)'
                                 : s >= 50 ? 'rgba(20,184,166,0.12)'
                                 : s >= 35 ? 'var(--warn-soft)'
                                 : 'var(--bear-soft)';
                        return (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 4, background: bg, fontSize: 11 }}>
                            <span style={{ fontWeight: 700, color: c, fontSize: 13 }}>{s > 0 ? s.toFixed(0) : '-'}</span>
                            <span style={{ color: c, fontSize: 10 }}>{w.conviction_label ?? ''}</span>
                          </div>
                        );
                      })()}
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

      {/* 데이터 설명 */}
      <div style={{ gridColumn: 'span 3' }}>
        <GlossaryPanel items={WATCHLIST_GLOSSARY} />
      </div>
    </div>
  );
}
