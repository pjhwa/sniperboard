"""TDD for Conviction Composite Score v1 (Phase 1 연계 강화).

이 테스트들은 Conviction Calculator의 핵심 동작을 먼저 정의합니다.
- Stage2 Score (0-7 from signal_engine.calculate_stage2_analysis['score'])
- Sentiment Composite: producer −2..+2 (market-sentiment-data composite_score)
  normalized to 0–100 via (x+2)/4*100; legacy 0–100 values still accepted
- Regime Total (0-100 from regime_engine.compute_regime['total'])

초기 가중치 (onboarding.md 기준, complete-plan 상세 알고리즘 부재로 v1 단순화):
- Stage2: 40% (0-7 → 0-100 정규화)
- Sentiment: 30%
- Regime: 30% (None일 경우 neutral 50으로 폴백)

실행: cd /Users/jerry/dev/sniperboard/backend && PYTHONPATH=. python -m pytest tests/test_conviction_calculator.py -q --tb=short
"""

import sys
from pathlib import Path

# backend/ 를 path 에 추가 (test_data_adapter.py와 동일 패턴)
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from core.conviction_calculator import calculate_conviction, normalize_sentiment_composite


def test_normalize_sentiment_composite_producer_scale():
    """−2..+2 producer composite maps to 0–100 linearly."""
    assert normalize_sentiment_composite(-2.0) == 0.0
    assert normalize_sentiment_composite(0.0) == 50.0
    assert normalize_sentiment_composite(2.0) == 100.0
    assert abs(normalize_sentiment_composite(0.7) - 67.5) < 1e-9
    assert abs(normalize_sentiment_composite(-1.3) - 17.5) < 1e-9
    assert normalize_sentiment_composite(None) == 50.0


def test_normalize_sentiment_composite_legacy_0_100():
    """Values outside [−2, 2] are treated as already 0–100."""
    assert normalize_sentiment_composite(70.0) == 70.0
    assert normalize_sentiment_composite(0.5) == 62.5  # still in [−2,2] → map
    assert normalize_sentiment_composite(100.0) == 100.0
    assert normalize_sentiment_composite(-5.0) == 0.0  # clamp


def test_calculate_conviction_weighted_average_happy_path():
    """40/30/30 가중 평균 + Stage2 정규화가 올바르게 동작해야 함.

    Given:
      - Stage2 score 5/7 (≈71.43 norm)
      - Sentiment 70 (legacy 0–100, still supported)
      - Regime 80
    Expected rough: 0.4*71.43 + 0.3*70 + 0.3*80 ≈ 73.57
    """
    result = calculate_conviction(
        stage2_score=5.0,
        sentiment_composite=70.0,
        regime_total=80.0,
    )

    assert isinstance(result, dict)
    assert "score" in result
    assert "label" in result
    assert "components" in result

    score = result["score"]
    assert isinstance(score, (int, float))
    assert 72 <= score <= 75, f"Expected ~73.6, got {score}"

    # 라벨은 v1 단순 버킷 (추후 정교화)
    assert result["label"] in {"Very High", "High", "Moderate"}

    comp = result["components"]
    assert comp["stage2"]["raw"] == 5.0
    assert abs(comp["stage2"]["norm"] - 71.43) < 0.1
    assert comp["stage2"]["weight"] == 0.4
    assert comp["sentiment"]["raw"] == 70.0
    assert comp["regime"]["raw"] == 80.0


def test_calculate_conviction_producer_scale_optimistic():
    """Live composite +0.7 → 67.5 on 0–100; Stage2=5 Regime=60 MIXED → ~66.8."""
    result = calculate_conviction(
        stage2_score=5.0,
        sentiment_composite=0.7,
        regime_total=60.0,
        regime_label="MIXED",
    )
    # 0.4*71.428... + 0.3*67.5 + 0.3*60 ≈ 28.57 + 20.25 + 18 = 66.82
    assert 66.0 <= result["score"] <= 68.0, f"got {result['score']}"
    assert abs(result["components"]["sentiment"]["raw"] - 67.5) < 0.2
    assert result["components"]["sentiment"]["input"] == 0.7
    assert result["label"] in {"High", "Moderate"}


def test_calculate_conviction_producer_scale_fearful_vs_missing():
    """Missing sentiment must NOT score higher than present fearful sentiment incorrectly.

    Before fix: raw −1.3 clamped to 0 → lower; fallback 50 → higher (bug).
    After fix: −1.3 → 17.5; None → 50 — missing is still higher than fear, but
    optimistic (+0.7→67.5) is higher than missing. Key: fear ≠ euphoria ≈ floor.
    """
    base = dict(stage2_score=5.0, regime_total=60.0, regime_label="MIXED")
    fear = calculate_conviction(sentiment_composite=-1.3, **base)
    missing = calculate_conviction(sentiment_composite=None, **base)
    opt = calculate_conviction(sentiment_composite=0.7, **base)
    euph = calculate_conviction(sentiment_composite=1.8, **base)

    # Fear and euphoria must diverge (pre-fix they both ~46–47)
    assert euph["score"] - fear["score"] > 10, (
        f"euphoria {euph['score']} should be well above fear {fear['score']}"
    )
    assert opt["score"] > missing["score"] > fear["score"]


def test_calculate_conviction_handles_regime_none_as_neutral():
    """Regime total이 None이면 neutral(50)으로 폴백하여 계산."""
    result = calculate_conviction(
        stage2_score=7.0,          # max
        sentiment_composite=60.0,
        regime_total=None,
    )

    # 0.4*(100) + 0.3*60 + 0.3*50 = 40 + 18 + 15 = 73
    assert 72 <= result["score"] <= 74
    assert result["components"]["regime"]["filled"] == 50.0
    assert result["components"]["regime"]["raw"] is None


def test_calculate_conviction_clamps_and_bounds():
    """0 미만 / 100 초과 입력도 0~100으로 클램프.

    Stage2=0, sentiment legacy 0, regime 0 → score 0.
    Note: sentiment producer 0.0 would map to 50; use legacy scale 0 via
    value already at floor after map: use −2.0 for true zero sentiment weight.
    """
    result_low = calculate_conviction(0.0, -2.0, 0.0)
    assert result_low["score"] == 0.0

    result_high = calculate_conviction(7.0, 100.0, 100.0)
    assert result_high["score"] == 100.0

    result_high_producer = calculate_conviction(7.0, 2.0, 100.0)
    assert result_high_producer["score"] == 100.0


# --- C: Simple integration-style tests for watchlist/daily usage ---

from api.schemas import WatchlistItemSchema


def test_watchlist_item_schema_has_conviction_fields():
    """WatchlistItemSchema에 conviction 필드가 선언되어 있는지 확인 (C task)."""
    fields = WatchlistItemSchema.model_fields
    assert "conviction_score" in fields
    assert "conviction_label" in fields


def test_conviction_for_watchlist_like_item():
    """워치리스트 스타일 데이터로 conviction 계산 (C: integration smoke)."""
    # Typical watchlist item data — legacy 0–100 still works
    stage2_score = 5
    result = calculate_conviction(
        stage2_score=stage2_score,
        sentiment_composite=68.0,
        regime_total=72.0,
    )
    assert 65 <= result["score"] <= 80
    assert result["label"] in {"High", "Moderate", "Very High"}


def test_conviction_watchlist_like_producer_composite():
    """Per-symbol composite_score from latest.json style (−2..+2)."""
    result = calculate_conviction(
        stage2_score=5,
        sentiment_composite=0.8,  # optimistic mild
        regime_total=72.0,
    )
    # sentiment → 70; 0.4*71.4 + 0.3*70 + 0.3*72 ≈ 28.6+21+21.6 = 71.2
    assert 69 <= result["score"] <= 73
    assert abs(result["components"]["sentiment"]["raw"] - 70.0) < 0.2


# --- Task 2: Regime-conditioned weight tests ---

def test_regime_conditioned_risk_on_increases_sentiment_weight():
    """RISK_ON / CONSTRUCTIVE일 때 Sentiment 가중치가 올라가야 함."""
    result = calculate_conviction(
        stage2_score=5,
        sentiment_composite=80.0,
        regime_total=70.0,
        regime_label="CONSTRUCTIVE",
    )
    # Sentiment weight should be 0.35 instead of 0.30
    # Expected higher score than default 40/30/30
    default_result = calculate_conviction(5, 80.0, 70.0)  # no label
    assert result["score"] > default_result["score"]
    assert result["components"]["sentiment"]["weight"] == 0.35
    assert result["components"]["regime"]["weight"] == 0.25


def test_regime_conditioned_risk_off_increases_regime_weight():
    """RISK_OFF / DEFENSIVE일 때 Regime 가중치가 올라가야 함."""
    result = calculate_conviction(
        stage2_score=4,
        sentiment_composite=30.0,
        regime_total=75.0,
        regime_label="RISK_OFF",
    )
    default_result = calculate_conviction(4, 30.0, 75.0)
    assert result["score"] > default_result["score"]  # Regime pull is stronger
    assert result["components"]["regime"]["weight"] == 0.35
    assert result["components"]["sentiment"]["weight"] == 0.25


def test_regime_conditioned_mixed_is_neutral():
    """MIXED일 때는 중립 가중치(0.30/0.30)를 유지해야 함."""
    result = calculate_conviction(5, 60.0, 50.0, "MIXED")
    assert result["components"]["sentiment"]["weight"] == 0.30
    assert result["components"]["regime"]["weight"] == 0.30


def test_regime_conditioned_returns_adjusted_weights_in_components():
    """components에 실제 적용된 가중치가 정확히 기록되어야 함."""
    result = calculate_conviction(6, 70.0, 80.0, "CONSTRUCTIVE")
    assert result["components"]["sentiment"]["weight"] == 0.35
    assert result["components"]["regime"]["weight"] == 0.25
    assert result["components"]["stage2"]["weight"] == 0.40


def test_reliability_low_when_no_regime():
    """Regime 데이터가 없으면 reliability = low"""
    result = calculate_conviction(5, 60.0, None, None)
    assert result["reliability"] == "low"
    assert any("Regime data unavailable" in n for n in result["notes"])


def test_reliability_high_with_full_data():
    """충분한 데이터가 있으면 reliability = high"""
    result = calculate_conviction(6, 75.0, 82.0, "CONSTRUCTIVE")
    assert result["reliability"] == "high"


def test_calculator_is_defensive_on_bad_input():
    """이상한 입력이 들어와도 crash 없이 결과 + low reliability를 반환해야 함"""
    result = calculate_conviction(-999, -999, None, None)
    assert result["reliability"] == "low"
    assert result["score"] >= 0   # 최소한 음수가 되면 안 됨
    assert len(result["notes"]) > 0


def test_load_sentiment_helper_brief_context_path():
    """P0-3: brief wraps payload under data; helper reads data.context."""
    from unittest.mock import patch
    from api.endpoints import _load_sentiment_for_conviction

    brief = {
        "available": True,
        "data": {
            "context": {
                "market_sentiment": {"composite_score": -1.0},
            }
        },
    }
    sent = {
        "available": True,
        "market": {"composite_score": 0.5},
        "symbols": [
            {"symbol": "NVDA", "composite_score": 0.8},
            {"symbol": "tsla", "composite_score": -0.5},
        ],
    }
    with patch("api.endpoints.fetch_brief", return_value=brief), \
         patch("api.endpoints.fetch_latest", return_value=sent):
        market, smap = _load_sentiment_for_conviction()
    assert market == -1.0  # prefers brief context
    assert smap["NVDA"] == 0.8
    assert smap["TSLA"] == -0.5  # uppercased
