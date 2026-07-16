#!/usr/bin/env bash
# Phase A1 — rebuild backend image from current tree and verify reliability modules.
# Contract: after code changes, operators run THIS script (or CI image build) so
# "main ≠ running container" cannot silently recur.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building sniperboard-backend from $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
docker compose build backend

echo "==> Restarting backend"
docker compose up -d backend

echo "==> Waiting for API..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:5001/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Verifying modules inside container"
# Must use python -c (or docker exec -i with a pipe). Bare `docker exec ... python - <<EOF`
# never feeds stdin to the container process — asserts would be skipped.
docker exec sniperboard-backend python -c "
import core.earnings_consistency as ec
from core.github_payload_cache import slots_compatible
from core.live_backtest_compare import DEFAULT_METHODOLOGY, compare_live_to_backtest
from api.endpoints import _MIN_STAGE2_BARS
assert hasattr(ec, 'reconcile_sentiment_mood_with_session'), 'missing mood reconcile'
assert hasattr(ec, 'sanitize_briefing_payload'), 'missing sanitize_briefing_payload'
assert _MIN_STAGE2_BARS == 200, _MIN_STAGE2_BARS
assert slots_compatible('pre_open', 'pre_open')
assert DEFAULT_METHODOLOGY['stage2_threshold'] == 5
cmp_ = compare_live_to_backtest(
    {'n_closed': 0, 'expectancy_r': None, 'win_rate': None, 'profit_factor': None},
    {'expectancy_r': 0.46, 'win_rate': 0.386, 'profit_factor': 1.9, 'n': 145},
)
assert cmp_['confidence'] == 'LOW' and cmp_['health_status'] == 'INSUFFICIENT_DATA'
print('OK: earnings_consistency + github_payload_cache + MIN_STAGE2=200 + live_backtest_compare')
"

echo "==> Soft-fail smoke: SPCX must not be 500"
code=$(curl -sS -o /dev/null -w "%{http_code}" 'http://localhost:5001/api/daily?symbol=SPCX' || true)
if [ "$code" = "500" ]; then
  echo "FAIL: SPCX returned 500" >&2
  exit 1
fi
echo "SPCX HTTP $code (expected 404 or 200)"

echo "==> Earnings live days_until present"
curl -sS "http://localhost:5001/api/earnings" | python3 -c "
import sys, json
d=json.load(sys.stdin)
assert d.get('available') is True, d
ups=(d.get('data') or {}).get('upcoming_earnings') or []
assert ups, 'no upcoming earnings'
assert 'days_until' in ups[0]
print('OK earnings', ups[0].get('symbol'), ups[0].get('earnings_date'), ups[0].get('days_until'))
print('meta', d.get('meta'))
"

echo "==> Signal-log stats C1/C2 fields"
curl -sS "http://localhost:5001/api/signal-log/stats" | python3 -c "
import sys, json
d=json.load(sys.stdin)
assert 'methodology' in d and d['methodology'], d.keys()
assert d['methodology'].get('stage2_threshold') == 5
assert d.get('sample_n') == d.get('n_closed')
assert 'comparison' in d and d['comparison'] is not None
assert d['comparison'].get('sample_n') == d.get('n_closed')
assert 'live' in d['comparison']
print('OK signal-log/stats C1/C2', 'n_closed=', d.get('n_closed'),
      'confidence=', d['comparison'].get('confidence'),
      'health=', d['comparison'].get('health_status'))
"

echo "==> C4 alerts + P2+ citations"
curl -sS "http://localhost:5001/api/alerts" | python3 -c "
import sys, json
d=json.load(sys.stdin)
assert 'alerts' in d and 'count' in d, d.keys()
assert isinstance(d['alerts'], list)
print('OK alerts count=', d['count'], 'types=', d.get('counts_by_type'))
"
curl -sS "http://localhost:5001/api/morning-briefing" | python3 -c "
import sys, json
d=json.load(sys.stdin)
data=d.get('data') or {}
gc=data.get('global_context') or {}
issues=gc.get('issues') or []
if issues:
    iss=issues[0]
    assert 'source_urls' in iss or iss.get('source_hint'), iss
    if iss.get('source_hint') and not (iss.get('source_urls') or []):
        raise SystemExit('expected source_urls enrichment for source_hint')
    print('OK briefing citations', 'urls=', (iss.get('source_urls') or [])[:1], 'kind=', (iss.get('source_resolved') or {}).get('kind'))
else:
    print('OK briefing (no global issues to cite)')
"

echo "==> Deploy verify complete"
