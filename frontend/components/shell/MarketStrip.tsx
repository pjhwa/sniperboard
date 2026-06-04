'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useMacro } from '@/hooks/useMacro';
import { useIntraday } from '@/hooks/useIntraday';
import { usePrePost } from '@/hooks/usePrePost';
import { Sparkline } from '@/components/ui/Sparkline';
import { t } from '@/app/i18n';

const STRIP_SYMBOLS = ['SPY', 'QQQ', 'IWM', '^VIX', 'DX-Y.NYB', 'GLD', 'CL=F', 'BTC-USD', 'KRW=X'];

// 심볼별 레이블 override (displaySym 변환으로 처리 불가한 경우)
const STRIP_LABEL_OVERRIDE: Record<string, string> = {
  'KRW=X': 'USD/KRW',
};

// 심볼별 가격 포맷터
const STRIP_PRICE_FORMAT: Record<string, (price: number) => string> = {
  'KRW=X': (p) => Math.round(p).toLocaleString('en-US'),
};

const SYMBOL_TOOLTIPS: Record<string, { en: string; ko: string }> = {
  'SPY':      { en: 'S&P 500 ETF — tracks 500 large US stocks. Market temperature gauge', ko: 'S&P 500 ETF — 미국 대형주 500개 추종. 전체 시장 체온계' },
  'QQQ':      { en: 'Nasdaq 100 ETF — tech-heavy large growth stocks (Apple, Nvidia, etc.)', ko: '나스닥 100 ETF — 애플·엔비디아 등 기술주 중심 대형 성장주' },
  'IWM':      { en: 'Russell 2000 ETF — 2000 small-cap US stocks. Reflects domestic economy and risk appetite', ko: '러셀 2000 ETF — 미국 소형주 2000개. 내수 경기·리스크 선호도 반영' },
  '^VIX':     { en: 'VIX Fear Index — implied volatility of S&P500 options. >20 = caution, >30 = fear', ko: 'VIX 공포 지수 — S&P 500 옵션 내재변동성. 20↑ 주의, 30↑ 공포 구간' },
  'DX-Y.NYB': { en: 'DXY Dollar Index — dollar strength vs. 6 major currencies. Strong dollar → risk assets tend to fall', ko: 'DXY 달러 인덱스 — 6개 주요 통화 대비 달러 강도. 달러↑ = 위험자산↓ 경향' },
  'GLD':      { en: 'Gold ETF — safe-haven and inflation hedge. Inverse to dollar and rates', ko: '금 ETF — 안전자산·인플레이션 헤지. 달러·금리와 역관계' },
  'CL=F':     { en: 'WTI Crude Oil Futures — West Texas crude. Leading indicator for energy sector and inflation', ko: 'WTI 원유 선물 — 서부 텍사스산 원유. 에너지 섹터·인플레이션 선행 지표' },
  'BTC-USD':  { en: 'Bitcoin — digital gold and risk sentiment proxy. Often leads risk-on/off moves', ko: '비트코인 — 디지털 금이자 리스크 심리 대리지표. 위험선호/회피 움직임을 선행하는 경향' },
  'KRW=X':    { en: 'USD/KRW — dollar to Korean Won. Higher = weaker won vs. dollar', ko: '달러/원 환율 — 숫자가 높을수록 원화 약세 (1달러에 필요한 원화)' },
};

export function MarketStrip() {
  const { symbol, timeframe, locale } = useStore();
  const { macroData } = useMacro();
  const { ohlcvData } = useIntraday(symbol, timeframe);
  const { prePostData } = usePrePost(symbol);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const macro = macroData?.macro ?? [];
  const items = STRIP_SYMBOLS.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as typeof macro;

  const candles = ohlcvData?.candles ?? [];
  const lastCandle = candles[candles.length - 1];
  // PRE/POST/OVERNIGHT 상태에서는 공식 종가(regular_close)를, 그 외엔 인트라데이 마지막 캔들 사용
  const isPP = prePostData?.market_state === 'PRE' || prePostData?.market_state === 'POST' || prePostData?.market_state === 'OVERNIGHT';
  const displayPrice = isPP && prePostData?.regular_close != null
    ? prePostData.regular_close
    : lastCandle?.close ?? null;
  // regularMarketChangePercent가 있으면 사용 (전일 대비 일별 변화율); 없으면 폴백
  const chg = prePostData?.regular_change_pct != null
    ? prePostData.regular_change_pct
    : (lastCandle ? ((lastCandle.close - (candles[Math.max(0, candles.length - 24)]?.close ?? lastCandle.close)) / (candles[Math.max(0, candles.length - 24)]?.close ?? lastCandle.close)) * 100 : null);
  const sparkValues = candles.slice(-30).map(c => c.close);

  return (
    <div className="strip hide-mobile">
      {(lastCandle || displayPrice != null) && (
        <div className="strip__cell" style={{ background: 'var(--bg-muted)', minWidth: 220 }}>
          <span className="sym-pill__badge" style={{ width: 28, height: 28, fontSize: 13 }}>
            {symbol.slice(0, 1)}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{symbol}</span>
              {chg !== null && (
                <span className={'badge ' + (chg >= 0 ? 'bull' : 'bear')} style={{ fontSize: 11 }}>
                  {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
              ${(displayPrice ?? lastCandle!.close).toFixed(2)}
            </div>
            {prePostData && (() => {
              const { market_state, pre_market_price, pre_market_change_pct, post_market_price, post_market_change_pct, overnight_price, overnight_change_pct } = prePostData;
              let price: number | null = null;
              let chgPct: number | null = null;
              let label: string | null = null;
              let dimmed = false;
              if (market_state === 'PRE' && pre_market_price != null) {
                price = pre_market_price; chgPct = pre_market_change_pct; label = 'PRE';
              } else if (market_state === 'POST' && post_market_price != null) {
                price = post_market_price; chgPct = post_market_change_pct; label = 'POST';
              } else if (market_state === 'OVERNIGHT' && overnight_price != null) {
                price = overnight_price; chgPct = overnight_change_pct; label = '🌙';
              } else if (market_state === 'CLOSED' && post_market_price != null) {
                price = post_market_price; chgPct = post_market_change_pct; label = 'POST'; dimmed = true;
              }
              if (price == null) return null;
              const up = (chgPct ?? 0) >= 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1, opacity: dimmed ? 0.45 : 1 }}>
                  <span style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                  </span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                    ${price.toFixed(2)}
                  </span>
                  {chgPct != null && (
                    <span style={{ fontSize: 11, color: up ? 'var(--bull)' : 'var(--bear)' }}>
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
        const displaySym = STRIP_LABEL_OVERRIDE[m.symbol]
          ?? m.symbol.replace('^', '').replace('-Y.NYB', 'Y');
        const formatPrice = STRIP_PRICE_FORMAT[m.symbol]
          ?? ((p: number) => p.toLocaleString(undefined, { maximumFractionDigits: 2 }));
        return (
          <div
            key={m.symbol}
            className="strip__cell"
            onMouseEnter={e => {
              if (!SYMBOL_TOOLTIPS[m.symbol]) return;
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setTooltip({ text: SYMBOL_TOOLTIPS[m.symbol]?.[locale] ?? '', x: rect.left + rect.width / 2, y: rect.bottom + 6 });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            <div>
              <div className="strip__label" style={{ marginBottom: 1 }}>{displaySym}</div>
              <div className="strip__val">
                {m.price != null ? formatPrice(m.price) : '—'}
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
      {tooltip && (
        <div className="strip__tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
      <button
        className="guide-btn"
        style={{ position: 'relative', top: 'unset', right: 'unset', marginLeft: 'auto', marginRight: 14, alignSelf: 'center', flexShrink: 0 }}
        onClick={() => document.dispatchEvent(new Event('guide:open'))}
      >
        {locale === 'en' ? '? Guide' : '? 가이드'}
      </button>
    </div>
  );
}
