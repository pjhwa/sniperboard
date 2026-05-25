#!/bin/bash
#
# Phase 1 Conviction Composite Score - End-to-End Verification Script
# Usage:
#   1. Start services: ./run_docker.sh   (or docker compose up --build -d)
#   2. Wait ~30-60s for backend to be ready
#   3. ./scripts/verify_conviction.sh
#

set -e

API_BASE="${API_BASE:-http://localhost:5001}"

echo "=========================================================="
echo "  SniperBoard Phase 1 Conviction Verification"
echo "  API Base: $API_BASE"
echo "=========================================================="

echo ""
echo "[1/4] Checking /api/watchlist for conviction fields..."
WATCHLIST=$(curl -s "$API_BASE/api/watchlist")
if echo "$WATCHLIST" | grep -q '"conviction_score"'; then
    echo "  ✅ conviction_score present in watchlist response"
else
    echo "  ❌ conviction_score MISSING in watchlist"
    exit 1
fi

if echo "$WATCHLIST" | grep -q '"conviction_label"'; then
    echo "  ✅ conviction_label present in watchlist response"
else
    echo "  ❌ conviction_label MISSING"
    exit 1
fi

# Show sample for first symbol
echo ""
echo "Sample watchlist item (first symbol):"
echo "$WATCHLIST" | python3 -c '
import sys, json
data = json.load(sys.stdin)
if data.get("watchlist"):
    item = data["watchlist"][0]
    print(f"  Symbol: {item.get(\"symbol\")}")
    print(f"  Stage2 Score: {item.get(\"score\")}")
    print(f"  Conviction: {item.get(\"conviction_score\")} ({item.get(\"conviction_label\")})")
'

echo ""
echo "[2/4] Checking /api/daily?symbol=NVDA for conviction fields..."
DAILY=$(curl -s "$API_BASE/api/daily?symbol=NVDA")
if echo "$DAILY" | grep -q '"conviction_score"'; then
    echo "  ✅ conviction_score present in /daily response"
else
    echo "  ❌ conviction_score MISSING in /daily"
    exit 1
fi

echo ""
echo "Daily conviction for NVDA:"
echo "$DAILY" | python3 -c '
import sys, json
data = json.load(sys.stdin)
print(f"  Conviction: {data.get(\"conviction_score\")} ({data.get(\"conviction_label\")})")
print(f"  Stage2 Score inside stage2: {data.get(\"stage2\", {}).get(\"score\")}")
'

echo ""
echo "[3/4] Checking /api/brief for context field (Phase 1 Context Attribution)..."
BRIEF=$(curl -s "$API_BASE/api/brief")
if echo "$BRIEF" | grep -q '"context"'; then
    echo "  ✅ context field present in /brief response"
else
    echo "  ⚠️  context field not yet visible (may need fresh brief collection in market-sentiment-data)"
fi

echo ""
echo "[4/4] Basic sanity checks passed."

echo ""
echo "=========================================================="
echo "Verification complete. Review the numbers above."
echo "If conviction_score values look reasonable (0-100) and labels are sensible,"
echo "Phase 1 Conviction foundation is working."
echo "=========================================================="

echo ""
echo "Quick local verification (no Docker required):"
echo "  cd /path/to/sniperboard"
echo "  PYTHONPATH=backend python3 scripts/verify_conviction_local.py"
echo ""
