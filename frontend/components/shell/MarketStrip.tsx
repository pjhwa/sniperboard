'use client';

import { useStore } from '@/hooks/useStore';
import { useMacro } from '@/hooks/useMacro';
import { useIntraday } from '@/hooks/useIntraday';
import { Sparkline } from '@/components/ui/Sparkline';

const STRIP_SYMBOLS = ['SPY', 'QQQ', 'IWM', '^VIX', 'DX-Y.NYB', 'GLD', 'CL=F'];

export function MarketStrip() {
  const { symbol, timeframe } = useStore();
  const { macroData } = useMacro();
  const { ohlcvData } = useIntraday(symbol, timeframe);

  const macro = macroData?.macro ?? [];
  const items = STRIP_SYMBOLS.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as typeof macro;

  const candles = ohlcvData?.candles ?? [];
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[Math.max(0, candles.length - 24)];
  const chg = lastCandle && prevCandle
    ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
    : null;
  const sparkValues = candles.slice(-30).map(c => c.close);

  return (
    <div className="strip">
      {lastCandle && (
        <div className="strip__cell" style={{ background: 'var(--bg-muted)', minWidth: 220 }}>
          <span className="sym-pill__badge" style={{ width: 28, height: 28, fontSize: 12 }}>
            {symbol.slice(0, 1)}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{symbol}</span>
              {chg !== null && (
                <span className={'badge ' + (chg >= 0 ? 'bull' : 'bear')} style={{ fontSize: 10 }}>
                  {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>
              ${lastCandle.close.toFixed(2)}
            </div>
          </div>
          {sparkValues.length > 1 && (
            <Sparkline values={sparkValues} width={72} height={28} />
          )}
        </div>
      )}

      {items.map(m => {
        const up = (m.change_pct_1d ?? 0) >= 0;
        const displaySym = m.symbol.replace('^', '').replace('-Y.NYB', 'Y');
        return (
          <div key={m.symbol} className="strip__cell">
            <div>
              <div className="strip__label" style={{ marginBottom: 1 }}>{displaySym}</div>
              <div className="strip__val">
                {m.price != null ? m.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
              </div>
            </div>
            {m.change_pct_1d != null && (
              <div className={'strip__chg ' + (up ? 'chg up' : 'chg down')}>
                {up ? '▲' : '▼'} {Math.abs(m.change_pct_1d).toFixed(2)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
