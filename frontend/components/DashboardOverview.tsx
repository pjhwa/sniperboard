'use client';

import React from 'react';
import { useMacro } from '../hooks/useMacro';
import { useRegime } from '../hooks/useRegime';
import { useDistributionDays } from '../hooks/useDistributionDays';
import { RegimeData, DDDetail, MacroItem, REGIME_META, DD_META } from '../app/types';

// ─── 유틸 ───────────────────────────────────────────────

function fmt(v: number | null | undefined, dec = 2): string {
  if (v == null) return '—';
  return v > 1000
    ? v.toLocaleString(undefined, { maximumFractionDigits: dec })
    : v.toFixed(dec);
}

function ChangeChip({ v, size = 'sm' }: { v: number | null; size?: 'sm' | 'md' }) {
  if (v == null) return <span style={{color:'var(--text-muted)'}} className="text-xs">—</span>;
  const pos = v >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-bold rounded-full border ${
      size === 'md' ? 'text-sm px-2 py-0.5' : 'text-xs px-1.5 py-0.5'
    } ${
      pos ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
          : 'text-red-300    bg-red-500/15    border-red-500/30'
    }`}>
      {pos ? '▲' : '▼'} {Math.abs(v).toFixed(2)}%
    </span>
  );
}

// ─── Regime Card ─────────────────────────────────────────

const COMPONENT_LABELS: Record<string, string> = {
  trend: '추세', breadth: '폭', credit: '신용', volatility: '변동성', momentum: '모멘텀',
};

const COMPONENT_COLORS: Record<string, { bar: string; glow: string }> = {
  trend:      { bar: 'bg-blue-400',    glow: 'rgba(96,165,250,0.4)' },
  breadth:    { bar: 'bg-teal-400',    glow: 'rgba(45,212,191,0.4)' },
  credit:     { bar: 'bg-emerald-400', glow: 'rgba(52,211,153,0.4)' },
  volatility: { bar: 'bg-yellow-400',  glow: 'rgba(250,204,21,0.4)' },
  momentum:   { bar: 'bg-orange-400',  glow: 'rgba(251,146,60,0.4)' },
};

function RegimeCard({ data }: { data: RegimeData | undefined }) {
  if (!data) {
    return (
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-3 animate-pulse">
        <div className="h-4 rounded w-1/3" style={{background:'rgba(45,65,115,0.3)'}} />
        <div className="h-8 rounded w-1/2" style={{background:'rgba(45,65,115,0.3)'}} />
      </div>
    );
  }
  const meta = REGIME_META[data.regime];
  const components = data.components as unknown as Record<string, number | null>;

  return (
    <div className={`glass-card rounded-2xl p-5 border ${meta.bg} relative overflow-hidden`}>
      {/* 상단 하이라이트 선 */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-40" />

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:'var(--text-label)'}}>
            Risk Regime — 매크로 환경
          </div>
          <div className={`text-2xl font-black tracking-tight ${meta.color}`}>
            {meta.labelKo}
            <span className="text-sm font-semibold ml-2 opacity-60">{meta.label}</span>
          </div>
        </div>
        {data.total != null && (
          <div className="text-right shrink-0">
            <div className={`text-4xl font-black tabular-nums ${meta.color}`}>{data.total.toFixed(0)}</div>
            <div className="text-[10px] font-medium" style={{color:'var(--text-muted)'}}>/ 100점</div>
          </div>
        )}
      </div>

      {/* 설명 */}
      <p className="text-xs leading-relaxed mb-5" style={{color:'var(--text-secondary)'}}>{meta.desc}</p>

      {/* 5요소 바 */}
      <div className="space-y-2.5">
        {(['trend', 'breadth', 'credit', 'volatility', 'momentum'] as const).map((key) => {
          const val = components[key];
          const pct = val != null ? Math.round((val / 20) * 100) : 0;
          const cc = COMPONENT_COLORS[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <div className="w-14 text-right text-[10px] font-semibold shrink-0" style={{color:'var(--text-label)'}}>
                {COMPONENT_LABELS[key]}
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'rgba(20,30,60,0.8)'}}>
                {val != null && (
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${cc.bar}`}
                    style={{ width: `${pct}%`, boxShadow: pct > 30 ? `0 0 8px ${cc.glow}` : 'none' }}
                  />
                )}
              </div>
              <div className="w-10 text-right text-[10px] tabular-nums font-medium shrink-0" style={{color:'var(--text-secondary)'}}>
                {val != null ? `${val.toFixed(0)}` : '—'}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] mt-4" style={{color:'var(--text-muted)'}}>
        ※ 후행 지표 — 시장 환경 진단이며 매매 신호가 아닙니다.
      </p>
    </div>
  );
}

// ─── Distribution Day Card ────────────────────────────────

function DDCard({ sym, dd }: { sym: string; dd: DDDetail | undefined }) {
  if (!dd) {
    return (
      <div className="glass-card rounded-xl p-4 animate-pulse h-32">
        <div className="h-3 rounded w-1/2 mb-3" style={{background:'rgba(45,65,115,0.3)'}} />
        <div className="h-8 rounded w-1/3" style={{background:'rgba(45,65,115,0.3)'}} />
      </div>
    );
  }
  const meta = DD_META[dd.level];

  return (
    <div className={`glass-card rounded-xl p-4 border ${meta.bg} relative overflow-hidden`}>
      <div className="absolute top-0 left-0 w-full h-[2px] opacity-60" style={{
        background: dd.level === 'DANGER' ? 'linear-gradient(90deg, transparent, #f87171, transparent)'
                  : dd.level === 'WARNING' ? 'linear-gradient(90deg, transparent, #fb923c, transparent)'
                  : 'linear-gradient(90deg, transparent, #34d399, transparent)'
      }} />

      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-label)'}}>
          Distribution Day · {sym}
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      <div className="flex items-baseline gap-1 mt-1">
        <span className={`text-4xl font-black tabular-nums leading-none ${meta.color}`}>{dd.count}</span>
        <span className="text-sm font-medium" style={{color:'var(--text-muted)'}}>일 / 25일</span>
      </div>

      {/* 시각적 도트 */}
      <div className="flex gap-1 mt-3 flex-wrap">
        {Array.from({ length: 25 }).map((_, i) => {
          const isDD = i < dd.count;
          return (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${
              isDD
                ? dd.level === 'DANGER'  ? 'bg-red-400'
                : dd.level === 'WARNING' ? 'bg-orange-400'
                : 'bg-emerald-400'
                : 'bg-blue-950/60'
            }`} style={isDD && dd.level === 'DANGER' ? {boxShadow:'0 0 4px rgba(248,113,113,0.6)'} : {}} />
          );
        })}
      </div>

      <p className="text-[10px] mt-2 leading-relaxed" style={{color:'var(--text-secondary)'}}>{meta.desc}</p>
    </div>
  );
}

// ─── 핵심 지수 스냅샷 ─────────────────────────────────────

function IndexSnapshot({ item, label }: { item: MacroItem | undefined; label: string }) {
  if (!item) return null;
  const pos = (item.change_pct_1d ?? 0) >= 0;

  return (
    <div className="glass-card rounded-xl p-4 hover:scale-[1.02] transition-transform duration-200">
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{color:'var(--text-label)'}}>{label}</div>
      <div className="text-xl font-black text-white tabular-nums leading-tight">{fmt(item.price)}</div>
      <div className="mt-1.5"><ChangeChip v={item.change_pct_1d} /></div>
      <div className="text-[9px] mt-1 font-medium" style={{color:'var(--text-muted)'}}>
        5D: {item.change_pct_5d != null ? `${item.change_pct_5d >= 0 ? '+' : ''}${item.change_pct_5d.toFixed(2)}%` : '—'}
      </div>
    </div>
  );
}

// ─── VIX 패널 ─────────────────────────────────────────────

function VIXPanel({ bySymbol }: { bySymbol: Record<string, MacroItem> }) {
  const vix   = bySymbol['^VIX'];
  const vix9d = bySymbol['^VIX9D'];
  const vvix  = bySymbol['^VVIX'];

  const vixVal   = vix?.price ?? null;
  const vix9dVal = vix9d?.price ?? null;

  const isBackwardation = vixVal != null && vix9dVal != null && vix9dVal > vixVal;
  const vixLevel = vixVal == null ? 'unknown'
    : vixVal < 14  ? 'low'
    : vixVal < 20  ? 'normal'
    : vixVal < 28  ? 'elevated'
    : 'high';

  const vixLevelMeta: Record<string, { label: string; color: string; desc: string }> = {
    low:      { label: 'VIX 낮음',   color: 'text-emerald-400', desc: '시장 안정 — 신규 진입 무방, 콜 매도 매력도 낮음' },
    normal:   { label: 'VIX 보통',   color: 'text-teal-400',    desc: '정상 변동성 범위 — 일반적 매매 환경' },
    elevated: { label: 'VIX 상승',   color: 'text-orange-400',  desc: '불확실성 증가 — 포지션 사이즈 조절 권장' },
    high:     { label: 'VIX 급등',   color: 'text-red-400',     desc: 'VIX>28: 신규 매수 신중. 단, 백워데이션이면 단기 바닥 신호 가능' },
    unknown:  { label: 'VIX 로딩',   color: 'text-blue-400',    desc: '데이터 로딩 중...' },
  };
  const lm = vixLevelMeta[vixLevel];

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{color:'var(--text-label)'}}>
        <span className="w-2 h-2 rounded-full bg-blue-500/60" />
        변동성 (VIX) 환경
      </div>

      <div className="flex flex-wrap gap-6 mb-4">
        <div>
          <div className="text-[10px] font-medium mb-0.5" style={{color:'var(--text-muted)'}}>^VIX (공포지수)</div>
          <div className={`text-3xl font-black tabular-nums ${lm.color}`}>{fmt(vixVal, 1)}</div>
          <div className={`text-[10px] font-bold mt-1 ${lm.color}`}>{lm.label}</div>
        </div>
        {vix9dVal != null && (
          <div>
            <div className="text-[10px] font-medium mb-0.5" style={{color:'var(--text-muted)'}}>^VIX9D (단기)</div>
            <div className="text-3xl font-black tabular-nums text-white">{fmt(vix9dVal, 1)}</div>
            <div className="text-[10px] mt-1 font-medium" style={{color:'var(--text-label)'}}>9일 내재변동성</div>
          </div>
        )}
        {vvix?.price != null && (
          <div>
            <div className="text-[10px] font-medium mb-0.5" style={{color:'var(--text-muted)'}}>^VVIX (꼬리위험)</div>
            <div className={`text-3xl font-black tabular-nums ${(vvix.price ?? 0) > 110 ? 'text-orange-400' : 'text-white'}`}>
              {fmt(vvix.price, 1)}
            </div>
            <div className="text-[10px] mt-1 font-medium" style={{color:(vvix.price ?? 0) > 110 ? undefined : 'var(--text-label)'}}>
              {(vvix.price ?? 0) > 110 ? '⚠ 꼬리위험 경고' : 'VIX의 변동성'}
            </div>
          </div>
        )}
      </div>

      {isBackwardation && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl mb-3 glow-blue" style={{background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.35)'}}>
          <span className="text-blue-300 font-black text-sm">⚡</span>
          <span className="text-blue-300 text-xs font-bold">VIX9D &gt; VIX — 백워데이션: 단기 패닉, 반등 가능성 ↑</span>
        </div>
      )}

      <p className="text-xs leading-relaxed" style={{color:'var(--text-secondary)'}}>{lm.desc}</p>
      {vvix?.price != null && (vvix.price ?? 0) > 110 && (
        <p className="text-xs text-orange-400 mt-1 font-medium">⚠ VVIX &gt; 110 — 시스템 꼬리 위험 격앙 중.</p>
      )}
    </div>
  );
}

// ─── 시장 폭 패널 ─────────────────────────────────────────

function BreadthPanel({ bySymbol }: { bySymbol: Record<string, MacroItem> }) {
  const items = [
    { sym: 'SPY',  label: 'S&P 500',     sub: '시가총액 가중' },
    { sym: 'QQQ',  label: '나스닥100',    sub: '빅테크 집중' },
    { sym: 'RSP',  label: 'S&P 동등가중', sub: '500개 균등' },
    { sym: 'MAGS', label: 'Mag7',         sub: '7대 빅테크' },
    { sym: 'IWM',  label: '러셀2000',     sub: '중소형주' },
  ];

  const spy1d  = bySymbol['SPY']?.change_pct_1d ?? 0;
  const rsp1d  = bySymbol['RSP']?.change_pct_1d ?? null;
  const breadthWarning = rsp1d != null && spy1d > 0.3 && rsp1d < spy1d - 0.3;
  const maxAbs = Math.max(...items.map(i => Math.abs(bySymbol[i.sym]?.change_pct_1d ?? 0)), 0.5);

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />

      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{color:'var(--text-label)'}}>
          <span className="w-2 h-2 rounded-full bg-teal-500/60" />
          시장 폭 (Breadth) — 랠리 건강도
        </div>
        {breadthWarning && (
          <span className="px-2 py-0.5 rounded-full text-orange-300 text-[9px] font-bold" style={{background:'rgba(251,146,60,0.15)', border:'1px solid rgba(251,146,60,0.35)'}}>
            ⚠ 협소한 랠리
          </span>
        )}
      </div>

      <div className="space-y-3 mb-5">
        {items.map(({ sym, label, sub }) => {
          const item = bySymbol[sym];
          const chg = item?.change_pct_1d ?? null;
          const barW = chg != null ? Math.abs(chg) / maxAbs * 65 : 0;
          const pos = (chg ?? 0) >= 0;
          const isSpy = sym === 'SPY';

          return (
            <div key={sym} className="flex items-center gap-3">
              <div className="w-28 shrink-0">
                <div className={`text-xs font-bold ${isSpy ? 'text-white' : ''}`} style={!isSpy ? {color:'var(--text-primary)'} : {}}>
                  {label}
                </div>
                <div className="text-[9px]" style={{color:'var(--text-muted)'}}>{sub}</div>
              </div>
              <div className="flex-1 flex items-center h-5">
                {chg != null ? (
                  pos ? (
                    <div className="h-3 rounded-r-full bg-gradient-to-r from-emerald-600/50 to-emerald-400/80 transition-all duration-700"
                      style={{ width: `${barW}%`, boxShadow: barW > 20 ? '0 0 8px rgba(52,211,153,0.4)' : 'none' }} />
                  ) : (
                    <div className="h-3 rounded-l-full bg-gradient-to-l from-red-600/50 to-red-400/80 transition-all duration-700 ml-auto"
                      style={{ width: `${barW}%`, boxShadow: barW > 20 ? '0 0 8px rgba(248,113,113,0.4)' : 'none' }} />
                  )
                ) : (
                  <div className="h-2 w-2 rounded-full" style={{background:'rgba(45,65,115,0.5)'}} />
                )}
              </div>
              <div className="w-20 shrink-0 flex justify-end">
                <ChangeChip v={chg} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-3 text-xs leading-relaxed" style={{background:'rgba(15,25,55,0.6)', border:'1px solid rgba(45,65,115,0.3)'}}>
        <span className="font-semibold text-white">폭 지표 읽는 법:</span>{' '}
        <span style={{color:'var(--text-secondary)'}}>
          SPY(가중)는 오르는데 RSP(동등가중)가 못 따라오면 소수 대형주만의 랠리입니다.
          이런 <span className="text-orange-400 font-semibold">협소한 랠리</span>에서 Stage 2 진입 성공률은 낮아집니다.
        </span>
      </div>
    </div>
  );
}

// ─── 신용 스트레스 패널 ───────────────────────────────────

function CreditPanel({ bySymbol }: { bySymbol: Record<string, MacroItem> }) {
  const hyg = bySymbol['HYG'];
  const ief = bySymbol['IEF'];
  const jnk = bySymbol['JNK'];
  const lqd = bySymbol['LQD'];

  const hygChg5d = hyg?.change_pct_5d ?? null;
  const iefChg5d = ief?.change_pct_5d ?? null;

  let stressLevel: 'OK' | 'WATCH' | 'STRESS' = 'OK';
  if (hygChg5d != null && iefChg5d != null) {
    const spread = hygChg5d - iefChg5d;
    if (spread < -2) stressLevel = 'STRESS';
    else if (spread < -0.5) stressLevel = 'WATCH';
  }

  const stressMeta = {
    OK:     { color: 'text-emerald-300', bg: 'rgba(16,185,129,0.12)', border: 'rgba(52,211,153,0.3)',  label: '정상',      desc: '신용 시장 안정. HYG와 SPY가 동조하는 건전한 환경.' },
    WATCH:  { color: 'text-yellow-300',  bg: 'rgba(245,158,11,0.12)', border: 'rgba(250,204,21,0.3)',  label: '주시',      desc: 'HYG가 IEF 대비 소폭 약세 — 신용 조건 악화 초기 신호.' },
    STRESS: { color: 'text-red-300',     bg: 'rgba(244,63,94,0.12)',  border: 'rgba(248,113,113,0.3)', label: '스트레스',  desc: '하이일드 채권이 국채 대비 크게 하락 — 기업 부도 위험 증가 가격화.' },
  }[stressLevel];

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{color:'var(--text-label)'}}>
          <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
          신용 스트레스 — HYG / IEF 관계
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{background: stressMeta.bg, border:`1px solid ${stressMeta.border}`, color: stressMeta.color.replace('text-', '')}}>
          <span className={stressMeta.color}>{stressMeta.label}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { item: hyg, label: 'HYG', sub: '하이일드', accent: true },
          { item: jnk, label: 'JNK', sub: '정크본드', accent: false },
          { item: lqd, label: 'LQD', sub: '투자등급', accent: false },
          { item: ief, label: 'IEF', sub: '중기국채', accent: true },
        ].map(({ item, label, sub, accent }) => (
          <div key={label} className={`rounded-xl p-3 ${accent ? '' : ''}`} style={{background:'rgba(12,20,45,0.7)', border:'1px solid rgba(35,55,95,0.5)'}}>
            <div className="text-[10px] font-bold mb-0.5" style={{color:'var(--text-label)'}}>
              {label} <span className="font-normal opacity-70">{sub}</span>
            </div>
            <div className="text-lg font-black text-white tabular-nums">{fmt(item?.price)}</div>
            <div className="mt-1">
              <ChangeChip v={item?.change_pct_1d ?? null} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 text-xs leading-relaxed" style={{background:'rgba(15,25,55,0.6)', border:'1px solid rgba(45,65,115,0.3)'}}>
        <span className="font-semibold text-white">읽는 법:</span>{' '}
        <span style={{color:'var(--text-secondary)'}}>
          HYG(하이일드)는 주식과 유사하게 움직입니다.{' '}
          <span className="text-orange-400 font-semibold">SPY 상승 + HYG 하락 = 위험 신호</span> —
          신용 시장이 주식 시장보다 먼저 위험을 감지합니다.{' '}
          {stressMeta.desc}
        </span>
      </div>
    </div>
  );
}

// ─── 메인 DashboardOverview ───────────────────────────────

export default function DashboardOverview() {
  const { macroData, isLoading: macroLoading } = useMacro();
  const { regimeData } = useRegime();
  const { ddData } = useDistributionDays();

  const bySymbol: Record<string, MacroItem> = macroData
    ? Object.fromEntries(macroData.macro.map((m) => [m.symbol, m]))
    : {};

  return (
    <div className="space-y-5 animate-fade-in">

      {/* 섹션 제목 */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-indigo-600" />
        <span className="text-sm font-bold tracking-wide" style={{color:'var(--text-secondary)'}}>
          Market Overview
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest" style={{color:'var(--text-muted)'}}>
          — 현재 시장 한눈에 보기
        </span>
      </div>

      {/* Row 1: Regime + DD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <RegimeCard data={regimeData} />
        </div>
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DDCard sym="SPY" dd={ddData?.spy} />
          <DDCard sym="QQQ" dd={ddData?.qqq} />
        </div>
      </div>

      {/* Row 2: 핵심 지수 스냅샷 */}
      {!macroLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <IndexSnapshot item={bySymbol['SPY']}      label="S&P 500 (SPY)" />
          <IndexSnapshot item={bySymbol['QQQ']}      label="나스닥100 (QQQ)" />
          <IndexSnapshot item={bySymbol['IWM']}      label="러셀2000 (IWM)" />
          <IndexSnapshot item={bySymbol['DX-Y.NYB']} label="달러인덱스 (DXY)" />
          <IndexSnapshot item={bySymbol['GLD']}      label="금 (GLD)" />
        </div>
      )}

      {/* Row 3: VIX + Breadth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VIXPanel bySymbol={bySymbol} />
        <BreadthPanel bySymbol={bySymbol} />
      </div>

      {/* Row 4: Credit Stress */}
      <CreditPanel bySymbol={bySymbol} />

      {/* 구분선 */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex-1 h-[1px]" style={{background:'linear-gradient(90deg, transparent, rgba(45,65,115,0.5), transparent)'}} />
        <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{color:'var(--text-muted)'}}>
          세부 분석 탭
        </span>
        <div className="flex-1 h-[1px]" style={{background:'linear-gradient(90deg, transparent, rgba(45,65,115,0.5), transparent)'}} />
      </div>

    </div>
  );
}
