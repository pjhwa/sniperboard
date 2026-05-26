# YF Accuracy Harden - API 명세서 (Phase 1)

**버전**: v1.0  
**작성일**: 2026-05-25  
**대상 Phase**: Phase 1

## 1. 변경 개요

Phase 1에서 발생하는 주요 API 변경은 다음과 같습니다:

- Conviction Composite Score 추가
- AI 응답(Brief, Sentiment, Earnings)에 `meta` 필드 (freshness) 추가
- Brief 응답에 `context` 필드 (생성 당시 기술적 맥락) 추가

기존 응답 구조는 **최대한 하위 호환**을 유지합니다. 새로운 필드는 모두 **optional** 또는 별도 객체로 분리합니다.

---

## 2. 주요 변경 사항 상세

### 2.1 Watchlist API (`GET /api/watchlist`)

**변경 전 응답 예시 (일부)**:
```json
{
  "watchlist": [
    {
      "symbol": "NVDA",
      "score": 6,
      "rs_score": 72.5,
      ...
    }
  ]
}
```

**변경 후 응답**:
```json
{
  "watchlist": [
    {
      "symbol": "NVDA",
      "score": 6,
      "rs_score": 72.5,
      "conviction_score": 78.4,           // 신규 (0~100)
      "conviction_label": "강한 확신 구간", // 신규
      ...
    }
  ]
}
```

**필드 설명**:
- `conviction_score`: number (0~100)
- `conviction_label`: string (해석용 라벨)

### 2.2 Brief API (`GET /api/brief`)

**변경 후 응답 구조**:
```json
{
  "available": true,
  "data": { ... 기존 Brief 데이터 ... },
  "meta": {                           // 신규 (Phase 1-3에서 이미 추가됨)
    "fetched_at": "2026-05-25T04:46:56Z",
    "age_minutes": 12.3,
    "source": "github_raw"
  },
  "context": {                        // 신규 (Phase 1 핵심)
    "captured_at": "2026-05-25T04:25:12Z",
    "regime": {
      "total": 72,
      "label": "CONSTRUCTIVE"
    },
    "technical_summary": {
      "avg_stage2": 5.3,
      "avg_rs_score": 61.4
    },
    "key_factors": [
      "Stage2 평균 5점 이상",
      "Regime CONSTRUCTIVE 구간"
    ]
  }
}
```

### 2.3 Sentiment API (`GET /api/sentiment`)

기존 응답에 `meta` 필드 추가 (이미 Task 3에서 구현됨).  
추가 변경 없음.

### 2.4 Earnings API (`GET /api/earnings`)

기존 응답에 `meta` 필드 추가 (이미 Task 3에서 구현됨).  
추가 변경 없음.

---

## 3. Request 변경 사항

Phase 1에서는 **새로운 쿼리 파라미터 추가 없음**.

다만, 향후를 위해 아래 옵션은 열어둠:
- `/api/watchlist?include_conviction=true` (기본값 true로 고려 중)

---

## 4. Error Response

기존 에러 응답 형식 유지.  
새로운 필드 추가 시에도 `error` 객체 안에만 추가.

---

## 5. 하위 호환성 보장 정책

- 기존 필드는 절대 삭제하지 않음
- 새로운 필드는 항상 optional 또는 별도 객체로 분리
- 클라이언트가 새로운 필드를 무시해도 기존 기능이 정상 동작해야 함

---

**다음 문서**: `yf-accuracy-harden-data-model.md` 참조 (Context Snapshot 상세 스키마)