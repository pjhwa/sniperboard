'use client';

import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { t } from '@/app/i18n';
import type { BiLang } from '@/app/i18n';
import { useSignalLog, useSignalLogStats, useRefreshSignalLog } from '@/hooks/useSignalLog';
import type { SignalLogEntry, SignalLogStats } from '@/hooks/useSignalLog';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { WatchlistItem } from '@/app/types';

// ── 정적 문자열 ──────────────────────────────────────────────────────────────
const S: Record<string, BiLang> = {
  title:         { en: 'Signal Tracker', ko: '신호 트래커' },
  subtitle:      { en: 'Live vs. Backtest Validation', ko: '실거래 vs. 백테스트 대조 검증' },
  methodNote:    { en: 'Every signal auto-logged. Every outcome tracked. No cherry-picking.',
                   ko: '모든 신호를 자동 기록하고 결과를 추적합니다. 선택적 공개 없음.' },
  refresh:       { en: 'Refresh Outcomes', ko: '결과 갱신' },
  refreshing:    { en: 'Refreshing…', ko: '갱신 중…' },
  modelHealth:   { en: 'Model Health', ko: '모델 헬스' },
  onTrack:       { en: 'ON TRACK', ko: '정상 작동' },
  watch:         { en: 'WATCH', ko: '주의 요망' },
  underperf:     { en: 'UNDERPERFORMING', ko: '성과 미달' },
  noData:        { en: 'INSUFFICIENT DATA', ko: '데이터 부족' },
  confidence:    { en: 'Confidence', ko: '신뢰도' },
  low:           { en: 'LOW (<30 trades)', ko: '낮음 (30건 미만)' },
  medium:        { en: 'MEDIUM (30–80)', ko: '보통 (30–80건)' },
  high:          { en: 'HIGH (80+)', ko: '높음 (80건+)' },
  tradesToGrow:  { en: 'Confidence grows as trades accumulate',
                   ko: '거래가 누적될수록 통계적 신뢰도가 높아집니다' },
  totalTrades:   { en: 'Total Signals', ko: '총 신호' },
  closed:        { en: 'closed', ko: '청산' },
  active:        { en: 'active', ko: '활성' },
  pending:       { en: 'pending', ko: '대기' },
  winRate:       { en: 'Win Rate', ko: '승률' },
  vsBt:          { en: 'vs backtest', ko: 'vs 백테스트' },
  expectancy:    { en: 'Expectancy', ko: '기대값' },
  profitFactor:  { en: 'Profit Factor', ko: '손익비' },
  mdd:           { en: 'Max DD', ko: '최대낙폭' },
  equityCurve:   { en: 'Cumulative R Curve', ko: '누적 R 수익 곡선' },
  liveLabel:     { en: 'Live', ko: '라이브' },
  btLabel:       { en: 'Backtest baseline', ko: '백테스트 기준선' },
  pipeline:      { en: 'Current Pipeline', ko: '현재 파이프라인' },
  noPipeline:    { en: 'No active or pending signals', ko: '활성/대기 신호 없음' },
  ipoRow:        { en: 'New IPO · Monitoring', ko: '신규 IPO · 모니터링' },
  ipoNote:       { en: 'Insufficient history — signal tracking begins when data accumulates',
                   ko: '데이터 부족 — 데이터 축적 후 신호 추적 시작' },
  history:       { en: 'Full Signal Log', ko: '전체 신호 기록' },
  noHistory:     { en: 'No signals yet', ko: '신호 없음' },
  symbol:        { en: 'Symbol', ko: '종목' },
  date:          { en: 'Date', ko: '날짜' },
  score:         { en: 'Score', ko: '점수' },
  entryP:        { en: 'Entry', ko: '진입가' },
  stopP:         { en: 'Stop', ko: '손절' },
  targetP:       { en: 'Target', ko: '목표' },
  statusL:       { en: 'Status', ko: '상태' },
  rMult:         { en: 'R Multiple', ko: 'R 배수' },
  regimeL:       { en: 'Regime', ko: '레짐' },
  regimeBreak:   { en: 'Performance by Regime', ko: '레짐별 성과' },
  nTrades:       { en: 'trades', ko: '건' },
  noRegime:      { en: 'No regime data yet', ko: '레짐 데이터 없음' },
  btBaseline:    { en: 'Backtest Baseline', ko: '백테스트 기준' },
  winRateShort:  { en: 'Win Rate', ko: '승률' },
  expR:          { en: 'Exp. R', ko: '기대값 R' },
  pfLabel:       { en: 'PF', ko: '손익비' },
  avgWin:        { en: 'Avg Win', ko: '평균 수익' },
  avgLoss:       { en: 'Avg Loss', ko: '평균 손실' },
  barsHeld:      { en: 'Bars', ko: '보유일' },
};

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
function fmtR(v: number | null | undefined): string {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}R`;
}
function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}
function fmtDelta(v: number | null | undefined, isR = true): string {
  if (v == null) return '';
  const sign = v > 0 ? '▲+' : (v < 0 ? '▼' : '');
  return isR ? `${sign}${v.toFixed(3)}R` : `${sign}${(v * 100).toFixed(1)}pp`;
}
function statusColor(status: string): string {
  if (status === 'WIN')       return 'var(--bull)';
  if (status === 'LOSS')      return 'var(--bear)';
  if (status === 'TIMEOUT')   return 'var(--warn)';
  if (status === 'ACTIVE')    return 'var(--teal)';
  if (status === 'PENDING')   return 'var(--info)';
  if (status === 'CANCELLED') return 'var(--em-500)';
  return 'var(--fg)';
}
function healthColor(status: string): string {
  if (status === 'ON_TRACK')       return 'var(--bull)';
  if (status === 'WATCH')          return 'var(--warn)';
  if (status === 'UNDERPERFORMING') return 'var(--bear)';
  return 'var(--em-500)';
}

// ── 자산곡선 SVG ─────────────────────────────────────────────────────────────
function EquityCurveSVG({ stats, locale }: { stats: SignalLogStats; locale: string }) {
  const live = stats.equity_curve;
  const bsl  = stats.backtest_baseline;

  // 백테스트 기준 점선 생성 (n_closed 개 포인트, expectancy_r 기울기)
  const n = Math.max(live.length, 2);
  const btCurve = Array.from({ length: n }, (_, i) => ({
    trade_n: i + 1,
    equity:  bsl.expectancy_r * (i + 1),
  }));

  const allEquities = [
    ...live.map(p => p.equity),
    ...btCurve.map(p => p.equity),
    0,
  ];
  const minEq = Math.min(...allEquities);
  const maxEq = Math.max(...allEquities);
  const range = maxEq - minEq || 1;

  const W = 600, H = 160, PL = 44, PR = 12, PT = 10, PB = 24;
  const gW = W - PL - PR;
  const gH = H - PT - PB;

  function xPos(tradeN: number): number {
    return PL + ((tradeN - 1) / Math.max(n - 1, 1)) * gW;
  }
  function yPos(eq: number): number {
    return PT + (1 - (eq - minEq) / range) * gH;
  }

  const livePoints = live.map(p => `${xPos(p.trade_n)},${yPos(p.equity)}`).join(' ');
  const btPoints   = btCurve.map(p => `${xPos(p.trade_n)},${yPos(p.equity)}`).join(' ');
  const zeroY      = yPos(0);
  const healthCol  = healthColor(stats.health.status);

  // y축 눈금 (3개)
  const ticks = [maxEq, (maxEq + minEq) / 2, minEq].map(v => ({
    v,
    y: yPos(v),
    label: v >= 0 ? `+${v.toFixed(1)}R` : `${v.toFixed(1)}R`,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* 격자 */}
      {ticks.map((tk, i) => (
        <g key={i}>
          <line x1={PL} y1={tk.y} x2={W - PR} y2={tk.y}
                stroke="var(--border)" strokeDasharray="4 3" strokeWidth="0.5" />
          <text x={PL - 4} y={tk.y + 4} textAnchor="end"
                fontSize="10" fill="var(--em-500)">{tk.label}</text>
        </g>
      ))}
      {/* 기준선 (0R) */}
      <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY}
            stroke="var(--border)" strokeWidth="1" />

      {/* 백테스트 기준선 (점선) */}
      {btCurve.length >= 2 && (
        <polyline points={btPoints}
                  fill="none" stroke="var(--em-500)" strokeWidth="1.5"
                  strokeDasharray="6 4" opacity="0.5" />
      )}

      {/* 라이브 곡선 */}
      {live.length >= 2 && (
        <>
          <polyline points={livePoints}
                    fill="none" stroke={healthCol} strokeWidth="2.5" />
          {/* 마지막 포인트 강조 */}
          <circle cx={xPos(live[live.length - 1].trade_n)}
                  cy={yPos(live[live.length - 1].equity)}
                  r="4" fill={healthCol} />
        </>
      )}
      {live.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle"
              fontSize="12" fill="var(--em-500)">
          {locale === 'ko' ? '아직 청산된 거래가 없습니다' : 'No closed trades yet'}
        </text>
      )}

      {/* 범례 */}
      <g transform={`translate(${PL + 8},${PT + 6})`}>
        <line x1="0" y1="5" x2="20" y2="5" stroke={healthCol} strokeWidth="2" />
        <text x="24" y="9" fontSize="10" fill="var(--fg)">
          {locale === 'ko' ? '라이브' : 'Live'}
        </text>
        <line x1="60" y1="5" x2="80" y2="5" stroke="var(--em-500)"
              strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="84" y="9" fontSize="10" fill="var(--em-500)">
          {locale === 'ko' ? '백테스트 기준' : 'BT baseline'}
        </text>
      </g>
    </svg>
  );
}

// ── 메인 보드 ─────────────────────────────────────────────────────────────────
export function TrackBoard() {
  const { locale } = useStore();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: logData,   isLoading: logLoading }   = useSignalLog();
  const { data: stats,     isLoading: statsLoading }  = useSignalLogStats();
  const { mutate: refresh, isPending: refreshing }    = useRefreshSignalLog();
  const { watchlist: wlItems }                        = useWatchlist();

  const lc = locale === 'en' ? 'en' : 'ko';
  const tl = (b: BiLang) => t(b, lc);

  // 헬스 텍스트 + 색상
  const healthStatus = stats?.health?.status ?? 'INSUFFICIENT_DATA';
  const healthLabel  = {
    ON_TRACK: tl(S.onTrack),
    WATCH: tl(S.watch),
    UNDERPERFORMING: tl(S.underperf),
    INSUFFICIENT_DATA: tl(S.noData),
  }[healthStatus] ?? tl(S.noData);
  const hColor = healthColor(healthStatus);

  const confidenceLabel = {
    LOW:    tl(S.low),
    MEDIUM: tl(S.medium),
    HIGH:   tl(S.high),
  }[stats?.health?.confidence ?? 'LOW'] ?? tl(S.low);

  // 전체 엔트리 (DB 조회 결과)
  const allEntries = logData?.entries ?? [];

  // 파이프라인: allEntries에서 PENDING/ACTIVE 필터 (stats.pipeline은 LIMIT 10이라 부족)
  const pipelineEntries = allEntries
    .filter(e => e.status === 'PENDING' || e.status === 'ACTIVE')
    .sort((a, b) => b.stage2_score - a.stage2_score);

  // 신규 IPO 심볼: 워치리스트에서 entry=0인 종목 (데이터 부족 종목)
  const trackedSymbols = new Set(allEntries.map(e => e.symbol));
  const ipoSymbols = (wlItems ?? [])
    .filter((item: WatchlistItem) => item.entry === 0 && !trackedSymbols.has(item.symbol))
    .map((item: WatchlistItem) => item.symbol);

  // 전체 신호 기록 필터 (PENDING/ACTIVE 포함)
  const filteredEntries = statusFilter === 'ALL'
    ? allEntries
    : allEntries.filter(e => e.status === statusFilter);

  const bsl = stats?.backtest_baseline;

  return (
    <div className="board-wrap">
      <div className="board" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px 32px' }}>

        {/* ── 헤더 ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{tl(S.title)}</h2>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>{tl(S.subtitle)}</div>
          </div>
          <button
            className="btn"
            onClick={() => refresh()}
            disabled={refreshing}
            style={{ fontSize: 13, padding: '6px 14px' }}
          >
            {refreshing ? tl(S.refreshing) : tl(S.refresh)}
          </button>
        </div>

        {/* ── 방법론 배너 ───────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--em-soft)', border: '1px solid color-mix(in srgb, var(--em-500) 20%, transparent)',
          borderRadius: 'var(--r-md)', padding: '10px 14px',
          fontSize: 12, color: 'var(--em-600)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>🔍</span>
          <span>{tl(S.methodNote)}</span>
          {bsl && (
            <span style={{ marginLeft: 'auto', color: 'var(--em-600)', whiteSpace: 'nowrap' }}>
              {lc === 'ko' ? '백테스트 기준' : 'BT baseline'}: +{bsl.expectancy_r}R · {(bsl.win_rate * 100).toFixed(1)}% · {bsl.n}{lc === 'ko' ? '건' : ' trades'}
            </span>
          )}
        </div>

        {/* ── 모델 헬스 배너 ────────────────────────────────────────────── */}
        {!statsLoading && stats && (
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${hColor}`,
            borderRadius: 10,
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)', marginBottom: 4 }}>{tl(S.modelHealth)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: hColor, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 18, fontWeight: 700, color: hColor }}>{healthLabel}</span>
              </div>
            </div>
            {stats.expectancy_r !== null && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)', marginBottom: 4 }}>{tl(S.expectancy)}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                  {fmtR(stats.expectancy_r)}
                  {stats.health.expectancy_delta !== null && (
                    <span style={{
                      fontSize: 13, marginLeft: 6,
                      color: (stats.health.expectancy_delta ?? 0) >= 0 ? 'var(--bull)' : 'var(--bear)',
                    }}>
                      {fmtDelta(stats.health.expectancy_delta)}
                    </span>
                  )}
                </div>
              </div>
            )}
            {stats.win_rate !== null && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)', marginBottom: 4 }}>{tl(S.winRate)}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                  {fmtPct(stats.win_rate)}
                  {stats.health.win_rate_delta !== null && (
                    <span style={{
                      fontSize: 13, marginLeft: 6,
                      color: (stats.health.win_rate_delta ?? 0) >= 0 ? 'var(--bull)' : 'var(--bear)',
                    }}>
                      {fmtDelta(stats.health.win_rate_delta, false)}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {tl(S.confidence)}: <strong style={{ color: 'var(--fg)' }}>{confidenceLabel}</strong>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{tl(S.tradesToGrow)}</div>
            </div>
          </div>
        )}

        {/* ── KPI 4카드 ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
             className="mob-wrap">
          {/* 총 신호 */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="kpi__label">{tl(S.totalTrades)}</div>
            <div className="kpi__val" style={{ fontSize: 28 }}>{stats?.n_total ?? '—'}</div>
            <div className="kpi__sub">
              {stats?.n_closed ?? 0} {tl(S.closed)} · {stats?.n_active ?? 0} {tl(S.active)} · {stats?.n_pending ?? 0} {tl(S.pending)}
            </div>
          </div>

          {/* 승률 */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="kpi__label">{tl(S.winRate)}</div>
            <div className="kpi__val" style={{ fontSize: 28, color: stats?.win_rate ? (stats.win_rate >= 0.35 ? 'var(--bull)' : 'var(--bear)') : undefined }}>
              {fmtPct(stats?.win_rate)}
            </div>
            {bsl && <div className="kpi__sub">{tl(S.vsBt)} {fmtPct(bsl.win_rate)}</div>}
          </div>

          {/* 기대값 */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="kpi__label">{tl(S.expectancy)}</div>
            <div className="kpi__val" style={{ fontSize: 28, color: stats?.expectancy_r ? ((stats.expectancy_r ?? 0) >= 0 ? 'var(--bull)' : 'var(--bear)') : undefined }}>
              {fmtR(stats?.expectancy_r)}
            </div>
            {bsl && <div className="kpi__sub">{tl(S.vsBt)} +{bsl.expectancy_r}R</div>}
          </div>

          {/* 손익비 + MDD */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="kpi__label">{tl(S.profitFactor)}</div>
            <div className="kpi__val" style={{ fontSize: 28 }}>
              {stats?.profit_factor?.toFixed(2) ?? '—'}
            </div>
            <div className="kpi__sub">{tl(S.mdd)}: {stats?.mdd != null ? `${stats.mdd.toFixed(1)}%` : '—'}</div>
          </div>
        </div>

        {/* ── 자산곡선 ──────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card__hd" style={{ marginBottom: 8 }}>
            <h3>{tl(S.equityCurve)}</h3>
            {stats && (
              <small>
                {stats.wins}W / {stats.losses}L / {stats.timeouts}T
                {stats.avg_win_r != null && stats.avg_loss_r != null && (
                  <> · avg {fmtR(stats.avg_win_r)} / {fmtR(stats.avg_loss_r)}</>
                )}
              </small>
            )}
          </div>
          {stats ? (
            <EquityCurveSVG stats={stats} locale={lc} />
          ) : (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
              {statsLoading ? (lc === 'ko' ? '로딩 중…' : 'Loading…') : '—'}
            </div>
          )}
        </div>

        {/* ── 현재 파이프라인 + 레짐별 성과 (2fr + 1fr) ────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'start' }}
             className="mob-wrap">

          {/* 파이프라인 — compact 테이블 */}
          <div className="card">
            <div className="card__hd" style={{ marginBottom: 8 }}>
              <h3>{tl(S.pipeline)}</h3>
              <small>
                {pipelineEntries.length}{lc === 'ko' ? '건' : ' signals'}
                {ipoSymbols.length > 0 && (
                  <span style={{ marginLeft: 6, color: 'var(--warn)' }}>
                    + {ipoSymbols.length} IPO
                  </span>
                )}
              </small>
            </div>
            {pipelineEntries.length === 0 && ipoSymbols.length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '8px 0' }}>{tl(S.noPipeline)}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl" style={{ minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th>{tl(S.symbol)}</th>
                      <th>{tl(S.score)}</th>
                      <th>{tl(S.entryP)}</th>
                      <th>{tl(S.stopP)}</th>
                      <th>{tl(S.targetP)}</th>
                      <th>{tl(S.statusL)}</th>
                      <th>{tl(S.date)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineEntries.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700 }}>{item.symbol}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: item.stage2_score >= 6 ? 'var(--bull)' : 'var(--fg)' }}>
                            {item.stage2_score}/7
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>${item.entry.toFixed(2)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bear)' }}>${item.stop.toFixed(2)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bull)' }}>${item.target.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${item.status === 'ACTIVE' ? 'teal' : 'info'}`} style={{ fontSize: 10 }}>
                            {item.status === 'ACTIVE' ? (lc === 'ko' ? '활성' : 'ACTIVE') : (lc === 'ko' ? '대기' : 'PENDING')}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{item.signal_date}</td>
                      </tr>
                    ))}
                    {/* 신규 IPO 모니터링 행 */}
                    {ipoSymbols.map((sym: string) => (
                      <tr key={`ipo-${sym}`} style={{ opacity: 0.7 }}>
                        <td style={{ fontWeight: 700 }}>{sym}</td>
                        <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--fg-subtle)' }}>—</td>
                        <td colSpan={3} style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>
                          {tl(S.ipoNote)}
                        </td>
                        <td>
                          <span className="badge warn" style={{ fontSize: 10 }}>IPO</span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 레짐별 성과 */}
          <div className="card">
            <div className="card__hd" style={{ marginBottom: 8 }}>
              <h3>{tl(S.regimeBreak)}</h3>
            </div>
            {!stats || Object.keys(stats.regime_breakdown).length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '8px 0' }}>{tl(S.noRegime)}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(stats.regime_breakdown).map(([regime, data]) => {
                  const expR = data.expectancy_r ?? 0;
                  const col  = expR > 0 ? 'var(--bull)' : 'var(--bear)';
                  return (
                    <div key={regime}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{regime}</span>
                        <span style={{ color: col, fontWeight: 700 }}>{fmtR(data.expectancy_r)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                        {data.n}{tl(S.nTrades)} · {fmtPct(data.win_rate)}
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 4 }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${Math.min(100, Math.abs(expR) * 40)}%`,
                          background: col, transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 전체 신호 기록 (PENDING 포함) ────────────────────────────── */}
        <div className="card">
          <div className="card__hd" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <h3>{tl(S.history)}</h3>
            <small style={{ color: 'var(--fg-subtle)' }}>{allEntries.length}{lc === 'ko' ? '건' : ' total'}</small>
            {/* 상태 필터 */}
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {(['ALL', 'PENDING', 'ACTIVE', 'WIN', 'LOSS', 'TIMEOUT', 'CANCELLED'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: statusFilter === s ? statusColor(s === 'ALL' ? 'ACTIVE' : s) : 'var(--border)',
                    color: statusFilter === s ? 'var(--bg)' : 'var(--fg-muted)',
                    fontWeight: 600,
                  }}
                >
                  {s === 'ALL' ? (lc === 'ko' ? '전체' : 'ALL') : s}
                </button>
              ))}
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '8px 0' }}>{tl(S.noHistory)}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>{tl(S.symbol)}</th>
                    <th>{tl(S.date)}</th>
                    <th>{tl(S.score)}</th>
                    <th>{tl(S.entryP)}</th>
                    <th>{tl(S.stopP)}</th>
                    <th>{tl(S.targetP)}</th>
                    <th>{tl(S.statusL)}</th>
                    <th>{tl(S.rMult)}</th>
                    <th>{tl(S.regimeL)}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.slice(0, 200).map(entry => (
                    <tr key={entry.id} style={{
                      background: entry.status === 'WIN'  ? 'color-mix(in srgb, var(--bull) 5%, transparent)'
                                : entry.status === 'LOSS' ? 'color-mix(in srgb, var(--bear) 5%, transparent)'
                                : undefined
                    }}>
                      <td style={{ fontWeight: 700 }}>{entry.symbol}</td>
                      <td style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>{entry.signal_date}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: entry.stage2_score >= 6 ? 'var(--bull)' : 'var(--fg)' }}>
                          {entry.stage2_score}/7
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>${entry.entry.toFixed(2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bear)' }}>${entry.stop.toFixed(2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bull)' }}>${entry.target.toFixed(2)}</td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 700, color: statusColor(entry.status) }}>
                          {entry.status === 'WIN'       ? '✓ WIN'
                         : entry.status === 'LOSS'      ? '✗ LOSS'
                         : entry.status === 'TIMEOUT'   ? '⏱ TIMEOUT'
                         : entry.status === 'CANCELLED' ? '✕ CANCEL'
                         : entry.status === 'ACTIVE'    ? '● ACTIVE'
                         : '○ PENDING'}
                        </span>
                        {entry.exit_date && (
                          <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{entry.exit_date}</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: (entry.r_multiple ?? 0) > 0 ? 'var(--bull)' : (entry.r_multiple ?? 0) < 0 ? 'var(--bear)' : 'var(--em-500)' }}>
                        {fmtR(entry.r_multiple)}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--em-500)' }}>{entry.regime ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
