<div align="center">

# ⚡ SniperBoard

**Precision Signal Dashboard for US Equities**

*Livermore · O'Neil · Minervini 전략 기반 스윙 트레이딩 대시보드*

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

---

## 📌 Overview

SniperBoard는 미국 주식 스윙 트레이딩을 위한 **웹 기반 매매 신호 대시보드**입니다.  
단기 인트라데이 신호부터 Minervini Stage 2 일봉 분석, O'Neil Distribution Day, 시장 폭·신용 스트레스·변동성 환경까지 **상시 대시보드 + 4개 탭**으로 구성됩니다.

### 🎨 UI/UX (Deep Navy Terminal Theme)

**프리미엄 딥 네이비 다크 테마** — 단순한 검정이 아닌 `#07091a` 베이스에 인디고 대기 그라디언트를 적용해 공간감과 가독성을 동시에 확보합니다.

- **글래스모피즘 카드**: 블루틴트 경계선(`rgba(45,65,115)`) + 고대비 배경으로 배경과 명확히 구분
- **텍스트 계층**: 흰색 수치 → 블루틴트 레이블 → 머트 보조 텍스트 3단계 계층
- **색상 글로우**: Regime 바·DD 도트·상태 배지에 색상별 발광 효과
- **실시간 신호 펄스**: 신호별 고대비 색상 + LIVE 네온 펄스 애니메이션

```
브라우저 ──► Next.js Frontend (포트 4000)
                    │
                    ▼ REST API
             FastAPI Backend (포트 5000)
                    │
                    ├── /api/ohlcv              단기 OHLCV + 6신호 + 지표
                    ├── /api/latest-signal      최신 신호 요약
                    ├── /api/daily              일봉 + Stage 2 + Breadth Warning
                    ├── /api/watchlist          6종목 Stage 2 일괄 분석
                    ├── /api/macro              매크로 지표 22개 심볼
                    ├── /api/regime             Risk Regime 5요소 종합 점수  ★ NEW
                    └── /api/distribution-days  Distribution Day Count        ★ NEW
                              │
                              ▼
                         yfinance (OHLCV 데이터)
```

---

## 🏠 Dashboard Overview (상시 표시)

모든 탭 위에 항상 표시되는 **마켓 한눈에 보기** 패널입니다.  
카지노 마켓 글을 참고하지 않아도 현재 시장 상황과 통찰을 즉시 파악할 수 있도록 핵심 설명을 함께 제공합니다.

### Risk Regime 카드

5가지 매크로 요소를 0~100점으로 종합하여 시장 환경을 분류합니다.

| 레짐 | 점수 | 의미 |
|------|------|------|
| **Risk-On** (강세) | 80~100 | 매크로 환경 우호 — 추세 추종 전략 유효 |
| **Constructive** (우호적) | 60~79 | 대체로 건전 — 선별적 진입 가능 |
| **Mixed** (혼조) | 40~59 | 신호 혼재 — 포지션 사이즈 축소 권장 |
| **Defensive** (방어적) | 20~39 | 약세 신호 우세 — 현금 비중 확대 |
| **Risk-Off** (약세) | 0~19 | 리스크 오프 — 신규 매수 자제 |

**5요소 구성** (각 0~20점):
- **추세**: SPY vs EMA200 이격률
- **폭**: RSP vs SPY 60일 상대성과
- **신용**: HYG/IEF 30일 변화율
- **변동성**: ^VIX 수준 (낮을수록 고점수)
- **모멘텀**: SPY 20일 RoC

### Distribution Day Count (O'Neil 원전)

지난 25거래일 중 **거래량 증가 + 종가 −0.2% 이하**인 날 수. 기관 분배(매도) 강도를 측정합니다.

| 수준 | 기준 | 의미 |
|------|------|------|
| 정상 | 0~3일 | 기관 분배 압력 낮음 |
| ⚠ 경계 | 4~5일 | 기관 매도 진행 중 — 신규 진입 신중 |
| 🔴 위험 | 6일+ | O'Neil: 시장 상단 임박 — 포지션 축소 고려 |

### 핵심 지수 스냅샷
SPY · QQQ · IWM · DXY · GLD 가격 및 1D/5D 수익률.

### VIX 환경 패널
- ^VIX 절대 수준별 의미 해설 (낮음/보통/상승/급등)
- **백워데이션 자동 감지**: VIX9D > VIX이면 배지 표시 → 단기 패닉 + 반등 가능성 신호
- ^VVIX > 110이면 꼬리 위험 경고

### 시장 폭 (Breadth) 패널
SPY · QQQ · RSP · MAGS · IWM 1일 수익률 가로 바 비교.  
SPY가 오르는데 RSP(동등가중)가 못 따라오면 **협소한 랠리** 배지 자동 표시.

### 신용 스트레스 패널
HYG · JNK · LQD · IEF 수익률 + 스트레스 레벨 자동 판단.  
"SPY 상승 + HYG 하락 = 위험 신호" 해설 포함.

---

## 🖥️ 4탭 구성

### 탭 1 · 단기 (Intraday)

실시간 단기 매매 신호 대시보드입니다.

- **캔들스틱 차트** — lightweight-charts, 30초 자동 갱신
- **EMA 오버레이** — EMA21 (황색) / EMA50 (인디고)
- **거래량 히스토그램** — 차트 하단 20%, 양봉/음봉 색상 구분
- **6개 신호 마커** — 매수(▲) / 경고(▼) 마커
- **RSI 게이지 바** — 과매도 / 중립 / 강세 / 과열 시각화
- **타임프레임** — 5분봉 / 1분봉

### 탭 2 · 일봉 분석 (Daily)

스윙 트레이딩 진입 판단을 위한 일봉 종합 분석 화면입니다.

- **1년 일봉 차트** — EMA8/21/50/200 + Entry Pivot 라인 + 가우시안 채널
- **Market Structure 감지** — HH/HL/LH/LL 자동 분류
- **RSI 다이버전스 경고** — 베어리시 / 불리시 자동 감지
- **베어 플래그 감지** — 급락 후 거래량 감소 횡보 구간 자동 탐지
- **가우시안 채널 분석** — 돌파 / 리테스트 / 이탈 상태 배지
- **Stage 2 체크리스트** — Minervini 7가지 기준 + 종합 점수
- **⚠ Breadth Warning 배지** — SPY 신고가 + RSP 신고가 미달 시 별도 경고 표시 ★ NEW
- **R:R 계산기** — ATR 기반 자동 진입/손절/목표가

### 탭 3 · 워치리스트

6개 종목(TSLA·AAPL·NVDA·META·AMZN·GOOGL)을 Stage 2 점수 순으로 비교합니다.

- Stage 2 점수, RS Score, 52주 고점 대비, 진입/손절/목표가
- 7개 체크 항목을 점 색상으로 한눈에 확인
- 행 클릭 시 R:R 계산 패널 확장 → 일봉 분석 탭 바로가기

### 탭 4 · 매크로 (Macro)

오일·금리·달러·섹터 로테이션과 신규 매크로 지표를 한눈에 파악합니다.

- **섹터 로테이션 바** — SMH·XLE·XLY·XHB·ITA 1일 수익률 자동 정렬
- **VIX 백워데이션 배지** — ^VIX9D > ^VIX이면 자동 표시 ★ NEW
- **그룹별 매크로 카드** (22개 심볼):

| 그룹 | 심볼 |
|------|------|
| **변동성** ★ NEW | ^VIX, ^VVIX, ^VIX9D |
| **폭(Breadth)** ★ NEW | SPY, QQQ, RSP, MAGS, IWM |
| **신용 스트레스** ★ NEW | HYG, JNK, LQD, IEF, TLT |
| **달러 / 금리** | DX-Y.NYB, ^TNX |
| **원자재** | CL=F, GLD |
| **섹터 ETF** | SMH, XLE, XLY, XHB, ITA |

---

## 🎯 6가지 단기 매매 신호

| 신호 | 색상 | 설명 | 행동 |
|------|------|------|------|
| **Sniper** | 🟢 | 21EMA 0.4% 이내 접근 + RSI 38~58 + 거래량 급증 | 진입 |
| **VCP** | 🔵 | 30봉 신고가 + 거래량 2배 + ATR 8봉 연속 축소 | 돌파 진입 |
| **Pullback** | 🟡 | 고점 대비 4.5~9% 조정 + EMA 지지 + MACD 전환 | 눌림 진입 |
| **StrongTrend** | 🩵 | 가격 > 21EMA > 50EMA + EMA 기울기 +0.15% | 홀딩 |
| **Overbought** | 🟠 | RSI ≥ 76 + 21EMA 이격 +3.2% + 5봉 중 4양봉 | 분할 익절 |
| **Downtrend** | 🔴 | 가격 < 21EMA + EMA 음의 기울기 + 거래량 급증 | 접근 금지 |

---

## 📊 Stage 2 체크리스트 (Minervini)

| # | 항목 | 기준 |
|---|------|------|
| 1 | Price > EMA21 > EMA50 > EMA200 | 가격이 모든 이평선 위에 위치 |
| 2 | EMA200 상승 중 | EMA200 기울기 양수 |
| 3 | 52주 고점 -25% 이내 | 52주 신고가 대비 조정 폭 제한 |
| 4 | 52주 저점 +30% 이상 | 52주 신저가 대비 충분한 반등 |
| 5 | 최근 조정 15% 이내 | 20일 고점 대비 얕은 조정 |
| 6 | RS Score ≥ 50 (vs SPY) | 63일 수익률 S&P500 대비 우위 |
| 7 | 거래량 수축 | 5일 평균 < 20일 평균 (눌림 확인) |

**점수 해석**: 6~7점 진입 고려 / 4~5점 관망 / 3점 이하 회피  
**Breadth Warning**: SPY 신고가 + RSP 신고가 미달이면 점수와 무관하게 경고 배지 추가 표시.

---

## 📐 Market Structure 감지

| 구조 | 조건 | 의미 |
|------|------|------|
| **UPTREND** | HH + HL | 연속 고점 신고 + 연속 저점 신고 — 추세 매수 유효 |
| **DOWNTREND** | LH + LL | 연속 고점 저하 + 연속 저점 저하 — 매수 접근 금지 |
| **DISTRIBUTION** | LH + HL | 고점이 낮아지는 로어하이 경고 |
| **ACCUMULATION** | HH + LL | 고점 신고 but 저점도 하락 — 방향성 결정 대기 |

---

## 💡 R:R 계산기

```
진입가 = 20일 고점 × 1.005  (피벗 돌파)
손절가 = 진입가 − 2 × ATR(14)
목표가 = 진입가 + 3 × (진입가 − 손절가)  → 기본 R:R = 1:3
매수 수량 = (계좌 × 리스크%) ÷ (진입가 − 손절가)
```

---

## 🚀 빠른 시작

### 요구사항

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose (v2)
- Git

### 1. 클론 및 이동

```bash
git clone https://github.com/pjhwa/sniperboard.git
cd sniperboard
```

### 2. 실행

```bash
./run_docker.sh
# 또는
docker compose up --build -d
```

| 서비스 | 포트 | URL |
|--------|------|-----|
| **대시보드 Frontend** | 4000 | [http://localhost:4000](http://localhost:4000) |
| **API Backend** | 5000 | [http://localhost:5000/docs](http://localhost:5000/docs) |

> **참고**: 첫 로딩은 yfinance 배치 다운로드로 1~2분 소요될 수 있습니다.

---

## 🛠️ 로컬 개발

```bash
# 백엔드
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 5000

# 프론트엔드
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:5000 npm run dev
```

---

## 📡 API 엔드포인트

### `GET /api/ohlcv`
단기 OHLCV 캔들 + 6신호 + 보조 지표.

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `symbol` | string | — | 종목 코드 (예: `TSLA`) |
| `tf` | string | `5m` | 타임프레임 (`1m`, `5m`) |

### `GET /api/daily`
1년 일봉 + Stage 2 분석 + Breadth Warning.

```jsonc
{
  "symbol": "TSLA",
  "stage2": {
    "score": 6,
    "breadth_narrow": false,      // SPY 신고가 + RSP 미달 시 true
    "market_structure": "UPTREND",
    "entry": 323.6,
    "stop": 307.2,
    "target": 356.8
  }
}
```

### `GET /api/macro`
매크로 지표 22개 심볼 (^VIX·^VVIX·^VIX9D·HYG·JNK·LQD·IEF·RSP·MAGS·IWM 포함).

### `GET /api/regime` ★ NEW
Risk Regime 5요소 종합 점수.

```jsonc
{
  "total": 75.0,
  "regime": "CONSTRUCTIVE",
  "components": {
    "trend": 20.0,
    "breadth": 0.0,
    "credit": 20.0,
    "volatility": 15.7,
    "momentum": 19.3
  },
  "valid_count": 5
}
```

### `GET /api/distribution-days` ★ NEW
SPY · QQQ Distribution Day Count.

```jsonc
{
  "spy": { "count": 6, "level": "DANGER", "dates": ["2026-04-21", "..."] },
  "qqq": { "count": 5, "level": "WARNING", "dates": ["..."] }
}
```

### `GET /api/watchlist`
6개 종목 Stage 2 분석을 점수 순으로 반환.

---

## 🏗️ 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.2 | React 프레임워크 |
| React | 19.2 | UI |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 4.x | 스타일링 |
| lightweight-charts | 4.2 | 캔들스틱 차트 |
| TanStack Query | 5.x | 서버 상태 관리 |
| Zustand | 5.x | 클라이언트 상태 관리 |

### Backend

| 기술 | 용도 |
|------|------|
| FastAPI | REST API 서버 |
| pandas / numpy | 신호·지표·패턴 계산 |
| yfinance | OHLCV 데이터 수집 |
| uvicorn | ASGI 서버 |

---

## 📁 프로젝트 구조

```
sniperboard/
├── backend/
│   ├── api/
│   │   ├── endpoints.py        # REST API 7개 엔드포인트
│   │   └── schemas.py          # Pydantic 응답 모델
│   ├── core/
│   │   ├── signal_engine.py    # 6신호 + Stage2 + Breadth Warning
│   │   ├── distribution_day.py # O'Neil Distribution Day Count  ★ NEW
│   │   └── regime_engine.py    # Risk Regime 5요소 점수 엔진    ★ NEW
│   ├── services/
│   │   └── data_service.py     # yfinance 데이터 수집
│   └── main.py
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # 대시보드 (Overview + 4탭)
│   │   ├── types.ts            # TypeScript 인터페이스 + 메타데이터
│   │   └── globals.css         # 딥 네이비 다크 테마
│   ├── components/
│   │   ├── DashboardOverview.tsx  # 마켓 한눈에 보기 (상시)  ★ NEW
│   │   ├── IntradayTab.tsx
│   │   ├── DailyTab.tsx           # Breadth Warning 배지 포함
│   │   ├── WatchlistTab.tsx
│   │   └── MacroTab.tsx           # 6그룹 재편 + VIX 백워데이션 배지
│   └── hooks/
│       ├── useRegime.ts           # Regime 데이터 훅  ★ NEW
│       ├── useDistributionDays.ts # DD Count 훅       ★ NEW
│       ├── useDaily.ts
│       ├── useWatchlist.ts
│       ├── useMacro.ts
│       └── useStore.ts
├── docs/
│   ├── sniperboard-integration-plan.md
│   └── claude-code-brief.md
├── docker-compose.yml
└── README.md
```

---

## ⚠️ 주의사항

- yfinance는 개발/테스트용입니다. 운영 환경에서는 [Polygon.io](https://polygon.io/) 등 유료 데이터 소스를 권장합니다.
- 매매 신호·패턴 분석은 **참고용**이며, 투자 손실에 대한 책임은 사용자 본인에게 있습니다.
- Risk Regime·Distribution Day는 **후행 지표**입니다 — 시장 환경 진단이며 매매 신호가 아닙니다.
- 미국 주식 시장 운영 시간(ET 09:30–16:00) 외에는 단기 데이터가 갱신되지 않습니다.

---

## 📄 License

MIT © [pjhwa](https://github.com/pjhwa)
