#!/usr/bin/env python3
"""
Phase 1 Conviction - Local Verification (No Docker required)

This script directly tests the conviction calculator with realistic data
that mimics what the watchlist and daily endpoints would produce.

Run from sniperboard root:
    PYTHONPATH=backend python scripts/verify_conviction_local.py
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from core.conviction_calculator import calculate_conviction

print("=" * 60)
print("SniperBoard Phase 1 Conviction - Local Verification")
print("=" * 60)

# Realistic test cases based on current market conditions

test_cases = [
    {
        "name": "Strong stock in CONSTRUCTIVE regime",
        "stage2": 6,
        "sentiment": 78.0,
        "regime": 72.0,
        "regime_label": "CONSTRUCTIVE",
    },
    {
        "name": "Average stock in MIXED regime",
        "stage2": 4,
        "sentiment": 55.0,
        "regime": 48.0,
        "regime_label": "MIXED",
    },
    {
        "name": "Weak stock in RISK_OFF regime",
        "stage2": 2,
        "sentiment": 32.0,
        "regime": 18.0,
        "regime_label": "RISK_OFF",
    },
    {
        "name": "High Stage2 but poor sentiment",
        "stage2": 7,
        "sentiment": 28.0,
        "regime": 65.0,
        "regime_label": "CONSTRUCTIVE",
    },
]

print("\n[1/2] Testing conviction_calculator with realistic data...\n")

all_passed = True
for case in test_cases:
    result = calculate_conviction(
        stage2_score=case["stage2"],
        sentiment_composite=case["sentiment"],
        regime_total=case["regime"],
    )
    
    print(f"Case: {case['name']}")
    print(f"  Input  -> Stage2={case['stage2']}/7, Sentiment={case['sentiment']}, Regime={case['regime']} ({case['regime_label']})")
    print(f"  Output -> Conviction={result['score']}, Label='{result['label']}'")
    print(f"  Components: {result['components']}")
    print()
    
    if not (0 <= result["score"] <= 100):
        print("  ❌ FAIL: Score out of range")
        all_passed = False

if all_passed:
    print("[1/2] ✅ All calculator test cases passed.")
else:
    print("[1/2] ❌ Some test cases failed.")
    sys.exit(1)

print("\n[2/2] Simulating watchlist-style response...\n")

# Simulate what /api/watchlist would return now
simulated_watchlist = []
for sym, stage2 in [("NVDA", 6), ("AAPL", 5), ("TSLA", 3)]:
    # In real endpoint we would fetch per-symbol sentiment + regime
    conv = calculate_conviction(stage2, 65.0, 68.0)
    simulated_watchlist.append({
        "symbol": sym,
        "score": stage2,
        "conviction_score": conv["score"],
        "conviction_label": conv["label"],
    })

print("Simulated /api/watchlist items:")
for item in simulated_watchlist:
    print(f"  {item['symbol']}: Stage2={item['score']}, Conviction={item['conviction_score']} ({item['conviction_label']})")

print("\n" + "=" * 60)
print("Local verification completed successfully.")
print("Next: Run the full stack with ./run_docker.sh + ./scripts/verify_conviction.sh")
print("=" * 60)
