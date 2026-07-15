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
from api.endpoints import _MIN_STAGE2_BARS
assert hasattr(ec, 'reconcile_sentiment_mood_with_session'), 'missing mood reconcile'
assert hasattr(ec, 'sanitize_briefing_payload'), 'missing sanitize_briefing_payload'
assert _MIN_STAGE2_BARS == 200, _MIN_STAGE2_BARS
assert slots_compatible('pre_open', 'pre_open')
print('OK: earnings_consistency + github_payload_cache + MIN_STAGE2=200')
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

echo "==> Deploy verify complete"
