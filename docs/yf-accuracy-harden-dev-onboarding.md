# SniperBoard × Market-Sentiment-Data 연계 강화 프로젝트
## 개발자 온보딩 가이드 (Dev Onboarding Guide)

**목적**: 새로운 개발자(또는 AI)가 이 문서 하나만 읽고도 **Phase 1 개발을 즉시 착수**할 수 있도록 필요한 모든 정보를 담은 실무 가이드.

**대상 독자**: Backend / Frontend 개발자, 또는 이 프로젝트를 이어서 진행할 AI 에이전트

---

## 1. 프로젝트 한 줄 요약

**sniperboard의 정밀한 기술적 분석과 market-sentiment-data의 질 높은 AI 심리 분석을 긴밀하게 결합하여, 투자자에게 통합된 의사결정 통찰을 제공하는 시스템을 구축한다.**

기존에 이미 존재하는 강력한 양방향 연계를 더 깊고 실용적으로 발전시키는 것이 핵심입니다.

---

## 2. 현재 상태 (2026-05-25 기준)

### 2.1 주요 문제점
- 기술적 지표(Stage2, RS Score 등)와 심리 데이터가 별도로 존재
- AI Brief가 어떤 기술적 근거로 작성되었는지 알기 어려움
- 분할 종목에서 장기 지표의 정확성 문제 (yfinance raw price 사용)
- 연계의 강점을 충분히 시각화하지 못하고 있음

### 2.2 이미 완료된 작업
- yfinance 데이터 정확성 문제 분석 완료
- 전체 개선 아이디어 도출 및 우선순위 정리
- Phase 1 ~ 4 로드맵 수립
- Conviction Composite Score, Context Attribution 등 핵심 기능의 기본 설계 완료

---

## 3. Phase 1 목표 (5주)

**Phase 1의 핵심 목표**는 다음과 같습니다:

1. **Conviction Composite Score (v1)** 구현 및 노출
2. **Context Attribution** (Brief 생성 당시 맥락 공개) 구현
3. **Regime-Conditioned Sentiment 해석** 제공
4. 데이터 정확성 기반 강화 (이미 상당 부분 완료)

Phase 1 종료 시, 투자자가 "이 종목의 현재 종합 강도"를 빠르게 파악하고, AI가 왜 그런 판단을 했는지 근거를 확인할 수 있어야 합니다.

---

## 4. 개발 환경 설정

### 4.1 저장소
- **메인 저장소**: `/Users/jerry/dev/sniperboard`
- **연동 저장소**: `/Users/jerry/dev/market-sentiment-data`

### 4.2 필수 브랜치
모든 작업은 아래 브랜치에서 진행합니다:

```bash
feat/yf-accuracy-harden-2026-05-25
```

**절대 main 브랜치에 직접 작업하지 마세요.**

### 4.3 초기 설정 명령어

```bash
# sniperboard
cd /Users/jerry/dev/sniperboard
git checkout -b feat/yf-accuracy-harden-2026-05-25 origin/main   # 처음 한 번
git pull origin feat/yf-accuracy-harden-2026-05-25

# market-sentiment-data (필요 시)
cd /Users/jerry/dev/market-sentiment-data
git checkout -b feat/yf-accuracy-harden-2026-05-25 origin/main
```

---

## 5. 개발 착수 전 체크리스트

Phase 1 개발을 시작하기 전에 아래 항목을 **반드시 확인**하세요.

### 필수 사전 합의
- [ ] Conviction Score 기본 가중치에 대한 팀 합의
- [ ] Context Snapshot 데이터 구조 최종 확정
- [ ] Regime-Conditioned Sentiment 해석 룰 합의

### 기술 환경
- [ ] 두 저장소 모두 `feat/yf-accuracy-harden-2026-05-25` 브랜치 최신화
- [ ] sniperboard 백엔드 테스트 전체 실행 (`pytest tests/`)
- [ ] market-sentiment-data 테스트 전체 실행

### 문서
- [ ] 이 문서(`yf-accuracy-harden-dev-onboarding.md`) 전체 읽기
- [ ] `docs/yf-accuracy-harden-complete-plan.md` 핵심 부분 읽기

---

## 6. 핵심 기술 명세 (Phase 1)

### 6.1 Conviction Composite Score (v1)

**기본 가중치 (초기안)**:
- Stage2 Score: 40%
- Sentiment Composite: 30%
- Regime Total: 30%

**Regime에 따른 조정**:
- RISK_ON: Sentiment 가중치 상향
- RISK_OFF: Regime 가중치 상향

자세한 알고리즘은 `docs/yf-accuracy-harden-complete-plan.md`의 "Conviction Composite Score 상세 알고리즘 명세서" 참조.

### 6.2 Context Snapshot 구조 (요약)

Brief 생성 시점에 다음 정보를 저장합니다:

- Regime 상태 및 점수
- 평균 Stage2 점수, 평균 RS Score
- 주요 기술적 요약 (SPY 위치, Distribution Day 등)
- 당시 시장 Sentiment

이 데이터는 `market-sentiment-data/brief/` JSON 내부에 `context` 필드로 저장되며, `/api/brief` 응답에 포함되어 프론트에서 표시됩니다.

### 6.3 주요 파일 위치 (예정)

```
backend/
├── core/
│   ├── conviction_calculator.py          # 신규
│   └── signal_engine.py                  # Phase 2에서 adjusted price 로직 추가
├── api/
│   ├── endpoints.py
│   └── schemas.py
frontend/
├── components/boards/
│   ├── OverviewBoard.tsx
│   └── WatchlistBoard.tsx
```

---

## 7. 브랜치 전략 (간단 요약)

- **장기 브랜치**: `feat/yf-accuracy-harden-2026-05-25`
- **서브 브랜치 추천** (Phase 1 내부):
  - `feat/conviction-score-v1`
  - `feat/context-attribution`
  - `feat/regime-sentiment-interpretation`
  - `feat/phase1-polish`

모든 서브 브랜치는 `feat/yf-accuracy-harden-2026-05-25`로 PR합니다.

상세 전략은 `docs/yf-accuracy-harden-complete-plan.md`의 브랜치 전략 섹션 참조.

---

## 8. Claude.md 규칙 (중요)

이 프로젝트는 **Claude.md 규칙을 매우 엄격하게 따릅니다**.

**코드 파일을 수정할 때마다 반드시 해야 할 일**:
1. `PROJECT_CONTEXT.md` 업데이트
2. `README.md` 업데이트 (사용자 관점)
3. 두 파일 모두 git commit에 포함

이 규칙을 지키지 않으면 이후 유지보수가 매우 어려워집니다.

---

## 9. Phase 1 즉시 시작 가능한 첫 작업 추천

아래 순서로 시작하는 것을 강력 추천합니다:

1. **Conviction Score 계산 엔진** 설계 및 초기 구현 (`backend/core/conviction_calculator.py`)
2. **Context Snapshot 데이터 구조**를 `market-sentiment-data` 쪽에 먼저 확정
3. `collect_brief.py`에 Context 수집 로직 추가
4. `/api/brief` 응답에 `context` 필드 추가

가장 먼저 해야 할 일은 **가중치와 데이터 구조에 대한 팀 합의**입니다.

---

## 10. 참고 문서

- `docs/yf-accuracy-harden-complete-plan.md` — 전체 종합 계획 (가장 중요)
- `docs/yf-accuracy-harden-executive-summary.md` — 경영진용 요약
- `docs/superpowers/plans/2026-05-25-sniperboard-yf-accuracy-harden-plan.md` — 초기 작성된 구현 계획

---

**이 문서 하나만 읽고도 Phase 1 개발을 시작할 수 있도록** 최대한 압축하고 실무적으로 정리했습니다.

개발을 시작하기 전에, 반드시 위 체크리스트를 확인하고 팀과 핵심 설계(가중치, Context 구조)에 대한 합의를 먼저 진행하시기 바랍니다.

필요한 추가 문서(예: API 상세 스펙, UI 목업 가이드 등)가 있으면 언제든 요청해주세요.