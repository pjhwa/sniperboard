"""Conviction Composite Score Calculator (Phase 1 — SniperBoard × market-sentiment-data 연계 강화).

v1 목표:
- Stage2 Score (0-7) + Sentiment Composite (0-100) + Regime Total (0-100)을
  40/30/30 가중 평균으로 종합한 0-100 확신 점수 제공.
- Watchlist, Daily, Overview 등에서 사용 예정.
- Context Attribution과 함께 AI Brief의 근거 투명성 확보.

초기 가중치 및 정규화:
- Stage2: 40% (0-7 → 0-100 정규화: score / 7 * 100)
- Sentiment: 30%
- Regime: 30% (None → 50 neutral 폴백, v1)

Regime-conditioned weight 조정 (RISK_ON / RISK_OFF)은
yf-accuracy-harden-complete-plan.md 상세 알고리즘 부재로 v1에서는 미구현.
후속 TDD 슬라이스에서 추가 예정.

이 모듈은 순수 계산 (side-effect free). 호출 측에서
signal_engine.calculate_stage2_analysis()['score'],
regime_engine.compute_regime()['total'],
market-sentiment-data의 sentiment composite를 준비해 전달.

참고:
- docs/yf-accuracy-harden-dev-onboarding.md
- docs/yf-accuracy-harden-data-model.md
- docs/yf-accuracy-harden-api-spec.md
"""

from typing import Optional, Dict, Any
import math


def _normalize_stage2(stage2_score: float) -> float:
    """0-7 → 0-100 정규화 (음수/초과는 clamp)."""
    clamped = max(0.0, min(7.0, float(stage2_score)))
    return (clamped / 7.0) * 100.0


def _fill_regime(regime_total: Optional[float]) -> float:
    """None이면 neutral 50으로 폴백. 0-100 clamp."""
    if regime_total is None:
        return 50.0
    return max(0.0, min(100.0, float(regime_total)))


def _calculate_label(score: float) -> str:
    """v1 단순 라벨 버킷 (추후 정교화 예정, risk-register.md '참고용' 명확히)."""
    if score >= 80.0:
        return "매우 강한 확신"
    elif score >= 65.0:
        return "강한 확신 구간"
    elif score >= 50.0:
        return "중립적 확신"
    elif score >= 35.0:
        return "약한 확신"
    else:
        return "낮은 확신"


def calculate_conviction(
    stage2_score: float,
    sentiment_composite: float,
    regime_total: Optional[float] = None,
) -> Dict[str, Any]:
    """Conviction Composite Score v1 계산.

    Returns:
        {
            "score": float (0.0 ~ 100.0, 1 decimal),
            "label": str,
            "components": {
                "stage2": {"raw": float, "norm": float, "weight": 0.4},
                "sentiment": {"raw": float, "weight": 0.3},
                "regime": {"raw": Optional[float], "filled": float, "weight": 0.3},
            }
        }
    """
    stage2_norm = _normalize_stage2(stage2_score)
    sentiment = max(0.0, min(100.0, float(sentiment_composite)))
    regime_filled = _fill_regime(regime_total)

    # 40/30/30 weighted (이미 정규화된 0-100 스케일)
    raw_score = (
        0.4 * stage2_norm +
        0.3 * sentiment +
        0.3 * regime_filled
    )

    # Clamp + round to 1 decimal for stability
    score = round(max(0.0, min(100.0, raw_score)), 1)

    return {
        "score": score,
        "label": _calculate_label(score),
        "components": {
            "stage2": {
                "raw": float(stage2_score),
                "norm": round(stage2_norm, 1),
                "weight": 0.4,
            },
            "sentiment": {
                "raw": sentiment,
                "weight": 0.3,
            },
            "regime": {
                "raw": regime_total,
                "filled": regime_filled,
                "weight": 0.3,
            },
        },
    }
