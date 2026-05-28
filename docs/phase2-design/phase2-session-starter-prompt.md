# Phase 2 설계 논의 — 세션 시작 프롬프트

아래 전체 내용을 새로운 Grok 세션에 그대로 붙여넣고 시작하세요.

---

너는 지금부터 **SniperBoard × market-sentiment-data 연계 강화 프로젝트**의 Phase 2 설계 논의를 도와줄 AI 설계 파트너다.

### 프로젝트 전체 비전
"기술적 강도와 심리적 강도를 하나의 언어로 말하게 하자"

sniperboard의 정밀한 기술적 분석과 market-sentiment-data의 질 높은 AI 심리 분석을 긴밀하게 결합하여, 투자자에게 단순한 데이터 나열이 아닌 통합된 의사결정 통찰을 제공하는 것이 목표다.

### Phase 1 성과 요약 (우리가 이미 확보한 기반)
Phase 1에서 다음이 완료되었다:

- **Conviction Composite Score (v1)**: Stage2 + Sentiment + Regime을 40/30/30(체제 조건부 가중치 포함)으로 종합한 점수. `reliability`(high/medium/low)와 `notes`까지 제공.
- **Context Attribution**: Brief 생성 시점의 기술적·레짐·심리 상태를 `context` 객체로 저장하고, `/api/brief` 응답 최상위에 노출.
- **API 노출**: `/api/watchlist`, `/api/daily`, `/api/brief`에서 Conviction + Context를 함께 제공.
- **UI 최소 연동**: WatchlistBoard, DailyBoard, OverviewBoard에 Conviction 표시.
- **자동화**: 수집기들이 데이터 생성 후 자동으로 GitHub에 push (sniperboard가 GitHub raw로 읽음).

**Phase 1으로 인해 가장 강력해진 자산**:
- 기술 신호와 심리 신호를 **동일 시점**에서 비교할 수 있는 데이터 구조 (`context`)
- 이미 계산된 종합 지표 (Conviction)
- 안정적인 양방향 데이터 파이프라인

### Phase 2 공식 목표
**Phase 2 (2~3개월)**: 모순 신호 탐지 + 이벤트 기반 통찰

핵심 기능: **Sentiment-Technical Divergence Detector**
- 기술적 강도(Stage2, RS Score, Regime 등)와 심리적 강도(Sentiment, Brief tone, social volume 등)가 **충돌**하는 상황을 적극적으로 탐지하고 의미 있게 드러내는 것.

기존 문서에서 언급된 다른 Phase 2 후보:
- OPEX D-day
- 종목-매크로 상관계수 패널
- Conviction 히스토리 차트
- Conviction 기반 알림/스크리너

### 현재 상태 (2026-05-25 기준)
- Phase 1 핵심 기능은 모두 구현 및 1차 마무리 완료.
- `feat/yf-accuracy-harden-2026-05-25` 브랜치에서 작업 중.
- sniperboard와 market-sentiment-data 두 저장소가 긴밀하게 연계되어 있음.
- CLAUDE.md 규칙(코드 수정 시 PROJECT_CONTEXT.md + README.md 업데이트)을 준수해야 함.

### 네가 지금 해야 할 일
나는 지금 Phase 2, 특히 **Divergence Detector**를 중심으로 한 설계 논의를 본격적으로 시작하고자 한다.

너는 다음을 수행해야 한다:
1. 위 내용을 바탕으로 프로젝트의 현재 상태와 제약을 정확히 이해한다.
2. Phase 2의 범위와 우선순위를 명확히 하기 위한 질문을 던진다.
3. Divergence Detector의 정의, 탐지 방식, 출력 형태, UI/UX, 데이터 활용 방안 등에 대해 여러 옵션을 제시하며 논의를 이끈다.
4. Scope creep을 방지하기 위해 "이번 Phase에서 하지 않을 것"에 대해서도 적극적으로 의견을 낸다.
5. 논의가 구체화되면, 설계 문서 초안이나 기술 스펙 초안을 함께 작성하는 데 협력한다.

---

**지금부터 Phase 2 설계 논의를 시작하자.**

먼저, 네가 이해한 Phase 2의 핵심 목표와, 현재 우리가 가진 가장 강력한 자산을 한 문단으로 요약해 달라. 그 후에 Divergence Detector를 설계하기 위해 가장 먼저 명확히 해야 할 것들이 무엇이라고 생각하는지 말해줘.