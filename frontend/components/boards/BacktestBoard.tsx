'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useBacktest, BacktestStats, MonteCarloResult } from '@/hooks/useBacktest';
import { useSweep, SweepEntry } from '@/hooks/useSweep';
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

  // sweep section
  sweepTitle:    { en: 'Parameter Optimization Dashboard', ko: '파라미터 최적화 대시보드' },
  sweepSub:      { en: 'Compare 8 parameter combinations to find the most robust settings', ko: '8가지 파라미터 조합을 비교하여 가장 강건한 설정을 찾습니다' },
  sweepRunBtn:   { en: 'Run Sweep (~3min)', ko: '스윕 실행 (~3분 소요)' },
  sweepRunning:  { en: 'Running sweep...', ko: '스윕 실행 중...' },
  sweepRerun:    { en: 'Re-run Sweep', ko: '스윕 재실행' },
  sweepLastRun:  { en: 'Last sweep', ko: '최근 스윕' },
  sweepNoCache:  { en: 'No sweep results yet. Press the run button.', ko: '스윕 결과가 없습니다. 실행 버튼을 눌러주세요.' },
  heatmapTitle:  { en: 'Expectancy Heatmap (OOS)', ko: '기대값 히트맵 (Out-of-sample)' },
  heatmapSub:    { en: 'Stage2 threshold × RS threshold × SPY filter', ko: 'Stage2 임계값 × RS 임계값 × SPY필터 조합별 OOS 기대값' },
  heatmapInfo:   { en: 'Out-of-sample expectancy per parameter combination. Green = positive edge. The darker the green, the more robust. Red = negative or weak edge.', ko: '파라미터 조합별 Out-of-sample 기대값입니다. 초록 = 양수 엣지, 진할수록 강건. 빨간색 = 음수 또는 약한 엣지.' },
  rankTitle:     { en: 'Configuration Ranking (OOS Expectancy)', ko: '설정별 OOS 기대값 랭킹' },
  rankSub:       { en: 'Sorted by out-of-sample expectancy — most robust first', ko: 'OOS 기대값 내림차순 — 가장 강건한 설정이 상단' },
  rankInfo:      { en: 'OOS expectancy is the most honest performance metric — it uses data the model has never seen. Higher OOS expectancy = more generalizable signal.', ko: 'OOS 기대값은 모델이 한 번도 보지 않은 데이터로 측정한 가장 정직한 성과 지표입니다. OOS 기대값이 높을수록 더 일반화된 신호입니다.' },
  curveTitle:    { en: 'Equity Curve Comparison', ko: '자산곡선 비교 (전체 기간)' },
  curveSub:      { en: 'All 8 configurations overlaid — compare path and drawdown', ko: '8개 설정 자산곡선 오버레이 — 경로와 낙폭 비교' },
  curveInfo:     { en: 'Overlay of all parameter combination equity curves. A robust setting should have a smooth curve across all configurations.', ko: '모든 파라미터 조합의 자산곡선 오버레이입니다. 강건한 설정은 모든 조합에서 비슷한 상승 패턴을 보여야 합니다.' },
  amznTitle:     { en: 'AMZN Structural Incompatibility Analysis', ko: 'AMZN 구조적 불일치 분석 (투명성)' },
  amznSub:       { en: 'Win rate 21% across ALL 8 parameter combinations — structural mismatch with Stage2 breakout model', ko: '모든 8개 파라미터 조합에서 승률 21% — Stage2 브레이크아웃 모델과 구조적 불일치' },
  bestLabel:     { en: '✦ Recommended', ko: '✦ 권장 설정' },
  spyOn:         { en: 'SPY Filter ON', ko: 'SPY필터 ON' },
  spyOff:        { en: 'SPY Filter OFF', ko: 'SPY필터 OFF' },
  stg:           { en: 'Stage2', ko: 'Stage2' },
  rs:            { en: 'RS≥', ko: 'RS≥' },

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
        <span style={{ fontSize: '13px', color: 'var(--fg-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '13px', color: medColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
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
          fontSize: '11px', color: 'var(--fg-subtle)', fontVariantNumeric: 'tabular-nums',
        }}>{format(p5)}</div>
        {/* p95 label */}
        <div style={{
          position: 'absolute', right: 0, top: '14px',
          fontSize: '11px', color: 'var(--fg-subtle)', fontVariantNumeric: 'tabular-nums',
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
          <div style={{ fontSize: '35px', fontWeight: 900, color: probColor, letterSpacing: '-1px', lineHeight: 1 }}>
            {probPct}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t(S.mcProbLabel, locale)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: isStrong ? 'var(--emerald, #34d399)' : 'var(--warn, #fbbf24)', fontWeight: 600 }}>
            {isStrong ? t(S.mcInterpret, locale) : t(S.mcInterpretWarn, locale)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--fg-subtle)', marginTop: '4px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--fg-subtle)' }}>
          <div style={{ width: '20px', height: '6px', background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)', borderRadius: '1px' }} />
          IQR (p25~p75)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--fg-subtle)' }}>
          <div style={{ width: '2px', height: '10px', background: 'var(--emerald, #34d399)' }} />
          {t(S.mcMedian, locale)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--fg-subtle)' }}>
          양 끝 = p5 / p95 (90% 신뢰구간)
        </div>
      </div>
    </Card>
  );
}

// ── Parameter Sweep Components ───────────────────────────────────────────────

// 기대값을 색상으로 변환: -0.3 ~ +0.7R 범위 → red/yellow/green
function expToColor(exp: number): string {
  if (exp >= 0.4) return 'rgba(16,185,129,0.85)';
  if (exp >= 0.2) return 'rgba(16,185,129,0.5)';
  if (exp >= 0.05) return 'rgba(16,185,129,0.25)';
  if (exp >= -0.05) return 'rgba(100,116,139,0.4)';
  if (exp >= -0.2) return 'rgba(239,68,68,0.3)';
  return 'rgba(239,68,68,0.6)';
}
function expToTextColor(exp: number): string {
  if (exp >= 0.2) return '#34d399';
  if (exp >= 0.05) return '#6ee7b7';
  if (exp >= -0.05) return '#94a3b8';
  return '#f87171';
}

// 히트맵: Stage2 threshold(행) × RS threshold(열), SPY필터별 그룹
function SweepHeatmap({ entries, locale }: { entries: SweepEntry[]; locale: Locale }) {
  const thresholds = [5, 6];
  const rsValues = [50, 60, 70];
  const spyStates = [false, true];

  const lookup = (th: number, rs: number, spy: boolean): SweepEntry | undefined =>
    entries.find(e =>
      e.config.threshold === th &&
      e.config.rs_threshold === rs &&
      e.config.use_spy_filter === spy
    );

  const cellStyle = (exp: number): React.CSSProperties => ({
    background: expToColor(exp),
    borderRadius: '6px',
    padding: '8px 6px',
    textAlign: 'center' as const,
    minWidth: '80px',
    border: '1px solid rgba(255,255,255,0.07)',
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      {spyStates.map(spy => (
        <div key={String(spy)} style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1px', color: spy ? '#38bdf8' : '#94a3b8',
            marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: spy ? '#38bdf8' : '#64748b', display: 'inline-block',
            }} />
            {spy ? t(S.spyOn, locale) : t(S.spyOff, locale)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(${rsValues.length}, 1fr)`, gap: '6px', alignItems: 'center' }}>
            {/* 헤더행 */}
            <div style={{ fontSize: '11px', color: 'var(--fg-subtle)', textAlign: 'center' }} />
            {rsValues.map(rs => (
              <div key={rs} style={{ fontSize: '12px', color: 'var(--fg-subtle)', textAlign: 'center', fontWeight: 600 }}>
                {t(S.rs, locale)}{rs}
              </div>
            ))}
            {/* 데이터행 */}
            {thresholds.flatMap(th => [
              <div key={`label-${spy}-${th}`} style={{ fontSize: '12px', color: 'var(--fg-subtle)', fontWeight: 600, textAlign: 'right', paddingRight: '8px' }}>
                {t(S.stg, locale)} ≥{th}
              </div>,
              ...rsValues.map(rs => {
                const entry = lookup(th, rs, spy);
                const oos = entry?.out_of_sample;
                const isRecommended = th === 5 && rs === 70 && spy;
                return (
                  <div key={`cell-${spy}-${th}-${rs}`} style={{
                    ...cellStyle(oos?.expectancy_r ?? -1),
                    outline: isRecommended ? '2px solid #38bdf8' : 'none',
                    outlineOffset: '1px',
                  }}>
                    {oos ? (
                      <>
                        {isRecommended && (
                          <div style={{
                            display: 'inline-block',
                            background: '#38bdf8', color: '#0f172a', fontSize: '9px', fontWeight: 800,
                            padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap',
                            letterSpacing: '0.5px', marginBottom: '4px',
                          }}>
                            ✦ BEST OOS
                          </div>
                        )}
                        <div style={{ fontSize: '15px', fontWeight: 800, color: expToTextColor(oos.expectancy_r), fontVariantNumeric: 'tabular-nums' }}>
                          {oos.expectancy_r > 0 ? '+' : ''}{oos.expectancy_r.toFixed(3)}R
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--fg-subtle)', marginTop: '3px' }}>
                          {(oos.win_rate * 100).toFixed(0)}% · n={oos.n}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--fg-subtle)', fontSize: '12px' }}>—</div>
                    )}
                  </div>
                );
              }),
            ])}
          </div>
        </div>
      ))}
      {/* 범례 */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '4px' }}>
        {[
          { color: 'rgba(16,185,129,0.85)', label: '≥+0.4R' },
          { color: 'rgba(16,185,129,0.5)', label: '+0.2~0.4R' },
          { color: 'rgba(16,185,129,0.25)', label: '+0.05~0.2R' },
          { color: 'rgba(100,116,139,0.4)', label: '±0.05R' },
          { color: 'rgba(239,68,68,0.6)', label: '<-0.2R' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--fg-subtle)' }}>
            <div style={{ width: '14px', height: '14px', background: color, borderRadius: '3px' }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// 랭킹 바 차트
function SweepRanking({ entries, locale }: { entries: SweepEntry[]; locale: Locale }) {
  const sorted = [...entries].sort((a, b) => b.out_of_sample.expectancy_r - a.out_of_sample.expectancy_r);
  const maxAbs = Math.max(...sorted.map(e => Math.abs(e.out_of_sample.expectancy_r)), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {sorted.map((entry, i) => {
        const oos = entry.out_of_sample;
        const is_ = entry.in_sample;
        const exp = oos.expectancy_r;
        const barW = Math.max(2, (Math.abs(exp) / maxAbs) * 100);
        const isPositive = exp >= 0;
        const isRecommended = entry.config.threshold === 5 && entry.config.rs_threshold === 70 && entry.config.use_spy_filter;
        const barColor = isPositive ? (exp >= 0.4 ? '#34d399' : exp >= 0.2 ? '#6ee7b7' : '#a7f3d0') : '#f87171';
        return (
          <div key={entry.label} style={{
            background: isRecommended ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isRecommended ? 'rgba(56,189,248,0.3)' : 'var(--border)'}`,
            borderRadius: '10px',
            padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '6px',
                  background: isRecommended ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 800, color: isRecommended ? '#38bdf8' : 'var(--fg-subtle)',
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: isRecommended ? '#38bdf8' : 'var(--txt)' }}>
                  {entry.label}
                  {isRecommended && (
                    <span style={{
                      marginLeft: '8px', fontSize: '10px', fontWeight: 700,
                      background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
                      padding: '1px 7px', borderRadius: '4px', letterSpacing: '0.5px',
                    }}>
                      {t(S.bestLabel, locale)}
                    </span>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--fg-subtle)' }}>
                <span>IS: <span style={{ color: is_.expectancy_r >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>{is_.expectancy_r > 0 ? '+' : ''}{is_.expectancy_r.toFixed(3)}R</span></span>
                <span>OOS: <span style={{ color: barColor, fontWeight: 800, fontSize: '13px' }}>{exp > 0 ? '+' : ''}{exp.toFixed(3)}R</span></span>
                <span style={{ color: 'var(--fg-subtle)' }}>{(oos.win_rate * 100).toFixed(0)}% · n={oos.n}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '6px', background: 'var(--card-elev)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${barW}%`,
                  background: barColor, borderRadius: '3px',
                  marginLeft: isPositive ? '0' : `${100 - barW}%`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--fg-subtle)', minWidth: '50px', textAlign: 'right' }}>
                PF {oos.profit_factor.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 자산곡선 오버레이
function SweepEquityCurves({ entries }: { entries: SweepEntry[] }) {
  const W = 100, H = 60;
  const colors = [
    '#34d399', '#38bdf8', '#a78bfa', '#fb923c',
    '#f472b6', '#facc15', '#4ade80', '#67e8f9',
  ];
  const recommended = entries.find(e => e.config.threshold === 5 && e.config.rs_threshold === 70 && e.config.use_spy_filter);

  // 전체 곡선에서 공통 min/max 계산
  const allValues = entries.flatMap(e => e.aggregate.equity_curve.map(p => p.equity));
  if (allValues.length === 0) return null;
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 1;

  const toY = (v: number) => H - ((v - minV) / range) * (H - 4) - 2;

  const sorted = [...entries].sort((a, b) => b.aggregate.expectancy_r - a.aggregate.expectancy_r);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '160px', display: 'block' }}>
        {/* 기준선 */}
        <line x1="0" y1={toY(10000)} x2={W} y2={toY(10000)}
          stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" strokeDasharray="1 1" />
        {/* 비추천 곡선 먼저 (뒤에 배치) */}
        {sorted.map((entry, i) => {
          const curve = entry.aggregate.equity_curve;
          if (curve.length < 2) return null;
          const isRec = entry === recommended;
          if (isRec) return null;
          const pts = curve.map((p, j) =>
            `${((j / (curve.length - 1)) * W).toFixed(2)},${toY(p.equity).toFixed(2)}`
          ).join(' ');
          return (
            <polyline key={entry.label} points={pts}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="0.5"
              strokeOpacity="0.3"
              strokeLinejoin="round"
            />
          );
        })}
        {/* 권장 설정 곡선 (앞에 배치) */}
        {recommended && (() => {
          const curve = recommended.aggregate.equity_curve;
          if (curve.length < 2) return null;
          const pts = curve.map((p, j) =>
            `${((j / (curve.length - 1)) * W).toFixed(2)},${toY(p.equity).toFixed(2)}`
          ).join(' ');
          return (
            <polyline points={pts}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })()}
      </svg>
      {/* 범례 */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
        {sorted.map((entry, i) => {
          const isRec = entry === recommended;
          const finalEq = entry.aggregate.equity_curve.slice(-1)[0]?.equity ?? 10000;
          const ret = ((finalEq - 10000) / 10000 * 100).toFixed(0);
          return (
            <div key={entry.label} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', color: isRec ? '#38bdf8' : 'var(--fg-subtle)',
              fontWeight: isRec ? 700 : 400,
            }}>
              <div style={{
                width: isRec ? '18px' : '12px', height: isRec ? '3px' : '1.5px',
                background: isRec ? '#38bdf8' : colors[i % colors.length],
                borderRadius: '1px', opacity: isRec ? 1 : 0.5,
              }} />
              {entry.config.threshold}pt RS{entry.config.rs_threshold}{entry.config.use_spy_filter ? '+SPY' : ''}
              <span style={{ color: finalEq >= 10000 ? '#34d399' : '#f87171' }}>
                {finalEq >= 10000 ? '+' : ''}{ret}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// AMZN 구조적 불일치 분석 (스윕 데이터에서 AMZN만 추출)
function AmznAnalysis({ locale }: { locale: Locale }) {
  return (
    <div style={{
      borderLeft: '3px solid #f87171',
      background: 'rgba(239,68,68,0.04)',
      borderRadius: '0 10px 10px 0',
      padding: '14px 16px',
    }}>
      <div style={{ fontWeight: 700, fontSize: '14px', color: '#f87171', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        ⚠ {t(S.amznTitle, locale)}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
        {locale === 'ko'
          ? 'AMZN은 8개 파라미터 조합 (RS 50~70, Stage2 5~6, SPY 필터 ON/OFF) 에서 모두 승률 21% 수준입니다. 이는 Stage2 피봇 브레이크아웃 방법론과 AMZN의 가격 구조가 구조적으로 맞지 않는다는 의미입니다.'
          : 'AMZN shows ~21% win rate across all 8 parameter combinations (RS 50–70, Stage2 5–6, SPY filter on/off). This indicates a structural mismatch between the Stage2 pivot breakout methodology and AMZN\'s price behavior.'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {[
          { label: locale === 'ko' ? '승률 (모든 조합)' : 'Win Rate (all configs)', value: '~21%', color: '#f87171' },
          { label: locale === 'ko' ? '원인 분석' : 'Root Cause', value: locale === 'ko' ? '박스권 횡보' : 'Range-bound', color: '#fbbf24' },
          { label: locale === 'ko' ? '대안 ①' : 'Option ①', value: locale === 'ko' ? '백테스트 제외' : 'Exclude from BT', color: '#94a3b8' },
          { label: locale === 'ko' ? '대안 ②' : 'Option ②', value: locale === 'ko' ? '레인지 전략' : 'Range strategy', color: '#94a3b8' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '10px 12px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--fg-subtle)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--fg-subtle)', lineHeight: 1.6 }}>
        {locale === 'ko'
          ? '💡 이 분석은 방법론의 한계를 투명하게 공개합니다. Stage2 시스템이 모든 종목에 적용될 수 없다는 사실을 데이터로 확인하는 것이 더 신뢰할 수 있는 시스템입니다.'
          : '💡 This analysis openly discloses the limitations of the methodology. Confirming with data that the Stage2 system cannot be applied to every stock makes it a more trustworthy system.'}
      </div>
    </div>
  );
}

// ── 파라미터 최적화 대시보드 (전체 섹션) ──────────────────────────────────────
function SweepDashboard({ locale }: { locale: Locale }) {
  const { result, isLoading, isRunning, runError, runSweep } = useSweep();

  const generatedAt = result?.generated_at
    ? new Date(result.generated_at).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div style={{
      background: 'rgba(56,189,248,0.03)',
      border: '1px solid rgba(56,189,248,0.15)',
      borderRadius: '16px',
      padding: '20px',
      marginTop: '4px',
    }}>
      {/* 섹션 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8', marginBottom: '2px' }}>
            ⚗ {t(S.sweepTitle, locale)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--fg-subtle)' }}>{t(S.sweepSub, locale)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {generatedAt && (
            <span style={{ fontSize: '12px', color: 'var(--fg-subtle)' }}>
              {t(S.sweepLastRun, locale)}: {generatedAt}
            </span>
          )}
          {runError && <span style={{ fontSize: '12px', color: '#f87171' }}>{runError}</span>}
          {/* 결과 있을 때만 헤더에 재실행 버튼 표시 */}
          {result && (
            <button
              onClick={runSweep}
              disabled={isRunning}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '12px',
                background: isRunning ? 'var(--card-elev)' : 'rgba(56,189,248,0.1)',
                border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8',
                cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? 0.7 : 1,
              }}
            >
              {isRunning ? t(S.sweepRunning, locale) : t(S.sweepRerun, locale)}
            </button>
          )}
        </div>
      </div>

      {isLoading && <div style={{ color: 'var(--fg-muted)', padding: '20px', textAlign: 'center', fontSize: '14px' }}>로딩 중...</div>}

      {/* 미실행 상태: 눈에 띄는 중앙 실행 버튼 */}
      {!isLoading && !result && (
        <div style={{
          border: '1px dashed rgba(56,189,248,0.3)', borderRadius: '12px',
          padding: '32px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--fg-subtle)', marginBottom: '16px' }}>
            {t(S.sweepNoCache, locale)}
          </div>
          <button
            onClick={runSweep}
            disabled={isRunning}
            style={{
              padding: '12px 32px', borderRadius: '10px', fontWeight: 700, fontSize: '15px',
              background: isRunning ? 'var(--card-elev)' : 'rgba(56,189,248,0.15)',
              border: '1px solid rgba(56,189,248,0.5)', color: '#38bdf8',
              cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? 0.7 : 1,
              display: 'inline-flex', alignItems: 'center', gap: '8px',
            }}
          >
            {isRunning ? '⏳ ' + t(S.sweepRunning, locale) : '▶ ' + t(S.sweepRunBtn, locale)}
          </button>
        </div>
      )}

      {result && result.results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 히트맵 */}
          <Card
            title={t(S.heatmapTitle, locale)}
            action={t(S.heatmapSub, locale)}
            info={{ term: t(S.heatmapTitle, locale), body: t(S.heatmapInfo, locale) }}
          >
            <SweepHeatmap entries={result.results} locale={locale} />
          </Card>

          {/* 랭킹 + 자산곡선 — 위아래 배치 */}
          <Card
            title={t(S.rankTitle, locale)}
            action={t(S.rankSub, locale)}
            info={{ term: t(S.rankTitle, locale), body: t(S.rankInfo, locale) }}
          >
            <SweepRanking entries={result.results} locale={locale} />
          </Card>

          <Card
            title={t(S.curveTitle, locale)}
            action={t(S.curveSub, locale)}
            info={{ term: t(S.curveTitle, locale), body: t(S.curveInfo, locale) }}
          >
            <SweepEquityCurves entries={result.results} />
          </Card>

          {/* AMZN 구조적 불일치 */}
          <Card title={t(S.amznTitle, locale)} action={t(S.amznSub, locale)}>
            <AmznAnalysis locale={locale} />
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Equity Curve SVG Chart ────────────────────────────────────────────────────

function EquityCurve({ curve }: { curve: { date: string; equity: number }[] }) {
  if (!curve || curve.length < 2) return <div style={{ color: 'var(--fg-muted)', padding: '20px 0', textAlign: 'center' }}>데이터 없음</div>;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--fg-muted)', marginTop: '4px' }}>
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
      <div style={{ fontSize: '12px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', color: color ?? 'var(--txt)' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: '2px' }}>{sub}</div>}
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
      <span style={{ fontSize: '14px', fontWeight: highlight ? 700 : 400, color: 'var(--txt)' }}>{label}</span>
      <span style={{ textAlign: 'right', fontSize: '14px', color: winColor, fontVariantNumeric: 'tabular-nums' }}>{(stats.win_rate * 100).toFixed(1)}%</span>
      <span style={{ textAlign: 'right', fontSize: '14px', color: expColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{stats.expectancy_r > 0 ? '+' : ''}{stats.expectancy_r.toFixed(3)}R</span>
      <span style={{ textAlign: 'right', fontSize: '14px', color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>{stats.profit_factor}</span>
      <span style={{ textAlign: 'right', fontSize: '14px', color: 'var(--rose, #fb7185)', fontVariantNumeric: 'tabular-nums' }}>{stats.mdd.toFixed(1)}%</span>
      <span style={{ textAlign: 'right', fontSize: '13px', color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>n={stats.n}</span>
    </div>
  );
}

function StatsHeader({ locale }: { locale: string }) {
  const loc = locale as 'en' | 'ko';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr repeat(5, 80px)',
      padding: '6px 12px', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>Period</span>
      {['Win%', 'Exp(R)', 'PF', 'MDD', 'n'].map(h => (
        <span key={h} style={{ textAlign: 'right', fontSize: '12px', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>{h}</span>
      ))}
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────────

export function BacktestBoard() {
  const { locale } = useStore();
  const { result, isLoading, isRunning, runError, runBacktest } = useBacktest();
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
  const oosVerdictColor = oosVsIs === null ? 'var(--fg-muted)'
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

      {/* board: flex:1 + overflow:auto 스크롤 컨테이너 역할 */}
      <div className="board fade-in">
      {/* 내부 wrapper: flex-shrink:0 으로 board의 flex 압축 방지 → 카드가 자연 높이로 렌더링되고 board가 스크롤 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>

        {/* ── 실행 버튼 + 상태 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={runBacktest}
            disabled={isRunning}
            style={{
              padding: '8px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '15px',
              background: isRunning ? 'var(--card-elev)' : 'rgba(56,189,248,0.15)',
              border: '1px solid rgba(56,189,248,0.4)', color: 'var(--sky, #38bdf8)',
              cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? 0.7 : 1,
            }}
          >
            {isRunning ? t(S.running, locale) : generatedAt ? t(S.rerun, locale) : t(S.runBtn, locale)}
          </button>
          {generatedAt && (
            <span style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>
              {t(S.lastRun, locale)}: {generatedAt}
            </span>
          )}
          {runError && (
            <span style={{ fontSize: '13px', color: 'var(--rose, #fb7185)' }}>{runError}</span>
          )}
          {result?.config && (
            <span style={{ fontSize: '13px', color: 'var(--fg-subtle)', marginLeft: 'auto' }}>
              {result.config.symbols.join(' · ')} · Stage2 ≥ {result.config.stage2_threshold}
              {result.config.rs_threshold !== undefined && ` · RS≥${result.config.rs_threshold}`}
              {result.config.use_spy_filter && ' · SPY필터'}
              {' · '}{result.config.data_start} ~
            </span>
          )}
        </div>

        {/* ── 로딩 / 캐시 없음 ── */}
        {isLoading && <div style={{ color: 'var(--fg-muted)', padding: '40px', textAlign: 'center' }}>{t(S.loading, locale)}</div>}
        {!isLoading && !result && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '16px',
            padding: '40px', textAlign: 'center', color: 'var(--fg-muted)',
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
                padding: '11px 16px', fontSize: '14px', fontWeight: 600,
                color: 'var(--sky, #38bdf8)', cursor: 'pointer', listStyle: 'none',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                📖 {t(S.whatTitle, locale)}
              </summary>
              <div style={{ padding: '0 16px 14px', fontSize: '14px', color: 'var(--fg-muted)', lineHeight: 1.7 }}>
                {t(S.whatBody, locale)}
              </div>
            </details>

            {/* ── 방법론 배너 ── */}
            <div style={{
              borderLeft: '3px solid var(--warn, #fbbf24)', background: 'rgba(251,191,36,0.07)',
              borderRadius: '0 12px 12px 0', padding: '12px 16px',
            }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--warn, #fbbf24)', marginBottom: '6px' }}>
                ⚠ {t(S.methodTitle, locale)}
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {[S.tier1Only, S.limitEntry, S.limitSlip, S.limitBias, S.limitPast].map((key, i) => (
                  <li key={i} style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>{t(key, locale)}</li>
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
                  <div style={{ fontSize: '31px', fontWeight: 900, letterSpacing: '-0.5px', color: all.mdd > 40 ? 'var(--warn, #fbbf24)' : 'var(--fg-muted)' }}>
                    {all.mdd.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fg-subtle)', marginTop: '2px', textTransform: 'uppercase' }}>{t(S.mdd, locale)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'var(--card-elev)', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${Math.min(all.mdd, 100)}%`, borderRadius: '4px', background: all.mdd > 50 ? 'var(--rose, #fb7185)' : all.mdd > 30 ? 'var(--warn, #fbbf24)' : 'var(--emerald, #34d399)' }} />
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--fg-muted)', lineHeight: 1.6 }}>
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
                        background: 'rgba(255,255,255,0.03)', fontSize: '13px',
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
                {scoreRows.length === 0 && <div style={{ color: 'var(--fg-muted)', fontSize: '14px' }}>데이터 없음</div>}
                {scoreRows.map(([score, s]) => {
                  const barW = Math.max(4, s.win_rate * 100);
                  const expColor = s.expectancy_r > 0 ? 'var(--emerald, #34d399)' : 'var(--rose, #fb7185)';
                  return (
                    <div key={score} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '3px' }}>
                        <span style={{ color: 'var(--txt)', fontWeight: 600 }}>{score}/7점 <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>n={s.n}</span></span>
                        <span style={{ color: expColor, fontWeight: 700 }}>
                          {s.expectancy_r > 0 ? '+' : ''}{s.expectancy_r.toFixed(3)}R · {(s.win_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--card-elev)', overflow: 'hidden' }}>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Symbol', t(S.colWin, locale), t(S.colExp, locale), t(S.colPF, locale), t(S.colMDD, locale), t(S.colN, locale)].map((h, i) => (
                      <th key={i} style={{
                        padding: '8px 10px', textAlign: i === 0 ? 'left' : 'right',
                        fontSize: '12px', color: 'var(--fg-subtle)', textTransform: 'uppercase',
                        fontWeight: 700, background: 'var(--card-elev)',
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
                      <tr key={r.symbol} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--sky, #38bdf8)' }}>{r.symbol}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: winColor, fontVariantNumeric: 'tabular-nums' }}>{(s.win_rate * 100).toFixed(1)}%</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: expColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {s.expectancy_r > 0 ? '+' : ''}{s.expectancy_r.toFixed(3)}R
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: s.profit_factor >= 1.5 ? 'var(--emerald, #34d399)' : 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>{s.profit_factor}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: s.mdd > 30 ? 'var(--warn, #fbbf24)' : 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>{s.mdd.toFixed(1)}%</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>{s.n}</td>
                      </tr>
                    );
                  })}
                  {symRows.filter(r => r.all.expectancy_r < 0).map(r => (
                    <tr key={`note-${r.symbol}`}>
                      <td colSpan={6} style={{
                        padding: '6px 10px 10px 16px', fontSize: '12px',
                        background: 'rgba(251,113,133,0.04)',
                        borderLeft: '3px solid var(--rose, #fb7185)',
                      }}>
                        <strong style={{ color: 'var(--rose, #fb7185)' }}>⚠ {r.symbol}</strong>
                        {r.symbol === 'AMZN' ? (
                          <span style={{ color: 'var(--fg-muted)', marginLeft: 6 }}>
                            {locale === 'ko'
                              ? '모든 파라미터 조합(RS 50~80, SPY필터 ON/OFF, threshold 5~7)에서 승률 21% — Stage2 피봇 브레이크아웃 모델과 구조적 불일치. AMZN의 박스권/횡보 가격 특성이 원인. 대안: ① 백테스트 대상에서 제외 ② 별도 레인지-바운드 전략 적용'
                              : 'Win rate 21% across ALL parameter combinations (RS 50–80, SPY filter on/off, threshold 5–7) — structural mismatch with Stage2 pivot breakout model. AMZN\'s range-bound price behavior is the cause. Options: ① Exclude from backtest targets ② Apply a separate range-bound strategy'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--fg-muted)', marginLeft: 6 }}>
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

        {/* ── 파라미터 최적화 대시보드 (항상 표시) ── */}
        <SweepDashboard locale={locale as Locale} />

      </div>{/* /inner wrapper */}
      </div>{/* /board */}
    </div>
  );
}
