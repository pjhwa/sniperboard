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

export function WatchlistBoard() {
  const { symbol, setSymbol, setBoard } = useStore();
  const { watchlist, isLoading } = useWatchlist();

  return (
    <div className="board fade-in" style={{ gridTemplateColumns: '1fr', alignContent: 'start' }}>
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
                  <th>Conviction</th>
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
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 11, lineHeight: 1.1 }}>
                        <span style={{ fontWeight: 600, color: (w.conviction_score ?? 0) >= 70 ? 'var(--bull)' : 'var(--teal)' }}>
                          {w.conviction_score?.toFixed(0) ?? '-'}
                        </span>
                        <span className="subtle" style={{ fontSize: 10 }}>{w.conviction_label ?? ''}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn--ghost"
                        style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSymbol(w.symbol);
                          setBoard('daily');
                        }}
                      >
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
      <GlossaryPanel items={WATCHLIST_GLOSSARY} />
    </div>
  );
}
