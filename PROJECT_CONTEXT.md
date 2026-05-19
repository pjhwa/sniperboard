# Lazy Alpha Web Dashboard - 프로젝트 컨텍스트 문서

## 1. 프로젝트 개요
- **목표**: Whop의 Lazy Alpha Indicator를 웹 대시보드 형태로 재구현
- **방향**: TradingView 느낌을 최대한 살린 웹 버전
- **현재 범위**: 미국 주식 중심 (Mag7 + 주요 종목), 한국 주식은 추후 추가
- **버전**: 오픈 버전 (무료 공개, 구독/로그인 없음)
- **주요 타임프레임**: 5분봉 중심 + 1분봉 보조

## 2. 핵심 신호 정의 (6개)

### 2.1 VCP 타점 (돌파 진입)
- 최근 30캔들 최고가 갱신
- 거래량 ≥ 20일 평균 × 2.0
- 가격 > 21EMA
- ATR 변동성 8캔들 연속 축소
- 21EMA > 50EMA

### 2.2 Sniper 타점 (EMA 지지 반등)
- 21EMA에 0.4% 이내 접근
- RSI 38~58 구간
- 종가 > 21EMA
- 거래량 ≥ 직전 캔들 × 1.4

### 2.3 Pullback (지지 매수)
- 최근 15캔들 고점 대비 4.5~9% 조정
- 21EMA 또는 50EMA 지지
- MACD 히스토그램 3캔들 상승 전환
- 거래량 감소

### 2.4 StrongTrend (홀딩 유지)
- 가격 > 21EMA > 50EMA
- 21EMA 기울기 +0.15% 이상
- RSI 52~78
- 거래량 ≥ 20일 평균 × 0.9

### 2.5 Overbought (분할 익절)
- RSI ≥ 76
- 최근 5캔들 중 4캔들 이상 양봉
- 21EMA 이격률 +3.2% 이상
- 거래량 감소 조짐

### 2.6 Downtrend (접근 금지)
- 가격 < 21EMA
- 21EMA 기울기 음수
- 거래량 ≥ 20일 평균 × 1.3
- 최근 8캔들 저점 이탈

## 3. 기술 스택 (확정)

### Frontend
- Next.js 14 + TypeScript + Tailwind CSS
- TradingView Lightweight Charts (차트 + 신호 오버레이)
- React Query 또는 SWR (데이터 페칭)

### Backend
- FastAPI (Python)
- pandas + pandas_ta (신호 계산)
- yfinance (개발 초기) → Polygon.io (운영)

### 데이터
- 5분봉 + 1분봉
- Mag7 중심: NVDA, AAPL, TSLA, META, AMZN, GOOGL 등

## 4. 아키텍처

```
Next.js Frontend
    ↓ REST API
FastAPI Backend
    ├── /api/ohlcv
    ├── /api/signals
    ├── /api/latest-signal
    └── Signal Engine (core/signal_engine.py)
```

## 5. 진행 상황 요약

### 완료된 작업
- 6개 신호 조건 정의 및 수치 다듬기 완료
- Python Signal Engine 구현 완료 (`test_signals.py`)
- 실제 데이터 테스트 수행 (NVDA, TSLA, META, AAPL, AMZN, GOOGL)
- 테스트 결과:
  - TSLA: Sniper 신호 다수 발생
  - META: Sniper 발생
  - GOOGL: Downtrend 발생
  - NVDA: 최근 신호 적음 (조건 보수적)

### 현재 상태
- 신호 로직은 `test_signals.py`에 안정적으로 동작
- FastAPI 연동을 위한 아키텍처 설계 완료
- UI 레이아웃 및 차트 오버레이 방향성 확정

## 6. 다음 개발 우선순위 (추천)

1. `core/signal_engine.py` 모듈화 (기존 테스트 코드 정리)
2. FastAPI 기본 프로젝트 구조 생성
3. `/api/ohlcv` + `/api/signals` 엔드포인트 구현
4. Next.js + Lightweight Charts 연동 (캔들 + EMA + 마커)
5. 신호 오버레이 시각화 (색상, 마커, 배경)

## 7. 주의사항 및 컨벤션

- 신호 조건은 보수적으로 유지 (노이즈 최소화)
- 5분봉을 메인으로 사용, 1분봉은 보조 확인용
- 모든 시간 데이터는 ISO 8601 문자열 사용
- 신호는 boolean 배열 형태로 반환
- 한국 주식 데이터는 아직 고려하지 않음

## 8. 파일 위치

- 테스트 스크립트: `/home/citec/tmp/xfetch/test_signals.py`
- 프로젝트 컨텍스트: `/home/citec/tmp/xfetch/PROJECT_CONTEXT.md`

---
이 문서를 기준으로 다음 세션에서 바로 개발을 이어갈 수 있습니다.