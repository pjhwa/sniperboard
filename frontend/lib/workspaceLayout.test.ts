/**
 * Unit tests for shipped workspace layout serialize/restore.
 * Run: npx --yes tsx lib/workspaceLayout.test.ts
 */
import {
  LAYOUT_VERSION,
  WORKSPACE_BOARDS,
  serializeWorkspace,
  restoreWorkspace,
  isDesktopWorkspaceEnabled,
} from './workspaceLayout';

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

console.log('workspace board map');
{
  assert(WORKSPACE_BOARDS.trade === 'daily', 'Trade → daily');
  assert(WORKSPACE_BOARDS.research === 'deepdive', 'Research → deepdive');
  assert(WORKSPACE_BOARDS.macro === 'macro', 'Macro → macro');
}

console.log('serialize / restore round-trip');
{
  const raw = serializeWorkspace({ workspace: 'research', board: 'deepdive', symbol: 'NVDA' });
  const parsed = JSON.parse(raw);
  assert(parsed.version === LAYOUT_VERSION, 'writes current layout version');
  const restored = restoreWorkspace(raw);
  assert(restored.workspace === 'research', 'restore workspace');
  assert(restored.board === 'deepdive', 'restore board');
  assert(restored.symbol === 'NVDA', 'restore symbol');
}

console.log('version bump resets to Trade default');
{
  const stale = JSON.stringify({
    version: LAYOUT_VERSION - 1,
    workspace: 'macro',
    board: 'macro',
    symbol: 'SPY',
  });
  const restored = restoreWorkspace(stale);
  assert(restored.workspace === 'trade', 'stale version → trade');
  assert(restored.board === WORKSPACE_BOARDS.trade, 'stale version uses Trade board');
}

console.log('corrupt payload resets');
{
  const restored = restoreWorkspace('not-json');
  assert(restored.workspace === 'trade' && restored.board === 'daily', 'garbage → trade/daily');
}

console.log('desktop gate');
{
  assert(isDesktopWorkspaceEnabled(1024) === true, '1024px desktop');
  assert(isDesktopWorkspaceEnabled(767) === false, '767px mobile');
  assert(isDesktopWorkspaceEnabled(768) === true, '768px is desktop breakpoint');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
