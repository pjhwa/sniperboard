'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardStore } from '../hooks/useStore';
import { SYMBOLS, Tab } from './types';

// 분할한 컴포넌트 임포트
import IntradayTab from '../components/IntradayTab';
import DailyTab from '../components/DailyTab';
import WatchlistTab from '../components/WatchlistTab';

export default function SniperBoard() {
  const queryClient = useQueryClient();
  const { symbol, timeframe, tab, setSymbol, setTimeframe, setTab } = useDashboardStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // React Query 캐시 강제 무효화를 통한 일괄 데이터 갱신
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (tab === 'intraday') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['intraday_ohlcv', symbol, timeframe] }),
          queryClient.invalidateQueries({ queryKey: ['intraday_latest', symbol, timeframe] })
        ]);
      } else if (tab === 'daily') {
        await queryClient.invalidateQueries({ queryKey: ['daily_analysis', symbol] });
      } else if (tab === 'watchlist') {
        await queryClient.invalidateQueries({ queryKey: ['watchlist_analysis'] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      // 0.6초간 애니메이션을 즐길 수 있도록 약간 지연 후 종료
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950 text-white selection:bg-white/10 selection:text-white antialiased">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-900 animate-fade-in">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                SniperBoard
              </h1>
              {tab === 'intraday' && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE (30S)
                </div>
              )}
            </div>
            <p className="text-zinc-500 mt-1 text-xs tracking-wide uppercase font-medium">
              Precision Signal Dashboard &middot; Livermore &middot; O&apos;Neil &middot; Minervini
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap">
            {tab !== 'watchlist' && (
              <div className="relative">
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="appearance-none bg-zinc-900/90 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition cursor-pointer hover:bg-zinc-850"
                >
                  {SYMBOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
            
            {tab === 'intraday' && (
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="appearance-none bg-zinc-900/90 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition cursor-pointer hover:bg-zinc-850"
                >
                  <option value="5m">5분봉</option>
                  <option value="1m">1분봉</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-b from-white to-zinc-200 text-zinc-950 rounded-xl font-semibold text-sm hover:brightness-95 transition shadow-[0_4px_20px_rgba(255,255,255,0.08)] active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
            >
              <svg
                className={`w-4 h-4 text-zinc-900 ${isRefreshing ? 'animate-spin-slow' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5"
                />
              </svg>
              <span>새로고침</span>
            </button>
          </div>
        </header>

        {/* Tab Selection Section */}
        <div className="flex gap-1.5 bg-zinc-900/40 backdrop-blur-md border border-zinc-900 rounded-2xl p-1.5 w-fit animate-fade-in">
          {([
            ['intraday', '단기 (Intraday)'],
            ['daily', '일봉 분석 (Daily)'],
            ['watchlist', '워치리스트'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                tab === t
                  ? 'segment-tab-active'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Dynamic Tab Contents */}
        <main className="transition-all duration-300 animate-slide-up">
          {tab === 'intraday' && <IntradayTab />}
          {tab === 'daily' && <DailyTab />}
          {tab === 'watchlist' && <WatchlistTab />}
        </main>
        
      </div>
    </div>
  );
}
