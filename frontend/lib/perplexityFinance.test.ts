/**
 * Unit tests for Perplexity Finance deep-link helpers.
 * Run: npx --yes tsx lib/perplexityFinance.test.ts
 */
import { normalizeFinanceTicker, perplexityFinanceUrl } from './perplexityFinance';

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

console.log('normalizeFinanceTicker');
{
  assert(normalizeFinanceTicker('tsla') === 'TSLA', 'lower → upper');
  assert(normalizeFinanceTicker('  NVDA ') === 'NVDA', 'trim + upper');
  assert(normalizeFinanceTicker('BRK.B') === 'BRK.B', 'class share with dot');
  assert(normalizeFinanceTicker('^VIX') === null, 'index caret rejected');
  assert(normalizeFinanceTicker('CL=F') === null, 'futures = rejected');
  assert(normalizeFinanceTicker('KRW=X') === null, 'fx = rejected');
  assert(normalizeFinanceTicker('') === null, 'empty rejected');
  assert(normalizeFinanceTicker('too-long-ticker') === null, 'hyphen / long rejected');
}

console.log('perplexityFinanceUrl');
{
  assert(
    perplexityFinanceUrl('TSLA') === 'https://www.perplexity.ai/finance/TSLA',
    'quote page',
  );
  assert(
    perplexityFinanceUrl('tsla', 'earnings') === 'https://www.perplexity.ai/finance/TSLA/earnings',
    'earnings page uppercased',
  );
  assert(perplexityFinanceUrl('^VIX') === null, 'invalid ticker → null');
  assert(perplexityFinanceUrl('CL=F', 'earnings') === null, 'futures earnings → null');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
