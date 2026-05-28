'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useIntraday } from '@/hooks/useIntraday';
import { useDaily } from '@/hooks/useDaily';
import { useSentiment } from '@/hooks/useSentiment';
import { useBrief } from '@/hooks/useBrief';
import { useEarnings } from '@/hooks/useEarnings';
import { useRegime } from '@/hooks/useRegime';
import { Card, ScorePill } from '@/components/ui/Card';
import { RadialGauge } from '@/components/ui/RadialGauge';
import { Sparkline } from '@/components/ui/Sparkline';
import { HeatStrip } from '@/components/ui/HeatStrip';
import { Check, X, Sparkle } from '@/components/ui/Icons';
import {
  SYMBOLS, STAGE2_META, SIGNAL_META, SENTIMENT_META, TREND_META,
  VOLUME_META, SETUP_QUALITY_META, EARNINGS_RISK_META,
  UpcomingEarning, SymbolBrief, TopNews,
} from '@/app/types';
import { SentimentTrendChart } from './SentimentTrendChart';

// ─── helpers ──────────────────────────────────────────────────────────────────

const MONTHLY_PHASE_META: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED_UPTREND: { label: '월봉 상승 확인', color: '#fff',           bg: 'var(--bull)' },
  WEAKENING:         { label: '월봉 추세 약화', color: '#000',           bg: 'var(--warn)' },
  NEUTRAL:           { label: '월봉 중립',      color: 'var(--fg)',      bg: 'var(--border)' },
  DOWNTREND:         { label: '월봉 하락',       color: '#fff',           bg: 'var(--bear)' },
  UNKNOWN:           { label: '데이터 부족',     color: 'var(--fg-muted)', bg: 'var(--border-soft)' },
};

const SIGNAL_BADGE: Record<string, [string, string]> = {
  sniper:       ['bull', 'Sniper'],
  vcp:          ['info', 'VCP'],
  pullback:     ['warn', 'Pullback'],
  strong_trend: ['teal', 'StrongTrend'],
  overbought:   ['warn', 'Overbought'],
  downtrend:    ['bear', 'Downtrend'],
};

function compositeColor(score: number): string {
  if (score >= 1.5) return 'var(--emerald)';
  if (score >= 0.5) return 'var(--teal)';
  if (score > -0.5) return 'var(--fg-muted)';
  if (score > -1.5) return 'var(--orange)';
  return 'var(--red)';
}

function ScoreBar({ score }: { score: number }) {
  const s = Math.max(-2, Math.min(2, score));
  const pct = ((s + 2) / 4) * 100;
  const isPos = s >= 0;
  const color = compositeColor(s);
  return (
    <div style={{ margin: '6px 0 4px' }}>
      <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'var(--border)' }}>
        <div style={{ position: 'absolute', top: -2, bottom: -2, left: '50%', width: 1, background: 'var(--fg-subtle)', opacity: 0.4, transform: 'translateX(-50%)' }} />
        <div style={{
          position: 'absolute', top: 0, height: '100%',
          left: `${isPos ? 50 : pct}%`,
          width: `${isPos ? pct - 50 : 50 - pct}%`,
          borderRadius: 3, background: color, opacity: 0.85,
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          width: 9, height: 9, borderRadius: '50%',
          background: color, border: '2px solid var(--card)',
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 4px ${color}`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--fg-subtle)', marginTop: 3 }}>
        <span>−2</span><span>0</span><span>+2</span>
      </div>
    </div>
  );
}

function TopNewsBox({ topNews }: { topNews: TopNews | null | undefined }) {
  if (!topNews) return null;
  return (
    <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 6, background: 'var(--em-soft)', borderLeft: '2px solid var(--em-500)' }}>
      <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)', marginBottom: 3 }}>주요 뉴스</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.4, marginBottom: 3 }}>{topNews.headline}</div>
      <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 4 }}>{topNews.summary}</div>
      <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)' }}>출처: {topNews.source}</div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export function DeepDiveBoard() {
  const { symbol, setSymbol, timeframe, rrAccount, rrRiskPct } = useStore();
  const [showSentimentTrend, setShowSentimentTrend] = useState(false);

  // data hooks
  const { ohlcvData } = useIntraday(symbol, timeframe);
  const { dailyData, isLoading: dailyLoading } = useDaily(symbol);
  const { data: sentimentData } = useSentiment();
  const { briefData } = useBrief();
  const { earningsData } = useEarnings();
  const { regimeData } = useRegime();

  // derived intraday
  const candles = ohlcvData?.candles ?? [];
  const signals = ohlcvData?.signals;
  const indicators = ohlcvData?.indicators;
  const lastIdx = candles.length - 1;
  const lastCandle = candles[lastIdx];
  const activeSignals = signals
    ? ['sniper', 'vcp', 'pullback', 'strong_trend', 'overbought', 'downtrend'].filter(
        k => signals[k as keyof typeof signals][lastIdx]
      )
    : [];

  // derived daily
  const stage2 = dailyData?.stage2;
  const dailyCandles = dailyData?.candles ?? [];
  const dailyChg = dailyCandles.slice(-61).map((c, i, arr) =>
    i === 0 ? 0 : ((c.close - arr[i - 1].close) / arr[i - 1].close) * 100
  ).slice(1);
  const upDays   = dailyChg.filter(v => v > 0.05).length;
  const downDays = dailyChg.filter(v => v < -0.05).length;

  // R:R calc
  const entry = stage2?.entry ?? 0;
  const stop  = stage2?.stop  ?? 0;
  const target = stage2?.target ?? 0;
  const accountNum = parseFloat(rrAccount.replace(/,/g, '')) || 100000;
  const riskPct = parseFloat(rrRiskPct) || 1;
  const riskAmt = accountNum * (riskPct / 100);
  const qty = stop > 0 && entry > stop ? Math.floor(riskAmt / (entry - stop)) : 0;
  const stopLossPct = entry > 0 ? ((entry - stop) / entry) * 100 : 0;

  // sentiment for this symbol
  const symSentiment = (sentimentData?.latest?.symbols ?? []).find(s => s.symbol === symbol);
  const mktSentiment = sentimentData?.latest?.market;

  // brief for this symbol
  const symBrief: SymbolBrief | undefined = (briefData?.symbol_briefs ?? []).find(sb => sb.symbol === symbol);

  // earnings for this symbol
  const symEarning: UpcomingEarning | undefined = earningsData?.upcoming_earnings?.find(e => e.symbol === symbol);

  const REGIME_KO: Record<string, string> = {
    RISK_ON: '강세', CONSTRUCTIVE: '우호적', MIXED: '혼조', DEFENSIVE: '방어적', RISK_OFF: '약세', UNKNOWN: '불명',
  };

  return (
    <div className="board fade-in" style={{ gridTemplateColumns: '1fr 1fr 1fr', alignContent: 'start' }}>

      {/* ── Symbol Selector (full width) ── */}
      <div style={{
        gridColumn: 'span 3',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: 'var(--card)',
        borderRadius: 'var(--r)',
        border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginRight: 4 }}>
          종목 선택
        </span>
        {SYMBOLS.map(s => (
          <button
            key={s}
            onClick={() => { setSymbol(s); setShowSentimentTrend(false); }}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-sm)',
              fontSize: 12, fontWeight: 700,
              background: symbol === s ? 'var(--em-500)' : 'transparent',
              border: symbol === s ? '1px solid var(--em-500)' : '1px solid var(--border)',
              color: symbol === s ? '#fff' : 'var(--fg-muted)',
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            {s}
          </button>
        ))}
        {lastCandle && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="mono" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
              ${lastCandle.close.toFixed(2)}
            </span>
            {activeSignals.slice(0, 2).map(sig => {
              const m = SIGNAL_BADGE[sig];
              return m ? <span key={sig} className={'badge ' + m[0]}>● {m[1]}</span> : null;
            })}
          </div>
        )}
      </div>

      {/* ── Col 1+2: Snapshot + Heat ── */}
      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>

        {/* Price Snapshot */}
        <Card title={`${symbol} · 스냅샷`} hint={activeSignals.length ? 'LIVE' : null} action={timeframe}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Sparkline */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                인트라데이 5m
              </div>
              {candles.length > 1 ? (
                <Sparkline values={candles.slice(-80).map(c => c.close)} width={260} height={64} strokeWidth={1.6} />
              ) : (
                <div className="subtle" style={{ height: 64, display: 'flex', alignItems: 'center' }}>로딩 중...</div>
              )}
              {indicators && lastIdx >= 0 && (
                <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11 }}>
                  <div><span className="subtle">RSI </span>
                    <span className="mono" style={{ color: (indicators.rsi[lastIdx] ?? 0) >= 70 ? 'var(--warn)' : (indicators.rsi[lastIdx] ?? 0) <= 35 ? 'var(--bear)' : 'var(--fg)' }}>
                      {(indicators.rsi[lastIdx] ?? 0).toFixed(0)}
                    </span>
                  </div>
                  <div><span className="subtle">EMA21 </span><span className="mono">${(indicators.ema21[lastIdx] ?? 0).toFixed(2)}</span></div>
                  <div><span className="subtle">ATR </span><span className="mono">{(indicators.atr[lastIdx] ?? 0).toFixed(2)}</span></div>
                </div>
              )}
            </div>

            {/* Active signals */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                활성 신호
              </div>
              {activeSignals.length === 0 ? (
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>활성 신호 없음</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeSignals.map(sig => {
                    const m = SIGNAL_META[sig];
                    return m ? (
                      <div key={sig} style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--card-elev)', borderLeft: `2px solid ${m.color.replace('text-', '').includes('emerald') ? 'var(--bull)' : m.bg.includes('bear') ? 'var(--bear)' : m.bg.includes('yellow') ? 'var(--warn)' : 'var(--teal)'}` }}>
                        <div style={{ fontWeight: 600, fontSize: 11.5 }}>{m.label} <span className="badge neutral" style={{ fontSize: 9 }}>{m.action}</span></div>
                        <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 2 }}>{m.desc}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Daily Heat */}
        <Card title="Daily Heat · 60일" action={symbol}>
          {dailyChg.length > 0 ? (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span className="badge bull" style={{ fontSize: 10.5 }}>↑ {upDays}일 상승</span>
                <span className="badge bear" style={{ fontSize: 10.5 }}>↓ {downDays}일 하락</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--fg-subtle)', marginBottom: 3 }}>
                <span>← 60일 전</span><span>오늘 →</span>
              </div>
              <HeatStrip values={dailyChg} cols={20} rows={3} />
            </>
          ) : <div className="subtle">로딩 중...</div>}
        </Card>
      </div>

      {/* ── Col 3: Stage2 ── */}
      <Card title="Minervini Stage 2" action="7 Checks">
        {stage2 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <RadialGauge value={stage2.score} max={7} size={80} label={`${stage2.score}/7`} sublabel={stage2.score >= 6 ? '진입 고려' : stage2.score >= 4 ? '관망' : '회피'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>RS Score</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: stage2.rs_score >= 70 ? 'var(--bull)' : stage2.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)' }}>
                  {stage2.rs_score}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--fg-muted)' }}>vs SPY · 63일</div>
              </div>
            </div>

            {/* Monthly phase */}
            {(() => {
              const mp = stage2.monthly_phase ?? 'UNKNOWN';
              const meta = MONTHLY_PHASE_META[mp] ?? MONTHLY_PHASE_META.UNKNOWN;
              return (
                <div style={{ padding: '5px 10px', borderRadius: 6, background: meta.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                  {stage2.monthly_ema10 != null && (
                    <span className="mono" style={{ fontSize: 10.5, color: meta.color, opacity: 0.85 }}>
                      EMA10 ${stage2.monthly_ema10.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Conviction */}
            {dailyData?.conviction_score != null && (() => {
              const s = dailyData.conviction_score;
              const c = s >= 65 ? 'var(--bull)' : s >= 50 ? 'var(--teal)' : s >= 35 ? 'var(--warn)' : 'var(--bear)';
              const bg = s >= 65 ? 'var(--bull-soft)' : s >= 50 ? 'rgba(20,184,166,0.12)' : s >= 35 ? 'var(--warn-soft)' : 'var(--bear-soft)';
              return (
                <div style={{ padding: '6px 10px', borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', minWidth: 65 }}>Conviction</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{s}</div>
                  <div style={{ fontSize: 12, color: c }}>{dailyData.conviction_label}</div>
                </div>
              );
            })()}

            {(Object.keys(STAGE2_META) as (keyof typeof STAGE2_META)[]).map(k => (
              <div key={k} className={'s2-row ' + (stage2.checks[k] ? 'pass' : 'fail')}>
                <div className="check">{stage2.checks[k] ? <Check /> : <X />}</div>
                <div className="s2-label">{STAGE2_META[k].label}</div>
              </div>
            ))}
          </>
        ) : (
          <div className="subtle">{dailyLoading ? '로딩 중...' : '데이터 없음'}</div>
        )}
      </Card>

      {/* ── R:R + Key Levels ── */}
      <Card title="R:R · 진입 계획">
        {stage2 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--info-soft)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Entry</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)' }}>${entry.toFixed(2)}</div>
              </div>
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--bear-soft)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--bear)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stop</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--bear)' }}>${stop.toFixed(2)}</div>
              </div>
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--bull-soft)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--bull)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--bull)' }}>${target.toFixed(2)}</div>
              </div>
            </div>
            {([
              ['R:R Ratio', '1 : 3.00', 'var(--fg)'],
              ['Stop Loss %', `-${stopLossPct.toFixed(2)}%`, 'var(--bear)'],
              [`Position (${rrRiskPct}% · $${(accountNum/1000).toFixed(0)}K)`, qty > 0 ? `${qty} 주` : '—', 'var(--em-500)'],
            ] as [string, string, string][]).map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
                <span className="mono" style={{ color, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            <div className="divider" style={{ margin: '10px 0 8px' }} />
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Patterns</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {stage2.gc_breakout && <span className="badge purple">GC Breakout</span>}
              {stage2.gc_retest  && <span className="badge purple">GC Retest</span>}
              {stage2.gc_above   && <span className="badge teal">Above Channel</span>}
              {stage2.gc_below   && <span className="badge bear">Below Channel</span>}
              {stage2.bear_flag  && <span className="badge bear">Bear Flag</span>}
              {stage2.rsi_divergence_bearish && <span className="badge warn">RSI Bear Div</span>}
              {stage2.rsi_divergence_bullish && <span className="badge bull">RSI Bull Div</span>}
              {!stage2.gc_breakout && !stage2.gc_retest && !stage2.gc_above && !stage2.gc_below && !stage2.bear_flag && !stage2.rsi_divergence_bearish && !stage2.rsi_divergence_bullish && (
                <span className="badge neutral">패턴 없음</span>
              )}
            </div>
          </>
        ) : <div className="subtle">로딩 중...</div>}
      </Card>

      {/* ── Stage2 Key Numbers ── */}
      <Card title="핵심 수치">
        {stage2 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {([
              ['52주 고점 대비',    `${stage2.pct_from_52w_high.toFixed(1)}%`,  stage2.pct_from_52w_high >= -25 ? 'var(--bull)' : 'var(--bear)'],
              ['52주 저점 대비',    `+${stage2.pct_from_52w_low.toFixed(1)}%`,  stage2.pct_from_52w_low >= 30 ? 'var(--bull)' : 'var(--warn)'],
              ['최근 조정 (20일)',  `${stage2.pullback_pct.toFixed(1)}%`,       stage2.pullback_pct <= 15 ? 'var(--bull)' : 'var(--bear)'],
              ['EMA200 기울기',    `${stage2.ema200_slope >= 0 ? '+' : ''}${stage2.ema200_slope.toFixed(3)}`,  stage2.ema200_slope >= 0 ? 'var(--bull)' : 'var(--bear)'],
              ['최신 EMA21',       `$${stage2.latest_ema21.toFixed(2)}`,        'var(--fg)'],
              ['최신 EMA50',       `$${stage2.latest_ema50.toFixed(2)}`,        'var(--fg)'],
              ['최신 EMA200',      `$${stage2.latest_ema200.toFixed(2)}`,       'var(--fg)'],
              ['ATR14',            `${stage2.latest_atr.toFixed(2)}`,           'var(--fg-muted)'],
            ] as [string, string, string][]).map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
                <span className="mono" style={{ color, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            {stage2.gc_mid != null && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ color: 'var(--fg-muted)' }}>GC Upper</span>
                  <span className="mono" style={{ color: 'var(--purple)', fontWeight: 600 }}>${stage2.gc_upper?.toFixed(2) ?? '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ color: 'var(--fg-muted)' }}>GC Mid</span>
                  <span className="mono" style={{ color: 'var(--purple)', fontWeight: 600 }}>${stage2.gc_mid?.toFixed(2) ?? '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0' }}>
                  <span style={{ color: 'var(--fg-muted)' }}>GC Lower</span>
                  <span className="mono" style={{ color: 'var(--purple)', fontWeight: 600 }}>${stage2.gc_lower?.toFixed(2) ?? '—'}</span>
                </div>
              </>
            )}
          </div>
        ) : <div className="subtle">로딩 중...</div>}
      </Card>

      {/* ── Social Sentiment (symbol) ── */}
      <Card title="소셜 심리" action={`${symbol} · 소셜`}>
        {symSentiment ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <RadialGauge
                value={(symSentiment.composite_score ?? symSentiment.sentiment_score) + 2}
                max={4}
                size={88}
                label={symSentiment.composite_score ?? symSentiment.sentiment_score}
                sublabel={SENTIMENT_META[symSentiment.sentiment]?.label}
              />
              <div style={{ flex: 1 }}>
                <span className={'badge ' + (SENTIMENT_META[symSentiment.sentiment]?.color.replace('text-', '').split('-')[0] ?? 'neutral')}>
                  {SENTIMENT_META[symSentiment.sentiment]?.label}
                </span>
                <ScoreBar score={symSentiment.composite_score ?? symSentiment.sentiment_score} />
                <div style={{ display: 'flex', gap: 10, fontSize: 10.5, marginTop: 6 }}>
                  <div>
                    <div className="subtle" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>전일 대비</div>
                    <div className="mono" style={{ fontWeight: 600 }}>
                      {TREND_META[symSentiment.trend_vs_yesterday]?.icon} {symSentiment.trend_vs_yesterday}
                    </div>
                  </div>
                  <div>
                    <div className="subtle" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>언급량</div>
                    <div className="mono" style={{ fontWeight: 600 }}>
                      {VOLUME_META[symSentiment.mention_volume]?.label}
                    </div>
                  </div>
                  {symSentiment.score_delta != null && (
                    <div>
                      <div className="subtle" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Δ 전일</div>
                      <div className="mono" style={{ fontWeight: 600, color: symSentiment.score_delta > 0 ? 'var(--bull)' : 'var(--bear)' }}>
                        {symSentiment.score_delta > 0 ? '+' : ''}{symSentiment.score_delta}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.6, marginBottom: 8 }}>
              {symSentiment.key_reason}
            </div>
            <TopNewsBox topNews={symSentiment.top_news} />

            {/* Confidence + bot */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 10.5 }}>
              <span style={{ color: 'var(--fg-subtle)' }}>Confidence: <strong style={{ color: 'var(--em-500)' }}>{symSentiment.confidence.toUpperCase()}</strong></span>
              {symSentiment.bot_suspected === 'yes' && (
                <span style={{ color: 'var(--warn)' }}>⚠ 봇 의심</span>
              )}
            </div>

            {/* Sentiment trend toggle */}
            <button
              onClick={() => setShowSentimentTrend(v => !v)}
              style={{
                marginTop: 10, width: '100%', padding: '6px',
                borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                background: showSentimentTrend ? 'var(--em-soft)' : 'transparent',
                color: 'var(--fg-muted)', fontSize: 11, cursor: 'pointer',
              }}
            >
              {showSentimentTrend ? '▲ 심리 추이 숨기기' : '▼ 심리 추이 보기'}
            </button>
            {showSentimentTrend && <SentimentTrendChart symbol={symbol} />}
          </>
        ) : (
          <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
            {sentimentData?.available === false
              ? '심리 데이터 없음'
              : `${symbol} 심리 데이터를 불러오는 중...`}
          </div>
        )}
      </Card>

      {/* ── Market Sentiment mini ── */}
      <Card title="시장 전체 심리" action="Market">
        {mktSentiment ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <RadialGauge
                value={(mktSentiment.composite_score ?? mktSentiment.sentiment_score) + 2}
                max={4}
                size={72}
                label={mktSentiment.composite_score ?? mktSentiment.sentiment_score}
                sublabel={SENTIMENT_META[mktSentiment.sentiment]?.label}
              />
              <div style={{ flex: 1 }}>
                <span className={'badge ' + (SENTIMENT_META[mktSentiment.sentiment]?.color.replace('text-', '').split('-')[0] ?? 'neutral')}>
                  {SENTIMENT_META[mktSentiment.sentiment]?.label}
                </span>
                <ScoreBar score={mktSentiment.composite_score ?? mktSentiment.sentiment_score} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.6, marginBottom: 6 }}>
              {mktSentiment.key_reason}
            </div>
            <TopNewsBox topNews={mktSentiment.top_news} />
            <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 10.5 }}>
              <span style={{ color: 'var(--fg-subtle)' }}>
                전일 대비: <strong>{TREND_META[mktSentiment.trend_vs_yesterday]?.icon} {mktSentiment.trend_vs_yesterday}</strong>
              </span>
            </div>
          </>
        ) : (
          <div className="subtle">심리 데이터 없음</div>
        )}
      </Card>

      {/* ── AI Brief (symbol) ── */}
      <Card title="AI 분석 · Brief" action={symbol}>
        {symBrief ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div className="ico"><Sparkle /></div>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{symBrief.symbol}</span>
              {(() => {
                const sq = symBrief.setup_quality;
                const sqMeta = SETUP_QUALITY_META[sq] ?? SETUP_QUALITY_META['B'];
                return <span className={`badge ${sqMeta.color}`}>{sqMeta.label}</span>;
              })()}
              {(() => {
                const BIAS_LABELS: Record<string, string> = { buy: '매수', hold: '보유', watch: '관망', avoid: '회피' };
                const BIAS_COLORS: Record<string, string> = { buy: 'bull', hold: 'teal', watch: 'warn', avoid: 'bear' };
                return (
                  <span className={`badge ${BIAS_COLORS[symBrief.action_bias] ?? 'neutral'}`}>
                    {BIAS_LABELS[symBrief.action_bias] ?? symBrief.action_bias}
                  </span>
                );
              })()}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg)', lineHeight: 1.7, marginBottom: 10 }}>
              {symBrief.brief}
            </div>
            <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--bull-soft)', borderLeft: '2px solid var(--bull)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--bull)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>기회 요인</div>
                <div style={{ fontSize: 11, color: 'var(--fg)', lineHeight: 1.5 }}>{symBrief.key_opportunity}</div>
              </div>
              <div style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--bear-soft)', borderLeft: '2px solid var(--bear)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--bear)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>리스크 요인</div>
                <div style={{ fontSize: 11, color: 'var(--fg)', lineHeight: 1.5 }}>{symBrief.key_risk}</div>
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 9.5, color: 'var(--fg-subtle)' }}>AI 의견 — 매매 신호 아님</div>
          </>
        ) : (
          <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
            {briefData ? `${symbol} AI Brief 없음` : 'AI Brief 로딩 중...'}
          </div>
        )}
      </Card>

      {/* ── Earnings ── */}
      <Card title="실적 발표" action={symbol}>
        {symEarning ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{symEarning.symbol}</span>
              {(() => {
                const rm = EARNINGS_RISK_META[symEarning.risk_level] ?? EARNINGS_RISK_META.med;
                const tierColor = symEarning.relevance_tier === 'imminent' ? 'var(--bear)' : symEarning.relevance_tier === 'approaching' ? 'var(--warn)' : 'var(--fg-subtle)';
                const tierLabel = symEarning.relevance_tier === 'imminent' ? '⚡ 임박' : symEarning.relevance_tier === 'approaching' ? '📅 진입권' : '관망';
                return (
                  <>
                    <span className={`badge ${rm.color}`}>{rm.dot} {symEarning.risk_level.toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: tierColor, fontWeight: 600 }}>{tierLabel}</span>
                  </>
                );
              })()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--card-elev)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>발표일</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{symEarning.earnings_date.slice(5)}</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--card-elev)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>D-day</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: symEarning.days_until <= 7 ? 'var(--bear)' : 'var(--warn)' }}>
                  {symEarning.days_until}일 후
                </div>
              </div>
              {symEarning.eps_estimate != null && (
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--card-elev)' }}>
                  <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>EPS 추정</div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>${symEarning.eps_estimate.toFixed(2)}</div>
                </div>
              )}
              {symEarning.historical_beat_rate != null && (
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--card-elev)' }}>
                  <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>과거 Beat율</div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>{(symEarning.historical_beat_rate * 100).toFixed(0)}%</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{symEarning.ai_summary}</div>
            <div style={{ marginTop: 8, fontSize: 11, padding: '6px 10px', borderRadius: 6, background: 'var(--warn-soft)', color: 'var(--warn)' }}>
              ⚡ {symEarning.action_note}
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
            {earningsData ? `${symbol} — 30일 이내 실적 없음` : '실적 데이터 로딩 중...'}
          </div>
        )}
      </Card>

      {/* ── Regime + Market Structure ── */}
      <Card title="Risk Regime" action="매크로 환경">
        {regimeData ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <RadialGauge value={regimeData.total ?? 0} size={80} label={regimeData.total ?? '—'} sublabel="/ 100" />
              <div>
                <span className={'badge ' + (regimeData.regime === 'CONSTRUCTIVE' ? 'teal' : 'em')} style={{ marginBottom: 6, display: 'inline-block' }}>
                  {REGIME_KO[regimeData.regime] ?? '—'} · {regimeData.regime}
                </span>
                {stage2 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span className={'badge ' + (() => {
                      const m: Record<string, string> = { UPTREND: 'bull', DOWNTREND: 'bear', DISTRIBUTION: 'warn', ACCUMULATION: 'info', NEUTRAL: 'neutral' };
                      return m[stage2.market_structure] ?? 'neutral';
                    })()}>{stage2.market_structure}</span>
                  </div>
                )}
              </div>
            </div>
            {([
              ['Trend',      regimeData.components.trend],
              ['Breadth',    regimeData.components.breadth],
              ['Credit',     regimeData.components.credit],
              ['Volatility', regimeData.components.volatility],
              ['Momentum',   regimeData.components.momentum],
            ] as [string, number | null][]).map(([label, v]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, marginBottom: 4 }}>
                <div style={{ width: 60, color: 'var(--fg-subtle)' }}>{label}</div>
                <div className="bar" style={{ flex: 1 }}>
                  <div className="bar__fill" style={{
                    width: ((v ?? 0) / 20 * 100) + '%',
                    background: (v ?? 0) === 0 ? 'var(--bear)' : (v ?? 0) < 8 ? 'var(--warn)' : 'var(--em-500)',
                  }} />
                </div>
                <span className="mono" style={{ width: 26, textAlign: 'right', fontSize: 10, color: (v ?? 0) === 0 ? 'var(--bear)' : 'inherit' }}>
                  {(v ?? 0).toFixed(1)}
                </span>
              </div>
            ))}
          </>
        ) : <div className="subtle">로딩 중...</div>}
      </Card>

    </div>
  );
}
