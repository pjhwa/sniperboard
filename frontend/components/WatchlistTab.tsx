'use client';

import React, { useState } from 'react';
import { useDashboardStore } from '../hooks/useStore';
import { useWatchlist } from '../hooks/useWatchlist';
import { WatchlistItem } from '../app/types';

const getScoreColor = (s: number) => (s >= 6 ? 'text-emerald-400' : s >= 4 ? 'text-yellow-400' : 'text-red-400');
const getScoreBg = (s: number) =>
  s >= 6
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : s >= 4
    ? 'bg-yellow-500/10 border-yellow-500/30'
    : 'bg-red-500/10 border-red-500/30';

export default function WatchlistTab() {
  const { rrAccount, rrRiskPct, setRrAccount, setRrRiskPct, setSymbol } = useDashboardStore();
  const { watchlist, isLoading, error } = useWatchlist();
  const [selectedWatch, setSelectedWatch] = useState<WatchlistItem | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-8 h-8 border-2 border-t-white border-zinc-800 rounded-full animate-spin-slow" />
        <div className="text-zinc-500 text-sm tracking-wide">
          워치리스트 종목들의 Stage 2 지표 분석 중... (약 1분 소요)
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm text-center py-24 border border-red-500/20 bg-red-500/5 rounded-2xl glow-red animate-fade-in">
        워치리스트 데이터를 불러오지 못했습니다. 백엔드 연결 상태를 확인해주세요.
      </div>
    );
  }

  const rrAccN = parseFloat(rrAccount);
  const rrRiskN = parseFloat(rrRiskPct);

  // R:R 비율 시각화 바 렌더링 헬퍼
  const renderRRBar = (ratio: number | null) => {
    if (!ratio || ratio <= 0 || isNaN(ratio)) return null;
    
    const riskPart = 1;
    const rewardPart = Math.min(Math.max(ratio, 0.5), 10);
    const total = riskPart + rewardPart;
    const riskPct = (riskPart / total) * 100;
    const rewardPct = (rewardPart / total) * 100;
    
    return (
      <div className="mt-3.5 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-900">
        <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
          <span>손절 리스크 (1.0x)</span>
          <span>진입</span>
          <span>목표 수익 ({ratio.toFixed(2)}x)</span>
        </div>
        <div className="relative h-2 rounded-full overflow-hidden flex bg-zinc-950">
          <div className="h-full bg-gradient-to-r from-red-500/80 to-red-500" style={{ width: `${riskPct}%` }} />
          <div className="w-[2px] bg-white h-full z-10" />
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-500/80" style={{ width: `${rewardPct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      
      {/* Watchlist Table Card */}
      <div className="glass-card rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            워치리스트 &mdash; Stage 2 스코어 분석 순위
          </div>
        </div>

        {watchlist.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold text-zinc-500 border-b border-zinc-800/60 uppercase tracking-wider">
                    <th className="text-left pb-3 pr-4 font-bold">종목 (Ticker)</th>
                    <th className="text-right pb-3 pr-4 font-bold">현재가</th>
                    <th className="text-right pb-3 pr-4 font-bold">Stage 2 점수</th>
                    <th className="text-right pb-3 pr-4 font-bold">RS 스코어</th>
                    <th className="text-right pb-3 pr-4 font-bold">52W고점 이격</th>
                    <th className="text-right pb-3 pr-4 font-bold">피벗 진입가</th>
                    <th className="text-right pb-3 pr-4 font-bold">손절가</th>
                    <th className="text-right pb-3 pr-4 font-bold">목표가 (3R)</th>
                    <th className="text-center pb-3 font-bold">체크리스트 (7)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {watchlist.map((item) => {
                    const isSelected = selectedWatch?.symbol === item.symbol;
                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => setSelectedWatch(isSelected ? null : item)}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-zinc-900/70 border-l-2 border-l-amber-500' 
                            : 'hover:bg-zinc-900/40 hover:translate-x-0.5'
                        }`}
                      >
                        <td className="py-4 pr-4 font-bold">
                          <span className={`px-2.5 py-1 rounded-lg border text-xs tracking-wider transition ${
                            isSelected 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                          }`}>
                            {item.symbol}
                          </span>
                        </td>
                        <td className="text-right pr-4 font-semibold text-zinc-200 tabular-nums">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className="text-right pr-4">
                          <span className={`font-bold px-2 py-0.5 rounded-full border text-xs ${getScoreBg(item.score)} ${getScoreColor(item.score)}`}>
                            {item.score}/7
                          </span>
                        </td>
                        <td className="text-right pr-4 font-semibold tabular-nums">
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
                        <td className="text-right pr-4 font-semibold tabular-nums">
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
                        <td className="text-right pr-4 text-amber-400 font-bold tabular-nums">${item.entry.toFixed(2)}</td>
                        <td className="text-right pr-4 text-red-400 font-semibold tabular-nums">${item.stop.toFixed(2)}</td>
                        <td className="text-right pr-4 text-blue-400 font-semibold tabular-nums">${item.target.toFixed(2)}</td>
                        <td className="text-center">
                          <div className="flex justify-center items-center gap-1">
                            {(Object.values(item.checks) as boolean[]).map((v, i) => (
                              <div
                                key={i}
                                className={`w-2.5 h-2.5 rounded-full border transition ${
                                  v 
                                    ? 'bg-emerald-500 border-emerald-400 glow-green' 
                                    : 'bg-zinc-800 border-zinc-700/60'
                                }`}
                                title={`Check ${i+1}: ${v ? '통과' : '미달'}`}
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
            <div className="mt-4 text-xs text-zinc-500 font-medium flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              <span>행 클릭 시 해당 종목의 R:R 계산기가 아래에 확장됩니다. 다시 클릭하면 닫힙니다.</span>
            </div>
          </>
        ) : (
          <div className="text-zinc-500 text-sm text-center py-16">
            분석 대상 종목의 데이터를 찾을 수 없습니다.
          </div>
        )}
      </div>

      {/* R:R Panel - Expands on row click */}
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
          <div className="glass-card rounded-2xl p-5 shadow-2xl border-l-[3px] border-l-amber-500 animate-slide-up glow-amber relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-amber-300 tracking-tight">{item.symbol}</span>
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">포지션 최적화 계산</span>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${getScoreBg(item.score)} ${getScoreColor(item.score)}`}>
                  Stage 2 score: {item.score}/7
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-semibold flex-wrap">
                  <span>계좌</span>
                  <input
                    type="number"
                    value={rrAccount}
                    onChange={(e) => setRrAccount(e.target.value)}
                    step="1000"
                    className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-white font-bold focus:outline-none focus:border-zinc-700 transition"
                  />
                  <span>리스크 %</span>
                  <input
                    type="number"
                    value={rrRiskPct}
                    onChange={(e) => setRrRiskPct(e.target.value)}
                    step="0.5"
                    min="0.5"
                    max="5"
                    className="w-14 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-white font-bold focus:outline-none focus:border-zinc-700 transition"
                  />
                  <span className="text-zinc-500 font-medium">
                    = 리스크액:{' '}
                    <span className="text-red-400 font-bold">
                      ${(!isNaN(rrAccN) && !isNaN(rrRiskN) ? (rrAccN * rrRiskN) / 100 : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </span>
                </div>
                
                <button
                  onClick={() => {
                    setSymbol(item.symbol);
                  }}
                  className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded-lg text-zinc-300 font-bold transition duration-200 active:scale-95 cursor-pointer"
                >
                  일봉 분석 상세 →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 시나리오 A */}
              <div className="bg-zinc-950/40 rounded-xl border border-zinc-900 p-4 transition hover:bg-zinc-950/60">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 tracking-wider">
                    시나리오 A
                  </span>
                  <span className="text-xs text-zinc-200 font-bold">즉시 시장가 진입</span>
                </div>
                <p className="text-[12px] text-zinc-400 mb-3.5 leading-relaxed font-medium">
                  현재가 <span className="text-zinc-300 font-bold">${nowE.toFixed(2)}</span> 기준 시장가 매수. 손절 2ATR, 목표 수익 3R.
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">진입가</div>
                    <div className="font-bold text-xs text-blue-300">${nowE.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">손절가</div>
                    <div className="font-bold text-xs text-red-400">${nowS.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">목표가</div>
                    <div className="font-bold text-xs text-emerald-400">${nowT.toFixed(2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">R:R 비율</div>
                    <div
                      className={`font-bold text-sm ${
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
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">권장 수량</div>
                    <div className="font-bold text-sm text-blue-400">
                      {nowR.shares != null ? nowR.shares.toLocaleString() : '—'} 주
                    </div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">포지션 규모</div>
                    <div className="font-bold text-sm text-zinc-300">
                      {nowR.posSize
                        ? `$${nowR.posSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">목표 수익</div>
                    <div className="font-bold text-sm text-emerald-400">
                      {nowR.profit ? `+$${nowR.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                    </div>
                  </div>
                </div>
                {renderRRBar(nowR.ratio)}
              </div>

              {/* 시나리오 B */}
              <div className="bg-zinc-950/40 rounded-xl border border-amber-500/10 p-4 transition hover:bg-zinc-950/60">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 tracking-wider">
                    시나리오 B
                  </span>
                  <span className="text-xs text-zinc-200 font-bold">피벗 돌파 매수 (권장)</span>
                </div>
                <p className="text-[12px] text-zinc-400 mb-3.5 leading-relaxed font-medium">
                  20일 최고가 <span className="text-zinc-300 font-bold">${item.pivot_high.toFixed(2)}</span> +0.5% 돌파 시 자동매수 진입.
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">진입가 (피벗)</div>
                    <div className="font-bold text-xs text-amber-300">${pvtE.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">손절가</div>
                    <div className="font-bold text-xs text-red-400">${pvtS.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">목표가 (3R)</div>
                    <div className="font-bold text-xs text-emerald-400">${pvtT.toFixed(2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">R:R 비율</div>
                    <div
                      className={`font-bold text-sm ${
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
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">권장 수량</div>
                    <div className="font-bold text-sm text-amber-400">
                      {pvtR.shares != null ? pvtR.shares.toLocaleString() : '—'} 주
                    </div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">포지션 규모</div>
                    <div className="font-bold text-sm text-zinc-300">
                      {pvtR.posSize
                        ? `$${pvtR.posSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-900">
                    <div className="text-[10px] font-bold text-zinc-500 mb-0.5">목표 수익</div>
                    <div className="font-bold text-sm text-emerald-400">
                      {pvtR.profit ? `+$${pvtR.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                    </div>
                  </div>
                </div>
                {renderRRBar(pvtR.ratio)}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
