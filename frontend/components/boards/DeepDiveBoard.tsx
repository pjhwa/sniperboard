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
  UpcomingEarning, RecentResult, SymbolBrief, TopNews,
} from '@/app/types';
import { SentimentTrendChart } from './SentimentTrendChart';

// ─── 색상 헬퍼 ─────────────────────────────────────────────────────────────────
// var(--emerald/orange/red) 은 globals.css 에 없음 → bull/orange-literal/bear 사용

function csColor(s: number): string {
  if (s >= 1.5) return 'var(--bull)';
  if (s >= 0.5) return 'var(--teal)';
  if (s > -0.5) return 'var(--fg-muted)';
  if (s > -1.5) return 'hsl(20 90% 55%)';
  return 'var(--bear)';
}

// ─── 로컬 메타데이터 ────────────────────────────────────────────────────────────

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
  RISK_ON:      ['Risk-On',  'bull'],
  CONSTRUCTIVE: ['우호적',   'teal'],
  MIXED:        ['혼조',     'warn'],
  DEFENSIVE:    ['방어적',   'warn'],
  RISK_OFF:     ['Risk-Off', 'bear'],
  UNKNOWN:      ['불명',     'neutral'],
};

// ─── 서브 컴포넌트 ──────────────────────────────────────────────────────────────

/** −2~+2 스코어를 중앙 기준 채움 바로 시각화 */
function ScoreBar({ score }: { score: number }) {
  const s = Math.max(-2, Math.min(2, score));
  const pct = ((s + 2) / 4) * 100;   // -2→0%, 0→50%, +2→100%
  const color = csColor(s);
  return (
    <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'var(--border)', margin: '7px 0 4px' }}>
      {/* 중앙 눈금 */}
      <div style={{ position: 'absolute', top: -1, bottom: -1, left: '50%', width: 1, background: 'var(--fg-subtle)', opacity: 0.4, transform: 'translateX(-50%)' }} />
      {/* 채움 */}
      <div style={{
        position: 'absolute', top: 0, height: '100%',
        left: `${s >= 0 ? 50 : pct}%`,
        width: `${s >= 0 ? pct - 50 : 50 - pct}%`,
        borderRadius: 3, background: color, opacity: 0.9,
      }} />
      {/* 현재 위치 도트 */}
      <div style={{
        position: 'absolute', top: '50%', left: `${pct}%`,
        width: 9, height: 9, borderRadius: '50%',
        background: color, border: '2px solid var(--card)',
        transform: 'translate(-50%,-50%)',
        boxShadow: `0 0 5px ${color}`,
      }} />
    </div>
  );
}

function TopNewsBox({ news }: { news: TopNews | null | undefined }) {
  if (!news) return null;
  return (
    <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--em-soft)', borderLeft: '2px solid var(--em-500)' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)', marginBottom: 2 }}>주요 뉴스</div>
      <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.4, marginBottom: 2 }}>{news.headline}</div>
      <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 2 }}>{news.summary}</div>
      <div style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>출처: {news.source}</div>
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function DeepDiveBoard() {
  const { symbol, setSymbol, timeframe, rrAccount, rrRiskPct } = useStore();
  const [showSentTrend, setShowSentTrend] = useState(false);

  const { ohlcvData }                = useIntraday(symbol, timeframe);
  const { dailyData, isLoading: chartLoading } = useDaily(symbol);
  const { data: sentimentData }      = useSentiment();
  const { briefData }                = useBrief();
  const { earningsData }             = useEarnings();
  const { regimeData }               = useRegime();

  // ── Intraday
  const candles    = ohlcvData?.candles ?? [];
  const signals    = ohlcvData?.signals;
  const indicators = ohlcvData?.indicators;
  const lastIdx    = candles.length - 1;
  const lastCandle = candles[lastIdx];
  const activeSignals = signals
    ? ['sniper','vcp','pullback','strong_trend','overbought','downtrend']
        .filter(k => signals[k as keyof typeof signals][lastIdx])
    : [];

  // ── Daily / Stage2
  const stage2 = dailyData?.stage2;
  const dailyChg = (dailyData?.candles ?? []).slice(-61).map((c, i, arr) =>
    i === 0 ? 0 : ((c.close - arr[i - 1].close) / arr[i - 1].close) * 100
  ).slice(1);
  const upDays   = dailyChg.filter(v => v > 0.05).length;
  const downDays = dailyChg.filter(v => v < -0.05).length;
  const avgChg   = dailyChg.length ? dailyChg.reduce((a, b) => a + b, 0) / dailyChg.length : 0;

  // ── R:R
  const entry = stage2?.entry ?? 0;
  const stop  = stage2?.stop  ?? 0;
  const target = stage2?.target ?? 0;
  const accountNum = parseFloat(rrAccount.replace(/,/g, '')) || 100000;
  const riskPct    = parseFloat(rrRiskPct) || 1;
  const qty = stop > 0 && entry > stop
    ? Math.floor(accountNum * (riskPct / 100) / (entry - stop))
    : 0;
  const stopLossPct = entry > 0 ? ((entry - stop) / entry) * 100 : 0;

  // ── 심리/AI/실적
  const symSent  = (sentimentData?.latest?.symbols ?? []).find(s => s.symbol === symbol);
  const mktSent  = sentimentData?.latest?.market;
  const symBrief = (briefData?.symbol_briefs ?? []).find(sb => sb.symbol === symbol) as SymbolBrief | undefined;
  const symEarning = earningsData?.upcoming_earnings?.find(e => e.symbol === symbol) as UpcomingEarning | undefined;
  const symRecent  = earningsData?.recent_results?.find(r => r.symbol === symbol) as RecentResult  | undefined;

  // ── Conviction 색상
  const cv = dailyData?.conviction_score;
  const cvColor = cv == null ? 'var(--fg-muted)'
    : cv >= 65 ? 'var(--bull)' : cv >= 50 ? 'var(--teal)' : cv >= 35 ? 'var(--warn)' : 'var(--bear)';

  // ── 단축 변수
  const mp     = stage2?.monthly_phase ?? 'UNKNOWN';
  const mpMeta = MONTHLY_META[mp] ?? MONTHLY_META.UNKNOWN;

  const gcBadges:  [string, string][] = [];
  if (stage2?.gc_breakout)           gcBadges.push(['GC 돌파',    'purple']);
  else if (stage2?.gc_retest)        gcBadges.push(['GC 리테스트', 'purple']);
  else if (stage2?.gc_above)         gcBadges.push(['채널 위',     'teal']);
  else if (stage2?.gc_below)         gcBadges.push(['채널 아래',   'bear']);

  const patBadges: [string, string][] = [];
  if (stage2?.bear_flag)             patBadges.push(['Bear Flag',   'bear']);
  if (stage2?.rsi_divergence_bullish) patBadges.push(['RSI Bull Div','bull']);
  if (stage2?.rsi_divergence_bearish) patBadges.push(['RSI Bear Div','warn']);

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  //
  // 레이아웃: 3fr | 2fr 기준, alignItems: start
  //
  //  Row 1 (span 2): Zone 0 — 종목 선택 + 현재가 + 주요 배지
  //  Row 2  3fr : Daily Chart
  //         2fr : Stage 2 분석 카드
  //  Row 3  3fr : Daily Heat 60d
  //         2fr : R:R 진입 계획
  //  Row 4 (span 2 → 내부 3×1fr): 소셜 심리 | AI Brief | 실적
  //  Row 5  3fr : Risk Regime
  //         2fr : 시장 전체 심리
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '3fr 2fr', alignItems: 'start', alignContent: 'start', gridAutoRows: 'max-content' }}
    >

      {/* ════════════════════════════════════════════════════════════════
          ROW 1 — Zone 0: 종목 선택 + 가격 + 상황 배지
      ════════════════════════════════════════════════════════════════ */}
      <div style={{
        gridColumn: 'span 2',
        display: 'flex', alignItems: 'center', gap: 0,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', overflow: 'hidden',
      }}>
        {/* 종목 버튼 */}
        <div style={{ display: 'flex', gap: 3, padding: '8px 12px', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
          {SYMBOLS.map(s => (
            <button
              key={s}
              onClick={() => { setSymbol(s); setShowSentTrend(false); }}
              style={{
                padding: '5px 13px', borderRadius: 6,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: symbol === s ? 'var(--em-500)' : 'transparent',
                border: symbol === s ? '1px solid transparent' : '1px solid var(--border-soft)',
                color: symbol === s ? '#fff' : 'var(--fg-muted)',
                transition: 'all 0.1s',
              }}
            >{s}</button>
          ))}
        </div>

        {/* 가격 + 스파크라인 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', flex: 1, minWidth: 0 }}>
          {lastCandle ? (
            <>
              <div style={{ flexShrink: 0 }}>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  ${lastCandle.close.toFixed(2)}
                </div>
                {indicators && lastIdx >= 0 && (() => {
                  const rsi = indicators.rsi[lastIdx] ?? 0;
                  return (
                    <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 2, whiteSpace: 'nowrap' }}>
                      RSI{' '}
                      <span className="mono" style={{ color: rsi >= 70 ? 'var(--warn)' : rsi <= 35 ? 'var(--bear)' : 'var(--fg)' }}>
                        {rsi.toFixed(0)}
                      </span>
                      {' · '}EMA21{' '}
                      <span className="mono">${(indicators.ema21[lastIdx] ?? 0).toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>
              {candles.length > 10 && (
                <div style={{ maxWidth: 180, flexShrink: 0 }}>
                  <Sparkline values={candles.slice(-60).map(c => c.close)} width={180} height={36} strokeWidth={1.5} />
                </div>
              )}
            </>
          ) : (
            <div className="subtle" style={{ fontSize: 12 }}>시세 로딩 중...</div>
          )}

          {/* 우측 배지 그룹 */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {stage2 && <ScorePill score={stage2.score} />}
            {cv != null && (
              <div style={{
                padding: '3px 9px', borderRadius: 20,
                border: `1px solid ${cvColor}`, fontSize: 11, fontWeight: 700, color: cvColor,
                display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: 9, color: 'var(--fg-subtle)', fontWeight: 500 }}>C</span>{cv}
              </div>
            )}
            <div style={{ padding: '3px 9px', borderRadius: 20, background: mpMeta.bg, fontSize: 11, fontWeight: 700, color: mpMeta.color, whiteSpace: 'nowrap' }}>
              {mpMeta.label}
            </div>
            {stage2 && (
              <span className={`badge ${STRUCT_CLS[stage2.market_structure] ?? 'neutral'}`}>
                {stage2.market_structure}
              </span>
            )}
            {activeSignals.slice(0, 2).map(sig => {
              const CLR: Record<string, string> = { sniper:'bull', vcp:'info', pullback:'warn', strong_trend:'teal', overbought:'warn', downtrend:'bear' };
              return <span key={sig} className={`badge ${CLR[sig] ?? 'neutral'}`}>● {SIGNAL_META[sig]?.label}</span>;
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 2 LEFT — Daily Chart
      ════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ minHeight: 440 }}>
        <div className="card__hd">
          <h3>{symbol} · Daily Chart</h3>
          {stage2 && <span className={`badge ${STRUCT_CLS[stage2.market_structure] ?? 'neutral'}`}>{stage2.market_structure}</span>}
          {[...gcBadges, ...patBadges].map(([l, c]) => <span key={l} className={`badge ${c}`}>{l}</span>)}
          <small>1Y · GC · EMA8/21/50/200</small>
        </div>
        <div className="card__bd" style={{ paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}>
          {chartLoading
            ? <div className="subtle" style={{ padding: '32px 16px' }}>차트 로딩 중...</div>
            : dailyData ? <DailyChart data={dailyData} /> : null
          }
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 2 RIGHT — Stage 2 분석
      ════════════════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="card__hd">
          <h3>Minervini Stage 2</h3>
          {stage2 && <ScorePill score={stage2.score} />}
          {cv != null && (
            <span style={{ fontSize: 11, fontWeight: 700, color: cvColor, marginLeft: 2 }}>
              C:{cv} <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--fg-subtle)' }}>{dailyData?.conviction_label}</span>
            </span>
          )}
          <small>{stage2 ? (stage2.score >= 6 ? '진입 고려' : stage2.score >= 4 ? '관망' : '회피') : '—'}</small>
        </div>
        <div className="card__bd">
          {stage2 ? (
            <>
              {/* 7개 체크리스트 — 2컬럼 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px', marginBottom: 10 }}>
                {(Object.keys(STAGE2_META) as (keyof typeof STAGE2_META)[]).map(k => (
                  <div key={k} className={`s2-row ${stage2.checks[k] ? 'pass' : 'fail'}`}>
                    <div className="check">{stage2.checks[k] ? <Check /> : <X />}</div>
                    <div className="s2-label" style={{ fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {STAGE2_META[k].label}
                    </div>
                  </div>
                ))}
              </div>

              {/* 월봉 배너 */}
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

              {/* KPI 4개 — 2×2 그리드 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  ['RS Score', `${stage2.rs_score}`, stage2.rs_score >= 70 ? 'var(--bull)' : stage2.rs_score >= 50 ? 'var(--teal)' : 'var(--bear)', 'vs SPY 63일'],
                  ['52주 고점', `${stage2.pct_from_52w_high.toFixed(1)}%`, stage2.pct_from_52w_high >= -25 ? 'var(--bull)' : 'var(--bear)', '고점 대비'],
                  ['최근 조정', `${stage2.pullback_pct.toFixed(1)}%`, stage2.pullback_pct <= 15 ? 'var(--bull)' : 'var(--bear)', '20일 고점 대비'],
                  ['EMA200 기울기', `${stage2.ema200_slope >= 0 ? '+' : ''}${stage2.ema200_slope.toFixed(3)}`, stage2.ema200_slope >= 0 ? 'var(--bull)' : 'var(--bear)', '20일 기울기'],
                ] as [string, string, string, string][]).map(([label, val, color, sub]) => (
                  <div key={label} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1.1 }}>{val}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--fg-muted)', marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="subtle">{chartLoading ? '로딩 중...' : '데이터 없음'}</div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 3 LEFT — Daily Heat 60d
      ════════════════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="card__hd">
          <h3>Daily Heat · 60거래일</h3>
          <span className="badge bull" style={{ fontSize: 10 }}>↑ {upDays}일</span>
          <span className="badge bear" style={{ fontSize: 10 }}>↓ {downDays}일</span>
          <small>{symbol}</small>
        </div>
        <div className="card__bd">
          {dailyChg.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--fg-subtle)', marginBottom: 4 }}>
                <span>← 60일 전</span><span>오늘 →</span>
              </div>
              <HeatStrip values={dailyChg} cols={20} rows={3} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, fontSize: 9.5, color: 'var(--fg-subtle)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}><div style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--bear)' }} /><span>하락</span></div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}><div style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} /><span>보합</span></div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}><div style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--bull)' }} /><span>상승</span></div>
                <span style={{ marginLeft: 'auto' }}>
                  평균 <span className="mono" style={{ color: avgChg >= 0 ? 'var(--bull)' : 'var(--bear)' }}>{avgChg >= 0 ? '+' : ''}{avgChg.toFixed(2)}%</span>
                  {' · '}
                  <span style={{ color: 'var(--bull)' }}>+{Math.max(...dailyChg).toFixed(1)}%</span>
                  {' / '}
                  <span style={{ color: 'var(--bear)' }}>{Math.min(...dailyChg).toFixed(1)}%</span>
                </span>
              </div>
            </>
          ) : <div className="subtle">로딩 중...</div>}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 3 RIGHT — R:R 진입 계획
      ════════════════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="card__hd">
          <h3>진입 계획 · R:R</h3>
          <small>피벗 × 1.005 기준</small>
        </div>
        <div className="card__bd">
          {stage2 ? (
            <>
              {/* Entry / Stop / Target */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {([
                  ['Entry',  entry.toFixed(2),  'var(--info)',  'var(--info-soft)'],
                  ['Stop',   stop.toFixed(2),   'var(--bear)', 'var(--bear-soft)'],
                  ['Target', target.toFixed(2), 'var(--bull)', 'var(--bull-soft)'],
                ] as [string,string,string,string][]).map(([l,v,c,bg]) => (
                  <div key={l} style={{ padding: '8px 10px', borderRadius: 8, background: bg, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: c, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{l}</div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: c }}>${v}</div>
                  </div>
                ))}
              </div>

              {/* R:R 시각 바 (빨강1 : 녹색3) */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
                  <div style={{ flex: 1, background: 'var(--bear)', opacity: 0.7, borderRadius: '6px 0 0 6px' }} />
                  <div style={{ flex: 3, background: 'var(--bull)', opacity: 0.7, borderRadius: '0 6px 6px 0' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--fg-subtle)', marginTop: 3 }}>
                  <span style={{ color: 'var(--bear)' }}>-{stopLossPct.toFixed(2)}%</span>
                  <span style={{ fontWeight: 600 }}>1 : 3 R:R</span>
                  <span style={{ color: 'var(--bull)' }}>+{(stopLossPct * 3).toFixed(2)}%</span>
                </div>
              </div>

              {/* 포지션 크기 */}
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--em-soft)', border: '1px solid color-mix(in srgb, var(--em-500) 25%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    포지션 ({rrRiskPct}% · ${(accountNum/1000).toFixed(0)}K)
                  </div>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--em-500)', lineHeight: 1.1 }}>{qty > 0 ? `${qty} 주` : '—'}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 10.5, color: 'var(--fg-muted)' }}>
                  <div>Max Loss <span style={{ color: 'var(--bear)', fontWeight: 600 }}>${(accountNum * riskPct / 100).toFixed(0)}</span></div>
                  <div>ATR <span className="mono">{stage2.latest_atr.toFixed(2)}</span></div>
                </div>
              </div>

              {/* 패턴 배지 */}
              {(gcBadges.length > 0 || patBadges.length > 0) && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[...gcBadges, ...patBadges].map(([l, c]) => (
                    <span key={l} className={`badge ${c}`} style={{ fontSize: 10.5 }}>{l}</span>
                  ))}
                </div>
              )}
            </>
          ) : <div className="subtle">로딩 중...</div>}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 4 — 소셜 심리 | AI Brief | 실적 (span 2 → 내부 3등분)
          alignItems: stretch 로 3카드 동일 높이
      ════════════════════════════════════════════════════════════════ */}
      <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, alignItems: 'stretch' }}>

        {/* 소셜 심리 (종목) */}
        <div className="card">
          <div className="card__hd">
            <h3>소셜 심리 · {symbol}</h3>
            {symSent && (
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color: csColor(symSent.composite_score ?? symSent.sentiment_score) }}>
                {(symSent.composite_score ?? symSent.sentiment_score) > 0 ? '+' : ''}
                {symSent.composite_score ?? symSent.sentiment_score}
              </span>
            )}
          </div>
          <div className="card__bd">
            {symSent ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={`badge ${SENTIMENT_META[symSent.sentiment]?.color.replace('text-','').split('-')[0] ?? 'neutral'}`}>
                    {SENTIMENT_META[symSent.sentiment]?.label}
                  </span>
                  {symSent.score_delta != null && (
                    <span style={{ fontSize: 11, color: symSent.score_delta > 0 ? 'var(--bull)' : symSent.score_delta < 0 ? 'var(--bear)' : 'var(--fg-subtle)' }}>
                      {symSent.score_delta > 0 ? '↑' : symSent.score_delta < 0 ? '↓' : '→'} 전일 {symSent.score_delta > 0 ? '+' : ''}{symSent.score_delta}
                    </span>
                  )}
                </div>
                <ScoreBar score={symSent.composite_score ?? symSent.sentiment_score} />

                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.65, margin: '8px 0' }}>
                  {symSent.key_reason}
                </div>
                <TopNewsBox news={symSent.top_news} />

                <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 10.5, flexWrap: 'wrap' }}>
                  <span>{TREND_META[symSent.trend_vs_yesterday]?.icon} {TREND_META[symSent.trend_vs_yesterday]?.label}</span>
                  <span style={{ color: 'var(--fg-subtle)' }}>언급 {VOLUME_META[symSent.mention_volume]?.label}</span>
                  {symSent.bot_suspected === 'yes' && <span style={{ color: 'var(--warn)' }}>⚠ 봇 의심</span>}
                  <span style={{ color: 'var(--fg-subtle)' }}>신뢰도 <strong style={{ color: 'var(--em-500)' }}>{symSent.confidence.toUpperCase()}</strong></span>
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
          <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 160, height: 160, background: 'radial-gradient(circle, color-mix(in srgb, var(--em-500) 18%, transparent), transparent 70%)', pointerEvents: 'none' }} />
          <div className="card__hd" style={{ position: 'relative' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--em-500)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Sparkle />
            </div>
            <h3>AI 분석 · {symbol}</h3>
            {symBrief && (() => {
              const sqm = SETUP_QUALITY_META[symBrief.setup_quality] ?? SETUP_QUALITY_META['B'];
              const BIAS_CLS: Record<string,string> = { buy:'bull', hold:'teal', watch:'warn', avoid:'bear' };
              const BIAS_KO:  Record<string,string> = { buy:'매수', hold:'보유', watch:'관망', avoid:'회피' };
              return (
                <>
                  <span className={`badge ${sqm.color}`}>{sqm.label}</span>
                  <span className={`badge ${BIAS_CLS[symBrief.action_bias] ?? 'neutral'}`}>
                    {BIAS_KO[symBrief.action_bias] ?? symBrief.action_bias}
                  </span>
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
                <div style={{ marginTop: 8, fontSize: 9.5, color: 'var(--fg-subtle)' }}>AI 의견 · 매매 신호 아님</div>
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)', fontSize: 12, padding: '12px 0' }}>
                {briefData ? `${symbol} AI Brief 없음` : 'AI Brief 로딩 중...'}
              </div>
            )}
          </div>
        </div>

        {/* 실적 발표 — 없을 때 최근 결과로 채움 */}
        <div className="card">
          <div className="card__hd">
            <h3>실적 발표</h3>
            {symEarning && (() => {
              const rm = EARNINGS_RISK_META[symEarning.risk_level] ?? EARNINGS_RISK_META.med;
              const tierColor = symEarning.relevance_tier === 'imminent' ? 'var(--bear)' : symEarning.relevance_tier === 'approaching' ? 'var(--warn)' : 'var(--fg-subtle)';
              const tierLabel = symEarning.relevance_tier === 'imminent' ? '⚡ 임박' : symEarning.relevance_tier === 'approaching' ? '진입권' : '관망';
              return (
                <>
                  <span className={`badge ${rm.color}`}>{rm.dot} {symEarning.risk_level.toUpperCase()}</span>
                  <span style={{ fontSize: 10, color: tierColor, fontWeight: 600 }}>{tierLabel}</span>
                </>
              );
            })()}
            {!symEarning && symRecent && (
              <span className="badge neutral" style={{ fontSize: 10 }}>최근 결과</span>
            )}
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
                      <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>과거 Beat율</div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal)' }}>{(symEarning.historical_beat_rate * 100).toFixed(0)}%</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.65, marginBottom: 8 }}>{symEarning.ai_summary}</div>
                <div style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, background: 'var(--warn-soft)', color: 'var(--warn)', fontWeight: 500 }}>
                  ⚡ {symEarning.action_note}
                </div>
              </>
            ) : symRecent ? (
              /* 예정 실적 없음 → 최근 실적 결과 표시 */
              <>
                <div style={{ marginBottom: 8, fontSize: 10.5, color: 'var(--fg-subtle)' }}>30일 이내 예정 실적 없음 · 최근 결과:</div>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--card-elev)', border: '1px solid var(--border-soft)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{symRecent.report_date}</span>
                    <span className={`badge ${symRecent.surprise_pct >= 0 ? 'bull' : 'bear'}`} style={{ fontSize: 10 }}>
                      {symRecent.surprise_pct >= 0 ? '+' : ''}{symRecent.surprise_pct.toFixed(1)}% 서프라이즈
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>EPS 실제</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: symRecent.eps_actual >= symRecent.eps_estimate ? 'var(--bull)' : 'var(--bear)' }}>
                        ${symRecent.eps_actual.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>EPS 추정</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-muted)' }}>
                        ${symRecent.eps_estimate.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.65 }}>{symRecent.ai_reaction}</div>
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)', fontSize: 12, padding: '12px 0' }}>
                {earningsData ? '실적 데이터 없음' : '로딩 중...'}
              </div>
            )}
          </div>
        </div>

      </div>{/* end ROW 4 */}

      {/* ════════════════════════════════════════════════════════════════
          ROW 5 LEFT — Risk Regime (3fr, 가로 레이아웃)
      ════════════════════════════════════════════════════════════════ */}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center' }}>
              {/* 게이지 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <RadialGauge value={regimeData.total ?? 0} size={80} label={regimeData.total ?? '—'} sublabel="점수" />
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', lineHeight: 1.4, textAlign: 'center', maxWidth: 90 }}>
                  {regimeData.regime === 'RISK_ON'      && '추세 추종 유효'}
                  {regimeData.regime === 'CONSTRUCTIVE' && '선별 진입 가능'}
                  {regimeData.regime === 'MIXED'        && '포지션 축소 권장'}
                  {regimeData.regime === 'DEFENSIVE'    && '현금 비중 확대'}
                  {regimeData.regime === 'RISK_OFF'     && '신규 매수 자제'}
                  {regimeData.regime === 'UNKNOWN'      && '데이터 부족'}
                </div>
              </div>
              {/* 5요소 바 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {([
                  ['Trend',      regimeData.components.trend,      regimeData.diagnostics?.spy_vs_ema200_pct,    'SPY/EMA200'],
                  ['Breadth',    regimeData.components.breadth,    regimeData.diagnostics?.rsp_minus_spy_60d,   'RSP-SPY'],
                  ['Credit',     regimeData.components.credit,     regimeData.diagnostics?.hyg_ief_ratio_chg_pct,'HYG/IEF'],
                  ['Volatility', regimeData.components.volatility, regimeData.diagnostics?.vix_level,           'VIX'],
                  ['Momentum',   regimeData.components.momentum,   regimeData.diagnostics?.spy_roc_20d,         'RoC20d'],
                ] as [string, number|null, number|null|undefined, string][]).map(([label, v, raw, rawLabel]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5 }}>
                    <div style={{ width: 56, flexShrink: 0 }}>
                      <div style={{ color: 'var(--fg-muted)' }}>{label}</div>
                      {raw != null && <div style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>{rawLabel} {raw >= 0 ? '+' : ''}{raw.toFixed(1)}</div>}
                    </div>
                    <div className="bar" style={{ flex: 1 }}>
                      <div className="bar__fill" style={{
                        width: `${((v ?? 0) / 20 * 100).toFixed(1)}%`,
                        background: (v ?? 0) === 0 ? 'var(--bear)' : (v ?? 0) < 8 ? 'var(--warn)' : 'var(--em-500)',
                      }} />
                    </div>
                    <span className="mono" style={{ width: 26, textAlign: 'right', fontSize: 10, color: (v ?? 0) === 0 ? 'var(--bear)' : 'inherit' }}>
                      {(v ?? 0).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="subtle">로딩 중...</div>}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 5 RIGHT — 시장 전체 심리 (2fr)
      ════════════════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="card__hd">
          <h3>시장 전체 심리</h3>
          {mktSent && (
            <span className={`badge ${SENTIMENT_META[mktSent.sentiment]?.color.replace('text-','').split('-')[0] ?? 'neutral'}`}>
              {SENTIMENT_META[mktSent.sentiment]?.label}
            </span>
          )}
        </div>
        <div className="card__bd">
          {mktSent ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: csColor(mktSent.composite_score ?? mktSent.sentiment_score), lineHeight: 1, flexShrink: 0 }}>
                  {(mktSent.composite_score ?? mktSent.sentiment_score) > 0 ? '+' : ''}
                  {mktSent.composite_score ?? mktSent.sentiment_score}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ScoreBar score={mktSent.composite_score ?? mktSent.sentiment_score} />
                  <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 4 }}>
                    {TREND_META[mktSent.trend_vs_yesterday]?.icon} 전일 대비 {mktSent.trend_vs_yesterday}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.65, marginBottom: 8 }}>
                {mktSent.key_reason}
              </div>
              <TopNewsBox news={mktSent.top_news} />
            </>
          ) : <div className="subtle">심리 데이터 없음</div>}
        </div>
      </div>

    </div>
  );
}
