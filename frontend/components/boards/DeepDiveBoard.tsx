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
import DailyChart from '@/components/charts/DailyChart';
import {
  SYMBOLS, STAGE2_META, SIGNAL_META, SENTIMENT_META, TREND_META,
  VOLUME_META, SETUP_QUALITY_META, EARNINGS_RISK_META,
  UpcomingEarning, SymbolBrief, TopNews,
} from '@/app/types';
import { SentimentTrendChart } from './SentimentTrendChart';

// ─── 로컬 메타 ────────────────────────────────────────────────────────────────

const MONTHLY_META: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED_UPTREND: { label: '월봉 상승확인', color: '#fff',            bg: 'var(--bull)' },
  WEAKENING:         { label: '월봉 약화중',   color: '#000',            bg: 'var(--warn)' },
  NEUTRAL:           { label: '월봉 중립',     color: 'var(--fg)',       bg: 'var(--border)' },
  DOWNTREND:         { label: '월봉 하락',      color: '#fff',            bg: 'var(--bear)' },
  UNKNOWN:           { label: '월봉 ?',        color: 'var(--fg-muted)', bg: 'var(--border-soft)' },
};

const STRUCT_CLS: Record<string, string> = {
  UPTREND: 'bull', DOWNTREND: 'bear', DISTRIBUTION: 'warn', ACCUMULATION: 'info', NEUTRAL: 'neutral',
};

const REGIME_KO: Record<string, [string, string]> = {
  RISK_ON: ['Risk-On', 'bull'], CONSTRUCTIVE: ['우호적', 'teal'], MIXED: ['혼조', 'warn'],
  DEFENSIVE: ['방어적', 'warn'], RISK_OFF: ['Risk-Off', 'bear'], UNKNOWN: ['불명', 'neutral'],
};

// 소셜 composite score → 색상
function csColor(s: number) {
  if (s >= 1.5) return 'var(--bull)';
  if (s >= 0.5) return 'var(--teal)';
  if (s > -0.5) return 'var(--fg-muted)';
  if (s > -1.5) return 'var(--warn)';
  return 'var(--bear)';
}

// −2~+2 가로 막대
function ScoreBar({ score }: { score: number }) {
  const s = Math.max(-2, Math.min(2, score));
  const pct = ((s + 2) / 4) * 100;
  const color = csColor(s);
  return (
    <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'var(--border)', margin: '7px 0 4px' }}>
      <div style={{ position: 'absolute', top: -1, bottom: -1, left: '50%', width: 1, background: 'var(--fg-subtle)', opacity: 0.4, transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', top: 0, height: '100%', left: `${s >= 0 ? 50 : pct}%`, width: `${s >= 0 ? pct - 50 : 50 - pct}%`, borderRadius: 3, background: color, opacity: 0.85 }} />
      <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, width: 9, height: 9, borderRadius: '50%', background: color, border: '2px solid var(--card)', transform: 'translate(-50%,-50%)', boxShadow: `0 0 5px ${color}` }} />
    </div>
  );
}

function TopNewsBox({ news }: { news: TopNews | null | undefined }) {
  if (!news) return null;
  return (
    <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 6, background: 'var(--em-soft)', borderLeft: '2px solid var(--em-500)' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)', marginBottom: 2 }}>주요 뉴스</div>
      <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.4, marginBottom: 3 }}>{news.headline}</div>
      <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 3 }}>{news.summary}</div>
      <div style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>출처: {news.source}</div>
    </div>
  );
}

// KPI 블록 (label + 값)
function Kpi({ label, value, color, size = 20 }: { label: string; value: string; color?: string; size?: number }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontSize: size, fontWeight: 700, color: color ?? 'var(--fg)', lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function DeepDiveBoard() {
  const { symbol, setSymbol, timeframe, rrAccount, rrRiskPct } = useStore();
  const [showSentTrend, setShowSentTrend] = useState(false);

  const { ohlcvData } = useIntraday(symbol, timeframe);
  const { dailyData, isLoading: chartLoading } = useDaily(symbol);
  const { data: sentimentData } = useSentiment();
  const { briefData } = useBrief();
  const { earningsData } = useEarnings();
  const { regimeData } = useRegime();

  // ─ Intraday
  const candles   = ohlcvData?.candles ?? [];
  const signals   = ohlcvData?.signals;
  const indicators = ohlcvData?.indicators;
  const lastIdx   = candles.length - 1;
  const lastCandle = candles[lastIdx];
  const activeSignals = signals
    ? ['sniper','vcp','pullback','strong_trend','overbought','downtrend'].filter(k => signals[k as keyof typeof signals][lastIdx])
    : [];

  // ─ Daily / Stage2
  const stage2 = dailyData?.stage2;
  const dailyChg = (dailyData?.candles ?? []).slice(-61).map((c, i, arr) =>
    i === 0 ? 0 : ((c.close - arr[i - 1].close) / arr[i - 1].close) * 100
  ).slice(1);

  // ─ R:R
  const entry = stage2?.entry ?? 0;
  const stop  = stage2?.stop  ?? 0;
  const target = stage2?.target ?? 0;
  const accountNum = parseFloat(rrAccount.replace(/,/g, '')) || 100000;
  const riskPct = parseFloat(rrRiskPct) || 1;
  const qty = stop > 0 && entry > stop ? Math.floor(accountNum * (riskPct / 100) / (entry - stop)) : 0;
  const stopLossPct = entry > 0 ? ((entry - stop) / entry) * 100 : 0;

  // ─ Sentiment
  const symSent = (sentimentData?.latest?.symbols ?? []).find(s => s.symbol === symbol);
  const mktSent = sentimentData?.latest?.market;
  const symBrief: SymbolBrief | undefined = (briefData?.symbol_briefs ?? []).find(sb => sb.symbol === symbol);
  const symEarning: UpcomingEarning | undefined = earningsData?.upcoming_earnings?.find(e => e.symbol === symbol);

  // ─ Conviction 색상
  const cv = dailyData?.conviction_score;
  const cvColor = cv == null ? 'var(--fg-muted)' : cv >= 65 ? 'var(--bull)' : cv >= 50 ? 'var(--teal)' : cv >= 35 ? 'var(--warn)' : 'var(--bear)';

  // ─ Monthly phase
  const mp = stage2?.monthly_phase ?? 'UNKNOWN';
  const mpMeta = MONTHLY_META[mp] ?? MONTHLY_META.UNKNOWN;

  // GC 상태 배지
  const gcBadges: [string, string][] = [];
  if (stage2?.gc_breakout) gcBadges.push(['GC 돌파', 'purple']);
  else if (stage2?.gc_retest)  gcBadges.push(['GC 리테스트', 'purple']);
  else if (stage2?.gc_above)   gcBadges.push(['채널 위', 'teal']);
  else if (stage2?.gc_below)   gcBadges.push(['채널 아래', 'bear']);

  // 패턴 배지
  const patBadges: [string, string][] = [];
  if (stage2?.bear_flag)              patBadges.push(['Bear Flag', 'bear']);
  if (stage2?.rsi_divergence_bullish) patBadges.push(['RSI Bull Div', 'bull']);
  if (stage2?.rsi_divergence_bearish) patBadges.push(['RSI Bear Div', 'warn']);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '3fr 2fr', alignItems: 'start' }}
    >

      {/* ══════════════════════════════════════════════════════════════════
          ZONE 0: Symbol Picker + Price (full width)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        gridColumn: 'span 2',
        display: 'flex', alignItems: 'center', gap: 0,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', overflow: 'hidden',
      }}>
        {/* Symbol buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 12px', borderRight: '1px solid var(--border)' }}>
          {SYMBOLS.map(s => (
            <button
              key={s}
              onClick={() => { setSymbol(s); setShowSentTrend(false); }}
              style={{
                padding: '5px 12px', borderRadius: 6,
                fontSize: 12, fontWeight: 700,
                background: symbol === s ? 'var(--em-500)' : 'transparent',
                border: symbol === s ? '1px solid transparent' : '1px solid var(--border-soft)',
                color: symbol === s ? '#fff' : 'var(--fg-muted)',
                cursor: 'pointer', transition: 'all 0.1s',
              }}
            >{s}</button>
          ))}
        </div>

        {/* Price + change + sparkline snippet */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px' }}>
          {lastCandle ? (
            <>
              <div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  ${lastCandle.close.toFixed(2)}
                </div>
                {indicators && lastIdx >= 0 && (() => {
                  const rsi = indicators.rsi[lastIdx] ?? 0;
                  return (
                    <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 2 }}>
                      RSI <span className="mono" style={{ color: rsi >= 70 ? 'var(--warn)' : rsi <= 35 ? 'var(--bear)' : 'var(--fg)' }}>{rsi.toFixed(0)}</span>
                      {' · '}EMA21 <span className="mono">${(indicators.ema21[lastIdx] ?? 0).toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>
              {candles.length > 10 && (
                <div style={{ flex: 1, maxWidth: 160 }}>
                  <Sparkline values={candles.slice(-60).map(c => c.close)} width={160} height={36} strokeWidth={1.5} />
                </div>
              )}
            </>
          ) : (
            <div className="subtle" style={{ fontSize: 12 }}>시세 로딩 중...</div>
          )}

          {/* Quick-glance badges: Stage2 | Conviction | Monthly | Active Signals */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {stage2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ScorePill score={stage2.score} />
                <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontWeight: 500 }}>Stage2</span>
              </div>
            )}
            {cv != null && (
              <div style={{
                padding: '3px 10px', borderRadius: 20,
                border: `1px solid ${cvColor}`,
                background: 'transparent',
                fontSize: 11, fontWeight: 700, color: cvColor,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 9, color: 'var(--fg-subtle)', fontWeight: 500 }}>Conviction</span> {cv}
              </div>
            )}
            <div style={{ padding: '3px 10px', borderRadius: 20, background: mpMeta.bg, fontSize: 11, fontWeight: 700, color: mpMeta.color, whiteSpace: 'nowrap' }}>
              {mpMeta.label}
            </div>
            {stage2 && (
              <span className={'badge ' + (STRUCT_CLS[stage2.market_structure] ?? 'neutral')}>
                {stage2.market_structure}
              </span>
            )}
            {activeSignals.slice(0, 2).map(sig => {
              const COLOR_MAP: Record<string, string> = { sniper: 'bull', vcp: 'info', pullback: 'warn', strong_trend: 'teal', overbought: 'warn', downtrend: 'bear' };
              return <span key={sig} className={`badge ${COLOR_MAP[sig] ?? 'neutral'}`}>● {SIGNAL_META[sig]?.label}</span>;
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ZONE 1 LEFT: Daily Chart (tall anchor)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ minHeight: 420 }}>
        <div className="card__hd">
          <h3>{symbol} · Daily Chart</h3>
          {stage2 && <span className={'badge ' + (STRUCT_CLS[stage2.market_structure] ?? 'neutral')}>{stage2.market_structure}</span>}
          {gcBadges.map(([label, cls]) => (
            <span key={label} className={`badge ${cls}`}>{label}</span>
          ))}
          {patBadges.map(([label, cls]) => (
            <span key={label} className={`badge ${cls}`}>{label}</span>
          ))}
          <small>1Y · GC · EMA8/21/50/200</small>
        </div>
        <div className="card__bd" style={{ paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}>
          {chartLoading ? (
            <div className="subtle" style={{ padding: '32px 16px' }}>차트 로딩 중...</div>
          ) : dailyData ? (
            <DailyChart data={dailyData} />
          ) : null}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ZONE 1 RIGHT (stacked): Stage2 체크리스트 + R:R 계획
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Stage2 + Key Numbers */}
        <div className="card">
          <div className="card__hd">
            <h3>Minervini Stage 2</h3>
            {stage2 && <ScorePill score={stage2.score} />}
            {cv != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: cvColor, marginLeft: 4 }}>
                C:{cv} {dailyData?.conviction_label}
              </span>
            )}
            <small>{stage2 ? (stage2.score >= 6 ? '진입 고려' : stage2.score >= 4 ? '관망' : '회피') : '—'}</small>
          </div>
          <div className="card__bd">
            {stage2 ? (
              <>
                {/* 2-col checklist */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginBottom: 12 }}>
                  {(Object.keys(STAGE2_META) as (keyof typeof STAGE2_META)[]).map(k => (
                    <div key={k} className={'s2-row ' + (stage2.checks[k] ? 'pass' : 'fail')}>
                      <div className="check">{stage2.checks[k] ? <Check /> : <X />}</div>
                      <div className="s2-label" style={{ fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{STAGE2_META[k].label}</div>
                    </div>
                  ))}
                </div>

                {/* Monthly phase banner */}
                <div style={{ padding: '5px 10px', borderRadius: 6, background: mpMeta.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: mpMeta.color }}>{mpMeta.label}</span>
                  {stage2.monthly_ema10 != null && (
                    <span className="mono" style={{ fontSize: 10.5, color: mpMeta.color, opacity: 0.9 }}>
                      EMA10 ${stage2.monthly_ema10.toFixed(2)}
                      {stage2.pct_from_monthly_ema10 != null && (
                        <> · {stage2.pct_from_monthly_ema10 > 0 ? '+' : ''}{stage2.pct_from_monthly_ema10.toFixed(1)}%</>
                      )}
                    </span>
                  )}
                </div>

                {/* Key numbers: 2×2 grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>RS Score</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: stage2.rs_score >= 70 ? 'var(--bull)' : stage2.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)' }}>
                      {stage2.rs_score}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--fg-muted)' }}>/100</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--fg-muted)' }}>vs SPY 63일</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>52주 고점</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: stage2.pct_from_52w_high >= -25 ? 'var(--bull)' : 'var(--bear)' }}>
                      {stage2.pct_from_52w_high.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--fg-muted)' }}>고점 대비</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>최근 조정</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: stage2.pullback_pct <= 15 ? 'var(--bull)' : 'var(--bear)' }}>
                      {stage2.pullback_pct.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--fg-muted)' }}>20일 고점 대비</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>EMA200 기울기</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: stage2.ema200_slope >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
                      {stage2.ema200_slope >= 0 ? '+' : ''}{stage2.ema200_slope.toFixed(3)}
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--fg-muted)' }}>20일 기울기</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="subtle">{chartLoading ? '로딩 중...' : '데이터 없음'}</div>
            )}
          </div>
        </div>

        {/* R:R 진입 계획 */}
        <div className="card">
          <div className="card__hd">
            <h3>진입 계획 · R:R</h3>
            <small>피벗 × 1.005 기준</small>
          </div>
          <div className="card__bd">
            {stage2 ? (
              <>
                {/* Entry/Stop/Target 3-col */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  {([
                    ['Entry', entry.toFixed(2), 'var(--info)',  'var(--info-soft)'],
                    ['Stop',  stop.toFixed(2),  'var(--bear)', 'var(--bear-soft)'],
                    ['Target',target.toFixed(2),'var(--bull)', 'var(--bull-soft)'],
                  ] as [string,string,string,string][]).map(([label,val,color,bg]) => (
                    <div key={label} style={{ padding: '8px 10px', borderRadius: 8, background: bg, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 700, color }}>${val}</div>
                    </div>
                  ))}
                </div>

                {/* R:R 시각 바 */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
                    <div style={{ flex: 1, background: 'var(--bear)', opacity: 0.7, borderRadius: '6px 0 0 6px' }} title={`Stop: -${stopLossPct.toFixed(1)}%`} />
                    <div style={{ flex: 3, background: 'var(--bull)', opacity: 0.7, borderRadius: '0 6px 6px 0' }} title="Target: +3R" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--fg-subtle)', marginTop: 3 }}>
                    <span style={{ color: 'var(--bear)' }}>-{stopLossPct.toFixed(2)}%</span>
                    <span style={{ fontWeight: 600, color: 'var(--fg-muted)' }}>1 : 3 R:R</span>
                    <span style={{ color: 'var(--bull)' }}>+{(stopLossPct * 3).toFixed(2)}%</span>
                  </div>
                </div>

                {/* Position size */}
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--em-soft)', border: '1px solid color-mix(in srgb, var(--em-500) 25%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      포지션 ({rrRiskPct}% risk · ${(accountNum/1000).toFixed(0)}K)
                    </div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--em-500)' }}>{qty > 0 ? `${qty} 주` : '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 10.5, color: 'var(--fg-muted)' }}>
                    <div>Max Loss: <span style={{ color: 'var(--bear)', fontWeight: 600 }}>${(accountNum * riskPct / 100).toFixed(0)}</span></div>
                    <div>ATR: <span className="mono">{stage2.latest_atr.toFixed(2)}</span></div>
                  </div>
                </div>

                {/* 패턴 배지 */}
                {(gcBadges.length > 0 || patBadges.length > 0) && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {[...gcBadges, ...patBadges].map(([label, cls]) => (
                      <span key={label} className={`badge ${cls}`} style={{ fontSize: 10.5 }}>{label}</span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="subtle">로딩 중...</div>
            )}
          </div>
        </div>

      </div>{/* end ZONE 1 RIGHT */}

      {/* ══════════════════════════════════════════════════════════════════
          ZONE 2: Sentiment + AI + Earnings (full-width, internal 3-col)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'start' }}>

        {/* 소셜 심리 (종목) */}
        <div className="card">
          <div className="card__hd">
            <h3>소셜 심리 · {symbol}</h3>
            {symSent && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: csColor(symSent.composite_score ?? symSent.sentiment_score) }}>
                  {(symSent.composite_score ?? symSent.sentiment_score) > 0 ? '+' : ''}
                  {symSent.composite_score ?? symSent.sentiment_score}
                </span>
                <span style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>/ 2.0</span>
              </div>
            )}
          </div>
          <div className="card__bd">
            {symSent ? (
              <>
                {/* 감정 라벨 + ScoreBar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={'badge ' + (SENTIMENT_META[symSent.sentiment]?.color.replace('text-','').split('-')[0] ?? 'neutral')}>
                    {SENTIMENT_META[symSent.sentiment]?.label}
                  </span>
                  {symSent.score_delta != null && (
                    <span style={{ fontSize: 11, color: symSent.score_delta > 0 ? 'var(--bull)' : symSent.score_delta < 0 ? 'var(--bear)' : 'var(--fg-subtle)' }}>
                      {symSent.score_delta > 0 ? '↑' : symSent.score_delta < 0 ? '↓' : '→'} 전일 {symSent.score_delta > 0 ? '+' : ''}{symSent.score_delta}
                    </span>
                  )}
                </div>
                <ScoreBar score={symSent.composite_score ?? symSent.sentiment_score} />

                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.6, margin: '8px 0' }}>
                  {symSent.key_reason}
                </div>
                <TopNewsBox news={symSent.top_news} />

                <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 10.5, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--fg-subtle)' }}>
                    {TREND_META[symSent.trend_vs_yesterday]?.icon} {TREND_META[symSent.trend_vs_yesterday]?.label}
                  </span>
                  <span style={{ color: 'var(--fg-subtle)' }}>
                    언급 {VOLUME_META[symSent.mention_volume]?.label}
                  </span>
                  {symSent.bot_suspected === 'yes' && <span style={{ color: 'var(--warn)' }}>⚠ 봇 의심</span>}
                  <span style={{ color: 'var(--fg-subtle)' }}>
                    신뢰도 <strong style={{ color: 'var(--em-500)' }}>{symSent.confidence.toUpperCase()}</strong>
                  </span>
                </div>

                <button
                  onClick={() => setShowSentTrend(v => !v)}
                  style={{ marginTop: 10, width: '100%', padding: '5px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 11, cursor: 'pointer' }}
                >
                  {showSentTrend ? '▲ 추이 숨기기' : '▼ 심리 추이 보기'}
                </button>
                {showSentTrend && <SentimentTrendChart symbol={symbol} />}
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)', fontSize: 12, padding: '12px 0' }}>
                {sentimentData?.available === false ? `${symbol} 심리 데이터 없음` : '로딩 중...'}
              </div>
            )}
          </div>
        </div>

        {/* AI Brief (종목) */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--card-elev) 0%, var(--bg-muted) 100%)', position: 'relative', overflow: 'hidden' }}>
          {/* subtle glow */}
          <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 180, height: 180, background: 'radial-gradient(circle, color-mix(in srgb, var(--em-500) 20%, transparent), transparent 70%)', pointerEvents: 'none' }} />
          <div className="card__hd" style={{ position: 'relative' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--em-500)', color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Sparkle />
            </div>
            <h3>AI 분석 · {symbol}</h3>
            {symBrief && (() => {
              const sqm = SETUP_QUALITY_META[symBrief.setup_quality] ?? SETUP_QUALITY_META['B'];
              const BIAS_CLS: Record<string, string> = { buy: 'bull', hold: 'teal', watch: 'warn', avoid: 'bear' };
              const BIAS_KO: Record<string, string>  = { buy: '매수', hold: '보유', watch: '관망', avoid: '회피' };
              return (
                <>
                  <span className={`badge ${sqm.color}`}>{sqm.label}</span>
                  <span className={`badge ${BIAS_CLS[symBrief.action_bias] ?? 'neutral'}`}>{BIAS_KO[symBrief.action_bias] ?? symBrief.action_bias}</span>
                </>
              );
            })()}
          </div>
          <div className="card__bd" style={{ position: 'relative' }}>
            {symBrief ? (
              <>
                <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg)', marginBottom: 12 }}>
                  {symBrief.brief}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ padding: '7px 10px', borderRadius: 6, background: 'var(--bull-soft)', borderLeft: '2px solid var(--bull)' }}>
                    <div style={{ fontSize: 9, color: 'var(--bull)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>기회</div>
                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>{symBrief.key_opportunity}</div>
                  </div>
                  <div style={{ padding: '7px 10px', borderRadius: 6, background: 'var(--bear-soft)', borderLeft: '2px solid var(--bear)' }}>
                    <div style={{ fontSize: 9, color: 'var(--bear)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>리스크</div>
                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>{symBrief.key_risk}</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 9.5, color: 'var(--fg-subtle)' }}>AI 의견 — 매매 신호 아님</div>
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)', fontSize: 12, padding: '12px 0' }}>
                {briefData ? `${symbol} AI Brief 없음` : 'AI Brief 로딩 중...'}
              </div>
            )}
          </div>
        </div>

        {/* 실적 + 시장 심리 mini */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Earnings */}
          <div className="card">
            <div className="card__hd">
              <h3>실적 발표</h3>
              {symEarning && (() => {
                const rm = EARNINGS_RISK_META[symEarning.risk_level] ?? EARNINGS_RISK_META.med;
                return <span className={`badge ${rm.color}`}>{rm.dot} {symEarning.risk_level.toUpperCase()}</span>;
              })()}
            </div>
            <div className="card__bd">
              {symEarning ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--card-elev)' }}>
                      <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>발표일</div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{symEarning.earnings_date.slice(5)}</div>
                    </div>
                    <div style={{ padding: '7px 10px', borderRadius: 8, background: symEarning.days_until <= 7 ? 'var(--bear-soft)' : 'var(--warn-soft)' }}>
                      <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>D-Day</div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: symEarning.days_until <= 7 ? 'var(--bear)' : 'var(--warn)' }}>{symEarning.days_until}일 후</div>
                    </div>
                    {symEarning.eps_estimate != null && (
                      <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--card-elev)' }}>
                        <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>EPS 추정</div>
                        <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>${symEarning.eps_estimate.toFixed(2)}</div>
                      </div>
                    )}
                    {symEarning.historical_beat_rate != null && (
                      <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--card-elev)' }}>
                        <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Beat율</div>
                        <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal)' }}>{(symEarning.historical_beat_rate * 100).toFixed(0)}%</div>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.6, marginBottom: 8 }}>{symEarning.ai_summary}</div>
                  <div style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, background: 'var(--warn-soft)', color: 'var(--warn)', fontWeight: 500 }}>
                    ⚡ {symEarning.action_note}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                  {earningsData ? '30일 이내 실적 없음' : '로딩 중...'}
                </div>
              )}
            </div>
          </div>

          {/* 시장 전체 심리 mini */}
          <div className="card">
            <div className="card__hd">
              <h3>시장 전체 심리</h3>
              {mktSent && (
                <span className={'badge ' + (SENTIMENT_META[mktSent.sentiment]?.color.replace('text-','').split('-')[0] ?? 'neutral')}>
                  {SENTIMENT_META[mktSent.sentiment]?.label}
                </span>
              )}
            </div>
            <div className="card__bd">
              {mktSent ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: csColor(mktSent.composite_score ?? mktSent.sentiment_score), lineHeight: 1 }}>
                      {(mktSent.composite_score ?? mktSent.sentiment_score) > 0 ? '+' : ''}
                      {mktSent.composite_score ?? mktSent.sentiment_score}
                    </div>
                    <div style={{ flex: 1 }}>
                      <ScoreBar score={mktSent.composite_score ?? mktSent.sentiment_score} />
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 4 }}>
                        {TREND_META[mktSent.trend_vs_yesterday]?.icon} 전일 {mktSent.trend_vs_yesterday}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{mktSent.key_reason}</div>
                  <TopNewsBox news={mktSent.top_news} />
                </>
              ) : (
                <div className="subtle">심리 데이터 없음</div>
              )}
            </div>
          </div>

        </div>
      </div>{/* end ZONE 2 */}

      {/* ══════════════════════════════════════════════════════════════════
          ZONE 3: Daily Heat + Risk Regime (full-width, internal 2-col)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12, alignItems: 'start' }}>

        {/* Daily Heat 60d */}
        <div className="card">
          <div className="card__hd">
            <h3>Daily Heat · 60거래일</h3>
            {(() => {
              const upDays   = dailyChg.filter(v => v > 0.05).length;
              const downDays = dailyChg.filter(v => v < -0.05).length;
              return (
                <>
                  <span className="badge bull" style={{ fontSize: 10 }}>↑ {upDays}일</span>
                  <span className="badge bear" style={{ fontSize: 10 }}>↓ {downDays}일</span>
                </>
              );
            })()}
            <small>{symbol}</small>
          </div>
          <div className="card__bd">
            {dailyChg.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--fg-subtle)', marginBottom: 4 }}>
                  <span>← 60일 전</span><span>오늘 →</span>
                </div>
                <HeatStrip values={dailyChg} cols={20} rows={3} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 9.5, color: 'var(--fg-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bear)', opacity: 0.85 }} /><span>하락</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} /><span>보합</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bull)', opacity: 0.85 }} /><span>상승</span></div>
                  {dailyChg.length > 0 && (
                    <span style={{ marginLeft: 'auto' }}>
                      <span style={{ color: 'var(--bull)' }}>최대 +{Math.max(...dailyChg).toFixed(1)}%</span>
                      {' / '}
                      <span style={{ color: 'var(--bear)' }}>{Math.min(...dailyChg).toFixed(1)}%</span>
                    </span>
                  )}
                </div>
              </>
            ) : <div className="subtle">로딩 중...</div>}
          </div>
        </div>

        {/* Risk Regime */}
        <div className="card">
          <div className="card__hd">
            <h3>Risk Regime</h3>
            {regimeData && (() => {
              const [label, cls] = REGIME_KO[regimeData.regime] ?? ['불명', 'neutral'];
              return <span className={`badge ${cls}`}>{label}</span>;
            })()}
            <small>{regimeData?.total ?? '—'} / 100</small>
          </div>
          <div className="card__bd">
            {regimeData ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <RadialGauge value={regimeData.total ?? 0} size={80} label={regimeData.total ?? '—'} sublabel="점수" />
                  <div style={{ flex: 1, fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                    {regimeData.regime === 'RISK_ON'      && '추세 추종 전략 유효한 강세 환경'}
                    {regimeData.regime === 'CONSTRUCTIVE' && '선별적 진입이 가능한 우호적 환경'}
                    {regimeData.regime === 'MIXED'        && '신호 혼재. 포지션 사이즈 축소 권장'}
                    {regimeData.regime === 'DEFENSIVE'    && '약세 신호 우세. 현금 비중 확대'}
                    {regimeData.regime === 'RISK_OFF'     && '리스크 오프. 신규 매수 자제'}
                    {regimeData.regime === 'UNKNOWN'      && '데이터 부족으로 판단 불가'}
                  </div>
                </div>
                {([
                  ['Trend',      regimeData.components.trend,      regimeData.diagnostics?.spy_vs_ema200_pct,    'SPY/EMA200'],
                  ['Breadth',    regimeData.components.breadth,    regimeData.diagnostics?.rsp_minus_spy_60d,   'RSP-SPY'],
                  ['Credit',     regimeData.components.credit,     regimeData.diagnostics?.hyg_ief_ratio_chg_pct,'HYG/IEF'],
                  ['Volatility', regimeData.components.volatility, regimeData.diagnostics?.vix_level,           'VIX'],
                  ['Momentum',   regimeData.components.momentum,   regimeData.diagnostics?.spy_roc_20d,         'RoC20d'],
                ] as [string, number|null, number|null|undefined, string][]).map(([label, v, raw, rawLabel]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 10.5 }}>
                    <div style={{ width: 58 }}>
                      <div style={{ color: 'var(--fg-muted)' }}>{label}</div>
                      {raw != null && <div style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>{rawLabel} {raw >= 0 ? '+' : ''}{raw.toFixed(1)}</div>}
                    </div>
                    <div className="bar" style={{ flex: 1 }}>
                      <div className="bar__fill" style={{ width: `${((v??0)/20*100).toFixed(1)}%`, background: (v??0) === 0 ? 'var(--bear)' : (v??0) < 8 ? 'var(--warn)' : 'var(--em-500)' }} />
                    </div>
                    <span className="mono" style={{ width: 26, textAlign: 'right', fontSize: 10, color: (v??0) === 0 ? 'var(--bear)' : 'inherit' }}>{(v??0).toFixed(1)}</span>
                  </div>
                ))}
              </>
            ) : <div className="subtle">로딩 중...</div>}
          </div>
        </div>

      </div>{/* end ZONE 3 */}

    </div>
  );
}
