# Phase 2 설계 논의 — 컨텍스트 문서

**작성일**: 2026-05-25  
**목적**: Phase 2 (특히 Divergence Detector) 설계 논의를 위한 사전 컨텍스트 정리

---

## 1. 프로젝트 전체 비전

> **"기술적 강도와 심리적 강도를 하나의 언어로 말하게 하자"**

sniperboard의 정밀한 기술적 분석과 market-sentiment-data의 질 높은 AI 심리 분석을 긴밀하게 결합하여, 투자자에게 단순한 데이터 나열이 아닌 **통합된 의사결정 통찰**을 제공하는 것이 궁극적인 목표다.

---

## 2. Phase 1 성과 요약 (Phase 2의 기반)

Phase 1에서 다음이 완료되었다:

- **Conviction Composite Score (v1)**: Stage2 + Sentiment + Regime을 40/30/30 (Regime-conditioned 조정 포함)으로 종합한 점수. reliability와 notes까지 제공.
- **Context Attribution**: Brief 생성 시점의 기술적·레짐·심리 상태를 `context` 객체로 저장하고 `/api/brief`에서 최상위로 노출.
- **API 노출**: `/api/watchlist`, `/api/daily`, `/api/brief`에서 Conviction + Context 제공.
- **UI 최소 연동**: WatchlistBoard, DailyBoard, OverviewBoard에 Conviction 표시.
- **검증 도구**: `verify_conviction.sh`, `verify_conviction_local.py`
- **자동화**: 수집기들이 생성 후 자동 GitHub push (Phase 1 마무리 작업)

**Phase 1으로 인해 확보한 가장 큰 자산**:
- 기술 신호와 심리 신호를 **동일한 시점**에서 비교할 수 있는 데이터 구조 (`context`)
- 이미 계산된 종합 지표 (Conviction)
- 안정적인 데이터 파이프라인

---

## 3. Phase 2 공식 목표 (기존 문서 기준)

### Executive Summary 기준
- **Phase 2 (2~3개월)**: 모순 신호 탐지 + 이벤트 기반 통찰
- 핵심 기능: **Sentiment-Technical Divergence Detector**
  - 기술과 심리가 충돌하는 모순 신호를 적극적으로 포착

### Complete Plan 기준 (Phase 2 힌트)
- Divergence Detector (기술 vs 심리 충돌 탐지)
- Conviction 히스토리 차트
- Conviction 기반 알림 / 스크리너
- 더 정교한 per-symbol sentiment 모델 (Grok brief 내부 신호 활용)

### 다른 문서에서 언급된 Phase 2 항목 (참고)
- OPEX D-day (Macro + Daily)
- 종목-매크로 상관계수 패널 (Daily)
- (이것들은 별개의 Phase 2 항목일 수 있음)

---

## 4. 현재 보유 자산 (Phase 2 설계 시 활용 가능)

### 데이터
- 실시간 기술 데이터 (Stage2, RS Score, Regime 5요소, Distribution Day 등)
- 소셜 심리 데이터 (symbol별 sentiment, composite_score, trend_vs_yesterday 등)
- AI Brief (생성 시점 context 포함)
- Earnings 데이터

### 계산된 지표
- Conviction Score + reliability + components (weights 포함)
- Brief 생성 시점의 Context Snapshot

### 인프라
- 안정적인 API (`/api/brief`, `/api/watchlist`, `/api/daily` 등)
- 자동 GitHub push 파이프라인 (collectors)
- Docker 기반 실행 환경

---

## 5. Phase 2 설계 시 고려해야 할 주요 질문 (초안)

1. **Divergence의 정의**
   - 어떤 조합의 충돌을 Divergence로 정의할 것인가? (예: High Conviction + Negative Brief tone, Strong Stage2 + Weak Sentiment 등)
   - Divergence를 점수화할 것인가, boolean 이벤트로 할 것인가?

2. **탐지 로직 방향**
   - 규칙 기반으로 시작할 것인가?
   - 통계적 방법(편차, Z-score 등)을 사용할 것인가?
   - 시간 축 고려 (최근 N일 간의 divergence 강도 변화)?

3. **출력 및 소비 형태**
   - 새로운 `/api/divergences` 엔드포인트?
   - 기존 API에 필드 추가?
   - UI: 별도 Divergence Board? 기존 보드에 배지/섹션? 알림 기능?

4. **신뢰성**
   - Phase 1에서 만든 `reliability`와 `context`의 신선도를 어떻게 활용할 것인가?
   - False Positive를 줄이기 위한 최소 기준은?

5. **범위 관리**
   - Phase 2에서 **반드시 하지 않을 것**은 무엇인가? (Phase 1 때 scope creep 경험 반영)

---

## 6. 참고 문서 목록

- `yf-accuracy-harden-executive-summary.md` — 전체 Phase 로드맵 (가장 중요)
- `yf-accuracy-harden-complete-plan.md` — Phase 1 성과 + Phase 2 힌트
- `sniperboard-integration-plan.md`
- `claude-code-brief.md` — 다른 Phase 2 후보 기능들 (OPEX, 상관계수 등)
- `yf-accuracy-harden-dev-onboarding.md`
- `yf-accuracy-harden-data-model.md`

---

**이 문서는 Phase 2 설계 논의를 위한 사전 컨텍스트 정리본입니다.**  
새 세션에서 이 파일 + 위 참고 문서들을 함께 제공하면 효율적인 논의가 가능할 것입니다.