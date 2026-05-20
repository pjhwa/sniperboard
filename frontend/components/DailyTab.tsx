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
    ? 'bg-emerald-500/20 border-emerald-500/40'
    : s >= 4
    ? 'bg-yellow-500/20 border-yellow-500/40'
    : 'bg-red-500/20 border-red-500/40';

export default function DailyTab() {
  const { symbol } = useDashboardStore();
  const { dailyData, isLoading, error } = useDaily(symbol);

  if (isLoading) {
    return (
      <div className="text-zinc-500 text-sm text-center py-24">
        일봉 분석 데이터를 불러오는 중 (약 30초 소요)...
      </div>
    );
  }

  if (error || !dailyData) {
    return (
      <div className="text-red-400 text-sm text-center py-24 border border-red-500/20 bg-red-500/5 rounded-2xl">
        일봉 분석 데이터를 불러오지 못했습니다. 백엔드 동작 여부를 확인하십시오.
      </div>
    );
  }

  const s2 = dailyData.stage2;

  return (
    <div className="space-y-4">
      {/* Daily Chart Card */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 transition duration-200 hover:border-zinc-800/80">
        <div className="flex items-center gap-4 mb-3 text-xs text-zinc-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 bg-amber-400" />
            EMA 21
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 bg-indigo-400" />
            EMA 50
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 bg-rose-400" />
            EMA 200
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-5 h-0.5"
              style={{ borderTop: '1px dashed #a855f7', background: 'none' }}
            />
            가우시안 채널
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 bg-emerald-400 opacity-60" />
            Entry Pivot
          </span>
          <span className="ml-auto text-zinc-500">1년 일봉</span>
        </div>

        <DailyChart data={dailyData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gaussian Channel Analysis */}
        {s2?.gc_upper != null && (
          <div className="md:col-span-2 bg-zinc-900 rounded-2xl border border-purple-500/30 p-5 transition duration-200 hover:border-purple-500/50">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">가우시안 채널 분석</div>
              
              {s2.gc_breakout ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300 animate-pulse">
                  채널 상향 돌파 발생
                </span>
              ) : s2.gc_retest ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  리테스트 구간 — 눌림목 진입 대기
                </span>
              ) : s2.gc_above ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  채널 상단 돌파 유지
                </span>
              ) : s2.gc_below ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 border border-red-500/40 text-red-400">
                  채널 하단 이탈 — 접근 금지
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-700/50 border border-zinc-600 text-zinc-400">
                  채널 내부 — 관망
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs mb-3">
              <div>
                <div className="text-zinc-500 mb-0.5">GC 상단</div>
                <div className="font-semibold text-purple-300">${s2.gc_upper?.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">GC 중심</div>
                <div className="font-semibold text-purple-400/70">${s2.gc_mid?.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">GC 하단</div>
                <div className="font-semibold text-purple-300">${s2.gc_lower?.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">현재가 vs 상단</div>
                {(() => {
                  const latestClose = dailyData.candles[dailyData.candles.length - 1]?.close;
                  const gcUp = s2.gc_upper;
                  const pct = latestClose && gcUp ? ((latestClose / gcUp) - 1) * 100 : null;
                  return (
                    <div className={`font-semibold ${s2.gc_above ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                    </div>
                  );
                })()}
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">채널 상단 돌파</div>
                <div className={`font-semibold ${s2.gc_above ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {s2.gc_above ? 'YES' : 'NO'}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">리테스트</div>
                <div className={`font-semibold ${s2.gc_retest ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {s2.gc_retest ? 'YES' : 'NO'}
                </div>
              </div>
            </div>
            <div className="text-xs text-zinc-600 leading-relaxed">
              가우시안 채널(period=100, mult=1.5) — 통계적 노이즈를 제거한 핵심 추세 밴드.
              채널 상향 돌파 후 리테스트 구간은 핵심 매수 타이밍입니다.
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stage 2 Checklist */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 transition duration-200 hover:border-zinc-850">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">Stage 2 체크리스트</div>
            {s2 && (
              <div className={`font-bold text-lg px-3 py-1 rounded-lg border ${getScoreBg(s2.score)}`}>
                <span className={getScoreColor(s2.score)}>{s2.score}/7</span>
              </div>
            )}
          </div>

          {s2?.checks && (
            <div className="flex flex-col gap-2.5">
              {(Object.entries(s2.checks) as [keyof Stage2Checks, boolean][]).map(([key, passed]) => (
                <div key={key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-200 leading-tight">{STAGE2_META[key]?.label}</div>
                    <div className="text-xs text-zinc-500 leading-tight mt-0.5">{STAGE2_META[key]?.desc}</div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-none mt-0.5 ${
                      passed
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : 'text-red-400 bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    {passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {s2 && (
            <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-zinc-500 mb-0.5">RS Score</div>
                <div className={`font-semibold ${s2.rs_score >= 60 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                  {s2.rs_score}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">52W 고점</div>
                <div className="font-semibold text-zinc-200">{s2.pct_from_52w_high.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">52W 저점</div>
                <div className="font-semibold text-zinc-200">+{s2.pct_from_52w_low.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">최근 조정</div>
                <div className="font-semibold text-zinc-200">{s2.pullback_pct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">EMA200</div>
                <div className="font-semibold text-rose-400">${s2.latest_ema200.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">ATR(14)</div>
                <div className="font-semibold text-zinc-200">${s2.latest_atr.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        {/* RR Calculator */}
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
