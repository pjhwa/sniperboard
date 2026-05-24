'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useIntraday } from '@/hooks/useIntraday';
import { useDaily } from '@/hooks/useDaily';
import { Card } from '@/components/ui/Card';
import IntradayChart from '@/components/charts/IntradayChart';
import { ArrowRight } from '@/components/ui/Icons';
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';

const INTRADAY_GLOSSARY: GlossaryItem[] = [
  { term: 'RSI (14)', plain: '상대강도지수. 최근 14봉 기준으로 주가가 얼마나 강한지 0~100으로 나타냅니다. 30 이하면 "너무 많이 떨어져 반등 가능성", 70 이상이면 "과열되어 조정 가능성"을 시사합니다.' },
  { term: 'EMA21 (21봉 지수이동평균)', plain: '최근 21개 봉의 가중 평균 가격입니다. 주가가 이 선 위에 있으면 단기 강세, 아래면 단기 약세입니다. 트레이더들이 지지/저항선으로 자주 활용합니다.' },
  { term: 'EMA50 (50봉 지수이동평균)', plain: '최근 50개 봉의 가중 평균 가격입니다. EMA21보다 느린 중기 추세선으로, EMA21이 EMA50 위에 있으면 상승 추세가 강하다는 신호입니다.' },
  { term: 'ATR (14)', plain: '평균 진폭(Average True Range). 최근 14봉 동안 주가가 평균적으로 얼마나 오르내렸는지를 달러로 나타냅니다. 손절가 설정의 기준이 됩니다.' },
  { term: '21EMA 이격', plain: '현재가와 EMA21의 거리를 %로 나타냅니다. +3.2% 이상이면 평균에서 너무 많이 올라 단기 과열 위험, -2% 이하면 지지선에 접근 중임을 의미합니다.' },
  { term: 'Sniper 신호', plain: '가격이 EMA21(21봉 평균선)에 살짝 닿고 반등하면서 RSI가 38~58 사이일 때 뜨는 매수 신호입니다. 추세 중 가장 좋은 진입 타이밍을 포착합니다.', color: 'var(--bull)' },
  { term: 'VCP (변동성 수축 패턴)', plain: '주가가 신고가를 돌파하면서 거래량이 평소의 2배 이상 급증할 때 나타나는 강력한 돌파 매수 신호입니다. 기관 투자자들의 대량 매수가 확인된 것입니다.', color: 'var(--info)' },
  { term: 'Pullback (눌림목)', plain: '고점 대비 4.5~9% 조정 후 이동평균선에서 지지를 받을 때 나타납니다. 상승 추세가 잠깐 숨 고르기 후 재개될 가능성이 높은 진입 타이밍입니다.', color: 'var(--warn)' },
  { term: 'StrongTrend (강한 추세)', plain: '가격 > EMA21 > EMA50 순서로 정렬되고 RSI가 52~78일 때 표시됩니다. 현재 보유 중인 포지션을 계속 유지(홀딩)하라는 신호입니다.', color: 'var(--teal)' },
  { term: 'Overbought (과열)', plain: 'RSI가 76 이상이고 EMA21에서 +3.2% 이상 떨어진 과열 구간입니다. 일부 물량 분할 매도(익절)를 고려할 타이밍입니다.' },
  { term: 'Downtrend (하락 추세)', plain: '가격이 EMA21 아래에 있고 거래량이 급증한 상태입니다. "떨어지는 칼날을 잡지 말라" — 이 신호가 있을 때는 매수 접근 금지입니다.', color: 'var(--bear)' },
  { term: '진입 Entry / 손절 Stop / 목표 Target', plain: '일봉 기준으로 계산된 트레이드 계획입니다. 진입(어디서 살지), 손절(틀렸을 때 어디서 팔지), 목표(어디까지 먹을지)를 미리 정해두는 것이 핵심입니다.' },
  { term: 'R:R 비율 (Risk:Reward)', plain: '내가 잃을 수 있는 금액 대비 벌 수 있는 금액의 비율입니다. 1:3이면 1만원 잃을 위험에 3만원을 노린다는 뜻으로, 3번 중 1번만 맞아도 수익이 납니다.' },
  { term: '매수 수량 (Position Size)', plain: '계좌 규모와 리스크 %를 바탕으로 계산한 권장 매수 주수입니다. 계좌의 일정 비율만 위험에 노출시켜 한 번의 실패로 큰 타격을 입지 않도록 합니다.' },
];

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
  const [copied, setCopied] = useState(false);
  const [sigGuide, setSigGuide] = useState(false);
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

  function handleCopyEntry() {
    const text = `${symbol} | 진입: $${entry.toFixed(2)} | 손절: $${stop.toFixed(2)} | 목표: $${target.toFixed(2)} | 수량: ${qty > 0 ? qty + '주' : '—'} | R:R 1:3`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // clipboard unavailable (headless / no permission) — silent fail
    });
  }

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
          <button className="btn btn--ghost" onClick={() => setSigGuide(v => !v)}>
            {sigGuide ? '신호 가이드 닫기' : '신호 가이드'}
          </button>
          <button
            className="btn btn--em"
            onClick={handleCopyEntry}
            style={copied ? { background: 'var(--bull)', borderColor: 'var(--bull)' } : undefined}
          >
            {copied ? '복사됨 ✓' : <><span>진입 복사</span> <ArrowRight /></>}
          </button>
        </div>
      </div>

      {/* 신호 가이드 패널 */}
      {sigGuide && (
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <div className="card__hd">
              <h3>신호 가이드 — 각 신호의 의미와 대응 전략</h3>
              <small>6가지 신호</small>
            </div>
            <div className="card__bd">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {Object.entries(SIG_META).map(([key, m]) => (
                  <div key={key} className={`sig ${m.color}`}>
                    <div className="sig__hd">
                      <span className="sig__dot" />
                      <span className="sig__name">{m.name}</span>
                      <span className="sig__action">{m.action}</span>
                    </div>
                    <div className="sig__desc">{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이 화면 데이터 설명 */}
      <div style={{ gridColumn: 'span 2' }}>
        <GlossaryPanel items={INTRADAY_GLOSSARY} />
      </div>
    </div>
  );
}
