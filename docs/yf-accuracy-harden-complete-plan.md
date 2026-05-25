# YF Accuracy Harden + Conviction / Context Phase 1 완성 보고서

**작성일**: 2026-05-25  
**상태**: Phase 1 핵심 기능 구현 완료 + 검증 도구 제공

---

## 1. Phase 1 목표 (초기 계획 대비 실제 달성)

### 원래 목표 (onboarding + executive summary 기준)
- Conviction Composite Score v1 구현 및 노출
- Context Attribution (Brief 생성 시점 맥락 저장/표시)
- Regime-conditioned Sentiment 해석
- 데이터 정확성 기반 강화 (이미 상당 부분 사전 완료)

### 실제 달성 내용

| 항목 | 상태 | 비고 |
|------|------|------|
| Conviction Calculator (TDD) | ✅ 완료 | `core/conviction_calculator.py` (7 tests) |
| Regime-conditioned weights | ✅ 완료 | RISK_ON → Sentiment 비중 ↑, RISK_OFF → Regime 비중 ↑ |
| /api/watchlist 노출 | ✅ 완료 | per-symbol sentiment 지원 |
| /api/daily 노출 | ✅ 완료 | 일관된 필드 추가 |
| /api/brief Context | ✅ 완료 | context 필드 최상위 노출 |
| WatchlistBoard UI | ✅ 최소 완료 | Conviction 컬럼 + Glossary |
| DailyBoard UI | ✅ 최소 완료 | 헤더 배지 + Glossary |
| 검증 자동화 | ✅ 완료 | `verify_conviction.sh` + `verify_conviction_local.py` |
| 문서 업데이트 | ✅ 완료 | PROJECT_CONTEXT, README, 새로운 complete-plan |

---

## 2. 주요 구현 파일

### Backend (sniperboard)
- `backend/core/conviction_calculator.py`
- `backend/api/endpoints.py` (watchlist, daily, brief)
- `backend/api/schemas.py`
- `backend/tests/test_conviction_calculator.py` (7 tests)

### Frontend (sniperboard)
- `frontend/app/types.ts`
- `frontend/components/boards/WatchlistBoard.tsx`
- `frontend/components/boards/DailyBoard.tsx`

### Data Collection (market-sentiment-data)
- `collect/collect_brief.py` — `build_brief_context_snapshot()`
- `collect/test_collect_brief_context.py`

### 검증 도구 (sniperboard)
- `scripts/verify_conviction.sh`
- `scripts/verify_conviction_local.py`

---

## 3. 아키텍처 하이라이트

1. **순수 함수 설계**: `calculate_conviction()`은 side-effect가 없어 테스트와 재사용이 매우 용이함.
2. **Regime-conditioned 가중치**: 최초 v1 고정 가중치에서 Task 2에서 동적 조정으로 업그레이드.
3. **Context Attribution**: Brief 생성 시점의 기술적/레짐/심리 상태를 `brief/history/*.json`에 영구 저장 → 나중에 `/api/brief`로 투명하게 제공.
4. **점진적 개선**: per-symbol sentiment (B) → brief context 블렌딩 (Task 4) 순으로 자연스럽게 강화.

---

## 4. 검증 방법 (누구나 쉽게)

```bash
# 전체 스택 검증 (가장 추천)
./run_docker.sh
./scripts/verify_conviction.sh

# 빠른 로컬 검증 (Docker 없이)
PYTHONPATH=backend python3 scripts/verify_conviction_local.py
```

---

## 5. 남은 작업 / 다음 단계 제안 (Phase 2 준비)

- DailyBoard / OverviewBoard에 더 풍부한 Conviction 시각화
- Conviction 히스토리 차트 (Phase 3 힌트)
- Conviction을 기반으로 한 알림 / 스크리너 기능
- 더 정교한 per-symbol sentiment 모델 (Grok이 이미 생성한 brief context 적극 활용)

---

**결론**

Phase 1의 핵심 약속이었던 "Conviction Composite Score + Context Attribution"이 **데이터 레이어 → API → UI → 검증 도구**까지 모두 연결되어 동작합니다.

모든 변경은 `feat/yf-accuracy-harden-2026-05-25` 브랜치에 커밋되어 있으며, CLAUDE.md 규칙을 철저히 준수했습니다.

이 문서는 `yf-accuracy-harden-dev-onboarding.md`와 함께 Phase 1의 종합 완성 보고서 역할을 합니다.
