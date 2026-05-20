'use client';

import React from 'react';
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

  // React Query 캐시 강제 무효화를 통한 일괄 데이터 갱신
  const handleRefresh = async () => {
    if (tab === 'intraday') {
      await queryClient.invalidateQueries({ queryKey: ['intraday_ohlcv', symbol, timeframe] });
      await queryClient.invalidateQueries({ queryKey: ['intraday_latest', symbol, timeframe] });
    } else if (tab === 'daily') {
      await queryClient.invalidateQueries({ queryKey: ['daily_analysis', symbol] });
    } else if (tab === 'watchlist') {
      await queryClient.invalidateQueries({ queryKey: ['watchlist_analysis'] });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">SniperBoard</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">
              Precision Signal Dashboard · Livermore · O&apos;Neil · Minervini
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {tab !== 'watchlist' && (
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-zinc-500"
              >
                {SYMBOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            
            {tab === 'intraday' && (
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-zinc-500"
              >
                <option value="5m">5분봉</option>
                <option value="1m">1분봉</option>
              </select>
            )}
            
            <button
              onClick={handleRefresh}
              className="px-5 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition duration-150 active:scale-95"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* Tabs Controller */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-5 w-fit">
          {([
            ['intraday', '단기 (Intraday)'],
            ['daily', '일봉 분석 (Daily)'],
            ['watchlist', '워치리스트'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                tab === t ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Contents View */}
        <div className="transition-all duration-300">
          {tab === 'intraday' && <IntradayTab />}
          {tab === 'daily' && <DailyTab />}
          {tab === 'watchlist' && <WatchlistTab />}
        </div>
        
      </div>
    </div>
  );
}
