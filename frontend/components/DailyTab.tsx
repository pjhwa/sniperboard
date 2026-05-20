'use client';

import React from 'react';
import { useDashboardStore } from '../hooks/useStore';
import { useDaily } from '../hooks/useDaily';
import DailyChart from './charts/DailyChart';
import RRCalculator from './RRCalculator';
import { STAGE2_META, Stage2Checks } from '../app/types';

const getScoreColor = (s: number) => (s >= 6 ? 'text-emerald-400' : s >= 4 ? 'text-yellow-400' : 'text-red-400');
const getScoreBg = (s: number) =>
  s >= 6
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : s >= 4
    ? 'bg-yellow-500/10 border-yellow-500/30'
    : 'bg-red-500/10 border-red-500/30';

export default function DailyTab() {
  const { symbol } = useDashboardStore();
  const { dailyData, isLoading, error } = useDaily(symbol);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-8 h-8 border-2 border-t-white border-zinc-800 rounded-full animate-spin-slow" />
        <div className="text-zinc-500 text-sm tracking-wide">
          일봉 분석 데이터를 불러오는 중 (약 30초 소요)...
        </div>
      </div>
    );
  }

  if (error || !dailyData) {
    return (
      <div className="text-red-400 text-sm text-center py-24 border border-red-500/20 bg-red-500/5 rounded-2xl glow-red animate-fade-in">
        일봉 분석 데이터를 불러오지 못했습니다. 백엔드 동작 여부를 확인하십시오.
      </div>
    );
  }

  const s2 = dailyData.stage2;

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Daily Chart Card */}
      <div className="glass-card rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-800" />
            <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Daily Trend Chart (1Year)</span>
          </div>
          
          <div className="flex items-center gap-4 text-[11px] text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-amber-400 rounded-full" />
              EMA 21
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-indigo-400 rounded-full" />
              EMA 50
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-rose-400 rounded-full" />
              EMA 200
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 h-0.5"
                style={{ borderTop: '1px dashed #a855f7', background: 'none' }}
              />
              가우시안 채널
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-emerald-400 opacity-60 rounded-full" />
              Entry Pivot
            </span>
          </div>
        </div>

        <DailyChart data={dailyData} />
      </div>

      {/* Gaussian Channel Analysis */}
      {s2?.gc_upper != null && (
        <div className="glass-card rounded-2xl border-l-[3px] border-l-purple-500 p-5 shadow-lg glow-purple relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-850 to-transparent" />
          
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              가우시안 채널 분석 (Gaussian Channel)
            </div>
            
            {s2.gc_breakout ? (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 border border-purple-500/35 text-purple-300 animate-pulse">
                ✦ 채널 상향 돌파 발생
              </span>
            ) : s2.gc_retest ? (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/35 text-amber-300">
                ⟳ 리테스트 구간 &mdash; 분할 진입 영역
              </span>
            ) : s2.gc_above ? (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-500/35 text-emerald-300">
                ✓ 채널 상단 돌파 유지
              </span>
            ) : s2.gc_below ? (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-red-500/20 border border-red-500/35 text-red-400">
                ⚠ 채널 하단 이탈 &mdash; 매수 보류
              </span>
            ) : (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-400">
                ⊙ 채널 내부 &mdash; 관망
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 border-b border-zinc-800/60 pb-4 mb-4">
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900">
              <div className="text-[10px] font-bold text-zinc-500 mb-0.5">GC 상단</div>
              <div className="font-bold text-sm text-purple-300">${s2.gc_upper?.toFixed(2)}</div>
            </div>
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900">
              <div className="text-[10px] font-bold text-zinc-500 mb-0.5">GC 중심</div>
              <div className="font-bold text-sm text-purple-400/60">${s2.gc_mid?.toFixed(2)}</div>
            </div>
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900">
              <div className="text-[10px] font-bold text-zinc-500 mb-0.5">GC 하단</div>
              <div className="font-bold text-sm text-purple-300">${s2.gc_lower?.toFixed(2)}</div>
            </div>
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900">
              <div className="text-[10px] font-bold text-zinc-500 mb-0.5">현재가 vs 상단 이격</div>
              {(() => {
                const latestClose = dailyData.candles[dailyData.candles.length - 1]?.close;
                const gcUp = s2.gc_upper;
                const pct = latestClose && gcUp ? ((latestClose / gcUp) - 1) * 100 : null;
                return (
                  <div className={`font-bold text-sm ${s2.gc_above ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                  </div>
                );
              })()}
            </div>
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900">
              <div className="text-[10px] font-bold text-zinc-500 mb-0.5">채널 상단 돌파</div>
              <div className={`font-bold text-sm ${s2.gc_above ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {s2.gc_above ? 'YES' : 'NO'}
              </div>
            </div>
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900">
              <div className="text-[10px] font-bold text-zinc-500 mb-0.5">채널 리테스트</div>
              <div className={`font-bold text-sm ${s2.gc_retest ? 'text-amber-400' : 'text-zinc-600'}`}>
                {s2.gc_retest ? 'YES' : 'NO'}
              </div>
            </div>
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed font-medium">
            가우시안 채널(Period=100, Mult=1.5)은 통계적 노이즈를 걸러낸 장기 추세 대역입니다. 
            가격이 채널 상단을 돌파하고 눌림(Retest) 시 지지받는 자리는 정석적인 기관 매수 지점으로 작용합니다.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Stage 2 Checklist Board */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-850 to-transparent" />
          
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              Stage 2 체크리스트 (Mark Minervini)
            </div>
            {s2 && (
              <div className={`font-bold text-sm px-3.5 py-1 rounded-full border ${getScoreBg(s2.score)}`}>
                SCORE: <span className={`font-extrabold text-base ${getScoreColor(s2.score)}`}>{s2.score}/7</span>
              </div>
            )}
          </div>

          {s2?.checks && (
            <div className="grid gap-2.5">
              {(Object.entries(s2.checks) as [keyof Stage2Checks, boolean][]).map(([key, passed]) => (
                <div
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 hover:bg-zinc-900/30 ${
                    passed
                      ? 'border-emerald-500/10 bg-emerald-500/5'
                      : 'border-zinc-800/60 bg-zinc-900/20'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-zinc-200 leading-tight">
                      {STAGE2_META[key]?.label}
                    </div>
                    <div className="text-[10px] text-zinc-500 leading-tight mt-1 font-medium">
                      {STAGE2_META[key]?.desc}
                    </div>
                  </div>
                  
                  <div className="flex-none">
                    {passed ? (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full tracking-wider">
                        PASS
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full tracking-wider">
                        FAIL
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {s2 && (
            <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-zinc-900/35 border border-zinc-900/60 rounded-xl p-2">
                <div className="text-[9px] font-bold text-zinc-500 uppercase">RS Score</div>
                <div className={`font-bold text-xs mt-0.5 ${s2.rs_score >= 60 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                  {s2.rs_score}
                </div>
              </div>
              <div className="bg-zinc-900/35 border border-zinc-900/60 rounded-xl p-2">
                <div className="text-[9px] font-bold text-zinc-500 uppercase">52W 고점 이격</div>
                <div className="font-bold text-xs mt-0.5 text-zinc-300">
                  {s2.pct_from_52w_high.toFixed(1)}%
                </div>
              </div>
              <div className="bg-zinc-900/35 border border-zinc-900/60 rounded-xl p-2">
                <div className="text-[9px] font-bold text-zinc-500 uppercase">52W 저점 대비</div>
                <div className="font-bold text-xs mt-0.5 text-zinc-300">
                  +{s2.pct_from_52w_low.toFixed(1)}%
                </div>
              </div>
              <div className="bg-zinc-900/35 border border-zinc-900/60 rounded-xl p-2">
                <div className="text-[9px] font-bold text-zinc-500 uppercase">최근 조정폭</div>
                <div className="font-bold text-xs mt-0.5 text-zinc-300">
                  {s2.pullback_pct.toFixed(1)}%
                </div>
              </div>
              <div className="bg-zinc-900/35 border border-zinc-900/60 rounded-xl p-2">
                <div className="text-[9px] font-bold text-zinc-500 uppercase">EMA200</div>
                <div className="font-bold text-xs mt-0.5 text-rose-400">
                  ${s2.latest_ema200.toFixed(2)}
                </div>
              </div>
              <div className="bg-zinc-900/35 border border-zinc-900/60 rounded-xl p-2">
                <div className="text-[9px] font-bold text-zinc-500 uppercase">ATR (14)</div>
                <div className="font-bold text-xs mt-0.5 text-zinc-300">
                  ${s2.latest_atr.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RR Calculator Section */}
        {s2 && (
          <RRCalculator
            defaultEntry={s2.entry}
            defaultStop={s2.stop}
            defaultTarget={s2.target}
            latestClose={s2.latest_close}
            latestAtr={s2.latest_atr}
            pivotHigh={s2.pivot_high}
          />
        )}
      </div>
    </div>
  );
}
