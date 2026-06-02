'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { useBacktest, BacktestStats, MonteCarloResult } from '@/hooks/useBacktest';
import { Card } from '@/components/ui/Card';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { t, type Locale } from '@/app/i18n';
import type { BiLang } from '@/app/i18n';

const S: Record<string, BiLang> = {
  guideTitle:    { en: 'Backtest Guide', ko: '백테스트 가이드' },
  guide1Heading: { en: 'What is this screen?', ko: '이 화면은' },
  guide1Body:    { en: 'Shows results of simulating trades based on Stage2 signals from 2019 to present. Quantitatively verifies the reliability of signals and R:R plans.', ko: 'Stage2 신호 기반 가상 매매를 2019년부터 현재까지 시뮬레이션한 결과입니다. 시그널과 R:R 플랜의 신뢰도를 수치로 검증합니다.' },
  guide2Heading: { en: 'Key metrics', ko: '핵심 지표' },
  guide2Body:    { en: 'Expectancy (R) is the most important: positive means a long-run edge. Win rate alone is misleading — even 40% win rate with 3:1 R:R is profitable. Profit Factor ≥ 1.5 is considered robust.', ko: '기대값(R)이 가장 중요합니다: 양수면 장기적으로 우위가 있습니다. 승률만으로 판단하지 마세요 — R:R 3:1에서 승률 40%도 수익성이 있습니다. 손익비 ≥ 1.5는 견고한 수준입니다.' },
  guide3Heading: { en: 'In-sample vs Out-of-sample', ko: 'In-sample vs Out-of-sample' },
  guide3Body:    { en: 'In-sample (~2023) is the "training" period; Out-of-sample (2024~) is the "real" verification period. If the gap is small, it means there is no overfitting.', ko: 'In-sample(~2023)은 "학습" 기간, Out-of-sample(2024~)은 "실전" 검증 기간입니다. 두 기간의 격차가 작으면 과최적화(Overfitting)가 없다는 의미입니다.' },

  noCache:       { en: 'No backtest results yet. Press the run button.', ko: '백테스트 결과가 없습니다. 실행 버튼을 눌러주세요.' },
  runBtn:        { en: 'Run Backtest', ko: '백테스트 실행' },
  running:       { en: 'Running... (takes ~1min)', ko: '실행 중... (약 1분 소요)' },
  lastRun:       { en: 'Last run', ko: '최근 실행' },
  rerun:         { en: 'Re-run', ko: '재실행' },
  loading:       { en: 'Loading...', ko: '로딩 중...' },

  // methodology banner
  methodTitle:   { en: 'Methodology & Limitations', ko: '방법론 및 한계 (투명성)' },
  limitBias:     { en: 'Survivorship bias: current watchlist symbols only (delisted excluded → results may be inflated)', ko: '생존편향: 현재 워치리스트 종목만 포함 (상장폐지 제외 → 성과 상향 가능성)' },
  limitSlip:     { en: 'Slippage 0.05% included · Commission 0% (US broker standard)', ko: '슬리피지 0.05% 반영 · 수수료 0% (미국 브로커 기준)' },
  limitEntry:    { en: 'Entry: next bar after signal, at open or limit price (no same-day fill)', ko: '진입: 신호 발생 다음 봉 시가 또는 entry 가격 도달 시 (당일 종가 진입 없음 — look-ahead 방지)' },
  limitPast:     { en: 'Past results do not guarantee future profits', ko: '과거 성과가 미래 수익을 보장하지 않습니다' },

  // KPI cards
  totalTrades:   { en: 'Total Trades', ko: '총 거래' },
  winRate:       { en: 'Win Rate', ko: '승률' },
  expectancy:    { en: 'Expectancy', ko: '기대값' },
  profitFactor:  { en: 'Profit Factor', ko: '손익비' },
  mdd:           { en: 'Max Drawdown', ko: '최대낙폭' },
  maxLossStreak: { en: 'Max Consecutive Loss', ko: '최대 연속 손실' },
  avgHeld:       { en: 'Avg Hold (days)', ko: '평균 보유(일)' },
  breakeven:     { en: 'Breakeven win rate at 3:1 R:R', ko: '손익분기 승률 (R:R 3:1 기준)' },

  // comparison card
  isOosTitle:    { en: 'In-sample vs Out-of-sample', ko: 'In-sample vs Out-of-sample (과최적화 검증)' },
  isLabel:       { en: 'In-sample (~2023)', ko: 'In-sample (~2023)' },
  oosLabel:      { en: 'Out-of-sample (2024~)', ko: 'Out-of-sample (2024~)' },
  oosNote:       { en: 'Small gap → no overfitting', ko: '격차 작음 → 과최적화 없음' },
  oosBetter:     { en: 'OOS better than IS — signal has generalization', ko: 'OOS가 IS보다 우수 — 신호 일반화 확인' },
  oosSimilar:    { en: 'OOS similar to IS — signal is stable', ko: 'OOS가 IS와 유사 — 안정적인 신호' },
  oosWorse:      { en: 'OOS underperforms IS — check for overfitting', ko: 'OOS가 IS보다 부진 — 과최적화 가능성 확인 필요' },

  // equity curve
  equityTitle:   { en: 'Equity Curve (Virtual $10,000)', ko: '자산곡선 (가상 $10,000 기준)' },
  equityAction:  { en: 'All trades in sequence', ko: '전체 거래 순서대로' },

  // score breakdown
  scoreTitle:    { en: 'Stage2 Score Breakdown', ko: 'Stage2 점수별 성과' },
  scoreAction:   { en: 'Higher score = better signal quality?', ko: '점수가 높을수록 신호 품질이 좋은가?' },

  // symbol table
  symTitle:      { en: 'Per-Symbol Performance', ko: '종목별 성과' },
  symAction:     { en: 'Sorted by expectancy', ko: '기대값 내림차순' },
  colWin:        { en: 'Win%', ko: '승률' },
  colExp:        { en: 'Exp(R)', ko: '기대값(R)' },
  colPF:         { en: 'PF', ko: '손익비' },
  colMDD:        { en: 'MDD', ko: '낙폭' },
  colN:          { en: 'n', ko: '거래수' },

  // config
  configTitle:   { en: 'Backtest Config', ko: '백테스트 설정' },
  tier1Only:     { en: 'TIER 1 symbols only — TIER 2 excluded (batch analysis, less liquid)', ko: 'TIER 1 종목만 포함 — TIER 2 제외 (배치 분석, 유동성 낮음)' },

  // monte carlo
  mcTitle:       { en: 'Monte Carlo Confidence Intervals', ko: '몬테카를로 신뢰구간' },
  mcAction:      { en: '10,000 bootstrap resampling simulations', ko: '10,000회 부트스트랩 리샘플링' },
  mcProbLabel:   { en: 'Probability of Positive Expectancy', ko: '양수 기대값 확률' },
  mcProbDesc:    { en: 'Probability that the signal has a real edge (not noise)', ko: '시그널이 실제 엣지를 가질 확률 (노이즈가 아닐 확률)' },
  mcExpLabel:    { en: 'Expectancy (R) Range', ko: '기대값 (R) 범위' },
  mcWrLabel:     { en: 'Win Rate Range', ko: '승률 범위' },
  mcPfLabel:     { en: 'Profit Factor Range', ko: '손익비 범위' },
  mcMddLabel:    { en: 'MDD Range', ko: '최대낙폭 범위' },
  mcInterpret:   { en: 'Even the worst 5% scenario shows a positive expectancy — statistically robust signal', ko: '최악 5% 시나리오에서도 기대값 양수 — 통계적으로 견고한 시그널' },
  mcInterpretWarn: { en: 'Worst 5% scenario shows negative expectancy — edge may be fragile', ko: '최악 5% 시나리오에서 기대값 음수 — 엣지가 불안정할 수 있음' },
  mc90ci:        { en: '90% CI', ko: '90% 신뢰구간' },
  mcMedian:      { en: 'median', ko: '중앙값' },

  // what is backtest
  whatTitle:     { en: 'What is Backtesting?', ko: '백테스트란?' },
  whatBody:      { en: '"If you had applied this trading signal every time it appeared from 2019 to the present, what would the results have been?" This is a simulation that calculates entry/stop/target prices based on actual past price data. It is not a prediction of the future, but is used to objectively verify whether the signal works.', ko: '"2019년부터 현재까지 이 매매 신호가 발생할 때마다 매매했다면 결과가 어땠을까?"를 실제 과거 주가 데이터로 계산하는 시뮬레이션입니다. 미래 예측이 아니라 신호가 효과적인지 객관적으로 검증하는 도구입니다.' },

  // info popover bodies
  infoTrades:    { en: 'Total number of trades in the simulation. 100+ trades means statistically reliable results. Too few trades may be luck, not skill.', ko: '시뮬레이션에서 발생한 전체 매매 횟수입니다. 100회 이상이면 통계적으로 신뢰할 수 있는 수준입니다. 거래 수가 너무 적으면 운으로 볼 수 있습니다.' },
  infoWinRate:   { en: 'Percentage of trades that were profitable. IMPORTANT: At 1:3 R:R, even a 25% win rate is profitable long-term. Do not judge a strategy by win rate alone.', ko: '전체 거래 중 수익이 난 비율입니다. 중요: R:R 1:3 전략에서는 25%만 이겨도 장기적으로 수익이 납니다. 승률만으로 전략을 판단하지 마세요.' },
  infoExp:       { en: 'Average expected profit per trade in R units. "+0.4R" means you can expect to earn 40% of your risk amount per trade on average. Positive = long-term edge.', ko: '한 번 거래할 때 평균적으로 기대할 수 있는 수익입니다 (R 단위). "+0.4R"이면 거래당 위험 금액의 40%를 평균적으로 벌 수 있다는 의미입니다. 양수면 장기 우위가 있습니다.' },
  infoPF:        { en: 'Total profit ÷ Total loss. 1.0 = breakeven, 1.5+ = robust system, 2.0+ = excellent. Below 1.0 means losing more than winning overall.', ko: '총 수익 ÷ 총 손실입니다. 1.0 = 손익분기, 1.5 이상 = 견고한 시스템, 2.0 이상 = 우수한 시스템, 1.0 미만 = 전체적으로 손실.' },
  infoMDD:       { en: 'Maximum Drawdown: how much the account dropped from peak to trough. 50% MDD means $10,000 dropped to $5,000. You must psychologically endure this before recovery.', ko: '최대낙폭: 계좌가 최고점에서 최저점까지 얼마나 빠졌는지입니다. MDD 50%는 $10,000이 $5,000까지 줄었다는 의미입니다. 회복하기 전까지 이 구간을 심리적으로 버텨야 합니다.' },
  infoIsOos:     { en: 'In-sample is the "training" period (data used to develop the strategy). Out-of-sample is the "real" verification period (data the strategy has never seen). If OOS ≥ IS, the strategy is not over-fitted to past data.', ko: 'In-sample은 전략 개발에 사용한 "학습" 기간, Out-of-sample은 한 번도 보지 않은 미래 데이터로 검증한 "실전" 기간입니다. OOS가 IS 이상이면 이 전략이 과거 데이터에만 맞춰진 것이 아니라 실제로 통한다는 뜻입니다.' },
  infoScore:     { en: 'Minervini Stage2 checklist score (0–7 points). The higher the score, the more ideal the setup. Only stocks scoring 5 or higher enter.', ko: '미너비니 Stage2 체크리스트 점수(0~7점)입니다. 점수가 높을수록 더 완벽한 셋업입니다. 5점 이상인 종목만 진입합니다.' },
  infoMC:        { en: 'Shuffles the 145 trade outcomes 10,000 times to answer: "Is this result skill or luck?" If the probability of positive expectancy is 99.8%, the edge is statistically real.', ko: '145개 거래 결과를 10,000번 무작위로 섞어 "이 결과가 실력인가, 운인가?"를 검증합니다. 기대값 양수 확률이 99.8%라면 이 엣지가 통계적으로 실재한다는 의미입니다.' },
  infoSym:       { en: 'Expectancy per stock. Stocks with negative expectancy are structurally incompatible with the Stage2 breakout model — consider trading them differently.', ko: '종목별 기대값입니다. 기대값이 음수인 종목은 Stage2 브레이크아웃 모델과 구조적으로 맞지 않습니다. 해당 종목은 다른 전략을 적용하는 것이 적합합니다.' },
  infoEquity:    { en: 'If you had traded all signals in sequence starting with $10,000, this is the hypothetical equity curve. Red shaded areas are drawdown periods.', ko: '$10,000으로 시작해 모든 신호를 순서대로 매매했을 때의 가상 자산 곡선입니다. 빨간 음영 구간은 낙폭(Drawdown) 구간입니다.' },
};

// ── Monte Carlo Confidence Interval Bar ──────────────────────────────────────

function CIBar({
  label, p5, p25, median, p75, p95,
  format = (v: number) => v.toFixed(3),
  positiveGood = true,
}: {
  label: string;
  p5: number; p25: number; median: number; p75: number; p95: number;
  format?: (v: number) => string;
  positiveGood?: boolean;
}) {
  // Normalize positions onto a 0-100% scale relative to [p5, p95]
  const range = p95 - p5 || 1;
  const toX = (v: number) => Math.max(0, Math.min(100, ((v - p5) / range) * 100));

  const p25x  = toX(p25);
  const medx  = toX(median);
  const p75x  = toX(p75);

  const iqrColor   = positiveGood && median > 0 ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)';
  const medColor   = positiveGood && median > 0 ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)';
  const mutColor   = 'rgba(255,255,255,0.08)';

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'baseline' }}>
        <span style={{ fontSize: '12px', color: 'var(--mut)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '12px', color: medColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {format(median)}
        </span>
      </div>
      <div style={{ position: 'relative', height: '20px' }}>
        {/* Full range track (p5–p95) */}
        <div style={{
          position: 'absolute', top: '8px', left: 0, right: 0, height: '4px',
          background: mutColor, borderRadius: '2px',
        }} />
        {/* IQR box (p25–p75) */}
        <div style={{
          position: 'absolute', top: '6px', height: '8px',
          left: `${p25x}%`, width: `${p75x - p25x}%`,
          background: `${iqrColor}33`, border: `1px solid ${iqrColor}66`,
          borderRadius: '2px',
        }} />
        {/* Median tick */}
        <div style={{
          position: 'absolute', top: '4px', height: '12px', width: '2px',
          left: `${medx}%`, transform: 'translateX(-50%)',
          background: medColor, borderRadius: '1px',
        }} />
        {/* p5 label */}
        <div style={{
          position: 'absolute', left: 0, top: '14px',
          fontSize: '10px', color: 'var(--dim)', fontVariantNumeric: 'tabular-nums',
        }}>{format(p5)}</div>
        {/* p95 label */}
        <div style={{
          position: 'absolute', right: 0, top: '14px',
          fontSize: '10px', color: 'var(--dim)', fontVariantNumeric: 'tabular-nums',
          transform: 'translateX(0)',
        }}>{format(p95)}</div>
      </div>
      {/* Spacer for labels below bar */}
      <div style={{ height: '14px' }} />
    </div>
  );
}

function MonteCarloSection({ mc, locale }: { mc: MonteCarloResult; locale: Locale }) {
  if (mc.note) return null;

  const prob = mc.expectancy_r.prob_positive;
  const probPct = (prob * 100).toFixed(1);
  const isStrong = mc.expectancy_r.p5 > 0;

  // Prob bar color
  const probColor = prob >= 0.95 ? 'var(--emerald, #34d399)'
                  : prob >= 0.8  ? 'var(--sky, #38bdf8)'
                  : prob >= 0.6  ? 'var(--warn, #fbbf24)'
                  : 'var(--rose, #fb7185)';

  return (
    <Card title={t(S.mcTitle, locale)} action={t(S.mcAction, locale)}>
      {/* ── 양수 확률 (헤드라인) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px',
        padding: '14px 16px', borderRadius: '10px',
        background: isStrong ? 'rgba(52,211,153,0.06)' : 'rgba(251,191,36,0.06)',
        border: `1px solid ${isStrong ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
      }}>
        <div style={{ textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontSize: '32px', fontWeight: 900, color: probColor, letterSpacing: '-1px', lineHeight: 1 }}>
            {probPct}%
          </div>
          <div style={{ fontSize: '10px', color: 'var(--mut)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t(S.mcProbLabel, locale)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: isStrong ? 'var(--emerald, #34d399)' : 'var(--warn, #fbbf24)', fontWeight: 600 }}>
            {isStrong ? t(S.mcInterpret, locale) : t(S.mcInterpretWarn, locale)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '4px' }}>
            {t(S.mc90ci, locale)}: [{mc.expectancy_r.p5 >= 0 ? '+' : ''}{mc.expectancy_r.p5.toFixed(3)}R ~ {mc.expectancy_r.p5 >= 0 ? '+' : ''}{mc.expectancy_r.p95.toFixed(3)}R] · {t(S.mcMedian, locale)} {mc.expectancy_r.median >= 0 ? '+' : ''}{mc.expectancy_r.median.toFixed(3)}R
          </div>
        </div>
      </div>

      {/* ── 신뢰구간 바 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
        <CIBar
          label={t(S.mcExpLabel, locale)}
          p5={mc.expectancy_r.p5} p25={mc.expectancy_r.p25}
          median={mc.expectancy_r.median} p75={mc.expectancy_r.p75} p95={mc.expectancy_r.p95}
          format={v => (v >= 0 ? '+' : '') + v.toFixed(3) + 'R'}
        />
        <CIBar
          label={t(S.mcWrLabel, locale)}
          p5={mc.win_rate.p5} p25={mc.win_rate.p25}
          median={mc.win_rate.median} p75={mc.win_rate.p75} p95={mc.win_rate.p95}
          format={v => (v * 100).toFixed(1) + '%'}
        />
        <CIBar
          label={t(S.mcPfLabel, locale)}
          p5={mc.profit_factor.p5} p25={mc.profit_factor.p25}
          median={mc.profit_factor.median} p75={mc.profit_factor.p75} p95={mc.profit_factor.p95}
          format={v => v.toFixed(3)}
        />
        <CIBar
          label={t(S.mcMddLabel, locale)}
          p5={mc.mdd.p5} p25={mc.mdd.p25}
          median={mc.mdd.median} p75={mc.mdd.p75} p95={mc.mdd.p95}
          format={v => v.toFixed(1) + '%'}
          positiveGood={false}
        />
      </div>

      {/* ── 범례 ── */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--dim)' }}>
          <div style={{ width: '20px', height: '6px', background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)', borderRadius: '1px' }} />
          IQR (p25~p75)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--dim)' }}>
          <div style={{ width: '2px', height: '10px', background: 'var(--emerald, #34d399)' }} />
          {t(S.mcMedian, locale)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--dim)' }}>
          양 끝 = p5 / p95 (90% 신뢰구간)
        </div>
      </div>
    </Card>
  );
}

// ── Equity Curve SVG Chart ────────────────────────────────────────────────────

function EquityCurve({ curve }: { curve: { date: string; equity: number }[] }) {
  if (!curve || curve.length < 2) return <div style={{ color: 'var(--mut)', padding: '20px 0', textAlign: 'center' }}>데이터 없음</div>;

  const W = 100, H = 56; // viewBox units
  const values = curve.map(p => p.equity);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const toX = (i: number) => (i / (curve.length - 1)) * W;
  const toY = (v: number) => H - ((v - minV) / range) * (H - 4) - 2;

  // Polyline points
  const pts = curve.map((p, i) => `${toX(i).toFixed(2)},${toY(p.equity).toFixed(2)}`).join(' ');

  // MDD shade: find peak-to-trough regions
  let peak = values[0];
  let peakIdx = 0;
  const mddRegions: { x1: number; x2: number; y1: number; y2: number }[] = [];
  let inDD = false;
  let ddStart = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > peak) {
      if (inDD) {
        mddRegions.push({ x1: toX(ddStart), x2: toX(i), y1: toY(peak), y2: H });
        inDD = false;
      }
      peak = values[i];
      peakIdx = i;
    } else if (!inDD && (peak - values[i]) / peak > 0.03) {
      inDD = true;
      ddStart = peakIdx;
    }
  }

  const start = values[0];
  const end = values[values.length - 1];
  const totalReturn = ((end - start) / start * 100).toFixed(1);
  const isPositive = end >= start;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '120px', display: 'block' }}>
        {/* MDD shading */}
        {mddRegions.map((r, i) => (
          <rect key={i} x={r.x1} y={0} width={r.x2 - r.x1} height={H}
            fill="rgba(251,113,133,0.08)" />
        ))}
        {/* Baseline */}
        <line x1="0" y1={toY(10000)} x2={W} y2={toY(10000)}
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" strokeDasharray="1 1" />
        {/* Equity line */}
        <polyline points={pts}
          fill="none"
          stroke={isPositive ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)'}
          strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Start dot */}
        <circle cx={toX(0)} cy={toY(values[0])} r="1.2" fill="var(--mut, #9aa1b2)" />
        {/* End dot */}
        <circle cx={toX(curve.length - 1)} cy={toY(values[values.length - 1])} r="1.5"
          fill={isPositive ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)'} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--mut)', marginTop: '4px' }}>
        <span>{curve[0]?.date}</span>
        <span style={{ color: isPositive ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)', fontWeight: 700 }}>
          {isPositive ? '+' : ''}{totalReturn}% total return
        </span>
        <span>{curve[curve.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ── KPI Cell ─────────────────────────────────────────────────────────────────

function KpiCell({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 8px' }}>
      <div style={{ fontSize: '11px', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', color: color ?? 'var(--txt)' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--mut)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

// ── Stats Row (IS vs OOS) ─────────────────────────────────────────────────────

function StatsRow({ label, stats, highlight }: { label: string; stats: BacktestStats; highlight?: boolean }) {
  const expColor = stats.expectancy_r > 0 ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)';
  const winColor = stats.win_rate >= 0.4 ? 'var(--emerald, #34d399)' : 'var(--warn, #fbbf24)';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr repeat(5, 80px)',
      alignItems: 'center', padding: '10px 12px',
      background: highlight ? 'rgba(56,189,248,0.06)' : 'transparent',
      borderRadius: '8px', gap: '4px',
    }}>
      <span style={{ fontSize: '13px', fontWeight: highlight ? 700 : 400, color: 'var(--txt)' }}>{label}</span>
      <span style={{ textAlign: 'right', fontSize: '13px', color: winColor, fontVariantNumeric: 'tabular-nums' }}>{(stats.win_rate * 100).toFixed(1)}%</span>
      <span style={{ textAlign: 'right', fontSize: '13px', color: expColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{stats.expectancy_r > 0 ? '+' : ''}{stats.expectancy_r.toFixed(3)}R</span>
      <span style={{ textAlign: 'right', fontSize: '13px', color: 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>{stats.profit_factor}</span>
      <span style={{ textAlign: 'right', fontSize: '13px', color: 'var(--rose, #fb7185)', fontVariantNumeric: 'tabular-nums' }}>{stats.mdd.toFixed(1)}%</span>
      <span style={{ textAlign: 'right', fontSize: '12px', color: 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>n={stats.n}</span>
    </div>
  );
}

function StatsHeader({ locale }: { locale: string }) {
  const loc = locale as 'en' | 'ko';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr repeat(5, 80px)',
      padding: '6px 12px', borderBottom: '1px solid var(--line)',
    }}>
      <span style={{ fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase' }}>Period</span>
      {['Win%', 'Exp(R)', 'PF', 'MDD', 'n'].map(h => (
        <span key={h} style={{ textAlign: 'right', fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase' }}>{h}</span>
      ))}
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────────

export function BacktestBoard() {
  const { locale } = useStore();
  const { result, isLoading, isRunning, runError, runBacktest, hasCache } = useBacktest();
  const [guideOpen, setGuideOpen] = useState(false);
  const loc = locale as 'en' | 'ko';

  useEffect(() => {
    const handler = () => setGuideOpen(true);
    document.addEventListener('guide:open', handler);
    return () => document.removeEventListener('guide:open', handler);
  }, []);

  const guides: GuideSection[] = [
    { heading: t(S.guide1Heading, locale), body: t(S.guide1Body, locale) },
    { heading: t(S.guide2Heading, locale), body: t(S.guide2Body, locale) },
    { heading: t(S.guide3Heading, locale), body: t(S.guide3Body, locale) },
  ];

  const agg = result?.aggregate;
  const all = agg?.all;
  const isS = agg?.in_sample;
  const oos = agg?.out_of_sample;

  // IS vs OOS verdict
  const oosVsIs = oos && isS && isS.n > 0
    ? oos.expectancy_r - isS.expectancy_r
    : null;
  const oosVerdict = oosVsIs === null ? null
    : oosVsIs > 0 ? t(S.oosBetter, locale)
    : Math.abs(oosVsIs) < 0.15 ? t(S.oosSimilar, locale)
    : t(S.oosWorse, locale);
  const oosVerdictColor = oosVsIs === null ? 'var(--mut)'
    : oosVsIs > 0 ? 'var(--emerald, #34d399)'
    : Math.abs(oosVsIs) < 0.15 ? 'var(--sky, #38bdf8)'
    : 'var(--warn, #fbbf24)';

  // symbol table sorted by expectancy desc
  const symRows = result
    ? Object.values(result.by_symbol)
        .filter(r => r.all && r.all.n > 0)
        .sort((a, b) => b.all.expectancy_r - a.all.expectancy_r)
    : [];

  // score breakdown sorted
  const scoreRows = result
    ? Object.entries(result.breakdown_by_score)
        .filter(([, s]) => s.n > 0)
        .sort(([a], [b]) => Number(b) - Number(a))
    : [];

  // generated_at formatting
  const generatedAt = result?.generated_at
    ? new Date(result.generated_at).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="board-wrap">
      <BoardGuidePanel
        title={t(S.guideTitle, locale)}
        sections={guides}
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
      />

      {/* board 클래스: flex:1 + overflow:auto, 단일 컬럼 grid → 카드가 자연 높이로 쌓여 스크롤 활성화 */}
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr', alignItems: 'start', gap: '16px' }}>

        {/* ── 실행 버튼 + 상태 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={runBacktest}
            disabled={isRunning}
            style={{
              padding: '8px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '14px',
              background: isRunning ? 'var(--panel2)' : 'rgba(56,189,248,0.15)',
              border: '1px solid rgba(56,189,248,0.4)', color: 'var(--sky, #38bdf8)',
              cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? 0.7 : 1,
            }}
          >
            {isRunning ? t(S.running, locale) : generatedAt ? t(S.rerun, locale) : t(S.runBtn, locale)}
          </button>
          {generatedAt && (
            <span style={{ fontSize: '12px', color: 'var(--mut)' }}>
              {t(S.lastRun, locale)}: {generatedAt}
            </span>
          )}
          {runError && (
            <span style={{ fontSize: '12px', color: 'var(--rose, #fb7185)' }}>{runError}</span>
          )}
          {result?.config && (
            <span style={{ fontSize: '12px', color: 'var(--dim)', marginLeft: 'auto' }}>
              {result.config.symbols.join(' · ')} · Stage2 ≥ {result.config.stage2_threshold}
              {result.config.rs_threshold !== undefined && ` · RS≥${result.config.rs_threshold}`}
              {result.config.use_spy_filter && ' · SPY필터'}
              {' · '}{result.config.data_start} ~
            </span>
          )}
        </div>

        {/* ── 로딩 / 캐시 없음 ── */}
        {isLoading && <div style={{ color: 'var(--mut)', padding: '40px', textAlign: 'center' }}>{t(S.loading, locale)}</div>}
        {!isLoading && !result && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '16px',
            padding: '40px', textAlign: 'center', color: 'var(--mut)',
          }}>
            {t(S.noCache, locale)}
          </div>
        )}

        {result && all && (
          <>
            {/* ── 백테스트란? ── */}
            <details style={{
              background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)',
              borderRadius: '12px',
            }}>
              <summary style={{
                padding: '11px 16px', fontSize: '13px', fontWeight: 600,
                color: 'var(--sky, #38bdf8)', cursor: 'pointer', listStyle: 'none',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                📖 {t(S.whatTitle, locale)}
              </summary>
              <div style={{ padding: '0 16px 14px', fontSize: '13px', color: 'var(--mut)', lineHeight: 1.7 }}>
                {t(S.whatBody, locale)}
              </div>
            </details>

            {/* ── 방법론 배너 ── */}
            <div style={{
              borderLeft: '3px solid var(--warn, #fbbf24)', background: 'rgba(251,191,36,0.07)',
              borderRadius: '0 12px 12px 0', padding: '12px 16px',
            }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--warn, #fbbf24)', marginBottom: '6px' }}>
                ⚠ {t(S.methodTitle, locale)}
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {[S.tier1Only, S.limitEntry, S.limitSlip, S.limitBias, S.limitPast].map((key, i) => (
                  <li key={i} style={{ fontSize: '12px', color: 'var(--mut)' }}>{t(key, locale)}</li>
                ))}
              </ul>
            </div>

            {/* ── KPI 카드 4개 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <Card
                title={t(S.totalTrades, locale)}
                action={`WIN ${all.wins} · LOSS ${all.losses} · T/O ${all.timeouts}`}
                info={{ term: t(S.totalTrades, locale), body: t(S.infoTrades, locale) }}
              >
                <KpiCell label="" value={String(all.n)} sub={`avg ${all.avg_bars_held.toFixed(1)}d held`} />
              </Card>

              <Card
                title={t(S.winRate, locale)}
                action={t(S.breakeven, locale)}
                info={{ term: t(S.winRate, locale), body: t(S.infoWinRate, locale) }}
              >
                <KpiCell
                  label=""
                  value={`${(all.win_rate * 100).toFixed(1)}%`}
                  sub="breakeven 25%"
                  color={all.win_rate >= 0.25 ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)'}
                />
              </Card>

              <Card
                title={t(S.expectancy, locale)}
                action="per trade (R units)"
                info={{ term: t(S.expectancy, locale), body: t(S.infoExp, locale) }}
              >
                <KpiCell
                  label=""
                  value={`${all.expectancy_r > 0 ? '+' : ''}${all.expectancy_r.toFixed(3)}R`}
                  sub={`win avg +${all.avg_win_r.toFixed(2)}R / loss avg ${all.avg_loss_r.toFixed(2)}R`}
                  color={all.expectancy_r > 0 ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)'}
                />
              </Card>

              <Card
                title={t(S.profitFactor, locale)}
                action={`streak ${all.max_consecutive_loss}× loss`}
                info={{ term: t(S.profitFactor, locale), body: t(S.infoPF, locale) }}
              >
                <KpiCell
                  label=""
                  value={String(all.profit_factor)}
                  sub="≥1.5 = robust"
                  color={all.profit_factor >= 1.5 ? 'var(--emerald, #34d399)' : all.profit_factor >= 1.0 ? 'var(--warn, #fbbf24)' : 'var(--rose, #fb7185)'}
                />
              </Card>
            </div>

            {/* ── MDD 카드 ── */}
            <Card
              title={t(S.mdd, locale)}
              action={`${all.mdd.toFixed(1)}% · ${all.max_consecutive_loss}× max consecutive loss`}
              info={{ term: t(S.mdd, locale), body: t(S.infoMDD, locale) }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '4px 0 8px' }}>
                <div style={{ textAlign: 'center', minWidth: '72px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', color: all.mdd > 40 ? 'var(--warn, #fbbf24)' : 'var(--mut)' }}>
                    {all.mdd.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '2px', textTransform: 'uppercase' }}>{t(S.mdd, locale)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'var(--panel2)', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${Math.min(all.mdd, 100)}%`, borderRadius: '4px', background: all.mdd > 50 ? 'var(--rose, #fb7185)' : all.mdd > 30 ? 'var(--warn, #fbbf24)' : 'var(--emerald, #34d399)' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)', lineHeight: 1.6 }}>
                    {locale === 'ko'
                      ? `$10,000 기준 최저 $${(10000 * (1 - all.mdd / 100)).toFixed(0)}까지 감소 가능. 최대 연속 손실 ${all.max_consecutive_loss}회.`
                      : `$10,000 → min ~$${(10000 * (1 - all.mdd / 100)).toFixed(0)} worst case. Max ${all.max_consecutive_loss} consecutive losses.`}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── IS vs OOS + Score breakdown ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px' }}>
              <Card
                title={t(S.isOosTitle, locale)}
                info={{ term: 'In-sample vs Out-of-sample', body: t(S.infoIsOos, locale) }}
              >
                {isS && oos && (
                  <>
                    <StatsHeader locale={locale} />
                    <StatsRow label={t(S.isLabel, locale)} stats={isS} />
                    <StatsRow label={t(S.oosLabel, locale)} stats={oos} highlight />
                    {oosVerdict && (
                      <div style={{
                        marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)', fontSize: '12px',
                        color: oosVerdictColor, fontWeight: 600,
                      }}>
                        → {oosVerdict}
                      </div>
                    )}
                  </>
                )}
              </Card>

              <Card
                title={t(S.scoreTitle, locale)}
                action={t(S.scoreAction, locale)}
                info={{ term: 'Stage2 Score', body: t(S.infoScore, locale) }}
              >
                {scoreRows.length === 0 && <div style={{ color: 'var(--mut)', fontSize: '13px' }}>데이터 없음</div>}
                {scoreRows.map(([score, s]) => {
                  const barW = Math.max(4, s.win_rate * 100);
                  const expColor = s.expectancy_r > 0 ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)';
                  return (
                    <div key={score} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                        <span style={{ color: 'var(--txt)', fontWeight: 600 }}>{score}/7점 <span style={{ color: 'var(--mut)', fontWeight: 400 }}>n={s.n}</span></span>
                        <span style={{ color: expColor, fontWeight: 700 }}>
                          {s.expectancy_r > 0 ? '+' : ''}{s.expectancy_r.toFixed(3)}R · {(s.win_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--panel2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barW}%`, borderRadius: '3px', background: expColor, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>

            {/* ── 몬테카를로 신뢰구간 ── */}
            {result.monte_carlo && !result.monte_carlo.note && (
              <MonteCarloSection mc={result.monte_carlo} locale={locale as Locale} />
            )}

            {/* ── Equity Curve ── */}
            <Card
              title={t(S.equityTitle, locale)}
              action={t(S.equityAction, locale)}
              info={{ term: t(S.equityTitle, locale), body: t(S.infoEquity, locale) }}
            >
              <EquityCurve curve={all.equity_curve} />
            </Card>

            {/* ── 종목별 테이블 ── */}
            <Card
              title={t(S.symTitle, locale)}
              action={t(S.symAction, locale)}
              info={{ term: t(S.symTitle, locale), body: t(S.infoSym, locale) }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Symbol', t(S.colWin, locale), t(S.colExp, locale), t(S.colPF, locale), t(S.colMDD, locale), t(S.colN, locale)].map((h, i) => (
                      <th key={i} style={{
                        padding: '8px 10px', textAlign: i === 0 ? 'left' : 'right',
                        fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase',
                        fontWeight: 700, background: 'var(--panel2)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {symRows.map((r, i) => {
                    const s = r.all;
                    const expColor = s.expectancy_r > 0 ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)';
                    const winColor = s.win_rate >= 0.25 ? 'inherit' : 'var(--rose, #fb7185)';
                    return (
                      <tr key={r.symbol} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--sky, #38bdf8)' }}>{r.symbol}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: winColor, fontVariantNumeric: 'tabular-nums' }}>{(s.win_rate * 100).toFixed(1)}%</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: expColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {s.expectancy_r > 0 ? '+' : ''}{s.expectancy_r.toFixed(3)}R
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: s.profit_factor >= 1.5 ? 'var(--emerald, #34d399)' : 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>{s.profit_factor}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: s.mdd > 30 ? 'var(--warn, #fbbf24)' : 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>{s.mdd.toFixed(1)}%</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>{s.n}</td>
                      </tr>
                    );
                  })}
                  {symRows.filter(r => r.all.expectancy_r < 0).map(r => (
                    <tr key={`note-${r.symbol}`}>
                      <td colSpan={6} style={{
                        padding: '6px 10px 10px 16px', fontSize: '11px',
                        background: 'rgba(251,113,133,0.04)',
                        borderLeft: '3px solid var(--rose, #fb7185)',
                      }}>
                        <strong style={{ color: 'var(--rose, #fb7185)' }}>⚠ {r.symbol}</strong>
                        {r.symbol === 'AMZN' ? (
                          <span style={{ color: 'var(--mut)', marginLeft: 6 }}>
                            {locale === 'ko'
                              ? '모든 파라미터 조합(RS 50~80, SPY필터 ON/OFF, threshold 5~7)에서 승률 21% — Stage2 피봇 브레이크아웃 모델과 구조적 불일치. AMZN의 박스권/횡보 가격 특성이 원인. 대안: ① 백테스트 대상에서 제외 ② 별도 레인지-바운드 전략 적용'
                              : 'Win rate 21% across ALL parameter combinations (RS 50–80, SPY filter on/off, threshold 5–7) — structural mismatch with Stage2 pivot breakout model. AMZN\'s range-bound price behavior is the cause. Options: ① Exclude from backtest targets ② Apply a separate range-bound strategy'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--mut)', marginLeft: 6 }}>
                            {locale === 'ko'
                              ? 'Stage2 신호가 이 종목의 가격 구조와 맞지 않을 수 있습니다.'
                              : "Stage2 signal may not suit this stock's price structure."}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

          </>
        )}
      </div>
    </div>
  );
}
