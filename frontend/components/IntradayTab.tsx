'use client';

import React from 'react';
import { useDashboardStore } from '../hooks/useStore';
import { useIntraday } from '../hooks/useIntraday';
import IntradayChart from './charts/IntradayChart';
import StatCard from './StatCard';
import { SIGNAL_META } from '../app/types';

const getRsiColor  = (v: number) => v >= 76 ? 'text-orange-400' : v >= 60 ? 'text-yellow-400' : v >= 40 ? 'text-emerald-400' : 'text-blue-400';
const getRsiLabel  = (v: number) => v >= 76 ? '과열' : v >= 60 ? '강세' : v >= 40 ? '중립' : '과매도';

export default function IntradayTab() {
  const { symbol, timeframe } = useDashboardStore();
  const { ohlcvData, latestData, isLoading, error } = useIntraday(symbol, timeframe);

  if (isLoading) {
    return (
      <div className="text-zinc-500 text-sm text-center py-24">
        단기 차트 및 신호 분석 데이터를 로딩 중...
      </div>
    );
  }

  if (error || !ohlcvData) {
    return (
      <div className="text-red-400 text-sm text-center py-24 border border-red-500/20 bg-red-500/5 rounded-2xl">
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
    <div className="space-y-4">
      {/* Intraday Chart Card */}
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
          <span className="flex items-center gap-1.5 ml-4">
            <span className="text-emerald-400">▲</span>
            Sniper / VCP / PB 매수
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-orange-400">▼</span>
            OB / DT 경고
          </span>
          <span className="ml-auto text-zinc-500">30초 자동 갱신</span>
        </div>
        
        <IntradayChart
          candles={ohlcvData.candles}
          signals={ohlcvData.signals}
          indicators={ohlcvData.indicators}
        />
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="현재가"
          value={price ? `$${price.toFixed(2)}` : '—'}
          sub={symbol}
          valueClass="text-white text-xl"
        />
        <StatCard
          label="RSI (14)"
          value={rsi !== null ? rsi.toFixed(1) : '—'}
          sub={rsi !== null ? getRsiLabel(rsi) : ''}
          valueClass={`text-xl ${rsi !== null ? getRsiColor(rsi) : 'text-zinc-400'}`}
        />
        <StatCard
          label="21EMA 이격"
          value={emaSpread !== null ? `${emaSpread >= 0 ? '+' : ''}${emaSpread.toFixed(2)}%` : '—'}
          sub={emaSpread !== null ? (emaSpread > 3.2 ? '⚠ 과열 구간' : emaSpread < -2 ? '지지 접근' : '정상 범위') : ''}
          valueClass={`text-xl ${emaSpread !== null && Math.abs(emaSpread) > 3.2 ? 'text-orange-400' : 'text-zinc-200'}`}
        />
        <StatCard
          label="EMA21 / EMA50"
          value={ema21val && ema50val ? `${ema21val.toFixed(2)}` : '—'}
          sub={ema21val && ema50val ? `/ ${ema50val.toFixed(2)}` : ''}
          valueClass="text-amber-400 text-lg"
        />
        <StatCard
          label="ATR (14)"
          value={atrVal !== null ? `$${atrVal.toFixed(3)}` : '—'}
          sub="변동성 기준"
          valueClass="text-zinc-200 text-xl"
        />
      </div>

      {/* Active signals + signal guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
          <div className="text-xs text-zinc-400 uppercase tracking-widest mb-3">현재 활성 신호</div>
          {activeSigs.length > 0 ? (
            <div className="flex flex-col gap-2">
              {activeSigs.map((sig) => {
                const meta = SIGNAL_META[sig];
                return (
                  <div key={sig} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${meta?.bg ?? ''}`}>
                    <span className={`font-semibold text-sm ${meta?.color ?? 'text-white'}`}>{meta?.label ?? sig}</span>
                    <span className="text-xs text-zinc-400">{meta?.action}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-zinc-500 text-sm">현재 활성 신호 없음</div>
          )}
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 md:col-span-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest mb-3">신호 가이드</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(SIGNAL_META).map(([key, meta]) => (
              <div key={key} className={`rounded-lg border p-2.5 ${meta.bg}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>{meta.action}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{meta.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RSI Gauge */}
      {rsi !== null && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">RSI 게이지</div>
            <div className={`text-sm font-semibold ${getRsiColor(rsi)}`}>{rsi.toFixed(1)} — {getRsiLabel(rsi)}</div>
          </div>
          <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="bg-blue-500/30 flex-none" style={{ width: '30%' }} />
              <div className="bg-emerald-500/30 flex-none" style={{ width: '30%' }} />
              <div className="bg-yellow-500/30 flex-none" style={{ width: '16%' }} />
              <div className="bg-orange-500/30 flex-none" style={{ width: '24%' }} />
            </div>
            <div
              className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg transition-all duration-300"
              style={{ left: `${Math.min(Math.max(rsi, 0), 100)}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
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
