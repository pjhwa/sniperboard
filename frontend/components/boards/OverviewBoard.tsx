'use client';

import { useStore } from '@/hooks/useStore';
import { useRegime } from '@/hooks/useRegime';
import { useDistributionDays } from '@/hooks/useDistributionDays';
import { useMacro } from '@/hooks/useMacro';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useIntraday } from '@/hooks/useIntraday';
import { useDaily } from '@/hooks/useDaily';
import { Card, ScorePill } from '@/components/ui/Card';
import { RadialGauge } from '@/components/ui/RadialGauge';
import { Sparkline } from '@/components/ui/Sparkline';
import { HeatStrip } from '@/components/ui/HeatStrip';
import { Sparkle } from '@/components/ui/Icons';
import { MacroItem, RegimeDiagnostics, UpcomingEarning, EARNINGS_RISK_META } from '@/app/types';
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';
import { useBrief } from '@/hooks/useBrief';
import { useEarnings } from '@/hooks/useEarnings';

const OVERVIEW_GLOSSARY: GlossaryItem[] = [
  { term: 'Risk Regime (리스크 레짐)', plain: '지금 시장이 얼마나 투자하기 좋은 환경인지를 5가지 요소로 종합해 점수로 나타냅니다. 100점에 가까울수록 강세, 낮을수록 위험한 환경입니다.' },
  { term: 'Trend (추세)', plain: 'SPY(S&P500 ETF)가 200일 이동평균선 위에 있는지 확인합니다. 위에 있으면 시장 전체가 상승 추세임을 의미합니다.' },
  { term: 'Breadth (시장 폭)', plain: '소수 대형주만 오르는지, 많은 종목이 함께 오르는지를 봅니다. RSP(동일가중 ETF)가 SPY(시총가중)보다 강하면 건강한 상승입니다.' },
  { term: 'Credit (신용 스트레스)', plain: '회사채 시장의 건전성을 봅니다. 고위험 채권(HYG)이 안전 채권(IEF)보다 강하면 투자자들이 위험을 기꺼이 감수하고 있다는 신호입니다.' },
  { term: 'Volatility (변동성)', plain: 'VIX 공포 지수입니다. 14 이하면 시장이 안정적, 20 이상이면 불안, 30 이상이면 공포 국면입니다. 낮을수록 좋은 환경입니다.' },
  { term: 'Momentum (모멘텀)', plain: 'S&P500의 최근 20일 방향성입니다. 지수가 꾸준히 오르고 있으면 긍정 점수를 받습니다.' },
  { term: 'Distribution Days (분산일)', plain: '기관 투자자들이 대량 매도한 날의 수입니다. 25거래일 내에 4~5일이면 경계, 6일 이상이면 시장 상단 가능성이 높아 신규 진입을 조심해야 합니다.' },
  { term: 'VIX 백워데이션', plain: 'VIX9D(9일 변동성)가 VIX(30일)보다 높은 상태입니다. 정상적으로는 장기 변동성(VIX)이 더 높은데(콘탱고), 역전되면 지금 당장 시장이 더 불안하다는 뜻으로 위험 신호입니다.' },
  { term: 'Market Breadth · SPY vs RSP', plain: 'SPY는 시가총액 비례 지수(애플, MS 등 대형주 영향 큼), RSP는 모든 종목을 동일 비중으로 구성한 지수입니다. RSP가 SPY보다 약하면 소수 대형주만 시장을 끌고 있다는 경고입니다.' },
  { term: 'Credit Stress · HYG/JNK/LQD/IEF', plain: 'HYG·JNK는 고수익(고위험) 채권, LQD는 투자등급 회사채, IEF는 미국 국채입니다. 안전 자산(IEF)이 강하고 위험 자산(HYG)이 약하면 투자자들이 공포를 느끼고 있다는 뜻입니다.' },
  { term: 'Daily Heat Strip (일봉 히트맵)', plain: '최근 60거래일의 일별 등락률을 색깔로 표현합니다. 초록색이 짙을수록 큰 상승, 빨간색이 짙을수록 큰 하락입니다. 패턴을 보며 종목의 건강도를 확인합니다.' },
  { term: 'Watchlist Top 3', plain: 'Stage 2 점수가 가장 높은 3개 종목입니다. Stage 2는 Minervini의 이상적인 매수 구간 기준으로, 점수가 높을수록 지금 진입하기 좋은 환경임을 의미합니다.' },
  { term: 'Sector Momentum · 섹터 모멘텀', plain: '5개 테마 ETF의 최근 5일 수익률을 비교합니다. SMH(반도체), XLE(에너지), XLY(소비재), XHB(홈빌더), ITA(방산) 순위가 높을수록 현재 시장에서 선호받는 섹터입니다. ↑EMA는 21일 이동평균선 위에서 거래 중인 강세 상태를 의미합니다.' },
  { term: '종목별 AI 분석 · Setup Quality', plain: 'AI가 워치리스트 각 종목의 셋업 품질을 A+/A/B/C/D로 평가합니다. A+는 즉시 진입 가능한 최상의 구조, D는 진입을 피해야 할 상태입니다. 매수/보유/관망/회피 바이어스도 함께 제공합니다. AI 의견이므로 최종 판단은 본인이 해야 합니다.' },
];

const REGIME_LABELS: Record<string, [string, string]> = {
  RISK_ON:      ['Risk-On',      '강세'],
  CONSTRUCTIVE: ['Constructive', '우호적'],
  MIXED:        ['Mixed',        '혼조'],
  DEFENSIVE:    ['Defensive',    '방어적'],
  RISK_OFF:     ['Risk-Off',     '약세'],
  UNKNOWN:      ['Unknown',      '불명'],
};

const SIGNAL_BADGE: Record<string, [string, string]> = {
  sniper:       ['bull',   'Sniper'],
  vcp:          ['info',   'VCP'],
  pullback:     ['warn',   'Pullback'],
  strong_trend: ['teal',   'StrongTrend'],
  overbought:   ['warn',   'Overbought'],
  downtrend:    ['bear',   'Downtrend'],
};

function findMacro(macro: MacroItem[], sym: string) {
  return macro.find(m => m.symbol === sym);
}

export function OverviewBoard() {
  const { symbol, timeframe } = useStore();
  const { regimeData } = useRegime();
  const { ddData } = useDistributionDays();
  const { macroData } = useMacro();
  const { watchlist } = useWatchlist();
  const { ohlcvData } = useIntraday(symbol, timeframe);
  const { dailyData } = useDaily(symbol);

  const macro = macroData?.macro ?? [];
  const vix   = findMacro(macro, '^VIX');
  const vix9d = findMacro(macro, '^VIX9D');
  const spy   = findMacro(macro, 'SPY');
  const rsp   = findMacro(macro, 'RSP');
  const mags  = findMacro(macro, 'MAGS');
  const iwm   = findMacro(macro, 'IWM');
  const hyg   = findMacro(macro, 'HYG');
  const jnk   = findMacro(macro, 'JNK');
  const lqd   = findMacro(macro, 'LQD');
  const ief   = findMacro(macro, 'IEF');

  const { briefData } = useBrief();
  const { earningsData } = useEarnings();

  const candles = ohlcvData?.candles ?? [];
  const signals = ohlcvData?.signals;
  const indicators = ohlcvData?.indicators;
  const lastCandle = candles[candles.length - 1];
  const lastIdx = candles.length - 1;

  const activeSignals = signals
    ? ['sniper', 'vcp', 'pullback', 'strong_trend', 'overbought', 'downtrend'].filter(
        k => signals[k as keyof typeof signals][lastIdx]
      )
    : [];

  const dailyCandles = dailyData?.candles ?? [];
  const dailyChg = dailyCandles.slice(-61).map((c, i, arr) => {
    if (i === 0) return 0;
    return ((c.close - arr[i - 1].close) / arr[i - 1].close) * 100;
  }).slice(1); // 첫 번째 0 제거 → 60거래일 순수 등락률

  const upDays   = dailyChg.filter(v => v > 0.05).length;
  const downDays = dailyChg.filter(v => v < -0.05).length;
  const avgChg   = dailyChg.length ? dailyChg.reduce((a, b) => a + b, 0) / dailyChg.length : 0;
  const maxGain  = dailyChg.length ? Math.max(...dailyChg) : 0;
  const maxLoss  = dailyChg.length ? Math.min(...dailyChg) : 0;

  // 백워데이션: VIX9D(9일) > VIX(30일) — 단기 변동성이 장기보다 높아 역전된 상태
  const backward = vix && vix9d ? vix.price !== null && vix9d.price !== null && (vix9d.price ?? 0) > (vix.price ?? 0) : false;

  return (
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: 'auto auto auto auto', alignContent: 'start' }}
    >
      {/* AI Insight — span 2 */}
      <div style={{ gridColumn: 'span 2' }}>
        <div className="ai-card">
          <div className="ai-card__head">
            <div className="ico"><Sparkle /></div>
            <h3>오늘의 한마디 — Market Snapshot</h3>
            <small>{new Date().toLocaleDateString('ko-KR')}</small>
          </div>
          <div className="ai-card__body">
            {briefData?.market_brief ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className={`badge ${
                    briefData.market_brief.tone === 'bullish' ? 'bull' :
                    briefData.market_brief.tone === 'bearish' ? 'bear' :
                    briefData.market_brief.tone === 'cautious' ? 'warn' : 'neutral'
                  }`}>{
                    briefData.market_brief.tone === 'bullish' ? '강세' :
                    briefData.market_brief.tone === 'bearish' ? '약세' :
                    briefData.market_brief.tone === 'cautious' ? '주의' : '중립'
                  }</span>
                  <span style={{ fontSize: 13 }}>{briefData.market_brief.summary}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {briefData.market_brief.key_themes.map((theme, i) => (
                    <span key={i} className="badge neutral" style={{ fontSize: 10.5 }}>{theme}</span>
                  ))}
                </div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 11.5 }}>
                  주시: {briefData.market_brief.watch_points}
                </div>
                <div style={{ color: 'var(--fg-subtle)', fontSize: 10, marginTop: 4 }}>
                  AI 의견 — 매매 신호 아님 · {briefData.slot === 'pre_open' ? '장 전' : '장 후'} 기준
                </div>
              </>
            ) : regimeData ? (
              <>
                <div style={{ marginBottom: 6 }}>
                  현재 Risk Regime은{' '}
                  <strong>{REGIME_LABELS[regimeData.regime]?.[0] ?? regimeData.regime}</strong>
                  {' '}({regimeData.total ?? '—'}점) —{' '}
                  {regimeData.regime === 'RISK_ON' && '추세 추종 전략이 유효한 강세 환경입니다.'}
                  {regimeData.regime === 'CONSTRUCTIVE' && '선별적 진입이 가능한 우호적 환경입니다.'}
                  {regimeData.regime === 'MIXED' && '신호가 혼재합니다. 포지션 사이즈를 축소하세요.'}
                  {regimeData.regime === 'DEFENSIVE' && '약세 신호 우세. 현금 비중을 늘리세요.'}
                  {regimeData.regime === 'RISK_OFF' && '리스크 오프 국면. 신규 매수를 자제하세요.'}
                  {regimeData.regime === 'UNKNOWN' && '데이터 부족으로 판단이 어렵습니다.'}
                </div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                  Trend {(regimeData.components.trend ?? 0).toFixed(1)} ·
                  Breadth {(regimeData.components.breadth ?? 0).toFixed(1)} ·
                  Credit {(regimeData.components.credit ?? 0).toFixed(1)} ·
                  Volatility {(regimeData.components.volatility ?? 0).toFixed(1)} ·
                  Momentum {(regimeData.components.momentum ?? 0).toFixed(1)}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)' }}>AI Brief 로딩 중...</div>
            )}

            {/* Symbol Briefs — Action Bias 신호강도 미터 */}
            {briefData?.symbol_briefs && briefData.symbol_briefs.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 10, paddingTop: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  종목별 AI 분석
                </div>
                {briefData.symbol_briefs.map(sb => {
                  const gradeColor =
                    sb.setup_quality === 'A+' || sb.setup_quality === 'A' ? 'var(--bull)' :
                    sb.setup_quality === 'B' ? 'var(--teal)' :
                    sb.setup_quality === 'C' ? 'var(--warn)' : 'var(--bear)';
                  // avoid=0 watch=1 hold=2 buy=3
                  const BIAS_LEVELS = ['avoid', 'watch', 'hold', 'buy'] as const;
                  const BIAS_COLORS = ['var(--bear)', 'var(--warn)', 'var(--teal)', 'var(--bull)'];
                  const BIAS_LABELS: Record<string, string> = { buy: '매수', hold: '보유', watch: '관망', avoid: '회피' };
                  const biasIdx = BIAS_LEVELS.indexOf(sb.action_bias as typeof BIAS_LEVELS[number]);
                  const biasColor = BIAS_COLORS[biasIdx] ?? 'var(--fg-subtle)';
                  return (
                    <div key={sb.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border-soft)' }}>
                      <span style={{ fontWeight: 700, width: 44, fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0 }}>{sb.symbol}</span>
                      <span style={{ fontWeight: 700, fontSize: 11, color: gradeColor, width: 20, flexShrink: 0 }}>{sb.setup_quality}</span>
                      {/* 4칸 신호강도 미터 */}
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {BIAS_LEVELS.map((_, i) => (
                          <div key={i} style={{
                            width: 14, height: 8, borderRadius: 2,
                            background: i <= biasIdx ? BIAS_COLORS[i] : 'var(--bg-subtle)',
                            opacity: i <= biasIdx ? 0.85 : 0.35,
                            transition: 'background 0.2s',
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 10, color: biasColor, fontWeight: 600, width: 24, flexShrink: 0 }}>
                        {BIAS_LABELS[sb.action_bias]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Earnings Calendar */}
      <Card title="Earnings Calendar" action="30일 이내">
        {earningsData?.upcoming_earnings && earningsData.upcoming_earnings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {earningsData.upcoming_earnings.map((e: UpcomingEarning) => {
              const rm = EARNINGS_RISK_META[e.risk_level] ?? EARNINGS_RISK_META.med;
              const tierLabel = e.relevance_tier === 'imminent' ? '임박' : e.relevance_tier === 'approaching' ? '진입권' : '관망';
              const tierColor = e.relevance_tier === 'imminent' ? 'var(--bear)' : e.relevance_tier === 'approaching' ? 'var(--warn)' : 'var(--fg-subtle)';
              return (
                <div key={e.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, width: 40, fontFamily: 'var(--mono)' }}>{e.symbol}</span>
                  <span style={{ color: 'var(--fg-muted)', flex: 1 }}>
                    {e.earnings_date.slice(5)} · {e.days_until}일 후
                  </span>
                  {e.eps_estimate == null && (
                    <span style={{ fontSize: 9.5, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>추정치 미형성</span>
                  )}
                  <span style={{ fontSize: 9.5, color: tierColor, fontWeight: 600 }}>{tierLabel}</span>
                  <span className={`badge ${rm.color}`} style={{ fontSize: 10 }}>
                    {rm.dot} {e.risk_level.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
            {earningsData === null ? 'Earnings 로딩 중...' : '30일 이내 어닝 없음'}
          </div>
        )}
      </Card>

      {/* Regime gauge */}
      <Card title="Risk Regime" action="5요소 종합">
        {regimeData ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RadialGauge value={regimeData.total ?? 0} size={100} label={regimeData.total ?? '—'} sublabel="/ 100" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              <span className={'badge ' + (regimeData.regime === 'CONSTRUCTIVE' ? 'teal' : 'em')} style={{ alignSelf: 'flex-start' }}>
                {REGIME_LABELS[regimeData.regime]?.[0]} · {REGIME_LABELS[regimeData.regime]?.[1]}
              </span>
              {([
                ['Trend',      regimeData.components.trend,      regimeData.diagnostics?.spy_vs_ema200_pct,    'SPY/EMA200',  '%'],
                ['Breadth',    regimeData.components.breadth,    regimeData.diagnostics?.rsp_minus_spy_60d,   'RSP-SPY 60d', '%'],
                ['Credit',     regimeData.components.credit,     regimeData.diagnostics?.hyg_ief_ratio_chg_pct,'HYG/IEF 30d','%'],
                ['Volatility', regimeData.components.volatility, regimeData.diagnostics?.vix_level,           'VIX',         ''],
                ['Momentum',   regimeData.components.momentum,   regimeData.diagnostics?.spy_roc_20d,         'SPY RoC 20d', '%'],
              ] as [string, number | null, number | null | undefined, string, string][]).map(([label, v, raw, rawLabel, unit]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5 }}>
                  <div style={{ width: 64 }}>
                    <div style={{ color: 'var(--fg-subtle)' }}>{label}</div>
                    {raw !== null && raw !== undefined && (
                      <div style={{ fontSize: 9, color: (v ?? 0) === 0 ? 'var(--bear)' : 'var(--fg-subtle)', letterSpacing: '0.01em' }}>
                        {rawLabel} {raw >= 0 ? '+' : ''}{raw.toFixed(1)}{unit}
                      </div>
                    )}
                  </div>
                  <div className="bar" style={{ flex: 1 }}>
                    <div className="bar__fill" style={{
                      width: ((v ?? 0) / 20 * 100) + '%',
                      background: (v ?? 0) === 0 ? 'var(--bear)' : (v ?? 0) < 8 ? 'var(--warn)' : 'var(--em-500)',
                    }} />
                  </div>
                  <span className="mono" style={{ width: 26, textAlign: 'right', color: (v ?? 0) === 0 ? 'var(--bear)' : 'inherit' }}>
                    {(v ?? 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="subtle">로딩 중...</div>
        )}
      </Card>

      {/* Distribution Days */}
      <Card title="Distribution Days" action="O'Neil · 25거래일">
        {ddData ? (
          <>
            {(['spy', 'qqq'] as const).map(key => {
              const d = ddData[key];
              const cls = d.level === 'OK' ? 'bull' : d.level === 'WARNING' ? 'warn' : 'bear';
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{key.toUpperCase()}</span>
                    <span className={'badge ' + cls}>{d.count}일</span>
                    <small style={{ marginLeft: 'auto', color: 'var(--fg-subtle)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.level}</small>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} style={{
                        flex: 1, height: 10, borderRadius: 2,
                        background: i < d.count ? `var(--${cls === 'warn' ? 'warn' : cls})` : 'var(--bg-subtle)',
                        opacity: i < d.count ? (0.5 + (i / Math.max(d.count, 1)) * 0.5) : 1,
                      }} />
                    ))}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', lineHeight: 1.5 }}>
              OK &lt;4 · WARNING 4~5 · DANGER 6+
            </div>
          </>
        ) : (
          <div className="subtle">로딩 중...</div>
        )}
      </Card>

      {/* Market Breadth */}
      <Card title="Market Breadth" action="SPY vs RSP">
        {([
          ['SPY',  spy,  '시가총액'],
          ['RSP',  rsp,  '동일가중'],
          ['MAGS', mags, 'Mag 7'],
          ['IWM',  iwm,  'Small Cap'],
        ] as [string, MacroItem | undefined, string][]).map(([label, m, sub]) => {
          if (!m) return null;
          const up = (m.change_pct_5d ?? 0) >= 0;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 11.5 }}>
              <div style={{ width: 56 }}>
                <div style={{ fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{sub}</div>
              </div>
              <div className="bar grow" style={{ height: 6 }}>
                <div className="bar__fill" style={{ width: Math.min(100, Math.abs(m.change_pct_5d ?? 0) * 30) + '%', background: up ? 'var(--bull)' : 'var(--bear)' }} />
              </div>
              <span className={'mono ' + (up ? 'chg up' : 'chg down')} style={{ width: 52, textAlign: 'right' }}>
                {up ? '+' : ''}{(m.change_pct_5d ?? 0).toFixed(2)}%
              </span>
            </div>
          );
        })}
        {rsp && spy && (rsp.change_pct_5d ?? 0) < (spy.change_pct_5d ?? 0) && (
          <div style={{ fontSize: 10.5, color: 'var(--warn)', marginTop: 8, padding: '4px 8px', background: 'var(--warn-soft)', borderRadius: 6 }}>
            ⚠ RSP &lt; SPY — Mag7 주도형 협소 랠리
          </div>
        )}
      </Card>

      {/* VIX Panel */}
      <Card title="Volatility · VIX" action={backward ? '⚠ 백워데이션' : '정상'}>
        {vix ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 8 }}>
              {([
                ['^VIX', vix, 'VIX'],
                ['^VIX9D', vix9d, '9일'],
              ] as [string, MacroItem | undefined, string][]).map(([, m, l]) => (
                m ? (
                  <div key={l}>
                    <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{(m.price ?? 0).toFixed(2)}</div>
                    <div className={'mono ' + ((m.change_pct_1d ?? 0) >= 0 ? 'chg up' : 'chg down')} style={{ fontSize: 10.5 }}>
                      {(m.change_pct_1d ?? 0) >= 0 ? '+' : ''}{(m.change_pct_1d ?? 0).toFixed(2)}%
                    </div>
                  </div>
                ) : null
              ))}
            </div>
            <div className="rsi-gauge" style={{ height: 18 }}>
              <div className="marker" style={{ left: `${Math.min(100, ((vix.price ?? 0) / 40) * 100)}%` }} />
            </div>
            <div className="rsi-ticks">
              <span>0</span><span>14</span><span>20</span><span>30</span><span>40+</span>
            </div>
          </>
        ) : <div className="subtle">로딩 중...</div>}
      </Card>

      {/* Credit Stress */}
      <Card title="Credit Stress" action="HYG / IEF 5D">
        {([['HYG', hyg], ['JNK', jnk], ['LQD', lqd], ['IEF', ief]] as [string, MacroItem | undefined][]).map(([label, m]) => {
          if (!m) return null;
          const up = (m.change_pct_5d ?? 0) >= 0;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 11.5 }}>
              <span style={{ width: 36, fontWeight: 600 }}>{label}</span>
              <span style={{ flex: 1, color: 'var(--fg-subtle)', fontSize: 10.5 }}>{m.name}</span>
              <span className="mono" style={{ textAlign: 'right' }}>${(m.price ?? 0).toFixed(2)}</span>
              <span className={'mono ' + (up ? 'chg up' : 'chg down')} style={{ width: 56, textAlign: 'right' }}>
                {up ? '+' : ''}{(m.change_pct_5d ?? 0).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </Card>

      {/* Symbol mini intraday */}
      <Card title={`${symbol} · Intraday`} hint={activeSignals.length ? 'LIVE' : null} action="5m">
        {lastCandle ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
                ${lastCandle.close.toFixed(2)}
              </div>
              {activeSignals.slice(0, 2).map(s => {
                const meta = SIGNAL_BADGE[s];
                return meta ? <span key={s} className={'badge ' + meta[0]}>● {meta[1]}</span> : null;
              })}
            </div>
            {candles.length > 1 && (
              <Sparkline values={candles.slice(-60).map(c => c.close)} width={220} height={52} strokeWidth={1.6} />
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
              {indicators && (
                <>
                  <div><span className="subtle">RSI </span><span className="mono">{(indicators.rsi[lastIdx] ?? 0).toFixed(0)}</span></div>
                  <div><span className="subtle">EMA21 </span><span className="mono">${(indicators.ema21[lastIdx] ?? 0).toFixed(2)}</span></div>
                  <div><span className="subtle">ATR </span><span className="mono">{(indicators.atr[lastIdx] ?? 0).toFixed(2)}</span></div>
                </>
              )}
            </div>
          </>
        ) : <div className="subtle">로딩 중...</div>}
      </Card>

      {/* Daily Heat Strip */}
      <Card title="Daily Heat · 60d" action={symbol}>
        {dailyChg.length > 0 ? (
          <>
            {/* 요약 통계 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className="badge bull" style={{ fontSize: 10.5 }}>↑ {upDays}일 상승</span>
              <span className="badge bear" style={{ fontSize: 10.5 }}>↓ {downDays}일 하락</span>
              <span style={{ marginLeft: 'auto', fontSize: 10.5, color: avgChg >= 0 ? 'var(--bull)' : 'var(--bear)' }} className="mono">
                평균 {avgChg >= 0 ? '+' : ''}{avgChg.toFixed(2)}%/일
              </span>
            </div>

            {/* 타임라인 레이블 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--fg-subtle)', marginBottom: 3 }}>
              <span>← 60일 전</span>
              <span>오늘 →</span>
            </div>

            {/* 열 지도 (3행 × 20열 = 60거래일) */}
            <HeatStrip values={dailyChg} cols={20} rows={3} />

            {/* 범례 + 최대 등락 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 10, color: 'var(--fg-subtle)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bear)', opacity: 0.85 }} />
                <span>하락</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />
                <span>보합</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bull)', opacity: 0.85 }} />
                <span>상승 · 진할수록 큰 변동</span>
              </div>
              <span style={{ marginLeft: 'auto' }}>
                <span style={{ color: 'var(--bull)' }}>최대 +{maxGain.toFixed(1)}%</span>
                {' / '}
                <span style={{ color: 'var(--bear)' }}>{maxLoss.toFixed(1)}%</span>
              </span>
            </div>
          </>
        ) : <div className="subtle">로딩 중...</div>}
      </Card>

      {/* Sector Momentum */}
      <Card title="Sector Momentum" action="5D 수익률">
        {(() => {
          const sectors: [string, string][] = [
            ['SMH', '반도체'],
            ['XLE', '에너지'],
            ['XLY', '소비재'],
            ['XHB', '홈빌더'],
            ['ITA', '방산'],
          ];
          const items = sectors.map(([sym, label]) => ({ sym, label, m: findMacro(macro, sym) })).filter(x => x.m);
          if (items.length === 0) return <div className="subtle">로딩 중...</div>;
          const sorted = [...items].sort((a, b) => (b.m!.change_pct_5d ?? 0) - (a.m!.change_pct_5d ?? 0));
          const maxAbs = Math.max(...sorted.map(x => Math.abs(x.m!.change_pct_5d ?? 0)), 0.1);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {sorted.map(({ sym, label, m }) => {
                const chg = m!.change_pct_5d ?? 0;
                const up = chg >= 0;
                const barW = Math.min(100, (Math.abs(chg) / maxAbs) * 100);
                const aboveEma = m!.above_ema21;
                return (
                  <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 11.5 }}>
                    <div style={{ width: 34, fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 11 }}>{sym}</div>
                    <div style={{ width: 38, fontSize: 10, color: 'var(--fg-subtle)' }}>{label}</div>
                    <div className="bar" style={{ flex: 1, height: 5 }}>
                      <div className="bar__fill" style={{ width: barW + '%', background: up ? 'var(--bull)' : 'var(--bear)' }} />
                    </div>
                    <span className={'mono ' + (up ? 'chg up' : 'chg down')} style={{ width: 50, textAlign: 'right', fontSize: 11 }}>
                      {up ? '+' : ''}{chg.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 9.5, color: aboveEma ? 'var(--bull)' : 'var(--bear)', width: 28, textAlign: 'right' }}>
                      {aboveEma ? '↑EMA' : '↓EMA'}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Card>

      {/* Top watchlist preview */}
      <Card title="Watchlist · Top 3" action="Stage 2 정렬">
        {watchlist.slice(0, 3).map(w => (
          <div key={w.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <span className="sym-pill__badge" style={{ width: 22, height: 22 }}>{w.symbol[0]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{w.symbol}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 11.5 }}>${w.price.toFixed(2)}</div>
            </div>
            <ScorePill score={w.score} />
          </div>
        ))}
        {watchlist.length === 0 && <div className="subtle">로딩 중...</div>}
      </Card>

      {/* 이 화면 데이터 설명 */}
      <div style={{ gridColumn: 'span 4' }}>
        <GlossaryPanel items={OVERVIEW_GLOSSARY} />
      </div>
    </div>
  );
}
