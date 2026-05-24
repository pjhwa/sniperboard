'use client';

import React from 'react';
import { useSentiment } from '../hooks/useSentiment';
import {
  SENTIMENT_META, TREND_META, VOLUME_META,
  SymbolSentiment, MarketSentiment,
} from '../app/types';

function compositeColor(score: number): string {
  if (score >= 1.5) return 'text-emerald-400';
  if (score >= 0.5) return 'text-teal-400';
  if (score > -0.5) return 'text-zinc-400';
  if (score > -1.5) return 'text-orange-400';
  return 'text-red-400';
}

function compositeLabel(score: number): string {
  if (score >= 1.5) return '도취';
  if (score >= 0.5) return '낙관';
  if (score > -0.5) return '중립';
  if (score > -1.5) return '공포';
  return '극도공포';
}

// ── 시장 전체 카드 ──────────────────────────────────────────────────────────
function MarketCard({ market }: { market: MarketSentiment }) {
  const sm = SENTIMENT_META[market.sentiment];
  const tm = TREND_META[market.trend_vs_yesterday];

  const extremeLabel =
    market.extreme_flag === 'extreme_fear' ? '⚠ 극단적 공포'
    : market.extreme_flag === 'extreme_greed' ? '⚠ 극단적 탐욕'
    : null;

  return (
    <div className={`glass-card rounded-2xl p-5 border ${sm.bg}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-label)' }}>
            시장 전체 심리
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-2xl font-bold ${sm.color}`}>{sm.label}</span>
            <span className={`text-lg font-semibold ${tm.color}`}>{tm.icon} {tm.label}</span>
            {extremeLabel && (
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {extremeLabel}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{market.key_reason}</p>
        </div>
        <div className="text-right text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
          <p>신뢰도: <span className={market.confidence === 'low' ? 'text-red-400' : 'text-zinc-300'}>{market.confidence}</span></p>
          {market.composite_score !== undefined ? (
            <p>복합점수: <span className={`font-semibold ${compositeColor(market.composite_score)}`}>
              {market.composite_score > 0 ? '+' : ''}{market.composite_score}
            </span></p>
          ) : (
            <p>점수: <span className="text-zinc-300">{market.sentiment_score > 0 ? '+' : ''}{market.sentiment_score}</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 종목 카드 ───────────────────────────────────────────────────────────────
function SymbolCard({ sym }: { sym: SymbolSentiment }) {
  const sm = SENTIMENT_META[sym.sentiment];
  const tm = TREND_META[sym.trend_vs_yesterday];
  const vm = VOLUME_META[sym.mention_volume];
  const isLowConf = sym.confidence === 'low';

  return (
    <div
      className={`glass-card rounded-xl p-4 border transition-all ${sm.bg} ${isLowConf ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-base font-bold text-white">{sym.symbol}</span>
          {isLowConf && (
            <span className="ml-2 text-[10px] font-medium text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 px-1.5 py-0.5 rounded-full">
              신뢰도 낮음
            </span>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sm.bg} ${sm.color}`}>
          {sm.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs mb-2 flex-wrap">
        <span className={`font-semibold ${tm.color}`}>{tm.icon} {tm.label}</span>
        <span className={vm.color}>언급: {vm.label}</span>
        {sym.composite_score !== undefined ? (
          <span className={`font-semibold ${compositeColor(sym.composite_score)}`} title="복합 점수 (신뢰도·봇·언급량·다이버전스 반영)">
            ◈ {sym.composite_score > 0 ? '+' : ''}{sym.composite_score}
          </span>
        ) : (
          sym.score_delta !== null && sym.score_delta !== undefined && (
            <span className={`font-medium ${sym.score_delta > 0 ? 'text-emerald-400' : sym.score_delta < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
              Δ{sym.score_delta > 0 ? '+' : ''}{sym.score_delta}
            </span>
          )
        )}
        {sym.composite_score !== undefined && sym.score_delta !== null && sym.score_delta !== undefined && (
          <span className={`font-medium ${sym.score_delta > 0 ? 'text-emerald-400' : sym.score_delta < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            Δ{sym.score_delta > 0 ? '+' : ''}{sym.score_delta}
          </span>
        )}
      </div>

      <p className="text-xs leading-snug mb-2" style={{ color: 'var(--text-secondary)' }}>
        {sym.key_reason}
      </p>

      <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {sym.bot_suspected === 'yes' && (
          <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
            봇 의심
          </span>
        )}
        <span>신뢰도: {sym.confidence}</span>
      </div>
    </div>
  );
}

// ── 메인 탭 ─────────────────────────────────────────────────────────────────
export default function SentimentTab() {
  const { data, isLoading, isError } = useSentiment();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 animate-pulse text-sm">
        소셜 심리 데이터 로딩 중…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-red-500/20 text-red-400 text-sm">
        심리 데이터를 불러올 수 없습니다 — 수집기 또는 리포 설정을 확인하세요.
      </div>
    );
  }

  if (!data.available) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-zinc-700/40 text-zinc-400 text-sm space-y-1">
        <p className="font-semibold text-zinc-300">심리 데이터를 불러올 수 없습니다</p>
        <p>{data.error ?? '수집기 또는 GitHub 리포 설정을 확인하세요.'}</p>
      </div>
    );
  }

  const snapshot = data.latest;
  if (!snapshot) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-zinc-700/40 text-zinc-400 text-sm">
        스냅샷 데이터가 없습니다.
      </div>
    );
  }

  const generatedAt = snapshot.generated_at
    ? new Date(snapshot.generated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 시장 전체 */}
      {snapshot.market && <MarketCard market={snapshot.market} />}

      {/* 종목 그리드 */}
      {snapshot.symbols && snapshot.symbols.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshot.symbols.map((sym) => (
            <SymbolCard key={sym.symbol} sym={sym} />
          ))}
        </div>
      )}

      {/* 푸터 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <p className="italic">
          ⚠ 소셜 심리는 보조 참고용입니다. 진입 결정은 가격 신호를 우선하세요.
        </p>
        {generatedAt && (
          <p className="shrink-0">수집: {generatedAt} KST{snapshot.slot ? ` (${snapshot.slot})` : ''}</p>
        )}
      </div>
    </div>
  );
}
