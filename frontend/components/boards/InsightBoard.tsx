'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useInsight } from '@/hooks/useInsight';
import { Card } from '@/components/ui/Card';
import { t } from '@/app/i18n';
import type { BiLang } from '@/app/i18n';

const S: Record<string, BiLang> = {
  title: { en: 'Insight Lab', ko: '통찰 랩' },
  subtitle: {
    en: 'Historical edge checks across social, AI brief, macro — prove, do not preach',
    ko: '소셜·AI 브리프·매크로 교차 검증 — 단정하지 않고 증명합니다',
  },
  loading: { en: 'Building insight tables… (first load may take ~30s)', ko: '통찰 테이블 생성 중… (최초 약 30초)' },
  error: { en: 'Failed to load insight data', ko: '통찰 데이터 로드 실패' },
  disclaimer: { en: 'Disclaimer', ko: '고지' },
  integrity: { en: 'Integrity', ko: '정합 검증' },
  integrityOk: { en: 'Checks passed', ko: '검증 통과' },
  integrityFail: { en: 'Checks failed', ko: '검증 실패' },
  source: { en: 'Source coverage', ko: '데이터 커버리지' },
  mvp1: { en: 'MVP-1 · Divergence → Forward Return', ko: 'MVP-1 · 다이버전스 → 선행 수익' },
  mvp2: { en: 'MVP-2 · AI Action Hit-Rate', ko: 'MVP-2 · AI Action 적중률' },
  mvp3: { en: 'MVP-3 · Theme Persistence', ko: 'MVP-3 · 테마 지속성' },
  mvp4: { en: 'MVP-4 · Macro Transitions & Pre→Post', ko: 'MVP-4 · 매크로 전환 · 장전→장후' },
  events: { en: 'events', ko: '이벤트' },
  method: { en: 'Method', ko: '방법' },
  contrast: { en: 'Contrast (bullish vs none @ 5d)', ko: '대비 (bullish vs none · 5일)' },
  briefSrc: { en: 'Daily Brief (post_close)', ko: 'Daily Brief (장후)' },
  briefingSrc: { en: 'Morning Briefing', ko: '아침 브리핑' },
  action: { en: 'Action', ko: 'Action' },
  n: { en: 'n', ko: 'n' },
  avgRet: { en: 'Avg return', ko: '평균 수익' },
  dirHit: { en: 'Directional hit', ko: '방향 적중' },
  conf: { en: 'Confidence', ko: '신뢰도' },
  theme: { en: 'Theme', ko: '테마' },
  days: { en: 'Days', ko: '일수' },
  streak: { en: 'Max streak', ko: '최장 연속' },
  range: { en: 'First → Last', ko: '최초 → 최근' },
  spyCo: { en: 'SPY same-day avg', ko: 'SPY 당일 평균' },
  current: { en: 'Current judgment', ko: '현재 판단' },
  transitions: { en: 'Recent transitions', ko: '최근 전환' },
  prePost: { en: 'Pre-open → Post-close mood shift', ko: '장전 → 장후 심리 변화' },
  avgDelta: { en: 'Avg Δ composite', ko: '평균 Δ composite' },
  improved: { en: 'Improved rate', ko: '개선 비율' },
  noEdge: {
    en: 'No historical edge vs control in this window — shown honestly.',
    ko: '이 구간에서 통제군 대비 우위 없음 — 있는 그대로 표시.',
  },
  hasEdge: {
    en: 'Bullish divergence beat control on avg 5d return in this window.',
    ko: '이 구간에서 bullish 다이버전스가 통제군 대비 5일 평균 우세.',
  },
  window: { en: 'Window', ko: '윈도우' },
  horizon: { en: 'Action horizon', ko: 'Action 선행일' },
  heroEdge: { en: 'Bullish vs None Edge', ko: 'Bullish vs None 우위' },
  heroBuyHit: { en: 'Buy Hit-Rate', ko: 'Buy 적중률' },
  heroAvoidHit: { en: 'Avoid Hit-Rate', ko: 'Avoid 적중률' },
  heroMacro: { en: 'Macro', ko: '매크로' },
  heroPrePost: { en: 'Pre→Post Δ', ko: '장전→장후 Δ' },
  heroIntegrity: { en: 'Integrity', ko: '정합' },
  expandTable: { en: 'Full table ▼', ko: '전체 표 ▼' },
  collapseTable: { en: 'Collapse ▲', ko: '접기 ▲' },
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

export function InsightBoard() {
  const { locale } = useStore();
  const [days, setDays] = useState(60);
  const [horizon, setHorizon] = useState(5);
  const { data, isLoading, isError, refetch } = useInsight(days, horizon);
  const ko = locale === 'ko';

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

  const d1 = data.mvp1_divergence;
  const contrast = d1.contrast_bullish_vs_none_5d;
  const edgePositive = (contrast.delta_a_minus_b ?? 0) > 0;

  // Hero KPI: extract key numbers for mobile summary
  const buyRow = data.mvp2_actions.brief.by_action.find((r) => r.action === 'buy');
  const avoidRow = data.mvp2_actions.brief.by_action.find((r) => r.action === 'avoid');

  return (
    <div className="board-wrap">
      <div className="board" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 32px' }}>

        {/* Header + controls — mob-order-1 */}
        <div className="mob-order-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{t(S.title, locale)}</h2>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{t(S.subtitle, locale)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {t(S.window, locale)}
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{
                  background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '6px 8px', minHeight: 44,
                }}
              >
                {[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d}d</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {t(S.horizon, locale)}
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                style={{
                  background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '6px 8px', minHeight: 44,
                }}
              >
                {[3, 5, 10].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <button
              className="btn"
              style={{ fontSize: 12, padding: '6px 14px', minHeight: 44 }}
              onClick={() => refetch()}
            >
              {ko ? '새로고침' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Disclaimer — mob-order-3, details.mob-collapse (open always; on mobile user can collapse) */}
        <details className="mob-collapse mob-order-3" open style={{ height: 'auto' }}>
          <summary style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {t(S.disclaimer, locale)}
          </summary>
          <div className="mob-collapse-body">
            <div style={{
              background: 'var(--warn-soft)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
              borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 12.5, color: 'var(--fg)', lineHeight: 1.55,
            }}>
              <strong>{t(S.disclaimer, locale)}:</strong>{' '}
              {ko ? data.disclaimer_ko : data.disclaimer_en}
            </div>
          </div>
        </details>

        {/* Integrity + Source — mob-order-2 (show above disclaimer on mobile) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mob-wrap mob-order-2">
          <Card title={t(S.integrity, locale)} action={data.integrity.passed ? t(S.integrityOk, locale) : t(S.integrityFail, locale)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className={`badge ${data.integrity.passed ? 'bull' : 'bear'}`}>
                fail {data.integrity.fail_count} · warn {data.integrity.warn_count}
              </span>
            </div>
            {(data.integrity.issues || []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
                {ko
                  ? '카운트 일관성·가격 커버리지·히스토리 로드 검사 통과.'
                  : 'Count consistency, price coverage, and history load checks passed.'}
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
                {data.source.insight_data_root
                  ? `root: ${data.source.insight_data_root}`
                  : 'source: GitHub raw history'}
              </div>
            </div>
          </Card>
        </div>

        {/* Mobile Hero KPI — mob-show only, mob-order-4 */}
        <div className="mob-show mob-order-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {/* Edge */}
            <div style={{
              background: edgePositive ? 'var(--bull-soft)' : 'var(--bg-subtle)',
              border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroEdge, locale)}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: retColor(contrast.delta_a_minus_b) }}>
                {pct(contrast.delta_a_minus_b)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3 }}>
                n={contrast.n_a} vs {contrast.n_b}
              </div>
              {!edgePositive && (
                <div style={{ fontSize: 10, color: 'var(--bear)', marginTop: 4 }}>
                  {ko ? '우위 없음' : 'No edge'}
                </div>
              )}
            </div>

            {/* Integrity */}
            <div style={{
              background: data.integrity.passed ? 'var(--bull-soft)' : 'var(--bear-soft)',
              border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroIntegrity, locale)}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: data.integrity.passed ? 'var(--bull)' : 'var(--bear)' }}>
                {data.integrity.passed ? (ko ? '통과' : 'Pass') : (ko ? '실패' : 'Fail')}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3 }}>
                fail {data.integrity.fail_count} · warn {data.integrity.warn_count}
              </div>
            </div>

            {/* Buy hit */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroBuyHit, locale)}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
                {buyRow?.scored_directionally ? pct(buyRow.directional_hit_rate, 0) : '—'}
              </div>
              <span className={`badge ${confCls(buyRow?.confidence || '')}`} style={{ fontSize: 9, marginTop: 4, display: 'inline-block' }}>
                {buyRow?.confidence ?? '—'}
              </span>
            </div>

            {/* Avoid hit */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroAvoidHit, locale)}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
                {avoidRow?.scored_directionally ? pct(avoidRow.directional_hit_rate, 0) : '—'}
              </div>
              <span className={`badge ${confCls(avoidRow?.confidence || '')}`} style={{ fontSize: 9, marginTop: 4, display: 'inline-block' }}>
                {avoidRow?.confidence ?? '—'}
              </span>
            </div>

            {/* Macro judgment */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroMacro, locale)}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{data.mvp4_macro.current_judgment ?? '—'}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3 }}>
                {data.mvp4_macro.n_transitions} transitions
              </div>
            </div>

            {/* Pre→Post avg Δ */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>{t(S.heroPrePost, locale)}</div>
              <div className="mono" style={{
                fontSize: 20, fontWeight: 700,
                color: retColor(data.mvp4_pre_post.avg_delta != null ? data.mvp4_pre_post.avg_delta / 100 : null),
              }}>
                {data.mvp4_pre_post.avg_delta != null
                  ? (data.mvp4_pre_post.avg_delta > 0 ? '+' : '') + data.mvp4_pre_post.avg_delta.toFixed(3)
                  : '—'}
              </div>
              <span className={`badge ${confCls(data.mvp4_pre_post.confidence)}`} style={{ fontSize: 9, marginTop: 4, display: 'inline-block' }}>
                {data.mvp4_pre_post.confidence}
              </span>
            </div>
          </div>
        </div>

        {/* MVP-1 — mob-order-5 */}
        <div className="mob-order-5">
          <Card
            title={t(S.mvp1, locale)}
            action={`${d1.n_total_events} ${t(S.events, locale)}`}
          >
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
                    {d1.horizons.map((h) => (
                      <th key={h}>{h}d avg · n · hit+</th>
                    ))}
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
                            <span style={{ color: 'var(--fg-subtle)' }}> · {st?.n ?? 0}</span>
                            <span style={{ color: 'var(--fg-subtle)' }}> · {pct(st?.hit_rate, 0)}</span>
                            <div><span className={`badge ${confCls(st?.confidence || '')}`} style={{ fontSize: 9 }}>{st?.confidence}</span></div>
                          </td>
                        );
                      })}
                      <td style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                        {ko ? g.interpretation_ko : g.interpretation_en}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="mob-show">
              {d1.groups.map((g) => (
                <div key={g.divergence} style={{
                  background: 'var(--bg-subtle)', borderRadius: 8, padding: '10px 12px',
                  border: '1px solid var(--border-soft)', marginBottom: 10,
                }}>
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
                          <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: retColor(st?.avg_return) }}>
                            {pct(st?.avg_return, 1)}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>n={st?.n ?? 0}</div>
                          <span className={`badge ${confCls(st?.confidence || '')}`} style={{ fontSize: 8 }}>{st?.confidence}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.4 }}>
                    {ko ? g.interpretation_ko : g.interpretation_en}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 8,
              background: edgePositive ? 'var(--bull-soft)' : 'var(--bg-subtle)',
              border: '1px solid var(--border-soft)', fontSize: 12.5, lineHeight: 1.55,
            }}>
              <strong>{t(S.contrast, locale)}</strong>
              <div style={{ marginTop: 4 }}>
                Δ = {pct(contrast.delta_a_minus_b)}{' '}
                <span style={{ color: 'var(--fg-subtle)' }}>
                  (bullish {pct(contrast.avg_a)} n={contrast.n_a} − none {pct(contrast.avg_b)} n={contrast.n_b})
                </span>
              </div>
              <div style={{ marginTop: 4, color: 'var(--fg-muted)' }}>
                {edgePositive ? t(S.hasEdge, locale) : t(S.noEdge, locale)}{' '}
                {ko ? contrast.note_ko : contrast.note_en}
              </div>
            </div>
          </Card>
        </div>

        {/* MVP-2 — mob-order-6 */}
        <div className="mob-order-6">
          <Card title={t(S.mvp2, locale)} action={`${data.action_horizon_days}d`}>
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
                            <td className="mono">
                              {r.scored_directionally ? pct(r.directional_hit_rate, 0) : '—'}
                            </td>
                            <td><span className={`badge ${confCls(r.confidence)}`} style={{ fontSize: 10 }}>{r.confidence}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* MVP-3 — mob-order-7 */}
        <div className="mob-order-7">
          <Card title={t(S.mvp3, locale)} action={`${data.mvp3_themes.n_theme_days} theme-days`}>
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
                        <td style={{
                          fontSize: 12.5, maxWidth: 200,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        } as React.CSSProperties}>{th.theme}</td>
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
          </Card>
        </div>

        {/* MVP-4 — mob-order-8 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }} className="mob-wrap mob-order-8">
          <Card title={t(S.mvp4, locale)} action={data.mvp4_macro.current_judgment || '—'}>
            <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginBottom: 8 }}>
              {ko ? data.mvp4_macro.methodology_ko : data.mvp4_macro.methodology_en}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <span className="badge teal">{t(S.current, locale)}: {data.mvp4_macro.current_judgment ?? '—'}</span>
              <span className="badge neutral">{data.mvp4_macro.n_days}d series · {data.mvp4_macro.n_transitions} transitions</span>
            </div>
            <div style={{ fontSize: 12, marginBottom: 8, color: 'var(--fg-muted)' }}>
              dwell:{' '}
              {Object.entries(data.mvp4_macro.dwell_days || {}).map(([k, v]) => `${k}=${v}d`).join(' · ') || '—'}
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>{t(S.transitions, locale)}</div>
            <div style={{ maxHeight: 220, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>From → To</th>
                    <th>Composite</th>
                    <th>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.mvp4_macro.transitions].reverse().map((tr) => (
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
          </Card>

          <Card title={t(S.prePost, locale)} action={`${data.mvp4_pre_post.n_days}d`}>
            <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginBottom: 10 }}>
              {ko ? data.mvp4_pre_post.methodology_ko : data.mvp4_pre_post.methodology_en}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{t(S.avgDelta, locale)}</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: retColor(data.mvp4_pre_post.avg_delta != null ? data.mvp4_pre_post.avg_delta / 100 : null) }}>
                  {data.mvp4_pre_post.avg_delta != null ? (data.mvp4_pre_post.avg_delta > 0 ? '+' : '') + data.mvp4_pre_post.avg_delta.toFixed(3) : '—'}
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{t(S.improved, locale)}</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{pct(data.mvp4_pre_post.improved_rate, 0)}</div>
                <span className={`badge ${confCls(data.mvp4_pre_post.confidence)}`} style={{ fontSize: 10 }}>{data.mvp4_pre_post.confidence}</span>
              </div>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pre</th>
                    <th>Post</th>
                    <th>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.mvp4_pre_post.recent].reverse().map((r) => (
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
          </Card>
        </div>

      </div>
    </div>
  );
}
