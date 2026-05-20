# SniperBoard - 프로젝트 컨텍스트 문서

## 1. 프로젝트 개요
- **목표**: Whop의 Lazy Alpha Indicator를 웹 대시보드 형태로 재구현
- **방향**: TradingView 느낌을 살린 고성능 스윙 트레이딩 대시보드
- **현재 범위**: 미국 주식 중심 (Mag7 + 주요 종목), 한국 주식은 추후 추가
- **버전**: 오픈 버전 (무료 공개, 구독/로그인 없음)
- **주요 타임프레임**: 5분봉/1분봉 (단기) + 일봉 (스윙 분석)

---

## 2. 핵심 신호 및 분석 알고리즘 (6개 단기 신호 + Stage 2)

### 2.1 VCP 타점 (돌파 진입)
- 최근 30캔들 최고가 갱신
- 거래량 ≥ 20일 평균 × 2.0
- 가격 > 21EMA
- ATR 변동성 8캔들 연속 축소 (벡터 연산 최적화)
- 21EMA > 50EMA

### 2.2 Sniper 타점 (EMA 지지 반등)
- 21EMA에 0.4% 이내 접근
- RSI 38~58 구간
- 종가 > 21EMA
- 거래량 ≥ 직전 캔들 × 1.4

### 2.3 Pullback (지지 매수)
- 최근 15캔들 고점 대비 4.5~9% 조정
- 21EMA 또는 50EMA 지지
- MACD 히스토그램 3캔들 상승 전환 (벡터 연산 최적화)
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

### 2.7 Minervini Stage 2 분석 및 가우시안 채널
- **이평 정배열**: 가격 > EMA21 > EMA50 > EMA200
- **장기 추세**: EMA200이 20일 이상 연속 상승 중
- **52주 가격 밴드**: 고점 대비 -25% 이내, 저점 대비 +30% 이상
- **가우시안 채널**: 통계 노이즈가 필터링된 추세 채널 돌파 및 리테스트 판단

---

## 3. 기술 스택 (최종 확정 및 리팩토링 완료)

### Frontend
- **Core**: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS
- **State Management**: **Zustand** (클라이언트 전역 상태 및 리스크 설정 바인딩)
- **Server Cache**: **@tanstack/react-query** (REST API 통신 및 30초 캐시 무효화/폴링 관리)
- **Charts**: TradingView Lightweight Charts (반응형 Resize 및 메모리 정리 대응)

### Backend
- **Core**: FastAPI (Python)
- **Validation**: **Pydantic v2 schemas** (엄격한 입출력 타입 및 JSON 직렬화 검증)
- **Signal Engine**: pandas (벡터화 성능 개선 및 SettingWithCopyWarning 제거)
- **Data Provider**: `yfinance` 기반 다중 데이터 획득 모듈 (`BaseDataService` 추상화)
- **Testing**: **pytest** (신호 엔진, Gaussian Channel, Stage 2 스코어 자동 유닛 테스트)

---

## 4. 시스템 아키텍처

```
[ 브라우저 (Next.js Client) ]
      │
      ├── (Zustand Global Store - 계좌규모, 리스크% 등)
      │
      ▼ (React Query API fetch & Cache 관리)
[ FastAPI Backend (Port 5000) ]
      │
      ├── /api/ohlcv          (단기 캔들 + 6대 신호 + 보조 지표)
      ├── /api/latest-signal  (최신 캔들 기준 간략 상태 요약)
      ├── /api/daily          (일봉 + EMA 3종 + Gaussian + Stage2 스코어)
      ├── /api/watchlist      (주요 6종목 Stage2 일괄 스캔 순위)
      │
      ▼ (Pydantic schemas 데이터 규격 매핑)
[ Signal Engine & Data Layer ]
      │
      └── YFinanceDataService (BaseDataService 상속, 멀티스레드 멀티인덱스 복구)
```

---

## 5. 프로젝트 디렉토리 구조 및 파일 위치

*디렉토리 이름은 기존 `xfetch`에서 `sniperboard`로 변경될 예정입니다.*

```
sniperboard/
├── run_docker.sh          # 도커 빌드/재구동 통합 실행 스크립트
├── docker-compose.yml     # sniperboard 이미지/컨테이너(Frontend:4000, Backend:5000) 정의
├── backend/
│   ├── Dockerfile         # Python 3.11-slim 기반 API 빌드 환경
│   ├── requirements.txt   # FastAPI, yfinance, pandas, pytest 등 정의
│   ├── main.py            # FastAPI Entrypoint 및 CORS 미들웨어 설정
│   ├── api/
│   │   ├── endpoints.py   # API 라우팅 엔드포인트 구현 (Pydantic 모델 적용)
│   │   └── schemas.py     # 입출력 데이터 검증 스키마
│   ├── core/
│   │   └── signal_engine.py # 판다스 최적화 신호/지표 계산 엔진
│   ├── services/
│   │   ├── base.py        # BaseDataService 인터페이스 선언
│   │   └── data_service.py # YFinanceDataService 구현체
│   └── tests/
│       └── test_signal_engine.py # pytest 엔진 기능 검증 테스트
└── frontend/
    ├── Dockerfile         # Node 20-alpine 기반 Next.js 빌드 환경 (멀티스테이지)
    ├── app/
    │   ├── layout.tsx     # 폰트, 메타데이터, Providers 주입
    │   ├── page.tsx       # 메인 대시보드 구조 및 컴포넌트 결합
    │   ├── providers.tsx  # React Query Client Context
    │   └── types.ts       # 전역 금융 데이터 타입 명세
    ├── hooks/
    │   ├── useStore.ts    # Zustand 글로벌 스토어 (공유 설정)
    │   ├── useIntraday.ts # 단기 분석 조회용 훅
    │   ├── useDaily.ts    # 일봉 분석 조회용 훅
    │   └── useWatchlist.ts # 워치리스트 조회용 훅
    └── components/
        ├── StatCard.tsx   # 수치 모니터링 카드
        ├── RRCalculator.tsx # 손익비(R:R) 및 포지션 크기 계산기
        ├── IntradayTab.tsx  # 단기 분석 탭 통합 뷰
        ├── DailyTab.tsx     # 일봉 분석 탭 통합 뷰
        ├── WatchlistTab.tsx # 워치리스트 탭 통합 뷰
        └── charts/
            ├── IntradayChart.tsx # 단기 캔들/EMA/시그널 마커 차트
            └── DailyChart.tsx    # 일봉 캔들/EMA/Gaussian/Entry 차트
```