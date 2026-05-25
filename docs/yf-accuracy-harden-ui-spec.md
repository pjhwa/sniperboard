# YF Accuracy Harden - UI 상세 명세서 (Phase 1)

**버전**: v1.0  
**작성일**: 2026-05-25

## 1. 개요

Phase 1에서 변경되는 주요 UI 영역은 다음과 같습니다:

- Watchlist에 Conviction Score 추가
- OverviewBoard에 Conviction Score 및 Context 표시
- Brief 카드에 Context Attribution 패널 추가
- Sentiment 관련 UI에 Regime 해석 추가 (간단 버전)

## 2. 컴포넌트별 변경 사항

### 2.1 WatchlistBoard

**추가 컬럼**:
- Conviction Score (숫자 + 색상 배지 + 라벨)

**정렬**:
- 기본 정렬은 기존 Stage2 score 유지
- 향후 "Conviction Score" 정렬 옵션 추가 고려

### 2.2 OverviewBoard

**AI Insight 카드**:
- 상단에 Conviction Score 배지 추가 (선택 종목 기준)
- Brief 카드에 "생성 당시 맥락" 아코디언 추가

**Earnings 카드**:
- 각 종목 옆에 간단한 Conviction Score 미니 배지 (선택)

### 2.3 SentimentBoard (Light Touch)

- Market Sentiment 카드 하단에 간단한 "Regime 영향" 한 줄 설명 추가

## 3. 디자인 가이드라인

- 기존 Plaid DS 토큰 최대한 활용
- 새로운 색상 추가 최소화 (기존 success/warn/danger 색상 재사용)
- 정보 과부하 방지: 중요한 것만 강조

---

**상세 디자인은 Figma나 실제 구현 시 확정**