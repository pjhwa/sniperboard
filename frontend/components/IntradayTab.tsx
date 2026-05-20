'use client';

import React from 'react';
import { useDashboardStore } from '../hooks/useStore';
import { useIntraday } from '../hooks/useIntraday';
import IntradayChart from './charts/IntradayChart';
import StatCard from './StatCard';
import { SIGNAL_META } from '../app/types';

const getRsiColor = (v: number) => v >= 76 ? 'text-orange-400' : v >= 60 ? 'text-yellow-400' : v >= 40 ? 'text-emerald-400' : 'text-blue-400';
const getRsiLabel = (v: number) => v >= 76 ? '과열' : v >= 60 ? '강세' : v >= 40 ? '중립' : '과매도';

export default function IntradayTab() {
  const { symbol, timeframe } = useDashboardStore();
  const { ohlcvData, latestData, isLoading, error } = useIntraday(symbol, timeframe);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-8 h-8 border-2 border-t-white border-zinc-800 rounded-full animate-spin-slow" />
        <div className="text-zinc-500 text-sm tracking-wide">
          단기 차트 및 신호 분석 데이터를 로딩 중...
        </div>
      </div>
    );
  }

  if (error || !ohlcvData) {
    return (
      <div className="text-red-400 text-sm text-center py-24 border border-red-500/20 bg-red-500/5 rounded-2xl glow-red animate-fade-in">
        데이터를 불러오는 중 오류가 발생했습니다. 백엔드 연결 상태를 확인해주세요.
      </div>
    );
  }

  // 지표 유도 상태 계산
  const rsi = latestData?.latest_rsi ?? null;
  const price = latestData?.latest_price ?? null;
  const ema21val = latestData?.latest_ema21 ?? null;
  const ema50val = latestData?.latest_ema50 ?? null;
  const atrVal = latestData?.latest_atr ?? null;
  const emaSpread = ema21val && price ? ((price - ema21val) / ema21val) * 100 : null;
  const activeSigs = latestData?.active_signals ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Intraday Chart Card */}
      <div className="glass-card rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-800" />
            <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Intraday Trading Chart</span>
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
            <span className="flex items-center gap-1.5 ml-2">
              <span className="text-emerald-400">▲</span>
              Sniper / VCP / PB 매수
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-orange-400">▼</span>
              OB / DT 경고
            </span>
          </div>
        </div>
        
        <IntradayChart
          candles={ohlcvData.candles}
          signals={ohlcvData.signals}
          indicators={ohlcvData.indicators}
        />
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <StatCard
          label="현재가"
          value={price ? `$${price.toFixed(2)}` : '—'}
          sub={symbol}
          valueClass="text-white text-2xl"
        />
        <StatCard
          label="RSI (14)"
          value={rsi !== null ? rsi.toFixed(1) : '—'}
          sub={rsi !== null ? getRsiLabel(rsi) : ''}
          valueClass={`text-2xl ${rsi !== null ? getRsiColor(rsi) : 'text-zinc-400'}`}
        />
        <StatCard
          label="21EMA 이격"
          value={emaSpread !== null ? `${emaSpread >= 0 ? '+' : ''}${emaSpread.toFixed(2)}%` : '—'}
          sub={emaSpread !== null ? (emaSpread > 3.2 ? '⚠ 과열 구간' : emaSpread < -2 ? '지지 접근' : '정상 범위') : ''}
          valueClass={`text-2xl ${emaSpread !== null && Math.abs(emaSpread) > 3.2 ? 'text-orange-400' : 'text-zinc-100'}`}
        />
        <StatCard
          label="EMA21 / EMA50"
          value={ema21val && ema50val ? `${ema21val.toFixed(2)}` : '—'}
          sub={ema21val && ema50val ? `/ ${ema50val.toFixed(2)}` : ''}
          valueClass="text-amber-400 text-xl"
        />
        <StatCard
          label="ATR (14)"
          value={atrVal !== null ? `$${atrVal.toFixed(3)}` : '—'}
          sub="변동성 기준"
          valueClass="text-zinc-100 text-2xl"
        />
      </div>

      {/* Active signals + signal guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Active Signals Card */}
        <div className="glass-card rounded-2xl p-5 flex flex-col">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            현재 활성 신호
          </div>
          
          <div className="flex-1 flex flex-col justify-start">
            {activeSigs.length > 0 ? (
              <div className="grid gap-2.5">
                {activeSigs.map((sig) => {
                  const meta = SIGNAL_META[sig];
                  return (
                    <div
                      key={sig}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border ${meta?.bg ?? 'border-zinc-800 bg-zinc-900'} shadow-md transition-all duration-300 hover:scale-[1.02]`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            sig === 'sniper' || sig === 'vcp' || sig === 'pullback' || sig === 'strong_trend' ? 'bg-emerald-400' : 'bg-red-400'
                          }`} />
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${
                            sig === 'sniper' || sig === 'vcp' || sig === 'pullback' || sig === 'strong_trend' ? 'bg-emerald-500' : 'bg-red-500'
                          }`} />
                        </span>
                        <span className={`font-bold text-sm ${meta?.color ?? 'text-white'}`}>
                          {meta?.label ?? sig}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-300 uppercase tracking-wider">
                        {meta?.action}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-800 rounded-xl flex-1">
                <svg className="w-6 h-6 text-zinc-700 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-zinc-600 text-xs font-semibold">활성 신호 없음</span>
              </div>
            )}
          </div>
        </div>

        {/* Signal Guide Card */}
        <div className="glass-card rounded-2xl p-5 md:col-span-2">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            신호 가이드
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {Object.entries(SIGNAL_META).map(([key, meta]) => (
              <div
                key={key}
                className={`rounded-xl border p-4.5 ${meta.bg} hover:border-zinc-700/50 hover:bg-zinc-900/40 transition-all duration-300 hover:scale-[1.01]`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold tracking-tight ${meta.color}`}>{meta.label}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} tracking-wider uppercase`}>
                    {meta.action}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">{meta.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RSI Gauge */}
      {rsi !== null && (
        <div className="glass-card rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              RSI 게이지
            </div>
            <div className={`text-sm font-bold tracking-tight px-3 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 ${getRsiColor(rsi)}`}>
              {rsi.toFixed(1)} &mdash; <span className="font-semibold">{getRsiLabel(rsi)}</span>
            </div>
          </div>
          
          <div className="relative h-4 bg-zinc-900/80 rounded-full border border-zinc-850 overflow-visible">
            <div className="absolute inset-0 flex rounded-full overflow-hidden">
              <div className="bg-blue-500/20 border-r border-blue-500/10 flex-none" style={{ width: '30%' }} />
              <div className="bg-emerald-500/20 border-r border-emerald-500/10 flex-none" style={{ width: '30%' }} />
              <div className="bg-yellow-500/20 border-r border-yellow-500/10 flex-none" style={{ width: '16%' }} />
              <div className="bg-orange-500/20 flex-none" style={{ width: '24%' }} />
            </div>
            
            {/* Glowing Pointer */}
            <div
              className="absolute -top-1.5 -bottom-1.5 w-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] border-3 border-zinc-950 transition-all duration-300 cursor-pointer"
              style={{ left: `${Math.min(Math.max(rsi, 0), 100)}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          
          <div className="flex justify-between text-[10px] font-bold text-zinc-500 mt-2 px-1">
            <span>0 과매도</span>
            <span>30</span>
            <span>60</span>
            <span>76</span>
            <span>100 과열</span>
          </div>
        </div>
      )}
    </div>
  );
}
