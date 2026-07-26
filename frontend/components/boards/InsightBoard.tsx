'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useInsight } from '@/hooks/useInsight';
import { Card } from '@/components/ui/Card';
import { t } from '@/app/i18n';
import type { BiLang } from '@/app/i18n';

const S: Record<string, BiLang> = {
  title:       { en: 'Insight Lab', ko: '통찰 랩' },
  subtitle:    { en: 'Historical edge checks across social, AI brief, macro — prove, do not preach', ko: '소셜·AI 브리프·매크로 교차 검증 — 단정하지 않고 증명합니다' },
  loading:     { en: 'Building insight tables… (first load may take ~30s)', ko: '통찰 테이블 생성 중… (최초 약 30초)' },
  error:       { en: 'Failed to load insight data', ko: '통찰 데이터 로드 실패' },
  disclaimer:  { en: 'Disclaimer', ko: '고지' },
  integrity:   { en: 'Integrity', ko: '정합 검증' },
  integrityOk: { en: 'Checks passed', ko: '검증 통과' },
  integrityFail: { en: 'Checks failed', ko: '검증 실패' },
  source:      { en: 'Source coverage', ko: '데이터 커버리지' },
  window:      { en: 'Window', ko: '윈도우' },
  horizon:     { en: 'Action horizon', ko: 'Action 선행일' },
  events:      { en: 'events', ko: '이벤트' },
  method:      { en: 'Method', ko: '방법' },
  contrast:    { en: 'Contrast (bullish vs none @ 5d)', ko: '대비 (bullish vs none · 5일)' },
  briefSrc:    { en: 'Daily Brief (post_close)', ko: 'Daily Brief (장후)' },
  briefingSrc: { en: 'Morning Briefing', ko: '아침 브리핑' },
  action:      { en: 'Action', ko: 'Action' },
  n:           { en: 'n', ko: 'n' },
  avgRet:      { en: 'Avg return', ko: '평균 수익' },
  dirHit:      { en: 'Directional hit', ko: '방향 적중' },
  conf:        { en: 'Confidence', ko: '신뢰도' },
  theme:       { en: 'Theme', ko: '테마' },
  days:        { en: 'Days', ko: '일수' },
  streak:      { en: 'Max streak', ko: '최장 연속' },
  range:       { en: 'First → Last', ko: '최초 → 최근' },
  spyCo:       { en: 'SPY same-day avg', ko: 'SPY 당일 평균' },
  current:     { en: 'Current judgment', ko: '현재 판단' },
  transitions: { en: 'Recent transitions', ko: '최근 전환' },
  prePost:     { en: 'Pre-open → Post-close mood shift', ko: '장전 → 장후 심리 변화' },
  avgDelta:    { en: 'Avg Δ composite', ko: '평균 Δ composite' },
  improved:    { en: 'Improved rate', ko: '개선 비율' },
  noEdge:      { en: 'No historical edge vs control in this window — shown honestly.', ko: '이 구간에서 통제군 대비 우위 없음 — 있는 그대로 표시.' },
  hasEdge:     { en: 'Bullish divergence beat control on avg 5d return in this window.', ko: '이 구간에서 bullish 다이버전스가 통제군 대비 5일 평균 우세.' },
  // Summary section
  detailShow:  { en: 'Show full data ▼', ko: '상세 데이터 보기 ▼' },
  detailHide:  { en: 'Collapse ▲', ko: '접기 ▲' },
  lowSample:   { en: '⚠ Small sample — treat with caution', ko: '⚠ 표본 부족 — 해석에 주의하세요' },
  // MVP card questions
  mvp1q:  { en: "Did 'bullish' social signals lead to higher returns?", ko: "소셜 '강세' 신호 이후 주가가 더 올랐나요?" },
  mvp2q:  { en: "How often were AI 'buy' / 'avoid' calls correct?", ko: "AI '매수'·'회피' 추천은 얼마나 맞았나요?" },
  mvp3q:  { en: "Which themes dominated the market narrative recently?", ko: "요즘 시장에서 가장 자주 언급된 주제는?" },
  mvp4aq: { en: "What is the current macroeconomic environment?", ko: "지금 거시경제는 어떤 국면인가요?" },
  mvp4bq: { en: "Does market mood improve from morning open to market close?", ko: "장 시작과 마감, 시장 심리는 어떻게 달라지나요?" },
  // Hero KPI labels
  heroEdge:      { en: 'Bullish vs None Edge', ko: 'Bullish vs None 우위' },
  heroBuyHit:    { en: 'Buy Hit-Rate', ko: 'Buy 적중률' },
  heroAvoidHit:  { en: 'Avoid Hit-Rate', ko: 'Avoid 적중률' },
  heroMacro:     { en: 'Macro', ko: '매크로' },
  heroPrePost:   { en: 'Pre→Post Δ', ko: '장전→장후 Δ' },
  heroIntegrity: { en: 'Integrity', ko: '정합' },
  // MVP titles
  mvp1: { en: 'MVP-1 · Social Signal → Forward Return', ko: 'MVP-1 · 소셜 신호 → 이후 수익' },
  mvp2: { en: 'MVP-2 · AI Recommendation Accuracy', ko: 'MVP-2 · AI 추천 적중률' },
  mvp3: { en: 'MVP-3 · Recurring Market Themes', ko: 'MVP-3 · 반복 시장 테마' },
  mvp4: { en: 'MVP-4 · Macro Environment & Mood Shift', ko: 'MVP-4 · 거시환경 · 심리 변화' },
};

function pct(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}
function confCls(c: string): string {
  if (c === 'HIGH') return 'bull';
  if (c === 'MEDIUM') return 'teal';
  if (c === 'LOW') return 'warn';
  return 'neutral';
}
function retColor(v: number | null | undefined): string {
  if (v == null) return 'var(--fg-subtle)';
  if (v > 0) return 'var(--bull)';
  if (v < 0) return 'var(--bear)';
  return 'var(--fg)';
}

// 거시경제 국면 한국어/영어 표현
function judgmentText(j: string | null | undefined, ko: boolean): string {
  if (!j) return '—';
  const map: Record<string, [string, string]> = {
    RISK_ON:      ['위험 선호(Risk-On)', 'Risk-On'],
    RISK_OFF:     ['위험 회피(Risk-Off)', 'Risk-Off'],
    MIXED:        ['혼조(Mixed)', 'Mixed'],
    CONSTRUCTIVE: ['건설적(Constructive)', 'Constructive'],
    DEFENSIVE:    ['방어적(Defensive)', 'Defensive'],
  };
  const e = map[j];
  return e ? (ko ? e[0] : e[1]) : j;
}

// "상세 데이터 보기 ▼ / 접기 ▲" 공용 버튼
function DetailToggle({ open, onToggle, locale }: { open: boolean; onToggle: () => void; locale: string }) {
  const ko = locale === 'ko';
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', marginTop: 14,
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 6, padding: '8px 0',
        cursor: 'pointer', color: 'var(--fg-subtle)',
        fontSize: 12, fontFamily: 'inherit',
        transition: 'background 0.15s',
      }}
    >
      {open ? (ko ? '접기 ▲' : 'Collapse ▲') : (ko ? '상세 데이터 보기 ▼' : 'Show full data ▼')}
    </button>
  );
}

// 요약 섹션 공통 레이아웃
function SummarySection({
  question, children, warning,
}: {
  question: string;
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div style={{ paddingBottom: 14, marginBottom: 4, borderBottom: '1px solid var(--border-soft)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 10 }}>
        {question}
      </div>
      {children}
      {warning && (
        <span className="badge warn" style={{ fontSize: 11, marginTop: 8, display: 'inline-block' }}>
          ⚠ {/* text passed via children or a prop */}
        </span>
      )}
    </div>
  );
}

export function InsightBoard() {
  const { locale } = useStore();
  const [days, setDays] = useState(60);
  const [horizon, setHorizon] = useState(5);
  const { data, isLoading, isError, refetch } = useInsight(days, horizon);
  const ko = locale === 'ko';

  // detail expand state per section
  const [exp1, setExp1] = useState(false);
  const [exp2, setExp2] = useState(false);
  const [exp3, setExp3] = useState(false);
  const [exp4, setExp4] = useState(false);

  if (isLoading && !data) {
    return (
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr', alignContent: 'start' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--fg-muted)' }}>
          {t(S.loading, locale)}
        </div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ color: 'var(--bear)', marginBottom: 12 }}>{t(S.error, locale)}</div>
          <button className="btn" onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  // ── 데이터 추출 ──────────────────────────────────────────────
  const d1 = data.mvp1_divergence;
  const contrast = d1.contrast_bullish_vs_none_5d;
  const edgeDelta = contrast.delta_a_minus_b;
  const edgePositive = (edgeDelta ?? 0) > 0;
  const spyBaseline = d1.spy_baseline_5d;
  const regimeCtx = d1.regime_context;

  const buyRow   = data.mvp2_actions.brief.by_action.find((r) => r.action === 'buy');
  const avoidRow = data.mvp2_actions.brief.by_action.find((r) => r.action === 'avoid');
  const buyHit   = buyRow?.scored_directionally   ? buyRow.directional_hit_rate   : null;
  const avoidHit = avoidRow?.scored_directionally ? avoidRow.directional_hit_rate : null;

  const topTheme = data.mvp3_themes.themes[0] ?? null;

  const macro = data.mvp4_macro;
  const pp    = data.mvp4_pre_post;
  const ppImprovedN = pp.improved_rate != null ? Math.round(pp.improved_rate * pp.n_days) : null;

  // ── 평서문 생성 ──────────────────────────────────────────────
  const edgeAbsPct = pct(edgeDelta != null ? Math.abs(edgeDelta) : null);
  // SPY 베이스라인 컨텍스트 문장
  const spyAvg = spyBaseline?.avg_return;
  const spyCtxSuffix = spyAvg != null
    ? ko
      ? ` 참고로 같은 가격 기간 동안 SPY 무조건 5일 수익은 평균 ${pct(spyAvg)}였습니다 — 시장 전체 방향이 기준값에 영향을 줍니다.`
      : ` For context, SPY's unconditional 5-day return over the price window averaged ${pct(spyAvg)} — overall market direction affects all baselines.`
    : '';
  const mvp1Body = ko
    ? edgePositive
      ? `분석 기간(${days}일) 동안 소셜 분석에서 '강세(bullish)' 신호가 나온 날 기준 5일 후 평균 수익이, 신호 없는 날보다 ${pct(edgeDelta)} 높았습니다. (강세 ${contrast.n_a}회, 신호 없음 ${contrast.n_b}회 비교)${spyCtxSuffix}`
      : `분석 기간(${days}일) 동안 오히려 '강세' 신호가 나온 날이 신호 없는 날보다 5일 후 평균 ${edgeAbsPct} 낮은 수익을 보였습니다. 이 기간에는 강세 신호에 통계적 우위가 없었습니다. (강세 ${contrast.n_a}회, 신호 없음 ${contrast.n_b}회 비교)${spyCtxSuffix}`
    : edgePositive
      ? `Over the ${days}-day window, 'bullish' social signals averaged ${pct(edgeDelta)} higher 5-day return than the no-signal control group. (bullish: ${contrast.n_a} events vs none: ${contrast.n_b} events)${spyCtxSuffix}`
      : `In this ${days}-day window, days with a 'bullish' signal actually averaged ${edgeAbsPct} lower 5-day return than the no-signal control group — no statistical edge found. (bullish: ${contrast.n_a} events vs none: ${contrast.n_b} events)${spyCtxSuffix}`;

  const mvp1Warn = contrast.n_a < 30 || contrast.n_b < 30;

  const buyAbove50 = buyHit != null && buyHit >= 0.5;
  const avoidAbove50 = avoidHit != null && avoidHit >= 0.5;
  const mvp2Body = ko
    ? `AI 데일리 브리프가 '매수'를 권고했을 때 총 ${buyRow?.n ?? 0}회 중 ${pct(buyHit, 0)}가 ${data.action_horizon_days}일 후 실제로 올랐습니다${!buyAbove50 ? ' — 절반에 미치지 못해 이 기간에는 매수 신호의 방향성 우위가 없었습니다' : ''}. '회피'는 총 ${avoidRow?.n ?? 0}회 중 ${pct(avoidHit, 0)}가 실제로 하락했습니다${avoidAbove50 ? ' — 절반 이상 맞았습니다' : ''}.`
    : `AI Daily Brief 'buy' calls: ${pct(buyHit, 0)} of ${buyRow?.n ?? 0} were correct ${data.action_horizon_days}d later${!buyAbove50 ? ' — below 50%, no directional edge in this window' : ''}. 'Avoid' calls: ${pct(avoidHit, 0)} of ${avoidRow?.n ?? 0} were correct${avoidAbove50 ? ' — above 50%' : ''}.`;

  const mvp2Warn = buyRow?.confidence === 'LOW' || avoidRow?.confidence === 'LOW';

  const mvp3Body = topTheme
    ? ko
      ? `분석 기간(${days}일) 동안 AI 브리프에서 가장 오래 반복된 주제는 '${topTheme.theme}'입니다. 총 ${topTheme.count_days}일 등장했고 최대 ${topTheme.max_streak_days}일 연속 언급되었습니다.${topTheme.spy_same_day_stats ? ` 해당 날의 S&P500 평균 수익은 ${pct(topTheme.spy_same_day_stats.avg_return)}입니다 (관찰값, 인과관계 아님).` : ''}`
      : `The most frequently recurring topic in AI briefs over the ${days}-day window: '${topTheme.theme}'. Appeared on ${topTheme.count_days} days with a max streak of ${topTheme.max_streak_days} consecutive days.${topTheme.spy_same_day_stats ? ` SPY avg return on those days: ${pct(topTheme.spy_same_day_stats.avg_return)} (observational, not causal).` : ''}`
    : ko
      ? '분석 기간에 반복 테마가 충분히 쌓이지 않았습니다.'
      : 'Not enough recurring themes found in this analysis window.';

  const mvp4aBody = ko
    ? `현재 거시경제는 '${judgmentText(macro.current_judgment, true)}' 국면입니다. 분석 기간(${days}일) 중 ${macro.n_transitions}번 국면이 바뀌었습니다.`
    : `The current macro environment is '${judgmentText(macro.current_judgment, false)}'. There were ${macro.n_transitions} regime transitions over the ${days}-day window.`;

  const ppMajorityImproved = (pp.improved_rate ?? 0) >= 0.5;
  const mvp4bBody = ko
    ? `장 시작 전과 마감 후 심리를 비교하면 하루 동안 평균 ${pp.avg_delta != null ? (pp.avg_delta > 0 ? '+' : '') + pp.avg_delta.toFixed(2) : '—'} 포인트 변화가 있었습니다. ${pp.n_days}일 중 ${ppImprovedN ?? '—'}일(${pct(pp.improved_rate, 0)})은 장 마감 심리가 개선되었고, 나머지 ${pp.n_days - (ppImprovedN ?? 0)}일은 악화되거나 변화 없었습니다.${!ppMajorityImproved ? ' 이 기간에는 장 중 심리가 더 자주 나빠졌습니다.' : ''}`
    : `From pre-open to post-close, sentiment shifted an average of ${pp.avg_delta != null ? (pp.avg_delta > 0 ? '+' : '') + pp.avg_delta.toFixed(2) : '—'} points per day. ${ppImprovedN ?? '—'} of ${pp.n_days} days (${pct(pp.improved_rate, 0)}) saw improvement; the remaining ${pp.n_days - (ppImprovedN ?? 0)} days saw deterioration or no change.${!ppMajorityImproved ? ' Mood more often worsened during the day in this window.' : ''}`;

  const mvp4bWarn = pp.confidence === 'LOW';

  // ── 렌더 ─────────────────────────────────────────────────────
  return (
    <div className="board-wrap">
      <div className="board" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 32px' }}>

        {/* ── 헤더 + 컨트롤 ── */}
        <div className="mob-order-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{t(S.title, locale)}</h2>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{t(S.subtitle, locale)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {t(S.window, locale)}
              <select value={days} onChange={(e) => setDays(Number(e.target.value))}
                style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', minHeight: 44 }}>
                {[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d}d</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {t(S.horizon, locale)}
              <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}
                style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', minHeight: 44 }}>
                {[3, 5, 10].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <button className="btn" style={{ fontSize: 12, padding: '6px 14px', minHeight: 44 }} onClick={() => refetch()}>
              {ko ? '새로고침' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── 고지 (접기) ── */}
        <details className="mob-collapse mob-order-3" open style={{ height: 'auto' }}>
          <summary style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {t(S.disclaimer, locale)}
          </summary>
          <div className="mob-collapse-body">
            <div style={{ background: 'var(--warn-soft)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 12.5, color: 'var(--fg)', lineHeight: 1.55 }}>
              <strong>{t(S.disclaimer, locale)}:</strong>{' '}
              {ko ? data.disclaimer_ko : data.disclaimer_en}
            </div>
          </div>
        </details>

        {/* ── 정합 + 소스 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mob-wrap mob-order-2">
          <Card title={t(S.integrity, locale)} action={data.integrity.passed ? t(S.integrityOk, locale) : t(S.integrityFail, locale)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className={`badge ${data.integrity.passed ? 'bull' : 'bear'}`}>
                fail {data.integrity.fail_count} · warn {data.integrity.warn_count}
              </span>
            </div>
            {(data.integrity.issues || []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
                {ko ? '카운트 일관성·가격 커버리지·히스토리 로드 검사 통과.' : 'Count consistency, price coverage, and history load checks passed.'}
              </div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5 }}>
                {data.integrity.issues.map((i) => (
                  <li key={i.code} style={{ color: i.severity === 'fail' ? 'var(--bear)' : 'var(--warn)', marginBottom: 4 }}>
                    [{i.code}] {ko ? i.message_ko : i.message_en}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t(S.source, locale)} action={`${data.source.build_ms}ms`}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12.5 }}>
              <div>sentiment <strong>{data.source.sentiment_snapshots}</strong></div>
              <div>brief <strong>{data.source.brief_snapshots}</strong></div>
              <div>macro <strong>{data.source.macro_snapshots}</strong></div>
              <div>briefing <strong>{data.source.briefing_snapshots}</strong></div>
              <div>prices <strong>{data.source.price_symbols}</strong> symbols</div>
              <div style={{ gridColumn: 'span 2', color: 'var(--fg-subtle)', fontSize: 11 }}>
                {data.source.insight_data_root ? `root: ${data.source.insight_data_root}` : 'source: GitHub raw history'}
              </div>
            </div>
          </Card>
        </div>

        {/* ── Mobile Hero KPI ── */}
        <div className="mob-show mob-order-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: edgePositive ? 'var(--bull-soft)' : 'var(--bg-subtle)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroEdge, locale)}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: retColor(edgeDelta) }}>{pct(edgeDelta)}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3 }}>n={contrast.n_a} vs {contrast.n_b}</div>
            </div>
            <div style={{ background: data.integrity.passed ? 'var(--bull-soft)' : 'var(--bear-soft)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroIntegrity, locale)}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: data.integrity.passed ? 'var(--bull)' : 'var(--bear)' }}>
                {data.integrity.passed ? (ko ? '통과' : 'Pass') : (ko ? '실패' : 'Fail')}
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroBuyHit, locale)}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{buyRow?.scored_directionally ? pct(buyRow.directional_hit_rate, 0) : '—'}</div>
              <span className={`badge ${confCls(buyRow?.confidence || '')}`} style={{ fontSize: 9, marginTop: 4, display: 'inline-block' }}>{buyRow?.confidence ?? '—'}</span>
            </div>
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroAvoidHit, locale)}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{avoidRow?.scored_directionally ? pct(avoidRow.directional_hit_rate, 0) : '—'}</div>
              <span className={`badge ${confCls(avoidRow?.confidence || '')}`} style={{ fontSize: 9, marginTop: 4, display: 'inline-block' }}>{avoidRow?.confidence ?? '—'}</span>
            </div>
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroMacro, locale)}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{judgmentText(macro.current_judgment, ko)}</div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroPrePost, locale)}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: retColor(pp.avg_delta != null ? pp.avg_delta / 100 : null) }}>
                {pp.avg_delta != null ? (pp.avg_delta > 0 ? '+' : '') + pp.avg_delta.toFixed(3) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            MVP-1 · 소셜 신호 → 이후 수익
        ══════════════════════════════════════════════ */}
        <div className="mob-order-5">
          <Card title={t(S.mvp1, locale)} action={`${d1.n_total_events} ${t(S.events, locale)}`}>

            {/* 요약 */}
            <div style={{ paddingBottom: 14, marginBottom: 0, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 10 }}>
                {t(S.mvp1q, locale)}
              </div>
              {/* 핵심 수치 */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', marginBottom: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 2 }}>
                    {ko ? `강세 vs 중립 차이 (5일 기준)` : 'Bullish vs None gap (5d)'}
                  </div>
                  <div className="mono" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: retColor(edgeDelta) }}>
                    {edgeDelta != null && edgeDelta > 0 ? '+' : ''}{pct(edgeDelta)}
                  </div>
                </div>
                <div>
                  <span className={`badge ${edgePositive ? 'bull' : 'neutral'}`} style={{ fontSize: 12 }}>
                    {edgePositive ? (ko ? '✓ 우위 있음' : '✓ Edge found') : (ko ? '우위 없음' : 'No edge')}
                  </span>
                </div>
              </div>
              {/* 설명 문장 */}
              <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.65 }}>
                {mvp1Body}
              </div>
              {mvp1Warn && (
                <div className="badge warn" style={{ fontSize: 11, marginTop: 8, display: 'inline-block' }}>
                  {t(S.lowSample, locale)}
                </div>
              )}
            </div>

            <DetailToggle open={exp1} onToggle={() => setExp1(!exp1)} locale={locale} />

            {/* 상세 */}
            {exp1 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginBottom: 10, lineHeight: 1.5 }}>
                  <strong>{t(S.method, locale)}:</strong> {ko ? d1.methodology_ko : d1.methodology_en}
                </div>
                {/* Desktop table */}
                <div className="mob-hide" style={{ overflowX: 'auto' }}>
                  <table className="tbl" style={{ minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th>Divergence</th>
                        <th>{t(S.events, locale)}</th>
                        {d1.horizons.map((h) => <th key={h}>{h}d avg · n · hit+</th>)}
                        <th>{ko ? '해석' : 'Read'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d1.groups.map((g) => (
                        <tr key={g.divergence}>
                          <td style={{ fontWeight: 700 }}>{g.divergence}</td>
                          <td className="mono">{g.n_events}</td>
                          {d1.horizons.map((h) => {
                            const st = g.horizons[String(h)];
                            return (
                              <td key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                <span style={{ color: retColor(st?.avg_return), fontWeight: 600 }}>{pct(st?.avg_return)}</span>
                                <span style={{ color: 'var(--fg-subtle)' }}> · {st?.n ?? 0} · {pct(st?.hit_rate, 0)}</span>
                                <div><span className={`badge ${confCls(st?.confidence || '')}`} style={{ fontSize: 9 }}>{st?.confidence}</span></div>
                              </td>
                            );
                          })}
                          <td style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{ko ? g.interpretation_ko : g.interpretation_en}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="mob-show">
                  {d1.groups.map((g) => (
                    <div key={g.divergence} style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border-soft)', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{g.divergence}</span>
                        <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{g.n_events} {t(S.events, locale)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        {d1.horizons.map((h) => {
                          const st = g.horizons[String(h)];
                          return (
                            <div key={h} style={{ textAlign: 'center', minWidth: 60 }}>
                              <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{h}d</div>
                              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: retColor(st?.avg_return) }}>{pct(st?.avg_return, 1)}</div>
                              <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>n={st?.n ?? 0}</div>
                              <span className={`badge ${confCls(st?.confidence || '')}`} style={{ fontSize: 8 }}>{st?.confidence}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.4 }}>{ko ? g.interpretation_ko : g.interpretation_en}</div>
                    </div>
                  ))}
                </div>
                {/* Contrast box */}
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: edgePositive ? 'var(--bull-soft)' : 'var(--bg-subtle)', border: '1px solid var(--border-soft)', fontSize: 12.5, lineHeight: 1.55 }}>
                  <strong>{t(S.contrast, locale)}</strong>
                  <div style={{ marginTop: 4 }}>
                    Δ = {pct(contrast.delta_a_minus_b)}{' '}
                    <span style={{ color: 'var(--fg-subtle)' }}>(bullish {pct(contrast.avg_a)} n={contrast.n_a} − none {pct(contrast.avg_b)} n={contrast.n_b})</span>
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--fg-muted)' }}>
                    {edgePositive ? t(S.hasEdge, locale) : t(S.noEdge, locale)}{' '}
                    {ko ? contrast.note_ko : contrast.note_en}
                  </div>
                </div>

                {/* SPY 시장 베이스라인 */}
                {spyBaseline?.avg_return != null && (
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {ko ? '📊 시장 베이스라인 (SPY 무조건 5일 수익)' : '📊 Market Baseline (SPY unconditional 5d return)'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: retColor(spyBaseline.avg_return) }}>
                      {pct(spyBaseline.avg_return)} <span style={{ color: 'var(--fg-subtle)', fontFamily: 'inherit' }}>n={spyBaseline.n}</span>
                    </div>
                    <div style={{ color: 'var(--fg-muted)', marginTop: 4, lineHeight: 1.4 }}>
                      {ko ? ko ? spyBaseline.note_ko : spyBaseline.note_en : spyBaseline.note_en}
                    </div>
                  </div>
                )}

                {/* 레짐 컨텍스트 */}
                {regimeCtx && (regimeCtx.bull || regimeCtx.bear) && (
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {ko ? '📈 SPY 50SMA 레짐별 강세 vs 중립 delta' : '📈 Bullish vs None delta by SPY 50-SMA regime'}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {(['bull', 'bear'] as const).map((r) => {
                        const rv = regimeCtx[r];
                        if (!rv) return null;
                        const d = rv.delta_bullish_vs_none;
                        return (
                          <div key={r} style={{ minWidth: 110 }}>
                            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 2 }}>
                              {r === 'bull' ? (ko ? '상승장 (SPY > SMA)' : 'Bull (SPY > SMA)') : (ko ? '하락장 (SPY < SMA)' : 'Bear (SPY < SMA)')}
                            </div>
                            <div className="mono" style={{ fontWeight: 700, color: retColor(d) }}>Δ {pct(d)}</div>
                            <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>n={rv.n_bullish} bull · {rv.n_none} none</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.4 }}>
                      {ko ? regimeCtx.note_ko : regimeCtx.note_en}
                    </div>
                  </div>
                )}

                {/* 상관 n 경고 */}
                {(() => {
                  const bullGroup = d1.groups.find((g) => g.divergence === 'bullish_divergence');
                  const note = bullGroup?.horizons?.['5']?.correlated_n_note_en;
                  if (!note) return null;
                  const noteText = ko ? (bullGroup?.horizons?.['5']?.correlated_n_note_ko || note) : note;
                  return (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--warn-soft, var(--bg-subtle))', border: '1px solid var(--border-soft)', fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                      ⚠ {noteText}
                    </div>
                  );
                })()}

                {/* 신호 품질 추적기 */}
                {d1.signal_quality && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {ko ? '신호 품질 추적기' : 'Signal Quality Tracker'}
                    </div>

                    {/* Calibration table */}
                    {d1.signal_quality.calibration.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 5 }}>
                          {ko
                            ? 'composite_score 구간별 bullish 신호 실제 적중률'
                            : 'Bullish signal hit rate by composite_score range'}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                          <thead>
                            <tr style={{ color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-soft)' }}>
                              <th style={{ textAlign: 'left', padding: '3px 0', fontWeight: 500 }}>{ko ? '점수 구간' : 'Score'}</th>
                              <th style={{ textAlign: 'right', padding: '3px 0', fontWeight: 500 }}>n</th>
                              <th style={{ textAlign: 'right', padding: '3px 0', fontWeight: 500 }}>{ko ? '평균수익' : 'Avg ret'}</th>
                              <th style={{ textAlign: 'right', padding: '3px 0', fontWeight: 500 }}>{ko ? '적중률' : 'Hit rate'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {d1.signal_quality.calibration.map((c) => (
                              <tr key={c.score_range} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                                <td style={{ padding: '4px 0', fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                                  {c.score_range === 'high' ? (ko ? '고점수 ≥0.75' : 'High ≥0.75')
                                    : c.score_range === 'medium' ? (ko ? '중점수 0.5-0.75' : 'Mid 0.5-0.75')
                                    : (ko ? '저점수 <0.5' : 'Low <0.5')}
                                </td>
                                <td style={{ padding: '4px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{c.n}</td>
                                <td style={{ padding: '4px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: retColor(c.avg_return) }}>{pct(c.avg_return)}</td>
                                <td style={{ padding: '4px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: c.hit_rate >= 0.5 ? 'var(--bull)' : c.hit_rate < 0.35 ? 'var(--bear)' : 'var(--fg)' }}>{pct(c.hit_rate, 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {d1.signal_quality.inverse_calibration_detected && (
                          <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6, background: 'var(--warn-soft, var(--bg-subtle))', border: '1px solid var(--border-soft)', fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                            {ko
                              ? '⚠ 역교정 감지: 고점수 bullish 신호의 실제 적중률이 저점수보다 낮습니다. 심리 포화 가능성.'
                              : '⚠ Inverse calibration: high-score bullish signals underperform low-score ones — possible sentiment saturation.'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rolling windows summary */}
                    {d1.signal_quality.rolling_windows.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 5 }}>
                          {ko
                            ? '14일 롤링 창 · bullish vs none 델타 (최근 5개)'
                            : '14-day rolling windows · bullish vs none delta (last 5)'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {d1.signal_quality.rolling_windows.slice(-5).map((w) => (
                            <div key={w.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 10px', borderRadius: 6, background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', minWidth: 64 }}>
                              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 2 }}>{w.date.slice(5)}</div>
                              <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: w.delta_bull_vs_none >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
                                {w.delta_bull_vs_none >= 0 ? '+' : ''}{(w.delta_bull_vs_none * 100).toFixed(1)}%
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{(w.hit_rate_bull * 100).toFixed(0)}% hit</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                          {ko ? d1.signal_quality.note_ko : d1.signal_quality.note_en}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ══════════════════════════════════════════════
            MVP-2 · AI 추천 적중률
        ══════════════════════════════════════════════ */}
        <div className="mob-order-6">
          <Card title={t(S.mvp2, locale)} action={`${data.action_horizon_days}d`}>

            {/* 요약 */}
            <div style={{ paddingBottom: 14, marginBottom: 0, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 10 }}>
                {t(S.mvp2q, locale)}
              </div>
              {/* 핵심 수치 2개 나란히 */}
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 2 }}>
                    {ko ? `매수 추천 적중 (Daily Brief, ${data.action_horizon_days}일 후)` : `Buy call accuracy (Daily Brief, ${data.action_horizon_days}d)`}
                  </div>
                  <div className="mono" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: buyHit != null && buyHit >= 0.5 ? 'var(--bull)' : 'var(--fg)' }}>
                    {pct(buyHit, 0)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>n={buyRow?.n ?? 0}</span>
                    <span className={`badge ${confCls(buyRow?.confidence || '')}`} style={{ fontSize: 10 }}>{buyRow?.confidence ?? '—'}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 2 }}>
                    {ko ? `회피 추천 적중 (Daily Brief, ${data.action_horizon_days}일 후)` : `Avoid call accuracy (Daily Brief, ${data.action_horizon_days}d)`}
                  </div>
                  <div className="mono" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: avoidHit != null && avoidHit >= 0.5 ? 'var(--bull)' : 'var(--fg)' }}>
                    {pct(avoidHit, 0)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>n={avoidRow?.n ?? 0}</span>
                    <span className={`badge ${confCls(avoidRow?.confidence || '')}`} style={{ fontSize: 10 }}>{avoidRow?.confidence ?? '—'}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.65 }}>
                {mvp2Body}
              </div>
              {mvp2Warn && (
                <div className="badge warn" style={{ fontSize: 11, marginTop: 8, display: 'inline-block' }}>
                  {t(S.lowSample, locale)}
                </div>
              )}
            </div>

            <DetailToggle open={exp2} onToggle={() => setExp2(!exp2)} locale={locale} />

            {/* 상세 */}
            {exp2 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="mob-wrap">
                  {([
                    [t(S.briefSrc, locale), data.mvp2_actions.brief],
                    [t(S.briefingSrc, locale), data.mvp2_actions.briefing],
                  ] as const).map(([label, block]) => (
                    <div key={label}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                        {label} <span style={{ color: 'var(--fg-subtle)', fontWeight: 500 }}>n={block.n_events}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 8, lineHeight: 1.45 }}>
                        {ko ? block.methodology_ko : block.methodology_en}
                      </div>
                      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                        <table className="tbl">
                          <thead>
                            <tr>
                              <th>{t(S.action, locale)}</th>
                              <th>{t(S.n, locale)}</th>
                              <th>{t(S.avgRet, locale)}</th>
                              <th>{t(S.dirHit, locale)}</th>
                              <th>{t(S.conf, locale)}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {block.by_action.map((r) => (
                              <tr key={r.action}>
                                <td style={{ fontWeight: 700 }}>{r.action}</td>
                                <td className="mono">{r.n}</td>
                                <td className="mono" style={{ color: retColor(r.avg_return) }}>{pct(r.avg_return)}</td>
                                <td className="mono">{r.scored_directionally ? pct(r.directional_hit_rate, 0) : '—'}</td>
                                <td><span className={`badge ${confCls(r.confidence)}`} style={{ fontSize: 10 }}>{r.confidence}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ══════════════════════════════════════════════
            MVP-3 · 반복 시장 테마
        ══════════════════════════════════════════════ */}
        <div className="mob-order-7">
          <Card title={t(S.mvp3, locale)} action={`${data.mvp3_themes.n_theme_days} theme-days`}>

            {/* 요약 */}
            <div style={{ paddingBottom: 14, marginBottom: 0, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 10 }}>
                {t(S.mvp3q, locale)}
              </div>
              {topTheme ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>
                      {ko ? '가장 오래 반복된 주제 (AI 브리프 기준)' : 'Most recurring topic (AI brief)'}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.4 }}>
                      {topTheme.theme}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{ko ? '총 등장일' : 'Total days'}</div>
                      <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{topTheme.count_days}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{ko ? '최대 연속' : 'Max streak'}</div>
                      <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{topTheme.max_streak_days}</div>
                    </div>
                    {topTheme.spy_same_day_stats && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>SPY avg</div>
                        <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: retColor(topTheme.spy_same_day_stats.avg_return) }}>
                          {pct(topTheme.spy_same_day_stats.avg_return, 1)}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
              <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.65 }}>
                {mvp3Body}
              </div>
            </div>

            <DetailToggle open={exp3} onToggle={() => setExp3(!exp3)} locale={locale} />

            {/* 상세 */}
            {exp3 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginBottom: 10 }}>
                  {ko ? data.mvp3_themes.methodology_ko : data.mvp3_themes.methodology_en}
                </div>
                {data.mvp3_themes.themes.length === 0 ? (
                  <div className="subtle">{ko ? '테마 데이터 부족' : 'No themes in window'}</div>
                ) : (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                    <table className="tbl" style={{ minWidth: 560 }}>
                      <thead>
                        <tr>
                          <th>{t(S.theme, locale)}</th>
                          <th>{t(S.days, locale)}</th>
                          <th>{t(S.streak, locale)}</th>
                          <th>{t(S.range, locale)}</th>
                          <th>{t(S.spyCo, locale)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.mvp3_themes.themes.map((th) => (
                          <tr key={th.theme + th.first_date}>
                            <td style={{ fontSize: 12.5, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{th.theme}</td>
                            <td className="mono">{th.count_days}</td>
                            <td className="mono" style={{ fontWeight: 700 }}>{th.max_streak_days}</td>
                            <td style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{th.first_date} → {th.last_date}</td>
                            <td className="mono" style={{ color: retColor(th.spy_same_day_stats?.avg_return) }}>
                              {pct(th.spy_same_day_stats?.avg_return)}
                              {th.spy_same_day_stats ? ` (n=${th.spy_same_day_stats.n})` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ══════════════════════════════════════════════
            MVP-4 · 거시환경 + 장전→장후
        ══════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }} className="mob-wrap mob-order-8">

          {/* Macro transitions card */}
          <Card title={ko ? 'MVP-4 · 거시경제 국면' : 'MVP-4 · Macro Environment'} action={macro.current_judgment || '—'}>
            {/* 요약 */}
            <div style={{ paddingBottom: 14, marginBottom: 0, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 10 }}>
                {t(S.mvp4aq, locale)}
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 2 }}>
                  {ko ? '현재 국면' : 'Current regime'}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
                  {judgmentText(macro.current_judgment, ko)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 6 }}>
                  {ko ? `분석 기간 ${days}일 중 ${macro.n_transitions}번 국면 전환` : `${macro.n_transitions} transitions in ${days}-day window`}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.65 }}>
                {mvp4aBody}
              </div>
            </div>

            <DetailToggle open={exp4} onToggle={() => setExp4(!exp4)} locale={locale} />

            {exp4 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginBottom: 8 }}>
                  {ko ? macro.methodology_ko : macro.methodology_en}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span className="badge teal">{t(S.current, locale)}: {macro.current_judgment ?? '—'}</span>
                  <span className="badge neutral">{macro.n_days}d series · {macro.n_transitions} transitions</span>
                </div>
                <div style={{ fontSize: 12, marginBottom: 8, color: 'var(--fg-muted)' }}>
                  dwell: {Object.entries(macro.dwell_days || {}).map(([k, v]) => `${k}=${v}d`).join(' · ') || '—'}
                </div>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>{t(S.transitions, locale)}</div>
                <div style={{ maxHeight: 220, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                  <table className="tbl">
                    <thead>
                      <tr><th>Date</th><th>From → To</th><th>Composite</th><th>Δ</th></tr>
                    </thead>
                    <tbody>
                      {[...macro.transitions].reverse().map((tr) => (
                        <tr key={tr.date + tr.from + tr.to}>
                          <td className="mono" style={{ fontSize: 12 }}>{tr.date}</td>
                          <td style={{ fontSize: 12 }}>{tr.from} → <strong>{tr.to}</strong></td>
                          <td className="mono">{tr.market_composite ?? '—'}</td>
                          <td className="mono" style={{ color: retColor(tr.composite_delta_vs_prev != null ? tr.composite_delta_vs_prev / 100 : null) }}>
                            {tr.composite_delta_vs_prev != null ? (tr.composite_delta_vs_prev > 0 ? '+' : '') + tr.composite_delta_vs_prev : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          {/* Pre→Post card */}
          <Card title={ko ? 'MVP-4 · 장전→장후 심리' : 'MVP-4 · Pre→Post Mood'} action={`${pp.n_days}d`}>
            {/* 요약 */}
            <div style={{ paddingBottom: 14, marginBottom: 0, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 10 }}>
                {t(S.mvp4bq, locale)}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 2 }}>
                    {ko ? '하루 평균 심리 변화' : 'Avg daily mood shift'}
                  </div>
                  <div className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: retColor(pp.avg_delta != null ? pp.avg_delta / 100 : null) }}>
                    {pp.avg_delta != null ? (pp.avg_delta > 0 ? '+' : '') + pp.avg_delta.toFixed(2) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 2 }}>
                    {ko ? '심리 개선 비율' : 'Days improved'}
                  </div>
                  <div className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                    {pct(pp.improved_rate, 0)}
                  </div>
                  <span className={`badge ${confCls(pp.confidence)}`} style={{ fontSize: 10, marginTop: 4, display: 'inline-block' }}>{pp.confidence}</span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.65 }}>
                {mvp4bBody}
              </div>
              {mvp4bWarn && (
                <div className="badge warn" style={{ fontSize: 11, marginTop: 8, display: 'inline-block' }}>
                  {t(S.lowSample, locale)}
                </div>
              )}
            </div>

            <DetailToggle open={exp4} onToggle={() => setExp4(!exp4)} locale={locale} />

            {exp4 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginBottom: 10 }}>
                  {ko ? pp.methodology_ko : pp.methodology_en}
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                  <table className="tbl">
                    <thead>
                      <tr><th>Date</th><th>Pre</th><th>Post</th><th>Δ</th></tr>
                    </thead>
                    <tbody>
                      {[...pp.recent].reverse().map((r) => (
                        <tr key={r.date}>
                          <td className="mono" style={{ fontSize: 12 }}>{r.date}</td>
                          <td className="mono">{r.pre.toFixed(2)}</td>
                          <td className="mono">{r.post.toFixed(2)}</td>
                          <td className="mono" style={{ color: retColor(r.delta / 100), fontWeight: 600 }}>
                            {r.delta > 0 ? '+' : ''}{r.delta.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
