'use client';

import { useStore } from '@/hooks/useStore';
import { useCapLeaderboard, CapLeaderboardItem } from '@/hooks/useCapLeaderboard';
import { Sparkline } from '@/components/ui/Sparkline';
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { useState, useEffect } from 'react';
import { t } from '@/app/i18n';

const S = {
  title:          { en: 'Market Cap TOP 15', ko: '시총 TOP 15' },
  subtitle:       { en: 'CAP20 pool · sorted by market cap', ko: 'CAP20 풀 기준 · 시가총액 순' },
  lastUpdated:    { en: 'Updated', ko: '업데이트' },
  refresh:        { en: 'Refresh', ko: '새로고침' },
  loading:        { en: 'Loading leaderboard (first load ~20s)…', ko: '리더보드 로딩 중 (최초 로딩 ~20초)…' },
  error:          { en: 'Failed to load. Retry?', ko: '로딩 실패. 재시도?' },
  rank:           { en: '#',          ko: '#' },
  rankChg:        { en: 'Chg',        ko: '변동' },
  symbol:         { en: 'Symbol',     ko: '심볼' },
  marketCap:      { en: 'Market Cap', ko: '시총' },
  price:          { en: 'Price',      ko: '현재가' },
  change1d:       { en: '1D %',       ko: '등락' },
  trend:          { en: 'Trend',      ko: '트렌드' },
  week52pos:      { en: '52W Pos',    ko: '52W 위치' },
  guideTitle:     { en: 'Market Cap TOP 15 Guide', ko: '시총 TOP 15 가이드' },
  guide1Heading:  { en: 'This screen', ko: '이 화면은' },
  guide1Body:     { en: 'Shows the TOP 15 stocks by market cap from a pool of 20 large-cap stocks. Data is cached for 1 hour.', ko: '대형주 CAP20 풀에서 시가총액 상위 15개 종목을 보여줍니다. 데이터는 1시간 캐시됩니다.' },
  guide2Heading:  { en: 'Rank change', ko: '순위변동' },
  guide2Body:     { en: "↑ / ↓ shows movement vs. the previous day's snapshot stored in SQLite. \"NEW\" means the symbol entered the TOP 15 for the first time.", ko: '↑ / ↓ 는 SQLite에 저장된 전일 스냅샷 대비 변동입니다. "NEW"는 처음 TOP 15 진입.' },
  guide3Heading:  { en: '52W Position bar', ko: '52W 위치 막대' },
  guide3Body:     { en: 'Shows where the current price sits in the 52-week range. 100% = at 52W high. Right side is better for momentum.', ko: '현재가가 52주 범위의 어디에 위치하는지 표시합니다. 100% = 52주 고가. 오른쪽일수록 모멘텀 강함.' },
};

function GUIDE(locale: 'en' | 'ko'): GuideSection[] {
  return [
    { heading: t(S.guide1Heading, locale), body: t(S.guide1Body, locale) },
    { heading: t(S.guide2Heading, locale), body: t(S.guide2Body, locale) },
    { heading: t(S.guide3Heading, locale), body: t(S.guide3Body, locale) },
  ];
}

function fmtCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(1)}B`;
  return `$${(cap / 1e6).toFixed(0)}M`;
}

function RankChangeBadge({ change }: { change: number | null }) {
  if (change === null) {
    return <span style={{ fontSize: 11, color: 'var(--info)', fontWeight: 700 }}>NEW</span>;
  }
  if (change === 0) {
    return <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>—</span>;
  }
  const up = change > 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: up ? 'var(--bull)' : 'var(--bear)' }}>
      {up ? `↑${change}` : `↓${Math.abs(change)}`}
    </span>
  );
}

function Week52Bar({ price, low, high }: { price: number; low: number; high: number }) {
  const range = high - low;
  const pct = range > 0 ? Math.max(0, Math.min(100, ((price - low) / range) * 100)) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 72, height: 6, borderRadius: 3,
        background: 'var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: `${pct}%`, height: '100%',
          background: pct >= 70 ? 'var(--bull)' : pct >= 40 ? 'var(--warn)' : 'var(--bear)',
          borderRadius: 3,
        }} />
      </div>
      <span style={{ fontSize: 10, color: 'var(--fg-muted)', minWidth: 28 }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

function StructureBadge({ ms }: { ms: string }) {
  const color = ms === 'UPTREND' ? 'var(--bull)' : ms === 'DOWNTREND' ? 'var(--bear)' : 'var(--fg-muted)';
  const label = ms === 'UPTREND' ? '↑' : ms === 'DOWNTREND' ? '↓' : '→';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: 'var(--em-100)', padding: '1px 5px',
      borderRadius: 'var(--r-xs)',
    }}>
      {label} {ms}
    </span>
  );
}

export function MarketCapBoard() {
  const { locale } = useStore();
  const { leaderboard, isLoading, isError, refetch } = useCapLeaderboard();
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const handler = () => setGuideOpen(true);
    window.addEventListener('guide:open', handler);
    return () => window.removeEventListener('guide:open', handler);
  }, []);

  return (
    <div className="board-wrap">
      <BoardGuidePanel title={t(S.guideTitle, locale)} sections={GUIDE(locale)} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <div className="board fade-in" style={{ gridTemplateColumns: '1fr', alignContent: 'start' }}>

        {/* Header card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t(S.title, locale)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{t(S.subtitle, locale)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {leaderboard && (
              <span style={{ fontSize: '0.7rem', color: 'var(--fg-faint)' }}>
                {t(S.lastUpdated, locale)}: {new Date(leaderboard.generated_at).toLocaleTimeString()}
                {leaderboard.cached && ' (캐시)'}
              </span>
            )}
            <button
              className="badge"
              onClick={() => refetch()}
              style={{ cursor: 'pointer', fontSize: 11 }}
            >
              {t(S.refresh, locale)}
            </button>
          </div>
        </div>

        {/* Loading / error */}
        {isLoading && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: '32px 0' }}>
            {t(S.loading, locale)}
          </div>
        )}
        {isError && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--bear)', padding: '32px 0' }}>
            {t(S.error, locale)}
          </div>
        )}

        {/* Table */}
        {leaderboard && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 32, textAlign: 'center' }}>{t(S.rank, locale)}</th>
                  <th style={{ width: 36, textAlign: 'center' }}>{t(S.rankChg, locale)}</th>
                  <th>{t(S.symbol, locale)}</th>
                  <th style={{ textAlign: 'right' }}>{t(S.marketCap, locale)}</th>
                  <th style={{ textAlign: 'right' }}>{t(S.price, locale)}</th>
                  <th style={{ textAlign: 'right' }}>{t(S.change1d, locale)}</th>
                  <th style={{ minWidth: 160 }}>{t(S.trend, locale)}</th>
                  <th style={{ minWidth: 120 }}>{t(S.week52pos, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.items.map((item: CapLeaderboardItem) => {
                  const chgColor = item.change_pct_1d >= 0 ? 'var(--bull)' : 'var(--bear)';
                  return (
                    <tr key={item.symbol}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--em-500)' }}>
                        {item.rank}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <RankChangeBadge change={item.rank_change} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{item.symbol}</div>
                        <div style={{ fontSize: 10, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                          {item.company_name}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)' }}>
                        {fmtCap(item.market_cap)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        ${item.price.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: chgColor, fontFamily: 'var(--mono)' }}>
                        {item.change_pct_1d >= 0 ? '+' : ''}{item.change_pct_1d.toFixed(2)}%
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {item.spark.length > 1 && (
                            <Sparkline
                              values={item.spark}
                              width={80}
                              height={32}
                              fill={true}
                              strokeWidth={1.4}
                            />
                          )}
                          <StructureBadge ms={item.market_structure} />
                        </div>
                      </td>
                      <td>
                        <Week52Bar
                          price={item.price}
                          low={item.week52_low}
                          high={item.week52_high}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
