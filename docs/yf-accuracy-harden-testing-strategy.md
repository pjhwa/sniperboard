# YF Accuracy Harden - 테스트 전략

**버전**: v1.0  
**작성일**: 2026-05-25

## 1. 테스트 범위 (Phase 1)

### 1.1 Backend 테스트 우선순위

- **P0 (Must)**: Conviction Calculator 로직 단위 테스트 (가중치, Regime 조정, 예외)
- **P0**: Context Snapshot 생성 로직 테스트
- **P1**: API 응답 구조 테스트 (새 필드 포함)
- **P1**: 기존 기능 회귀 테스트 (signal_engine, endpoints 전체)

### 1.2 Frontend 테스트

- TypeScript 타입 체크 (tsc --noEmit)
- 주요 컴포넌트 렌더링 스냅샷 또는 로직 테스트 (선택)
- 수동 UI 검증 중점

### 1.3 E2E / 통합 테스트

Phase 1에서는 최소화. 
- Brief 수집 → Context 저장 → /api/brief 조회 전체 플로우 수동 검증 권장

## 2. 테스트 데이터 전략

- 실제 분할 종목 (NVDA 등) 과거 데이터 활용
- Mock을 통한 Regime별, Sentiment별 다양한 시나리오 커버

---

**Phase 2부터는 자동화된 E2E 테스트 도입을 검토**합니다.