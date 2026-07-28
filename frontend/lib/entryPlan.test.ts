/**
 * Unit tests for shipped entryPlan helpers.
 * Run: npx --yes tsx lib/entryPlan.test.ts
 */
import {
  classifySetupStatus,
  distanceToEntryPct,
  isDeepBreakdown,
  marketNowLevels,
  pctBelowEntry,
} from './entryPlan';

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

function almostEqual(a: number | null, b: number, eps = 1e-6): boolean {
  if (a == null) return false;
  return Math.abs(a - b) < eps;
}

console.log('distanceToEntryPct');
{
  // price below entry → positive distance (must rally)
  const d = distanceToEntryPct(307.14, 435.02);
  assert(d != null && d > 40 && d < 42, `TSLA-like distance ~41% got ${d}`);
  assert(almostEqual(distanceToEntryPct(100, 105), 5), '5% below via price base');
  // already above entry → negative
  assert(distanceToEntryPct(110, 100)! < 0, 'above entry is negative distance');
  assert(distanceToEntryPct(0, 100) === null, 'zero price → null');
  assert(distanceToEntryPct(100, 0) === null, 'zero entry → null');
}

console.log('pctBelowEntry');
{
  const b = pctBelowEntry(307.14, 435.02);
  assert(b != null && b > 29 && b < 30, `TSLA pct below entry ~29.4% got ${b}`);
  assert(almostEqual(pctBelowEntry(95, 100), 5), '5% below entry base');
  assert(pctBelowEntry(105, 100)! < 0, 'above entry negative below%');
}

console.log('classifySetupStatus — Ready');
{
  // Near pivot, strong Stage2
  assert(
    classifySetupStatus({ price: 100, entry: 103, stage2Score: 6 }) === 'ready',
    'near pivot Stage2=6 → ready',
  );
  assert(
    classifySetupStatus({ price: 104, entry: 103, stage2Score: 5 }) === 'ready',
    'already above entry Stage2=5 → ready',
  );
  assert(
    classifySetupStatus({ price: 100, entry: 104, stage2Score: 7, pullbackPct: 3 }) === 'ready',
    '~3.8% below entry Stage2=7 → ready',
  );
}

console.log('classifySetupStatus — Watch');
{
  assert(
    classifySetupStatus({ price: 100, entry: 108, stage2Score: 5 }) === 'watch',
    'mid distance ~7.4% Stage2=5 → watch',
  );
  assert(
    classifySetupStatus({ price: 100, entry: 103, stage2Score: 4 }) === 'watch',
    'near pivot Stage2=4 → watch',
  );
}

console.log('classifySetupStatus — Invalid / Avoid');
{
  // Deep drawdown TSLA-like
  assert(
    classifySetupStatus({
      price: 307.14,
      entry: 435.02,
      stage2Score: 2,
      pullbackPct: 29,
    }) === 'invalid',
    'TSLA deep drawdown → invalid',
  );
  assert(
    classifySetupStatus({ price: 80, entry: 100, stage2Score: 6 }) === 'invalid',
    '20% below entry even with Stage2=6 → invalid',
  );
  assert(
    classifySetupStatus({ price: 100, entry: 110, stage2Score: 2 }) === 'invalid',
    'weak Stage2 + distance → invalid',
  );
  assert(
    classifySetupStatus({ price: 100, entry: 120, stage2Score: 5, pullbackPct: 20 }) === 'invalid',
    'deep pullback + far → invalid',
  );
}

console.log('isDeepBreakdown');
{
  assert(isDeepBreakdown(307, 435, 29) === true, 'TSLA deep breakdown true');
  assert(isDeepBreakdown(100, 103, 3) === false, 'near pivot not deep');
  assert(isDeepBreakdown(100, 110, 16) === true, 'pullback>15 deep');
}

console.log('marketNowLevels (reference only)');
{
  const m = marketNowLevels(307.14, 10);
  assert(m != null, 'market now not null');
  if (m) {
    assert(m.entry === 307.14, `entry=price got ${m.entry}`);
    assert(almostEqual(m.stop, 287.14), `stop=price-2ATR got ${m.stop}`);
    // risk = 20, target = 307.14 + 60 = 367.14
    assert(almostEqual(m.target, 367.14), `target 1:3 got ${m.target}`);
    assert(almostEqual(m.riskPerShare, 20), `risk 2*ATR got ${m.riskPerShare}`);
  }
  assert(marketNowLevels(100, 0) === null, 'zero atr → null');
  assert(marketNowLevels(-1, 2) === null, 'bad price → null');
}

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
