"""Insight service integrity against local MSD when available (skips if missing)."""
import os
from pathlib import Path

import pytest

ROOT = Path(os.environ.get(
    "INSIGHT_DATA_ROOT",
    str(Path.home() / "dev" / "market-sentiment-data"),
))


@pytest.mark.skipif(not (ROOT / "sentiment" / "history").is_dir(), reason="local MSD not present")
def test_live_insight_integrity_and_no_lookahead():
    os.environ["INSIGHT_DATA_ROOT"] = str(ROOT)
    from services.insight_service import build_insight_payload, clear_insight_cache

    clear_insight_cache()
    p = build_insight_payload(days=45, horizon=5)

    assert p["available"] is True
    assert p["source"]["sentiment_snapshots"] >= 10
    assert p["integrity"]["fail_count"] == 0

    d1 = p["mvp1_divergence"]
    assert d1["n_total_events"] > 0
    for g in d1["groups"]:
        for h, st in g["horizons"].items():
            # completed windows cannot exceed event count
            assert st["n"] <= g["n_events"]
            if st["avg_return"] is not None:
                # absurd returns would indicate price bug (e.g. wrong scale)
                assert -0.9 < st["avg_return"] < 2.0

    # Methodology must document absolute entry rule
    assert "close[T" in d1["methodology_en"] or "close[T+" in d1["methodology_en"]

    # Action sections present
    assert "brief" in p["mvp2_actions"]
    assert "briefing" in p["mvp2_actions"]

    # Pre-post n_days consistent with recent list
    pp = p["mvp4_pre_post"]
    assert pp["n_days"] >= len(pp["recent"]) or pp["n_days"] == 0
