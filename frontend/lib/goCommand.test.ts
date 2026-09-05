/**
 * Unit tests for shipped GO command parser.
 * Run: npx --yes tsx lib/goCommand.test.ts
 */
import { parseGoCommand } from './goCommand';

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

console.log('parseGoCommand — symbol');
{
  const a = parseGoCommand('TSLA');
  assert(a.kind === 'symbol' && a.symbol === 'TSLA', 'TSLA → symbol TSLA');
  const b = parseGoCommand('  nvda  ');
  assert(b.kind === 'symbol' && b.symbol === 'NVDA', 'lowercase nvda uppercased');
}

console.log('parseGoCommand — symbol + Stage2');
{
  const a = parseGoCommand('TSLA S2');
  assert(
    a.kind === 'symbol-board' && a.symbol === 'TSLA' && a.board === 'deepdive',
    'TSLA S2 → DeepDive',
  );
}

console.log('parseGoCommand — symbol + RR');
{
  const a = parseGoCommand('TSLA RR');
  assert(
    a.kind === 'symbol-board' && a.symbol === 'TSLA' && a.board === 'daily',
    'TSLA RR → Daily (Entry Plan)',
  );
}

console.log('parseGoCommand — board verbs');
{
  assert(parseGoCommand('WATCH').kind === 'board' && parseGoCommand('WATCH').board === 'watchlist', 'WATCH → watchlist');
  assert(parseGoCommand('REGIME').kind === 'board' && parseGoCommand('REGIME').board === 'macro', 'REGIME → macro');
}

console.log('parseGoCommand — INSIDER');
{
  const a = parseGoCommand('INSIDER TSLA');
  assert(
    a.kind === 'symbol-board' && a.symbol === 'TSLA' && a.board === 'deepdive' && a.focus === 'insider',
    'INSIDER TSLA → DeepDive insider focus',
  );
}

console.log('parseGoCommand — glossary and shortcuts');
{
  const emptyQ = parseGoCommand('?');
  assert(emptyQ.kind === 'shortcuts', 'bare ? → shortcuts overlay');
  const term = parseGoCommand('?vcp');
  assert(term.kind === 'glossary' && term.query === 'vcp', '?vcp → glossary query vcp');
  const spaced = parseGoCommand('?  ');
  assert(spaced.kind === 'shortcuts', '? with only whitespace → shortcuts');
}

console.log('parseGoCommand — empty / unknown');
{
  assert(parseGoCommand('').kind === 'unknown', 'empty string is unknown');
  assert(parseGoCommand('!!!').kind === 'unknown', 'punctuation is unknown');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
