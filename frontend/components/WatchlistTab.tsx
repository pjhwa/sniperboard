'use client';

import React, { useState } from 'react';
import { useDashboardStore } from '../hooks/useStore';
import { useWatchlist } from '../hooks/useWatchlist';
import { WatchlistItem } from '../app/types';

const getScoreColor = (s: number) => (s >= 6 ? 'text-emerald-400' : s >= 4 ? 'text-yellow-400' : 'text-red-400');
const getScoreBg = (s: number) =>
  s >= 6
    ? 'bg-emerald-500/20 border-emerald-500/40'
    : s >= 4
    ? 'bg-yellow-500/20 border-yellow-500/40'
    : 'bg-red-500/20 border-red-500/40';

export default function WatchlistTab() {
  const { rrAccount, rrRiskPct, setRrAccount, setRrRiskPct, setSymbol, setTab } = useDashboardStore();
  const { watchlist, isLoading, error } = useWatchlist();
  const [selectedWatch, setSelectedWatch] = useState<WatchlistItem | null>(null);

  if (isLoading) {
    return (
      <div className="text-zinc-500 text-sm text-center py-24 animate-pulse">
        워치리스트 종목들의 Stage 2 지표 분석 중... (약 1분 소요)
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm text-center py-24 border border-red-500/20 bg-red-500/5 rounded-2xl">
        워치리스트 데이터를 불러오지 못했습니다. 백엔드 연결 상태를 확인해주세요.
      </div>
    );
  }

  const rrAccN = parseFloat(rrAccount);
  const rrRiskN = parseFloat(rrRiskPct);

  return (
    <div className="flex flex-col gap-4">
      {/* 순위 테이블 */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 transition duration-200 hover:border-zinc-800/80">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">워치리스트 — Stage 2 스코어 순위</div>
        </div>

        {watchlist.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                    <th className="text-left pb-3 pr-4">종목</th>
                    <th className="text-right pb-3 pr-4">현재가</th>
                    <th className="text-right pb-3 pr-4">Stage2</th>
                    <th className="text-right pb-3 pr-4">RS</th>
                    <th className="text-right pb-3 pr-4">52W고점</th>
                    <th className="text-right pb-3 pr-4">피벗 진입가</th>
                    <th className="text-right pb-3 pr-4">손절가</th>
                    <th className="text-right pb-3 pr-4">목표가 (3R)</th>
                    <th className="text-center pb-3">체크 (7)</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((item) => {
                    const isSelected = selectedWatch?.symbol === item.symbol;
                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => setSelectedWatch(isSelected ? null : item)}
                        className={`border-b border-zinc-800/50 cursor-pointer transition duration-150 ${
                          isSelected ? 'bg-zinc-800/80' : 'hover:bg-zinc-850'
                        }`}
                      >
                        <td className="py-3 pr-4 font-semibold">
                          <span className={isSelected ? 'text-amber-300' : ''}>{item.symbol}</span>
                          {isSelected && <span className="ml-1 text-xs text-amber-400">▼</span>}
                        </td>
                        <td className="text-right pr-4 text-zinc-200">${item.price.toFixed(2)}</td>
                        <td className="text-right pr-4">
                          <span className={`font-bold ${getScoreColor(item.score)}`}>{item.score}/7</span>
                        </td>
                        <td className="text-right pr-4">
                          <span
                            className={
                              item.rs_score >= 60
                                ? 'text-emerald-400'
                                : item.rs_score >= 40
                                ? 'text-zinc-300'
                                : 'text-red-400'
                            }
                          >
                            {item.rs_score.toFixed(0)}
                          </span>
                        </td>
                        <td className="text-right pr-4">
                          <span
                            className={
                              item.pct_from_52w_high >= -10
                                ? 'text-emerald-400'
                                : item.pct_from_52w_high >= -25
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }
                          >
                            {item.pct_from_52w_high.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right pr-4 text-amber-400">${item.entry.toFixed(2)}</td>
                        <td className="text-right pr-4 text-red-400">${item.stop.toFixed(2)}</td>
                        <td className="text-right pr-4 text-blue-400">${item.target.toFixed(2)}</td>
                        <td className="text-center">
                          <div className="flex justify-center gap-0.5">
                            {(Object.values(item.checks) as boolean[]).map((v, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${v ? 'bg-emerald-400' : 'bg-red-400/40'}`}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-xs text-zinc-600">* 행 클릭 → R:R 계산기 확장 · 다시 클릭하면 접힘</div>
          </>
        ) : (
          <div className="text-zinc-500 text-sm text-center py-12">데이터를 불러오지 못했습니다.</div>
        )}
      </div>

      {/* R:R 패널 — 행 선택 시 표시 */}
      {selectedWatch && (() => {
        const item = selectedWatch;
        const atr = item.latest_atr;

        // 시나리오 A: 즉시 진입 (현재가 기준)
        const nowE = item.price;
        const nowS = Math.round((nowE - 2 * atr) * 100) / 100;
        const nowT = Math.round((nowE + 3 * (nowE - nowS)) * 100) / 100;

        // 시나리오 B: 피벗 돌파 진입
        const pvtE = item.entry;
        const pvtS = item.stop;
        const pvtT = item.target;

        function calcW(e: number, s: number, t: number) {
          const riskPS = e - s;
          const reward = t - e;
          const ratio = riskPS > 0 ? reward / riskPS : null;
          const rd = !isNaN(rrAccN) && !isNaN(rrRiskN) ? (rrAccN * rrRiskN) / 100 : null;
          const shares = rd && riskPS > 0 ? Math.floor(rd / riskPS) : null;
          const posSize = shares ? shares * e : null;
          const profit = shares && reward ? shares * reward : null;
          return { ratio, shares, posSize, profit };
        }
        const nowR = calcW(nowE, nowS, nowT);
        const pvtR = calcW(pvtE, pvtS, pvtT);

        return (
          <div className="bg-zinc-900 rounded-2xl border border-amber-500/25 p-5 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-amber-300">{item.symbol}</span>
                <span className="text-zinc-400 text-sm">R:R 계산기</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getScoreBg(item.score)}`}>
                  <span className={getScoreColor(item.score)}>Stage2 {item.score}/7</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>계좌</span>
                  <input
                    type="number"
                    value={rrAccount}
                    onChange={(e) => setRrAccount(e.target.value)}
                    step="1000"
                    className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-zinc-500"
                  />
                  <span>리스크%</span>
                  <input
                    type="number"
                    value={rrRiskPct}
                    onChange={(e) => setRrRiskPct(e.target.value)}
                    step="0.5"
                    min="0.5"
                    max="5"
                    className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-zinc-500"
                  />
                  <span className="text-zinc-500">
                    = 리스크{' '}
                    <span className="text-zinc-300 font-semibold">
                      ${(!isNaN(rrAccN) && !isNaN(rrRiskN) ? (rrAccN * rrRiskN) / 100 : 0).toFixed(0)}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSymbol(item.symbol);
                    setTab('daily');
                  }}
                  className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-200 transition"
                >
                  일봉 분석 →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 시나리오 A */}
              <div className="bg-zinc-800/60 rounded-xl border border-zinc-700 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300">
                    시나리오 A
                  </span>
                  <span className="text-xs text-zinc-300 font-medium">지금 바로 매수</span>
                </div>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                  현재가 <span className="text-zinc-300">${nowE.toFixed(2)}</span>에 즉시 진입. 손절 2×ATR, 목표 3R.
                  <br />
                  <span className="text-amber-400/80">돌파 확인 없이 진입하므로 실패 시 손절 빈도 높음.</span>
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">진입가</div>
                    <div className="font-semibold text-blue-300">${nowE.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">손절가</div>
                    <div className="font-semibold text-red-400">${nowS.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">목표가</div>
                    <div className="font-semibold text-emerald-400">${nowT.toFixed(2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">R:R 비율</div>
                    <div
                      className={`font-bold text-base ${
                        nowR.ratio && nowR.ratio >= 2
                          ? 'text-emerald-400'
                          : nowR.ratio
                          ? 'text-yellow-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {nowR.ratio ? `1 : ${nowR.ratio.toFixed(2)}` : '—'}
                    </div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">매수 수량</div>
                    <div className="font-bold text-base text-blue-400">
                      {nowR.shares != null ? nowR.shares.toLocaleString() : '—'} 주
                    </div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">포지션 규모</div>
                    <div className="font-bold text-base text-zinc-200">
                      {nowR.posSize
                        ? `$${nowR.posSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-zinc-905 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">예상 수익</div>
                    <div className="font-bold text-base text-emerald-400">
                      {nowR.profit ? `+$${nowR.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 시나리오 B */}
              <div className="bg-zinc-800/60 rounded-xl border border-amber-500/25 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
                    시나리오 B
                  </span>
                  <span className="text-xs text-zinc-300 font-medium">피벗 돌파 후 진입 (권장)</span>
                </div>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                  20일 고점 <span className="text-zinc-300">${item.pivot_high.toFixed(2)}</span> +0.5% 돌파 시 매수 주문.
                  <br />
                  <span className="text-emerald-400/80">모멘텀·거래량 확인 후 진입 → 성공률·R:R 모두 유리.</span>
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">진입가 (피벗)</div>
                    <div className="font-semibold text-amber-300">${pvtE.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">손절가</div>
                    <div className="font-semibold text-red-400">${pvtS.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">목표가 (3R)</div>
                    <div className="font-semibold text-emerald-400">${pvtT.toFixed(2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">R:R 비율</div>
                    <div
                      className={`font-bold text-base ${
                        pvtR.ratio && pvtR.ratio >= 2
                          ? 'text-emerald-400'
                          : pvtR.ratio
                          ? 'text-yellow-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {pvtR.ratio ? `1 : ${pvtR.ratio.toFixed(2)}` : '—'}
                    </div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">매수 수량</div>
                    <div className="font-bold text-base text-amber-400">
                      {pvtR.shares != null ? pvtR.shares.toLocaleString() : '—'} 주
                    </div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">포지션 규모</div>
                    <div className="font-bold text-base text-zinc-200">
                      {pvtR.posSize
                        ? `$${pvtR.posSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-2">
                    <div className="text-zinc-500 mb-0.5">예상 수익</div>
                    <div className="font-bold text-base text-emerald-400">
                      {pvtR.profit ? `+$${pvtR.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
