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
단기 인트라데이 신호부터 Minervini Stage 2 일봉 분석, R:R 포지션 계산, 종목 워치리스트까지 **3개 탭**으로 구성됩니다.

```
브라우저 ──► Next.js Frontend (포트 4000)
                    │
                    ▼ REST API
             FastAPI Backend (포트 5000)
                    │
                    ├── /api/ohlcv          단기 OHLCV + 6신호 + 지표
                    ├── /api/latest-signal  최신 신호 요약
                    ├── /api/daily          일봉 + EMA200 + Stage 2 분석
                    ├── /api/watchlist      6종목 Stage 2 일괄 분석
                    └── Signal Engine       6신호 · Stage2 · RS 계산
                              │
                              ▼
                         yfinance (OHLCV 데이터)
```

---

## 🖥️ 3탭 구성

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

어제의 흐름을 보고 오늘 진입 여부를 판단하기 위한 스윙 트레이딩 분석 화면입니다.

- **1년 일봉 차트** — EMA21 / EMA50 / EMA200 오버레이, Entry Pivot 라인
- **Stage 2 체크리스트** — Minervini 7가지 기준 PASS/FAIL 배지 + 종합 점수
- **R:R 계산기** — 진입/손절/목표가 자동 입력 (ATR 기반), 수량·포지션 규모·예상 수익 계산

### 탭 3 · 워치리스트

6개 종목을 Stage 2 점수 순으로 비교합니다.

- Stage 2 점수, RS Score, 52주 고점 대비, 진입/손절/목표가
- 7개 체크 항목을 점 색상으로 한눈에 확인
- 행 클릭 시 해당 종목의 일봉 분석 탭으로 이동

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

프로젝트 루트에 포함된 `run_docker.sh` 스크립트를 실행하면 기존 컨테이너 클린업, 이미지 빌드 및 백그라운드 구동이 자동으로 이루어집니다.

```bash
./run_docker.sh
```

### 3. 수동 실행

직접 Docker Compose 명령어로 구동할 수도 있습니다.

```bash
docker compose up --build -d
```

| 서비스 | 호스트 포트 | 컨테이너 포트 | URL |
|--------|-------------|---------------|-----|
| **대시보드 Frontend** | 4000 | 3000 | [http://localhost:4000](http://localhost:4000) |
| **API Backend** | 5000 | 8000 | [http://localhost:5000/docs](http://localhost:5000/docs) |

> **참고**: 워치리스트 첫 로딩은 6종목 2년치 데이터를 일괄 다운로드하므로 1~2분 소요될 수 있습니다.

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

단기 OHLCV 캔들 + 6신호 + 보조 지표를 반환합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `symbol` | string | — | 종목 코드 (예: `TSLA`) |
| `tf` | string | `5m` | 타임프레임 (`1m`, `5m`) |

```jsonc
{
  "symbol": "TSLA",
  "timeframe": "5m",
  "candles": [
    { "time": "2026-05-19T14:30:00+00:00", "open": 320.1, "high": 322.5, "low": 319.8, "close": 321.4, "volume": 512000 }
  ],
  "signals": {
    "vcp": [false, false, true],
    "sniper": [false, true, false],
    "pullback": [false, false, false],
    "strong_trend": [true, true, false],
    "overbought": [false, false, false],
    "downtrend": [false, false, false]
  },
  "indicators": {
    "ema21": [319.2, 319.5],
    "ema50": [316.8, 317.0],
    "rsi": [54.2, 55.1],
    "atr": [1.82, 1.79]
  }
}
```

### `GET /api/latest-signal`

최신 캔들 기준 신호 요약을 반환합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `symbol` | string | — | 종목 코드 |
| `tf` | string | `5m` | 타임프레임 |

### `GET /api/daily`

1년 일봉 + EMA21/50/200 + Stage 2 분석 결과를 반환합니다.

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `symbol` | string | 종목 코드 |

```jsonc
{
  "symbol": "TSLA",
  "candles": [{ "time": "2025-05-19", "open": 320.1, "high": 322.5, "low": 319.8, "close": 321.4, "volume": 512000 }],
  "indicators": { "ema21": [319.2], "ema50": [316.8], "ema200": [290.5], "atr14": [8.4] },
  "vol_avg20": [38000000],
  "stage2": {
    "score": 6,
    "rs_score": 72.3,
    "checks": {
      "price_above_emas": true,
      "ema200_rising": true,
      "near_52w_high": true,
      "above_52w_low": true,
      "pullback_shallow": true,
      "rs_strong": true,
      "volume_contracting": false
    },
    "entry": 323.6,
    "stop": 307.2,
    "target": 356.8
  }
}
```

### `GET /api/watchlist`

6개 종목 전체의 Stage 2 분석을 점수 순으로 반환합니다.

```jsonc
{
  "watchlist": [
    {
      "symbol": "NVDA",
      "price": 950.2,
      "score": 7,
      "rs_score": 88.5,
      "pct_from_52w_high": -3.2,
      "entry": 962.0,
      "stop": 930.5,
      "target": 1056.5,
      "checks": { "price_above_emas": true, "ema200_rising": true, ... }
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
| pandas | 신호·지표 계산 |
| yfinance | OHLCV 데이터 수집 (단기·일봉·배치) |
| uvicorn | ASGI 서버 |

---

## 📁 프로젝트 구조

```
sniperboard/
├── backend/
│   ├── api/
│   │   └── endpoints.py        # REST API 라우터 (ohlcv / latest-signal / daily / watchlist)
│   ├── core/
│   │   └── signal_engine.py    # 6신호 + Stage2 분석 + RS 스코어 계산 엔진
│   ├── services/
│   │   └── data_service.py     # yfinance 단기·일봉·배치 데이터 수집
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # 3탭 메인 대시보드 (Intraday / Daily / Watchlist)
│   │   └── layout.tsx
│   ├── Dockerfile
│   ├── next.config.ts
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## ⚠️ 주의사항

- yfinance는 개발/테스트용입니다. 운영 환경에서는 [Polygon.io](https://polygon.io/) 등 유료 데이터 소스 사용을 권장합니다.
- 매매 신호와 Stage 2 분석은 **참고용**이며, 투자 손실에 대한 책임은 사용자 본인에게 있습니다.
- 미국 주식 시장 운영 시간(ET 09:30–16:00) 외에는 단기 데이터가 갱신되지 않습니다.
- 워치리스트 첫 로딩은 yfinance 배치 다운로드 특성상 1~2분 소요될 수 있습니다.

---

## 📄 License

MIT © [pjhwa](https://github.com/pjhwa)
