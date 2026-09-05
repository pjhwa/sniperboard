/**
 * Chart indicator math (Wilder RSI, MACD, Bollinger, ATR, VWAP).
 * Trailing-only — no center=True / future bars.
 */

export function rsiWilder(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = closes.map(() => null);
  if (closes.length < period + 1) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function emaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastE = emaSeries(closes, fast);
  const slowE = emaSeries(closes, slow);
  const macdLine: (number | null)[] = closes.map((_, i) =>
    fastE[i] != null && slowE[i] != null ? fastE[i]! - slowE[i]! : null,
  );
  const macdNumeric = macdLine.map((v) => v ?? 0);
  // Signal EMA over the macd line starting when both EMAs exist
  const first = macdLine.findIndex((v) => v != null);
  const signalLine: (number | null)[] = closes.map(() => null);
  const hist: (number | null)[] = closes.map(() => null);
  if (first >= 0) {
    const slice = macdNumeric.slice(first);
    const sig = emaSeries(slice, signal);
    for (let i = 0; i < sig.length; i++) {
      const idx = first + i;
      signalLine[idx] = sig[i];
      if (macdLine[idx] != null && sig[i] != null) {
        hist[idx] = macdLine[idx]! - sig[i]!;
      }
    }
  }
  return { macd: macdLine, signal: signalLine, histogram: hist };
}

export function bollingerBands(
  closes: number[],
  period = 20,
  multiplier = 2,
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    const sma = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (closes[j] - sma) ** 2;
    const std = Math.sqrt(variance / period);
    middle.push(sma);
    upper.push(sma + multiplier * std);
    lower.push(sma - multiplier * std);
  }
  return { upper, middle, lower };
}

export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): (number | null)[] {
  const n = Math.min(highs.length, lows.length, closes.length);
  const out: (number | null)[] = Array(n).fill(null);
  if (n < period + 1) return out;
  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < n; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  let prev = sum / period;
  out[period] = prev;
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

export function vwap(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
): (number | null)[] {
  const n = Math.min(highs.length, lows.length, closes.length, volumes.length);
  const out: (number | null)[] = [];
  let cumPv = 0;
  let cumV = 0;
  for (let i = 0; i < n; i++) {
    const typical = (highs[i] + lows[i] + closes[i]) / 3;
    const vol = volumes[i] ?? 0;
    cumPv += typical * vol;
    cumV += vol;
    out.push(cumV === 0 ? null : cumPv / cumV);
  }
  return out;
}
