'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useIntraday } from '@/hooks/useIntraday';
import { useDaily } from '@/hooks/useDaily';
import { Card } from '@/components/ui/Card';
import IntradayChart from '@/components/charts/IntradayChart';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { G } from '@/app/glossary';
import { t } from '@/app/i18n';
import type { BiLang } from '@/app/i18n';

const S: Record<string, BiLang> = {
  guideTitle:    { en: 'Intraday Guide', ko: 'Intraday 가이드' },
  guide1Heading: { en: 'About this screen', ko: '이 화면은' },
  guide1Body:    { en: 'Shows short-term buy/sell signals on 5-minute candles in real time. Refreshes every 30 seconds and calculates entry timing and position size.', ko: '5분봉 기준 단기 매수·매도 신호를 실시간으로 보여주는 화면입니다. 30초마다 갱신되며, 진입 타이밍과 포지션 사이즈를 계산합니다.' },
  guide2Heading: { en: 'How to read key indicators', ko: '핵심 지표 읽는 법' },
  guide2Body:    { en: 'Of the 6 signals, VCP·Sniper·Pullback are buy opportunities, StrongTrend means hold, Overbought means consider partial exit, and Downtrend means avoid buying. RSI and EMA deviation determine current overbought/oversold status.', ko: '6개 신호 중 VCP·Sniper·Pullback은 매수 기회, StrongTrend는 보유 유지, Overbought는 익절 검토, Downtrend는 매수 금지 신호입니다. RSI와 EMA 이격은 현재 과열/과매도 여부를 판단합니다.' },
  guide3Heading: { en: 'How to use now', ko: '지금 이렇게 쓰세요' },
  guide3Body:    { en: 'Check active signals → Verify R:R ≥ 2:1 → Calculate position size (stop × shares ≤ 1-2% of account) → Enter. Watch if no signal.', ko: '활성 신호 확인 → R:R 비율 2:1 이상 여부 확인 → 포지션 사이즈 계산(손절폭 × 수량 ≤ 계좌의 1~2%) → 진입. 신호가 없으면 관망합니다.' },
  noSignal:      { en: 'No active signals', ko: '현재 활성 신호 없음' },
  noSignalSub:   { en: 'Lights up automatically when conditions are met', ko: '조건 부합 시 자동 점등' },
  chartLoading:  { en: 'Loading chart...', ko: '차트 로딩 중...' },
  ema21Dev:      { en: 'EMA21 Dev', ko: '이격 21EMA' },
  entryLabel:    { en: 'Entry', ko: '진입 Entry' },
  stopLabel:     { en: 'Stop', ko: '손절 Stop' },
  targetLabel:   { en: 'Target', ko: '목표 Target' },
  qtyLabel:      { en: 'Qty', ko: '매수 수량' },
  qtyUnit:       { en: 'sh', ko: '주' },
  sigGuideOpen:  { en: 'Signal Guide', ko: '신호 가이드' },
  sigGuideClose: { en: 'Close Guide', ko: '신호 가이드 닫기' },
  sigGuideTitle: { en: 'Signal Guide — Meaning and Response Strategy for Each Signal', ko: '신호 가이드 — 각 신호의 의미와 대응 전략' },
  sigGuideCount:    { en: '6 signals',            ko: '6가지 신호' },
  activeSignals:    { en: 'Active Signals',        ko: '활성 신호' },
  rsiIndicators:    { en: 'RSI(14) · Indicators',  ko: 'RSI(14) · 지표' },
};

const SIG_META: Record<string, { name: string; color: string; action: BiLang; desc: BiLang }> = {
  sniper:       { name: 'Sniper',      color: 'color-bull',   action: { en: 'Entry',         ko: '진입' },      desc: { en: 'EMA21 touch + bounce · RSI 38-58', ko: '21EMA 터치 후 반등 · RSI 38~58' } },
  vcp:          { name: 'VCP',         color: 'color-info',   action: { en: 'Breakout Entry', ko: '돌파 진입' }, desc: { en: '30-candle high + 2x volume',        ko: '30봉 신고가 + 거래량 2배' } },
  pullback:     { name: 'Pullback',    color: 'color-warn',   action: { en: 'Pullback Entry', ko: '눌림 진입' }, desc: { en: '4.5-9% correction + EMA support',   ko: '4.5~9% 조정 + EMA 지지' } },
  strong_trend: { name: 'StrongTrend', color: 'color-teal',   action: { en: 'Hold',          ko: '홀딩' },      desc: { en: 'Price > EMA21 > EMA50 · trend accel', ko: '가격 > EMA21 > EMA50 · 추세 가속' } },
  overbought:   { name: 'Overbought',  color: 'color-orange', action: { en: 'Partial Exit',  ko: '분할 익절' }, desc: { en: 'RSI ≥ 76 · deviation +3.2%',         ko: 'RSI ≥ 76 · 이격 +3.2%' } },
  downtrend:    { name: 'Downtrend',   color: 'color-bear',   action: { en: 'Avoid',         ko: '접근 금지' }, desc: { en: 'Negative slope · volume surge',      ko: '음의 기울기 · 거래량 급증' } },
};

const SIG_INFO: Record<string, { term: BiLang; body: BiLang }> = {
  sniper:       G.signal_sniper,
  vcp:          G.signal_vcp,
  pullback:     G.signal_pullback,
  strong_trend: G.signal_strong_trend,
  overbought:   G.signal_overbought,
  downtrend:    G.signal_downtrend,
};

export function IntradayBoard() {
  const [tf, setTf] = useState('5m');
  const [sigGuide, setSigGuide] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const handler = () => setGuideOpen(true);
    document.addEventListener('guide:open', handler);
    return () => document.removeEventListener('guide:open', handler);
  }, []);
  const { symbol, rrAccount, rrRiskPct, setRrAccount, setRrRiskPct, locale } = useStore();
  const { ohlcvData, isLoading } = useIntraday(symbol, tf);
  const { dailyData } = useDaily(symbol);

  const INTRADAY_GUIDE = (): GuideSection[] => [
    { heading: t(S.guide1Heading, locale), body: t(S.guide1Body, locale) },
    { heading: t(S.guide2Heading, locale), body: t(S.guide2Body, locale) },
    { heading: t(S.guide3Heading, locale), body: t(S.guide3Body, locale) },
  ];

  const candles = ohlcvData?.candles ?? [];
  const signals = ohlcvData?.signals;
  const indicators = ohlcvData?.indicators;
  const lastIdx = candles.length - 1;
  const lastCandle = candles[lastIdx];

  const activeSignals = signals
    ? Object.keys(SIG_META).filter(k => {
        const arr = (signals as unknown as Record<string, boolean[]>)[k];
        return arr ? arr[lastIdx] : false;
      })
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
    <div className="board-wrap">
      <BoardGuidePanel title={t(S.guideTitle, locale)} sections={INTRADAY_GUIDE()} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
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
            {(['1m', '5m', '15m', '1h'] as const).map(tfOpt => (
              <button key={tfOpt} className={tf === tfOpt ? 'on' : ''} onClick={() => setTf(tfOpt)}>{tfOpt}</button>
            ))}
          </div>
        </div>
        <div className="card__bd" style={{ paddingTop: 0 }}>
          {isLoading ? (
            <div className="subtle" style={{ padding: 24 }}>{t(S.chartLoading, locale)}</div>
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
      <Card title={t(S.activeSignals, locale)} hint={activeSignals.length ? 'LIVE' : null}>
        <div className="col">
          {activeSignals.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>
              {t(S.noSignal, locale)}<br />
              <span style={{ fontSize: 10.5 }}>{t(S.noSignalSub, locale)}</span>
            </div>
          )}
          {activeSignals.map(s => {
            const m = SIG_META[s];
            return (
              <div key={s} className={`sig active ${m.color}`}>
                <div className="sig__hd">
                  <span className="sig__dot" />
                  <span className="sig__name">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {m.name}
                      {SIG_INFO[s] && <InfoPopover term={t(SIG_INFO[s].term, locale)} body={t(SIG_INFO[s].body, locale)} />}
                    </span>
                  </span>
                  <span className="sig__action">{t(m.action, locale)}</span>
                </div>
                <div className="sig__desc">{t(m.desc, locale)}</div>
              </div>
            );
          })}
          {Object.keys(SIG_META).filter(s => !activeSignals.includes(s)).slice(0, 4 - activeSignals.length).map(s => {
            const m = SIG_META[s];
            return (
              <div key={s} className={`sig ${m.color}`} style={{ opacity: 0.4 }}>
                <div className="sig__hd">
                  <span className="sig__dot" />
                  <span className="sig__name">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {m.name}
                      {SIG_INFO[s] && <InfoPopover term={t(SIG_INFO[s].term, locale)} body={t(SIG_INFO[s].body, locale)} />}
                    </span>
                  </span>
                  <span className="sig__action">{t(m.action, locale)}</span>
                </div>
                <div className="sig__desc">{t(m.desc, locale)}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* RSI + indicators */}
      <Card title={t(S.rsiIndicators, locale)}>
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
              <div className="subtle" style={{ fontSize: 10 }}>{t(S.ema21Dev, locale)}</div>
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
            <label>{t(S.entryLabel, locale)}</label>
            <span className="v entry">${entry.toFixed(2)}</span>
          </div>
          <div className="field">
            <label>{t(S.stopLabel, locale)}</label>
            <span className="v stop">${stop.toFixed(2)}</span>
          </div>
          <div className="field">
            <label>{t(S.targetLabel, locale)}</label>
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
            <label>{t(S.qtyLabel, locale)}</label>
            <span className="v" style={{ color: 'var(--em-500)' }}>{qty > 0 ? `${qty} ${t(S.qtyUnit, locale)}` : '—'}</span>
          </div>
          <div className="spacer" />
          <button className="btn btn--ghost" onClick={() => setSigGuide(v => !v)}>
            {sigGuide ? t(S.sigGuideClose, locale) : t(S.sigGuideOpen, locale)}
          </button>
        </div>
      </div>

      {/* Signal guide panel */}
      {sigGuide && (
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <div className="card__hd">
              <h3>{t(S.sigGuideTitle, locale)}</h3>
              <small>{t(S.sigGuideCount, locale)}</small>
            </div>
            <div className="card__bd">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {Object.entries(SIG_META).map(([key, m]) => (
                  <div key={key} className={`sig ${m.color}`}>
                    <div className="sig__hd">
                      <span className="sig__dot" />
                      <span className="sig__name">{m.name}</span>
                      <span className="sig__action">{t(m.action, locale)}</span>
                    </div>
                    <div className="sig__desc">{t(m.desc, locale)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
