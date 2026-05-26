# YF Accuracy Harden - 데이터 모델 명세서

**버전**: v1.0  
**작성일**: 2026-05-25  
**대상**: Phase 1 + 향후 확장 고려

## 1. 개요

이 문서는 Phase 1에서 도입되는 새로운 데이터 필드와 구조를 정의합니다.

주요 신규 데이터:
- Conviction Score (계산 결과)
- Context Snapshot (Brief 생성 시점의 기술적 맥락)
- Freshness Meta (이미 Task 3에서 일부 도입)

## 2. Conviction Score 데이터 모델

### 저장 위치
- 계산은 런타임에 수행 (영구 저장하지 않음, Phase 1 기준)
- Watchlist / Daily 응답에 포함

### 응답 필드 (Watchlist Item 기준)

```typescript
interface ConvictionScore {
  score: number;           // 0 ~ 100
  label: string;           // "매우 강한 확신" | "강한 확신 구간" | ...
  components?: {           // Phase 2+ 에서 확장 예정
    stage2: number;
    sentiment: number;
    regime: number;
  };
}
```

## 3. Context Snapshot 데이터 모델 (가장 중요)

### 저장 위치
- `market-sentiment-data/brief/history/`
- 각 Brief JSON 내부에 `context` 필드로 저장

### 스키마 (JSON Schema Draft-07)

```json
{
  "context": {
    "type": "object",
    "required": ["captured_at", "regime", "technical_summary"],
    "properties": {
      "captured_at": { "type": "string", "format": "date-time" },
      "source": { "type": "string", "enum": ["sniperboard"] },
      "regime": {
        "type": "object",
        "properties": {
          "total": { "type": "number" },
          "label": { "type": "string" }
        }
      },
      "technical_summary": {
        "type": "object",
        "properties": {
          "avg_stage2": { "type": "number" },
          "avg_rs_score": { "type": "number" },
          "spy_vs_ema200_pct": { "type": "number" },
          "distribution_day_spy": { "type": "integer" }
        }
      },
      "market_sentiment": {
        "type": "object",
        "properties": {
          "composite_score": { "type": "number" },
          "label": { "type": "string" }
        }
      },
      "key_factors": {
        "type": "array",
        "items": { "type": "string" }
      }
    }
  }
}
```

### 수집 시점
- `collect_brief.py`에서 Brief 생성 직전에 수집
- Sniperboard API 호출 후 즉시 생성하여 Brief와 함께 저장

## 4. Freshness Meta (이미 구현된 모델)

```json
{
  "meta": {
    "fetched_at": "string (ISO8601)",
    "age_minutes": "number",
    "source": "github_raw"
  }
}
```

---

**이 문서는 API 명세와 함께 Backend 개발 시 최우선 참조 문서입니다.**