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
- `scripts/verify_conviction.sh` (full stack)
- `scripts/verify_conviction_local.py` (no Docker)

---

## 3. 아키텍처 주요 결정

- **Calculator는 순수 함수**: `calculate_conviction()`은 I/O 없이 입력만으로 결과를 반환. 테스트 용이 + 재사용성 높음.
- **Regime label 기반 가중치 조정**: 최초 고정 40/30/30 → Task 2에서 동적 조정 (CONSTRUCTIVE 시 Sentiment 비중 35%, RISK_OFF 시 Regime 비중 35%).
- **Context Attribution 설계**: Brief 생성 **직전**에 스냅샷을 캡처하여 brief JSON에 영구 저장. 나중에 `/api/brief`에서 최상위로 노출.
- **Sentiment 소싱 우선순위 (Task 4)**: Conviction 계산 시 Brief의 context.market_sentiment를 우선 사용 → Brief와 Conviction이 동일한 sentiment 시점을 공유.
- **UI는 점진적**: WatchlistBoard → DailyBoard 카드 내부 → OverviewBoard 미리보기 순으로 자연스럽게 확장.

---

## 4. 정확한 가중치 공식 (최종)

기본:
- Stage2: 40%
- Sentiment: 30%
- Regime: 30%

Regime-conditioned (refined):
- CONSTRUCTIVE / RISK_ON : Sentiment 35% / Regime 25%
- DEFENSIVE / RISK_OFF   : Sentiment 25% / Regime 35%
- MIXED / 그 외          : 30% / 30% (중립)

Stage2 정규화: `min(7, max(0, stage2)) / 7 * 100`

---

## 5. 테스트 커버리지

- `test_conviction_calculator.py`: 9개 테스트
  - 기본 가중치 계산
  - Regime=None 처리
  - Clamp & bounds
  - Schema 호환성
  - Watchlist-like integration
  - Regime-conditioned (CONSTRUCTIVE, RISK_OFF, MIXED, weight transparency)

- `test_collect_brief_context.py`: Context 스냅샷 빌더 테스트
- `verify_conviction_local.py`: 현실 데이터 기반 스모크
- `verify_conviction.sh`: 실제 Docker 환경 E2E 검증

---

## 6. 알려진 제한사항 및 주의점

- Conviction은 **참고 지표**이며 투자 결정의 유일한 근거가 되어서는 안 됨.
- 현재 per-symbol sentiment는 sentiment 서비스에 의존 (brief context는 시장 전체 중심).
- Regime label은 5요소 평균 기반 (극단적 상황에서 민감할 수 있음).
- Docker frontend 빌드는 환경에 따라 추가 의존성 필요할 수 있음.

---

## 7. 검증 방법 (권장 순서)

1. Local: `PYTHONPATH=backend python3 scripts/verify_conviction_local.py`
2. Full stack: `./run_docker.sh` → `./scripts/verify_conviction.sh`
3. 수동: 브라우저에서 http://localhost:4000 접속 → Watchlist / Daily 탭 확인

---

## 8. 다음 단계 제안 (Phase 2 힌트)

- Conviction 히스토리 차트 (OverviewBoard)
- Conviction 기반 알림 / 스크리너
- Divergence Detector (기술 vs 심리 충돌 탐지)
- 더 정교한 per-symbol sentiment 모델 (Grok brief 내부 신호 활용)

---

**이 문서는 Phase 1의 공식 종합 보고서입니다.**

모든 주요 변경은 `feat/yf-accuracy-harden-2026-05-25` 브랜치에 커밋되어 있으며, CLAUDE.md 규칙을 준수했습니다.

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
