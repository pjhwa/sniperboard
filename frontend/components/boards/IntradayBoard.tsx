'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useIntraday } from '@/hooks/useIntraday';
import { useDaily } from '@/hooks/useDaily';
import { Card } from '@/components/ui/Card';
import IntradayChart from '@/components/charts/IntradayChart';
import { ArrowRight } from '@/components/ui/Icons';

const SIG_META: Record<string, { name: string; color: string; action: string; desc: string }> = {
  sniper:       { name: 'Sniper',      color: 'color-bull',   action: '진입',      desc: '21EMA 터치 후 반등 · RSI 38~58' },
  vcp:          { name: 'VCP',         color: 'color-info',   action: '돌파 진입', desc: '30봉 신고가 + 거래량 2배' },
  pullback:     { name: 'Pullback',    color: 'color-warn',   action: '눌림 진입', desc: '4.5~9% 조정 + EMA 지지' },
  strong_trend: { name: 'StrongTrend', color: 'color-teal',   action: '홀딩',      desc: '가격 > EMA21 > EMA50 · 추세 가속' },
  overbought:   { name: 'Overbought',  color: 'color-orange', action: '분할 익절', desc: 'RSI ≥ 76 · 이격 +3.2%' },
  downtrend:    { name: 'Downtrend',   color: 'color-bear',   action: '접근 금지', desc: '음의 기울기 · 거래량 급증' },
};

export function IntradayBoard() {
  const [tf, setTf] = useState('5m');
  const { symbol, rrAccount, rrRiskPct, setRrAccount, setRrRiskPct } = useStore();
  const { ohlcvData, isLoading } = useIntraday(symbol, tf);
  const { dailyData } = useDaily(symbol);

  const candles = ohlcvData?.candles ?? [];
  const signals = ohlcvData?.signals;
  const indicators = ohlcvData?.indicators;
  const lastIdx = candles.length - 1;
  const lastCandle = candles[lastIdx];

  const activeSignals = signals
    ? Object.keys(SIG_META).filter(k => signals[k as keyof typeof signals][lastIdx])
    : [];

  const rsiVal = indicators?.rsi[lastIdx] ?? 0;
  const atrVal = indicators?.atr[lastIdx] ?? 0;

  const stage2 = dailyData?.stage2;
  const entry = stage2?.entry ?? 0;
  const stop = stage2?.stop ?? 0;
  const target = stage2?.target ?? 0;

  const accountNum = parseFloat(rrAccount.replace(/,/g, '')) || 100000;
  const riskPct = parseFloat(rrRiskPct) || 1;
  const riskAmt = accountNum * (riskPct / 100);
  const qty = stop > 0 && entry > stop ? Math.floor(riskAmt / (entry - stop)) : 0;

  return (
    <div
      className="board fade-in"
      style={{ gridTemplateColumns: '1fr 300px', gridTemplateRows: 'auto 1fr auto' }}
    >
      {/* Chart */}
      <div className="card" style={{ gridRow: 'span 2' }}>
        <div className="card__hd">
          <h3>{symbol} · Intraday</h3>
          <span className="card-flag live">LIVE · 30s</span>
          <div className="seg" style={{ marginLeft: 'auto' }}>
            {(['1m', '5m', '15m', '1h'] as const).map(t => (
              <button key={t} className={tf === t ? 'on' : ''} onClick={() => setTf(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="card__bd" style={{ paddingTop: 0 }}>
          {isLoading ? (
            <div className="subtle" style={{ padding: 24 }}>차트 로딩 중...</div>
          ) : ohlcvData ? (
            <IntradayChart
              candles={ohlcvData.candles}
              signals={ohlcvData.signals}
              indicators={ohlcvData.indicators}
            />
          ) : null}
        </div>
      </div>

      {/* Active signals */}
      <Card title="Active Signals" hint={activeSignals.length ? 'LIVE' : null}>
        <div className="col">
          {activeSignals.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>
              현재 활성 신호 없음<br />
              <span style={{ fontSize: 10.5 }}>조건 부합 시 자동 점등</span>
            </div>
          )}
          {activeSignals.map(s => {
            const m = SIG_META[s];
            return (
              <div key={s} className={`sig active ${m.color}`}>
                <div className="sig__hd">
                  <span className="sig__dot" />
                  <span className="sig__name">{m.name}</span>
                  <span className="sig__action">{m.action}</span>
                </div>
                <div className="sig__desc">{m.desc}</div>
              </div>
            );
          })}
          {Object.keys(SIG_META).filter(s => !activeSignals.includes(s)).slice(0, 4 - activeSignals.length).map(s => {
            const m = SIG_META[s];
            return (
              <div key={s} className={`sig ${m.color}`} style={{ opacity: 0.4 }}>
                <div className="sig__hd">
                  <span className="sig__dot" />
                  <span className="sig__name">{m.name}</span>
                  <span className="sig__action">{m.action}</span>
                </div>
                <div className="sig__desc">{m.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* RSI + indicators */}
      <Card title="RSI(14) · Indicators">
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>RSI(14)</span>
            <span className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{rsiVal.toFixed(1)}</span>
          </div>
          <div className="rsi-gauge">
            <div className="marker" style={{ left: `${rsiVal}%` }} />
          </div>
          <div className="rsi-ticks"><span>0</span><span>30</span><span>50</span><span>70</span><span>100</span></div>
        </div>
        <div className="divider" />
        {lastCandle && indicators && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11 }}>
            <div><div className="subtle" style={{ fontSize: 10 }}>Price</div><div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>${lastCandle.close.toFixed(2)}</div></div>
            <div><div className="subtle" style={{ fontSize: 10 }}>Volume</div><div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{(lastCandle.volume / 1000).toFixed(0)}K</div></div>
            <div><div className="subtle" style={{ fontSize: 10 }}>EMA21</div><div className="mono" style={{ fontSize: 12 }}>${(indicators.ema21[lastIdx] ?? 0).toFixed(2)}</div></div>
            <div><div className="subtle" style={{ fontSize: 10 }}>EMA50</div><div className="mono" style={{ fontSize: 12 }}>${(indicators.ema50[lastIdx] ?? 0).toFixed(2)}</div></div>
            <div><div className="subtle" style={{ fontSize: 10 }}>ATR(14)</div><div className="mono" style={{ fontSize: 12 }}>{atrVal.toFixed(2)}</div></div>
            <div>
              <div className="subtle" style={{ fontSize: 10 }}>이격 21EMA</div>
              <div className="mono" style={{ fontSize: 12 }}>
                {indicators.ema21[lastIdx] ? (((lastCandle.close - indicators.ema21[lastIdx]) / indicators.ema21[lastIdx]) * 100).toFixed(2) : '—'}%
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Action bar */}
      <div style={{ gridColumn: 'span 2' }}>
        <div className="act-bar">
          <div className="field">
            <label>진입 Entry</label>
            <span className="v entry">${entry.toFixed(2)}</span>
          </div>
          <div className="field">
            <label>손절 Stop</label>
            <span className="v stop">${stop.toFixed(2)}</span>
          </div>
          <div className="field">
            <label>목표 Target</label>
            <span className="v target">${target.toFixed(2)}</span>
          </div>
          <div className="field">
            <label>R:R</label>
            <span className="v">1 : 3.00</span>
          </div>
          <div className="field">
            <label>Risk %</label>
            <input className="inp" value={rrRiskPct} onChange={e => setRrRiskPct(e.target.value)} style={{ width: 56 }} />
          </div>
          <div className="field">
            <label>Account $</label>
            <input className="inp" value={rrAccount} onChange={e => setRrAccount(e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="field">
            <label>매수 수량</label>
            <span className="v" style={{ color: 'var(--em-500)' }}>{qty > 0 ? `${qty} 주` : '—'}</span>
          </div>
          <div className="spacer" />
          <button className="btn btn--ghost">신호 가이드</button>
          <button className="btn btn--em">진입 복사 <ArrowRight /></button>
        </div>
      </div>
    </div>
  );
}
