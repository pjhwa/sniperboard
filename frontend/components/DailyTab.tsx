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
              <span className="inline-block w-4 h-0.5 bg-emerald-400 rounded-full" />
              EMA 8
            </span>
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

      {/* Market Structure + RSI Divergence + Bear Flag */}
      {s2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* 시장 구조 */}
          {(() => {
            const structMap: Record<string, { label: string; color: string; bg: string; desc: string }> = {
              UPTREND:      { label: 'HH+HL 상승추세',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', desc: '연속 고점 신고 + 연속 저점 신고 — 추세 매수 유효' },
              DOWNTREND:    { label: 'LH+LL 하락추세',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         desc: '연속 고점 저하 + 연속 저점 저하 — 매수 접근 금지' },
              DISTRIBUTION: { label: 'LH+HL 분배 (주의)', color: 'text-orange-400',bg: 'bg-orange-500/10 border-orange-500/30',   desc: '고점이 낮아지는 중 — 로어하이 경고, 전고점 저항 주시' },
              ACCUMULATION: { label: 'HH+LL 축적',       color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30',       desc: '고점 신고 but 저점도 하락 — 방향성 결정 대기 구간' },
              NEUTRAL:      { label: 'NEUTRAL',           color: 'text-zinc-400',   bg: 'bg-zinc-800/60 border-zinc-700/40',       desc: '스윙 포인트 불충분 — 추가 데이터 대기' },
            };
            const sm = structMap[s2.market_structure] ?? structMap['NEUTRAL'];
            return (
              <div className={`glass-card rounded-xl p-4 border-l-[3px] relative overflow-hidden ${
                s2.market_structure === 'UPTREND' ? 'border-l-emerald-500' :
                s2.market_structure === 'DOWNTREND' ? 'border-l-red-500' :
                s2.market_structure === 'DISTRIBUTION' ? 'border-l-orange-500' :
                s2.market_structure === 'ACCUMULATION' ? 'border-l-blue-500' :
                'border-l-zinc-700'
              }`}>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  시장 구조 (Market Structure)
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-3 ${sm.bg} ${sm.color}`}>
                  {sm.label}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">{sm.desc}</p>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'higher_high', label: 'HH', color: 'emerald' },
                    { key: 'higher_low',  label: 'HL', color: 'emerald' },
                    { key: 'lower_high',  label: 'LH', color: 'red' },
                    { key: 'lower_low',   label: 'LL', color: 'red' },
                  ].map(({ key, label, color }) => {
                    const active = s2[key as keyof typeof s2] as boolean;
                    return (
                      <div key={key} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${
                        active
                          ? color === 'emerald'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? (color === 'emerald' ? 'bg-emerald-400' : 'bg-red-400') : 'bg-zinc-700'}`} />
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* RSI 다이버전스 */}
          <div className={`glass-card rounded-xl p-4 border-l-[3px] relative overflow-hidden ${
            s2.rsi_divergence_bearish ? 'border-l-orange-500' :
            s2.rsi_divergence_bullish ? 'border-l-cyan-500' :
            'border-l-zinc-700'
          }`}>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              RSI 다이버전스
            </div>
            {s2.rsi_divergence_bearish ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-3 text-orange-400 bg-orange-500/10 border-orange-500/30 animate-pulse">
                  ⚠ 베어리시 다이버전스
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                  가격이 고점을 높이는 동안 RSI는 고점을 낮추는 중 — 네거티브 다이버전스. 추세 약화 신호, 분할 익절·신규 매수 자제 권고.
                </p>
              </>
            ) : s2.rsi_divergence_bullish ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-3 text-cyan-400 bg-cyan-500/10 border-cyan-500/30">
                  ✦ 불리시 다이버전스
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                  가격이 저점을 낮추는 동안 RSI는 저점을 높이는 중 — 포지티브 다이버전스. 잠재적 추세 전환 신호, 눌림목 진입 주목.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-3 text-zinc-400 bg-zinc-800/60 border-zinc-700/40">
                  감지 없음
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                  최근 40봉 내 유효한 RSI 다이버전스가 감지되지 않았습니다.
                </p>
              </>
            )}
          </div>

          {/* 베어플래그 */}
          <div className={`glass-card rounded-xl p-4 border-l-[3px] relative overflow-hidden ${
            s2.bear_flag ? 'border-l-red-500' : 'border-l-zinc-700'
          }`}>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              베어 플래그 패턴
            </div>
            {s2.bear_flag ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-3 text-red-400 bg-red-500/10 border-red-500/30 animate-pulse">
                  ⚠ 베어플래그 감지
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                  급락(폴) 후 거래량 감소를 동반한 횡보 구간(플래그) 감지. 하락 재개 가능성 — 숏 진입 또는 롱 포지션 축소 고려.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-3 text-zinc-400 bg-zinc-800/60 border-zinc-700/40">
                  패턴 없음
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                  현재 베어플래그 조건(5% 이상 급락 + 거래량 감소 횡보) 미충족.
                </p>
              </>
            )}
          </div>
        </div>
      )}

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
          
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                Stage 2 체크리스트 (Mark Minervini)
              </div>
              {s2?.breadth_narrow && (
                <div className="px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold tracking-wide">
                  ⚠ 협소한 랠리 — RSP 신고가 미달
                </div>
              )}
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
