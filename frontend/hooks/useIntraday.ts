import { useQuery } from '@tanstack/react-query';
import { API_BASE, Candle, Signals, IntradayIndicators, LatestData } from '../app/types';

interface IntradayFetchResult {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  signals: Signals;
  indicators: IntradayIndicators;
}

const fetchIntradayData = async (symbol: string, timeframe: string): Promise<IntradayFetchResult> => {
  const res = await fetch(`${API_BASE}/api/ohlcv?symbol=${symbol}&tf=${timeframe}`);
  if (!res.ok) throw new Error('Failed to fetch intraday OHLCV');
  return res.json();
};

const fetchLatestSignal = async (symbol: string, timeframe: string): Promise<LatestData> => {
  const res = await fetch(`${API_BASE}/api/latest-signal?symbol=${symbol}&tf=${timeframe}`);
  if (!res.ok) throw new Error('Failed to fetch latest signal');
  return res.json();
};

export function useIntraday(symbol: string, timeframe: string) {
  const ohlcvQuery = useQuery({
    queryKey: ['intraday_ohlcv', symbol, timeframe],
    queryFn: () => fetchIntradayData(symbol, timeframe),
    refetchInterval: 30000, // 30초마다 자동 폴링
  });

  const latestQuery = useQuery({
    queryKey: ['intraday_latest', symbol, timeframe],
    queryFn: () => fetchLatestSignal(symbol, timeframe),
    refetchInterval: 30000, // 30초마다 자동 폴링
  });

  const refetchAll = async () => {
    await Promise.all([ohlcvQuery.refetch(), latestQuery.refetch()]);
  };

  return {
    ohlcvData: ohlcvQuery.data,
    latestData: latestQuery.data,
    isLoading: ohlcvQuery.isLoading || latestQuery.isLoading,
    isRefetching: ohlcvQuery.isRefetching || latestQuery.isRefetching,
    error: ohlcvQuery.error || latestQuery.error,
    refetch: refetchAll,
  };
}
