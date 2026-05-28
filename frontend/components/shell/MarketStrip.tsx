'use client';

import { useStore } from '@/hooks/useStore';
import { useMacro } from '@/hooks/useMacro';
import { useIntraday } from '@/hooks/useIntraday';
import { usePrePost } from '@/hooks/usePrePost';
import { Sparkline } from '@/components/ui/Sparkline';

const STRIP_SYMBOLS = ['SPY', 'QQQ', 'IWM', '^VIX', 'DX-Y.NYB', 'GLD', 'CL=F'];

export function MarketStrip() {
  const { symbol, timeframe } = useStore();
  const { macroData } = useMacro();
  const { ohlcvData } = useIntraday(symbol, timeframe);
  const { prePostData } = usePrePost(symbol);

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
            {prePostData && (prePostData.market_state === 'PRE' || prePostData.market_state === 'POST') && (() => {
              const isPre = prePostData.market_state === 'PRE';
              const price = isPre ? prePostData.pre_market_price : prePostData.post_market_price;
              const chgPct = isPre ? prePostData.pre_market_change_pct : prePostData.post_market_change_pct;
              if (price == null) return null;
              const up = (chgPct ?? 0) >= 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <span style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isPre ? 'PRE' : 'POST'}
                  </span>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
                    ${price.toFixed(2)}
                  </span>
                  {chgPct != null && (
                    <span style={{ fontSize: 10, color: up ? 'var(--bull)' : 'var(--bear)' }}>
                      {up ? '+' : ''}{chgPct.toFixed(2)}%
                    </span>
                  )}
                </div>
              );
            })()}
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
