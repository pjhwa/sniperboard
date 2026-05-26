# SniperBoard × Market-Sentiment-Data 연계 강화 프로젝트
## Executive Summary (경영진용 요약)

**작성일**: 2026-05-25  
**프로젝트 기간**: Phase 1 (5주) + 전체 로드맵  
**주요 목적**: 두 저장소 간 강력한 양방향 연계를 최대한 활용하여, 투자자에게 실질적이고 깊은 통찰을 제공하는 시스템으로 고도화

---

### 1. 현재 상황 요약

- **sniperboard**: 기술적 신호 중심의 고품질 트레이딩 대시보드 (Stage 2, Regime, Distribution Day, Intraday Signal 등)
- **market-sentiment-data**: 소셜 심리 + Grok AI Brief + Earnings 데이터 저장소
- **현재 연계**: 이미 상당히 정교한 양방향 구조 존재
  - market-sentiment-data → sniperboard: Sentiment, Brief, Earnings 데이터 제공
  - sniperboard → market-sentiment-data: 가격·기술적 맥락을 Grok 프롬프트에 제공 (편향 방지)

**문제점**:
- 기술적 데이터와 심리 데이터가 아직 별도로 표시됨
- AI Brief가 어떤 맥락으로 작성되었는지 투자자가 알기 어려움
- 분할 종목(예: NVDA)에서 장기 지표(52주, RS Score 등)의 정확성 문제 존재
- 연계의 강점을 충분히 시각화·통합하지 못하고 있음

---

### 2. 프로젝트 비전

**"기술적 강도와 심리적 강도를 하나의 언어로 말하게 하자"**

sniperboard의 정밀한 기술적 분석과 market-sentiment-data의 질 높은 AI 심리 분석을 긴밀하게 결합하여, 투자자에게 **단순한 데이터 나열이 아닌 통합된 의사결정 통찰**을 제공하는 것이 목표입니다.

---

### 3. 핵심 개선 아이디어 (우선순위 순)

| 순위 | 아이디어 | 기대 효과 | Phase |
|------|----------|-----------|-------|
| 1 | **Conviction Composite Score** | 기술 + 심리 + 매크로를 하나의 점수로 종합 판단 가능 | Phase 1 |
| 2 | **Context Attribution** | AI Brief가 어떤 기술적 근거로 작성되었는지 투명하게 공개 | Phase 1 |
| 3 | **Sentiment-Technical Divergence Detector** | 기술과 심리가 충돌하는 모순 신호를 적극적으로 포착 | Phase 2 |
| 4 | **Historical Linkage Backtest View** | 과거 유사 패턴의 사후 수익률 분석 제공 | Phase 3 |

---

### 4. Phase 1 주요 결과물 (5주 목표)

- Conviction Composite Score (v1) 구현 및 UI 노출
- AI Brief 생성 시 사용된 가격·기술적 맥락 저장 및 표시 (Context Attribution)
- Regime 환경에 따른 Sentiment 해석 가이드 제공
- 데이터 정확성 개선 (yfinance MultiIndex 처리 강화 + adjusted price 지원)

**Phase 1 종료 시 기대 효과**:
- 투자자가 "이 종목의 현재 종합 강도"를 빠르게 파악 가능
- AI가 왜 그런 판단을 했는지 근거를 확인할 수 있음
- 기존 연계 구조를 크게 바꾸지 않으면서도 통찰의 질이 크게 향상

---

### 5. 전체 로드맵 (간략)

- **Phase 1** (5주): 기반 통합 지표 + 투명성 확보
- **Phase 2** (2~3개월): 모순 신호 탐지 + 이벤트 기반 통찰
- **Phase 3** (4~6개월): 역사적 패턴 분석 + AI 품질 관리 고도화
- **Phase 4** (장기): Cross-Asset 전이 분석 등 고도화

---

### 6. 핵심 위험 및 대응

- **Conviction Score 과신 위험**: "참고용 지표"임을 명확히 표시하고, 가중치 근거를 공개
- **AI Brief 신뢰도 하락 위험**: Context Attribution을 통해 오히려 투명성을 높이는 방향으로 설계
- **데이터 품질 의존성**: Historical 분석(Phase 3) 이전에 데이터 정합성 검증 체계 구축 필요

---

### 7. 권장 다음 행동

1. Phase 1 개발 착수용 체크리스트 및 브랜치 전략 문서 검토
2. Conviction Score 가중치와 Context Snapshot 데이터 구조에 대한 팀 합의
3. `feat/yf-accuracy-harden-2026-05-25` 브랜치에서 개발 시작

---

**이 문서는 경영진 및 이해관계자용 빠른 개요를 위한 문서입니다.**  
상세한 기술 계획과 실행 로드맵은 다음 문서를 참조하세요:

- `docs/yf-accuracy-harden-complete-plan.md` (종합 구현 계획)
- `docs/yf-accuracy-harden-dev-onboarding.md` (개발자 착수 가이드)