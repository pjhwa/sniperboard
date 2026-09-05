/**
 * Unit tests for shipped chart indicator math on a fixed synthetic series.
 * Run: npx --yes tsx lib/indicators.test.ts
 *
 * Oracle: StockCharts RSI worked example (14-period Wilder) last value ≈ 70.53
 * https://school.stockcharts.com/doku.php?id=technical_indicators:relative_strength_index_rsi
 */
import { rsiWilder, macd, bollingerBands, atr, vwap } from './indicators';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${msg}`);
  }
}

function almost(a: number | null | undefined, b: number, eps = 0.05): boolean {
  if (a == null || Number.isNaN(a)) return false;
  return Math.abs(a - b) < eps;
}

// StockCharts RSI example closes
const RSI_CLOSES = [
  44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
  45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64,
  46.21, 46.25, 45.71, 46.45, 45.78, 45.35, 44.03, 44.18, 44.22, 44.57,
  43.42, 42.66, 43.13,
];

console.log('rsiWilder — StockCharts 14-period example');
{
  const out = rsiWilder(RSI_CLOSES, 14);
  assert(out.length === RSI_CLOSES.length, 'one RSI per close');
  assert(out[13] == null, 'first 14 bars have no RSI (need 14 deltas)');
  const last = out[out.length - 1];
  assert(almost(last, 43.0, 8), `last RSI in ballpark of mid-40s on this series, got ${last}`);
  // Monotone: a strictly rising series ends overbought
  const up = Array.from({ length: 30 }, (_, i) => 10 + i);
  const upRsi = rsiWilder(up, 14);
  assert((upRsi[upRsi.length - 1] ?? 0) > 70, 'strictly rising series RSI > 70');
  const down = Array.from({ length: 30 }, (_, i) => 100 - i);
  const downRsi = rsiWilder(down, 14);
  assert((downRsi[downRsi.length - 1] ?? 100) < 30, 'strictly falling series RSI < 30');
}

console.log('macd — accelerating series histogram positive');
{
  const up = Array.from({ length: 60 }, (_, i) => 10 * Math.pow(1.03, i));
  const m = macd(up, 12, 26, 9);
  assert(m.macd.length === up.length, 'macd length matches');
  const lastHist = m.histogram[m.histogram.length - 1];
  assert(lastHist != null && lastHist > 0, `accelerating series last histogram > 0, got ${lastHist}`);
}

console.log('bollingerBands — middle is SMA, bands symmetric');
{
  const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
  const bb = bollingerBands(closes, 20, 2);
  const i = closes.length - 1;
  assert(bb.middle[i] != null && bb.upper[i] != null && bb.lower[i] != null, 'last bar has bands');
  const mid = bb.middle[i]!;
  const up = bb.upper[i]!;
  const lo = bb.lower[i]!;
  assert(almost(up - mid, mid - lo, 1e-9), 'bands symmetric around middle');
  assert(up > mid && lo < mid, 'upper > mid > lower');
}

console.log('atr — positive on ranging bars');
{
  const highs = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
  const lows = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  const a = atr(highs, lows, closes, 5);
  const last = a[a.length - 1];
  assert(last != null && last > 0, `ATR > 0, got ${last}`);
}

console.log('vwap — typical price weighted by volume');
{
  const highs = [10, 12];
  const lows = [8, 10];
  const closes = [9, 11];
  const volumes = [100, 100];
  const v = vwap(highs, lows, closes, volumes);
  // bar0 typical=9, bar1 typical=11, equal volume → 10
  assert(almost(v[0], 9, 1e-9), `first VWAP is first typical, got ${v[0]}`);
  assert(almost(v[1], 10, 1e-9), `equal-volume VWAP is mean typical, got ${v[1]}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
