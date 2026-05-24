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
import { MacroItem } from '@/app/types';

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

  const backward = vix && vix9d ? vix.price !== null && vix9d.price !== null && (vix.price ?? 0) > (vix9d.price ?? 0) : false;

  return (
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: 'auto auto auto', alignContent: 'start' }}
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
            {regimeData ? (
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
              <div style={{ color: 'var(--fg-muted)' }}>시장 데이터 로딩 중...</div>
            )}
          </div>
        </div>
      </div>

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
                ['Trend',      regimeData.components.trend],
                ['Breadth',    regimeData.components.breadth],
                ['Credit',     regimeData.components.credit],
                ['Volatility', regimeData.components.volatility],
                ['Momentum',   regimeData.components.momentum],
              ] as [string, number | null][]).map(([label, v]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5 }}>
                  <span style={{ width: 64, color: 'var(--fg-subtle)' }}>{label}</span>
                  <div className="bar" style={{ flex: 1 }}>
                    <div className="bar__fill" style={{ width: ((v ?? 0) / 20 * 100) + '%', background: 'var(--em-500)' }} />
                  </div>
                  <span className="mono" style={{ width: 26, textAlign: 'right' }}>{(v ?? 0).toFixed(1)}</span>
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
    </div>
  );
}
