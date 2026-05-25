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

Regime-conditioned weight 조정 (RISK_ON / RISK_OFF) 은 Task 2에서 구현 완료.

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
    regime_label: Optional[str] = None,
) -> Dict[str, Any]:
    """Conviction Composite Score v1 계산 (Regime-conditioned weights 지원).

    Regime-conditioned weight adjustment (refined in Task 2):
    - RISK_ON / CONSTRUCTIVE : Sentiment weight ↑ (0.35), Regime weight ↓ (0.25)
    - RISK_OFF / DEFENSIVE   : Regime weight ↑ (0.35), Sentiment weight ↓ (0.25)
    - MIXED                  : Neutral (0.30 / 0.30)
    - UNKNOWN / None         : Neutral (0.30 / 0.30)

    Stage2 weight is always fixed at 0.40 (core technical signal).

    The effective weights are returned in the 'components' for transparency.

    추가 필드 (Phase 1 마무리):
    - reliability: "high" | "medium" | "low" — 데이터 품질 기반 신뢰도
    - notes: 주의사항 배열 (예: Regime 데이터 부족 시 경고)
    """
    stage2_norm = _normalize_stage2(stage2_score)
    sentiment = max(0.0, min(100.0, float(sentiment_composite)))
    regime_filled = _fill_regime(regime_total)

    # Regime-conditioned weight adjustment (refined)
    s_weight = 0.30
    r_weight = 0.30

    label = (regime_label or "UNKNOWN").upper()

    if label in ("RISK_ON", "CONSTRUCTIVE"):
        s_weight = 0.35
        r_weight = 0.25
    elif label in ("RISK_OFF", "DEFENSIVE"):
        s_weight = 0.25
        r_weight = 0.35
    # MIXED and UNKNOWN stay at neutral 0.30/0.30

    stage2_weight = 0.40

    raw_score = (
        stage2_weight * stage2_norm +
        s_weight * sentiment +
        r_weight * regime_filled
    )

    score = round(max(0.0, min(100.0, raw_score)), 1)

    # 신뢰도(Reliability) 계산 - Phase 1 마무리 작업
    if regime_total is None:
        reliability = "low"
    elif regime_label is None or regime_label.upper() in ("UNKNOWN", "MIXED"):
        reliability = "medium"
    else:
        reliability = "high"

    # 간단한 disclaimer / note
    notes = []
    if regime_total is None:
        notes.append("Regime 데이터가 부족하여 신뢰도가 낮습니다.")
    if reliability == "low":
        notes.append("참고용으로만 활용하시기 바랍니다.")

    return {
        "score": score,
        "label": _calculate_label(score),
        "reliability": reliability,
        "notes": notes,
        "components": {
            "stage2": {
                "raw": float(stage2_score),
                "norm": round(stage2_norm, 1),
                "weight": stage2_weight,
            },
            "sentiment": {
                "raw": sentiment,
                "weight": round(s_weight, 2),
            },
            "regime": {
                "raw": regime_total,
                "filled": regime_filled,
                "weight": round(r_weight, 2),
            },
        },
    }
