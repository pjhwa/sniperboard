"""TDD for Conviction Composite Score v1 (Phase 1 연계 강화).

이 테스트들은 Conviction Calculator의 핵심 동작을 먼저 정의합니다.
- Stage2 Score (0-7 from signal_engine.calculate_stage2_analysis['score'])
- Sentiment Composite (0-100 from market-sentiment-data)
- Regime Total (0-100 from regime_engine.compute_regime['total'])

초기 가중치 (onboarding.md 기준, complete-plan 상세 알고리즘 부재로 v1 단순화):
- Stage2: 40% (0-7 → 0-100 정규화)
- Sentiment: 30%
- Regime: 30% (None일 경우 neutral 50으로 폴백)

Regime-conditioned weight adjust 및 정확한 라벨 버킷은 후속 슬라이스에서 추가.
(현재는 yf-accuracy-harden foundation 완료 상태에서 Conviction v1 시작)

실행: cd /Users/jerry/dev/sniperboard/backend && PYTHONPATH=. python -m pytest tests/test_conviction_calculator.py -q --tb=short
"""

import sys
from pathlib import Path

# backend/ 를 path 에 추가 (test_data_adapter.py와 동일 패턴)
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

# 아직 존재하지 않는 모듈 — RED 단계에서 ImportError 발생 예상
from core.conviction_calculator import calculate_conviction


def test_calculate_conviction_weighted_average_happy_path():
    """40/30/30 가중 평균 + Stage2 정규화가 올바르게 동작해야 함.

    Given:
      - Stage2 score 5/7 (≈71.43 norm)
      - Sentiment 70
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
    assert result["label"] in {"매우 강한 확신", "강한 확신 구간", "중립적 확신"}

    comp = result["components"]
    assert comp["stage2"]["raw"] == 5.0
    assert abs(comp["stage2"]["norm"] - 71.43) < 0.1
    assert comp["stage2"]["weight"] == 0.4
    assert comp["sentiment"]["raw"] == 70.0
    assert comp["regime"]["raw"] == 80.0


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
    """0 미만 / 100 초과 입력도 0~100으로 클램프."""
    result_low = calculate_conviction(0.0, 0.0, 0.0)
    assert result_low["score"] == 0.0

    result_high = calculate_conviction(7.0, 100.0, 100.0)
    assert result_high["score"] == 100.0


# --- C: Simple integration-style tests for watchlist/daily usage ---

from api.schemas import WatchlistItemSchema


def test_watchlist_item_schema_has_conviction_fields():
    """WatchlistItemSchema에 conviction 필드가 선언되어 있는지 확인 (C task)."""
    fields = WatchlistItemSchema.model_fields
    assert "conviction_score" in fields
    assert "conviction_label" in fields


def test_conviction_for_watchlist_like_item():
    """워치리스트 스타일 데이터로 conviction 계산 (C: integration smoke)."""
    # Typical watchlist item data
    stage2_score = 5
    # Simulate per-symbol or market sentiment
    result = calculate_conviction(
        stage2_score=stage2_score,
        sentiment_composite=68.0,
        regime_total=72.0,
    )
    assert 65 <= result["score"] <= 80
    assert result["label"] in {"강한 확신 구간", "중립적 확신", "매우 강한 확신"}
