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

## 📸 Screenshot

![SniperBoard Dashboard](docs/images/dashboard.png)

---

## 📌 Overview

SniperBoard는 미국 주식 스윙 트레이딩을 위한 **TradingView 스타일의 웹 기반 매매 신호 대시보드**입니다.  
단기 인트라데이 신호부터 Minervini Stage 2 일봉 분석, 시장 구조 감지, 매크로 컨텍스트까지 **4개 탭**으로 구성됩니다.

### 🎨 UI/UX (Premium Glassmorphic Theme)
**프리미엄 금융 터미널 스타일(Deep Zinc-Black Theme)** 적용.
- **글래스모피즘**: 투명 블러 배경 + 은은한 윤곽선 카드로 시각적 피로도 감소
- **실시간 신호 펄스**: 신호별 고대비 색상 + LIVE 네온 펄스 애니메이션
- **RSI 그라디언트 게이지**: 과매수/과매도 구간을 한눈에 식별
- **Stage 2 체크 보드**: Minervini 7대 조건 에메랄드 배지 시각화
- **R:R 포지션 바**: 진입/손절/목표 비율을 HTS 스타일 눈금 바로 시각화

```
브라우저 ──► Next.js Frontend (포트 4000)
                    │
                    ▼ REST API
             FastAPI Backend (포트 5000)
                    │
                    ├── /api/ohlcv          단기 OHLCV + 6신호 + 지표
                    ├── /api/latest-signal  최신 신호 요약
                    ├── /api/daily          일봉 + EMA8/21/50/200 + Stage 2 + 시장 구조
                    ├── /api/watchlist      6종목 Stage 2 일괄 분석
                    ├── /api/macro          매크로 지표 (DXY·TNX·TLT·원유·섹터 ETF)
                    └── Signal Engine       6신호 · Stage2 · 시장구조 · RSI다이버전스 계산
                              │
                              ▼
                         yfinance (OHLCV 데이터)
```

---

## 🖥️ 4탭 구성

### 탭 1 · 단기 (Intraday)

실시간 단기 매매 신호 대시보드입니다.

- **캔들스틱 차트** — lightweight-charts, 30초 자동 갱신
- **EMA 오버레이** — EMA21 (황색) / EMA50 (인디고)
- **거래량 히스토그램** — 차트 하단 20%, 양봉/음봉 색상 구분
- **6개 신호 마커** — 매수(▲) / 경고(▼) 마커
- **RSI 게이지 바** — 과매도 / 중립 / 강세 / 과열 시각화
- **EMA 이격률** — 3.2% 초과 시 과열 경고
- **타임프레임** — 5분봉 / 1분봉

### 탭 2 · 일봉 분석 (Daily)

스윙 트레이딩 진입 판단을 위한 일봉 종합 분석 화면입니다.

- **1년 일봉 차트** — EMA8 (민트) / EMA21 (황색) / EMA50 (인디고) / EMA200 (로즈) + Entry Pivot 라인 + 가우시안 채널
- **Market Structure 감지** — 스윙 고저점 기반 HH/HL/LH/LL 자동 분류 (UPTREND / DOWNTREND / DISTRIBUTION / ACCUMULATION)
- **RSI 다이버전스 경고** — 베어리시(가격 HH + RSI LH) / 불리시(가격 LL + RSI HL) 자동 감지
- **베어 플래그 감지** — 급락(폴) 후 거래량 감소 횡보 구간 자동 탐지
- **가우시안 채널 분석** — 채널 상단 돌파 / 리테스트 / 이탈 상태 배지
- **Stage 2 체크리스트** — Minervini 7가지 기준 PASS/FAIL + 종합 점수
- **R:R 계산기** — ATR 기반 자동 진입/손절/목표가, 수량·포지션 규모·예상 수익 계산

### 탭 3 · 워치리스트

6개 종목을 Stage 2 점수 순으로 비교합니다.

- Stage 2 점수, RS Score, 52주 고점 대비, 진입/손절/목표가
- 7개 체크 항목을 점 색상으로 한눈에 확인
- 행 클릭 시 R:R 계산 패널 확장 → 일봉 분석 탭 바로가기

### 탭 4 · 매크로 (Macro)

오일·금리·달러·섹터 로테이션을 한눈에 파악하는 매크로 컨텍스트 뷰입니다.

- **섹터 로테이션 바** — SMH·XLE·XLY·XHB·ITA 1일 수익률 기준 자동 정렬 시각화
- **매크로 카드** — DXY / 10년물 금리(^TNX) / TLT / WTI원유 / GLD / SPY / QQQ + 섹터 ETF
- 각 심볼별 **1D·5D 수익률**, **EMA8/21 포지션**, **RSI14**, **Market Structure** 표시

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

---

## 📐 Market Structure 감지

스윙 고점(Swing High)과 스윙 저점(Swing Low)을 자동으로 탐지하여 추세 구조를 분류합니다.

| 구조 | 조건 | 의미 |
|------|------|------|
| **UPTREND** | HH + HL | 연속 고점 신고 + 연속 저점 신고 — 추세 매수 유효 |
| **DOWNTREND** | LH + LL | 연속 고점 저하 + 연속 저점 저하 — 매수 접근 금지 |
| **DISTRIBUTION** | LH + HL | 고점이 낮아지는 로어하이 경고 — 전고점 저항 주시 |
| **ACCUMULATION** | HH + LL | 고점 신고 but 저점도 하락 — 방향성 결정 대기 |

---

## 💡 R:R 계산기

Stage 2 분석 결과에서 ATR을 기반으로 자동 계산됩니다.

```
진입가 = 20일 고점 × 1.005  (피벗 돌파)
손절가 = 진입가 − 2 × ATR(14)
목표가 = 진입가 + 3 × (진입가 − 손절가)  → 기본 R:R = 1:3
매수 수량 = (계좌 × 리스크%) ÷ (진입가 − 손절가)
```

모든 값은 화면에서 직접 수정 가능합니다.

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

### 2. 스크립트를 통한 간편 실행 (권장)

```bash
./run_docker.sh
```

### 3. 수동 실행

```bash
docker compose up --build -d
```

| 서비스 | 호스트 포트 | URL |
|--------|-------------|-----|
| **대시보드 Frontend** | 4000 | [http://localhost:4000](http://localhost:4000) |
| **API Backend** | 5000 | [http://localhost:5000/docs](http://localhost:5000/docs) |

> **참고**: 워치리스트·매크로 탭 첫 로딩은 yfinance 배치 다운로드로 1~2분 소요될 수 있습니다.

---

## 🛠️ 로컬 개발

### 백엔드

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 5000
```

### 프론트엔드

```bash
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

### `GET /api/latest-signal`

최신 캔들 기준 신호 요약.

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `symbol` | string | — | 종목 코드 |
| `tf` | string | `5m` | 타임프레임 |

### `GET /api/daily`

1년 일봉 + EMA8/21/50/200 + Stage 2 분석 + 시장 구조 + RSI 다이버전스 + 베어플래그.

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `symbol` | string | 종목 코드 |

```jsonc
{
  "symbol": "TSLA",
  "candles": [...],
  "indicators": { "ema8": [...], "ema21": [...], "ema50": [...], "ema200": [...], "atr14": [...] },
  "stage2": {
    "score": 6,
    "market_structure": "UPTREND",
    "higher_high": true,
    "higher_low": true,
    "lower_high": false,
    "lower_low": false,
    "rsi_divergence_bearish": false,
    "rsi_divergence_bullish": false,
    "bear_flag": false,
    "entry": 323.6,
    "stop": 307.2,
    "target": 356.8
  }
}
```

### `GET /api/watchlist`

6개 종목 전체의 Stage 2 분석을 점수 순으로 반환.

### `GET /api/macro`

매크로 지표 — DXY·TNX·TLT·원유·GLD·SPY·QQQ·SMH·XLE·XLY·XHB·ITA.

```jsonc
{
  "macro": [
    {
      "symbol": "SMH",
      "name": "반도체 (SMH)",
      "price": 218.4,
      "change_pct_1d": 1.82,
      "change_pct_5d": -3.1,
      "ema8": 215.3,
      "ema21": 210.7,
      "above_ema8": true,
      "above_ema21": true,
      "market_structure": "DISTRIBUTION",
      "rsi14": 54.2
    }
  ]
}
```

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
│   │   ├── endpoints.py        # REST API (ohlcv / latest-signal / daily / watchlist / macro)
│   │   └── schemas.py          # Pydantic 응답 모델
│   ├── core/
│   │   └── signal_engine.py    # 6신호 + Stage2 + 시장구조 + RSI다이버전스 + 베어플래그
│   ├── services/
│   │   └── data_service.py     # yfinance 데이터 수집
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # 4탭 메인 대시보드
│   │   └── types.ts            # TypeScript 인터페이스
│   ├── components/
│   │   ├── IntradayTab.tsx
│   │   ├── DailyTab.tsx        # 시장구조 + RSI다이버전스 + 베어플래그 패널 포함
│   │   ├── WatchlistTab.tsx
│   │   ├── MacroTab.tsx        # 섹터 로테이션 바 + 매크로 카드
│   │   └── charts/
│   │       └── DailyChart.tsx  # EMA8 추가
│   ├── hooks/
│   │   ├── useDaily.ts
│   │   ├── useWatchlist.ts
│   │   ├── useMacro.ts         # 매크로 데이터 훅
│   │   └── useStore.ts
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## ⚠️ 주의사항

- yfinance는 개발/테스트용입니다. 운영 환경에서는 [Polygon.io](https://polygon.io/) 등 유료 데이터 소스를 권장합니다.
- 매매 신호·패턴 분석은 **참고용**이며, 투자 손실에 대한 책임은 사용자 본인에게 있습니다.
- 미국 주식 시장 운영 시간(ET 09:30–16:00) 외에는 단기 데이터가 갱신되지 않습니다.
- 매크로 탭의 `^TNX`(금리)·`DX-Y.NYB`(달러인덱스)·`CL=F`(원유)는 yfinance 제공 범위에 따라 일부 지표가 제한될 수 있습니다.

---

## 📄 License

MIT © [pjhwa](https://github.com/pjhwa)
