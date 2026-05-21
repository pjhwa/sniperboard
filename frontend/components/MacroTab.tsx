'use client';

import React from 'react';
import { useMacro } from '../hooks/useMacro';
import { MacroItem } from '../app/types';

const MACRO_GROUPS: { label: string; symbols: string[] }[] = [
  { label: '변동성',       symbols: ['^VIX', '^VVIX', '^VIX9D'] },
  { label: '폭(Breadth)', symbols: ['SPY', 'QQQ', 'RSP', 'MAGS', 'IWM'] },
  { label: '신용 스트레스', symbols: ['HYG', 'JNK', 'LQD', 'IEF', 'TLT'] },
  { label: '달러 / 금리',  symbols: ['DX-Y.NYB', '^TNX'] },
  { label: '원자재',        symbols: ['CL=F', 'GLD'] },
  { label: '섹터 ETF',     symbols: ['SMH', 'XLE', 'XLY', 'XHB', 'ITA'] },
];

const STRUCTURE_META: Record<string, { label: string; color: string; bg: string }> = {
  UPTREND:     { label: 'HH+HL 상승',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  DOWNTREND:   { label: 'LH+LL 하락',    color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
  DISTRIBUTION:{ label: 'LH+HL 분배',    color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30' },
  ACCUMULATION:{ label: 'HH+LL 축적',    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
  NEUTRAL:     { label: 'NEUTRAL',        color: 'text-zinc-400',    bg: 'bg-zinc-800/60 border-zinc-700/40' },
};

function ChangePill({ value }: { value: number | null }) {
  if (value == null) return <span className="text-zinc-600 text-xs italic">—</span>;
  const pos = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full border ${
      pos ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'
    }`}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function MacroCard({ item }: { item: MacroItem }) {
  const sm = STRUCTURE_META[item.market_structure] ?? STRUCTURE_META['NEUTRAL'];

  const priceStr = item.price == null
    ? '—'
    : item.price > 1000
      ? item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : item.price.toFixed(item.price < 10 ? 3 : 2);

  return (
    <div className="glass-card rounded-xl p-3.5 flex flex-col gap-2.5 hover:bg-zinc-900/30 transition-all duration-200 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-sm text-white tracking-tight">{item.symbol}</div>
          <div className="text-[10px] font-medium mt-0.5 leading-tight" style={{color:'var(--text-label)'}}>{item.name}</div>
        </div>
        <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${sm.bg} ${sm.color} tracking-wider whitespace-nowrap`}>
          {sm.label}
        </div>
      </div>

      {/* Price + changes */}
      {item.price == null ? (
        <div className="text-xs italic py-1" style={{color:'var(--text-muted)'}}>데이터 없음</div>
      ) : (
        <div className="flex items-end justify-between gap-2">
          <div className="text-xl font-black text-white tabular-nums">{priceStr}</div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-[10px] font-medium" style={{color:'var(--text-label)'}}>
              <span>1D</span><ChangePill value={item.change_pct_1d} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium" style={{color:'var(--text-label)'}}>
              <span>5D</span><ChangePill value={item.change_pct_5d} />
            </div>
          </div>
        </div>
      )}

      {/* EMA status + RSI */}
      <div className="flex items-center justify-between pt-2 gap-2" style={{borderTop:'1px solid rgba(45,65,115,0.3)'}}>
        <div className="flex gap-1.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
            item.above_ema8
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
              : 'text-red-400 bg-red-500/10 border-red-500/25'
          }`}>
            EMA8 {item.above_ema8 ? '▲' : '▼'}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
            item.above_ema21
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
              : 'text-red-400 bg-red-500/10 border-red-500/25'
          }`}>
            EMA21 {item.above_ema21 ? '▲' : '▼'}
          </span>
        </div>
        {item.rsi14 != null && (
          <span className={`text-[9px] font-bold tabular-nums ${
            item.rsi14 >= 70 ? 'text-orange-400' : item.rsi14 <= 30 ? 'text-blue-400' : 'text-zinc-400'
          }`}>
            RSI {item.rsi14.toFixed(0)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MacroTab() {
  const { macroData, isLoading, error } = useMacro();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-8 h-8 border-2 border-t-white border-zinc-800 rounded-full animate-spin-slow" />
        <div className="text-sm tracking-wide" style={{color:'var(--text-secondary)'}}>매크로 지표 불러오는 중...</div>
      </div>
    );
  }

  if (error || !macroData) {
    return (
      <div className="text-red-400 text-sm text-center py-24 border border-red-500/20 bg-red-500/5 rounded-2xl glow-red animate-fade-in">
        매크로 데이터를 불러오지 못했습니다. 백엔드 연결 상태를 확인해주세요.
      </div>
    );
  }

  const bySymbol = Object.fromEntries(macroData.macro.map((m) => [m.symbol, m]));

  // VIX 백워데이션 감지
  const vixVal   = bySymbol['^VIX']?.price ?? null;
  const vix9dVal = bySymbol['^VIX9D']?.price ?? null;
  const isBackwardation = vixVal != null && vix9dVal != null && vix9dVal > vixVal;

  // 섹터 소팅: 일별 수익률 기준
  const sectorSymbols = ['SMH', 'XLE', 'XLY', 'XHB', 'ITA'];
  const sortedSectors = sectorSymbols
    .map((s) => bySymbol[s])
    .filter((item): item is MacroItem => Boolean(item) && item.change_pct_1d != null)
    .sort((a, b) => (b.change_pct_1d ?? 0) - (a.change_pct_1d ?? 0));

  return (
    <div className="space-y-6 animate-fade-in">

      {/* VIX 백워데이션 배지 (해당 시) */}
      {isBackwardation && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold w-fit">
          ⚡ VIX9D ({vix9dVal?.toFixed(1)}) &gt; VIX ({vixVal?.toFixed(1)}) — 백워데이션 감지: 단기 패닉 + 반등 가능성 신호
        </div>
      )}

      {/* 섹터 로테이션 바 */}
      <div className="glass-card rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
        <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-4" style={{color:'var(--text-label)'}}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          섹터 로테이션 — 1일 수익률 기준 (오늘 상/하위)
        </div>
        <div className="flex flex-col gap-2">
          {sortedSectors.map((item) => {
            const maxAbs = Math.max(...sortedSectors.map((s) => Math.abs(s.change_pct_1d ?? 0)), 0.5);
            const barW = Math.abs(item.change_pct_1d ?? 0) / maxAbs * 60;
            const pos = (item.change_pct_1d ?? 0) >= 0;
            return (
              <div key={item.symbol} className="flex items-center gap-3">
                <div className="w-10 text-right text-xs font-bold text-zinc-300 shrink-0">{item.symbol}</div>
                <div className="flex-1 flex items-center h-5">
                  {pos ? (
                    <div className="h-4 rounded-r-full bg-gradient-to-r from-emerald-500/60 to-emerald-400/80 transition-all duration-500" style={{ width: `${barW}%` }} />
                  ) : (
                    <div className="h-4 rounded-r-full bg-gradient-to-r from-red-500/60 to-red-400/80 transition-all duration-500 ml-auto" style={{ width: `${barW}%` }} />
                  )}
                </div>
                <div className="w-20 text-xs font-bold tabular-nums shrink-0">
                  <ChangePill value={item.change_pct_1d} />
                </div>
                <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                  (STRUCTURE_META[item.market_structure] ?? STRUCTURE_META['NEUTRAL']).bg
                } ${(STRUCTURE_META[item.market_structure] ?? STRUCTURE_META['NEUTRAL']).color}`}>
                  {(STRUCTURE_META[item.market_structure] ?? STRUCTURE_META['NEUTRAL']).label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 그룹별 매크로 카드 */}
      {MACRO_GROUPS.map((group) => {
        const items = group.symbols.map((s) => bySymbol[s]).filter(Boolean) as MacroItem[];
        if (items.length === 0) return null;
        return (
          <div key={group.label} className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{color:'var(--text-label)'}}>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              {group.label}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map((item) => (
                <MacroCard key={item.symbol} item={item} />
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-[11px] font-medium text-center pb-2" style={{color:'var(--text-muted)'}}>
        매크로 탭은 오일·금리·달러·섹터 로테이션을 한눈에 파악하기 위한 컨텍스트 뷰입니다. EMA8/21 포지션과 시장 구조(HH/HL 등)를 통해 지수 추세를 확인하세요.
      </p>
    </div>
  );
}
