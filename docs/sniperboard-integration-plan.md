# SniperBoard에 추가할 가치 있는 지표 — 선별 계획서

> 카지노 마켓 대화에서 반복 등장하는 분석 도구 중, sniperboard의 **결정론적 신호 엔진**과 **Livermore·O'Neil·Minervini** 정체성에 자연스럽게 융합되는 것만 추린다.

---

## 1. 선별 기준 (5개. 모두 통과한 지표만 채택)

| # | 기준 | 탈락시키는 것 |
|---|---|---|
| 1 | **yfinance에서 안정적으로 받을 수 있다** | GEX/딜러 감마, MOVE 인덱스, 0DTE 플로우, McClellan |
| 2 | **결정론적으로 표현 가능** (boolean 또는 0~100 점수) | 카지노 마켓 글 한글 NLP 파싱, 작성자 정성 해설 |
| 3 | **모든 Mag7 + 임의 종목에 보편 유효** | pbar 레벨(종목·사용자별), 카지노 포스트 로그 |
| 4 | **sniperboard의 O'Neil/Minervini 정체성과 정합** | 카지노 마켓 저자별 정확도 트래킹 (개인 저널) |
| 5 | **기존 4탭 UI의 단순함을 해치지 않는다** | 시나리오 빌더 UI, 예측 누적 트래커 별도 탭 |

---

## 2. 선별 결과 — 7개

| # | 지표 | 카지노 마켓에서의 위상 | sniperboard 정합도 | 데이터 가용성 | 우선순위 |
|---|---|---|---|---|---|
| 1 | **Distribution Day Count** (SPY/QQQ) | "디스트리뷰션" 빈출 표현 | ★★★ (O'Neil 책의 핵심) | High | ★★★ |
| 2 | **VIX 환경 + Term Structure** (^VIX, ^VVIX, ^VIX9D) | "변동성 레짐", "VIX 백워데이션" | ★★★ (모든 매매의 컨텍스트) | High | ★★★ |
| 3 | **시장 폭 다이버전스** (RSP/MAGS/IWM vs SPY) | "협소한 랠리", "Mag7 집중" | ★★★ (Stage 2 진입 보강) | High | ★★★ |
| 4 | **신용 스트레스** (HYG/IEF 비율) | "JNK/HYG 다이버전스" | ★★ (선행성, 매크로 컨텍스트) | High | ★★ |
| 5 | **OPEX D-day 캘린더** | "OPEX 무브", "월간 만기 자기장" | ★★ (단기 의사결정 캘린더) | High (계산) | ★★ |
| 6 | **종목-매크로 상관계수 패널** | "BTC와 동조", "DXY 역상관" | ★★ (개별 종목 매크로 민감도) | High | ★★ |
| 7 | **예상 무브** (ATM 옵션 기반) | "예상무브 $XX" 빈출 | ★ (단기 변동성 기대치) | **Low** (yfinance 옵션 노이즈) | ★ |

탈락시킨 것: pbar, 카지노 포스트 로그, 예측 트래커, 시나리오 빌더, Gamma flip, MOVE 인덱스, Wyckoff 단계 자동 라벨링, 작성자 bias 보정.

---

## 3. 각 지표 — 왜 가치 있는가 + 어디에 박는가

### 3.1. Distribution Day Count ★★★

**무엇**: 지난 25거래일 중 **SPY(또는 QQQ) 거래량이 전일 대비 증가**하면서 **종가가 0.2% 이상 하락**한 날 수.

**투자자 통찰**:
- O'Neil의 원전 *How to Make Money in Stocks*에서 시장 상단의 가장 강력한 선행 지표로 제시된 것.
- **4~5개 누적 = 경계 / 6개 이상 = 시장 상단 임박** — 기관이 분배(distribution) 중이라는 신호.
- sniperboard가 "Livermore·O'Neil·Minervini"를 표방하면서 이 지표가 빠진 건 구멍이다.
- **카지노 마켓의 "디스트리뷰션" 언급은 정확히 이 개념** — 즉, 새로운 인사이트가 아니라 O'Neil 정통 회귀.

**융합 위치**: **Macro 탭 최상단 + 일봉 탭 Stage 2 패널 옆**. SPY/QQQ 각각의 DD count를 카운터로 표시. ≥5면 빨강.

**추가 효과**: Stage 2 score가 6점이어도 SPY DD ≥ 5면 진입 보류 권고 — 종목 신호와 시장 환경을 분리 가시화.

---

### 3.2. VIX 환경 + Term Structure ★★★

**무엇**:
- ^VIX 수준 (절대값)
- ^VIX9D / ^VIX 비율 → **>1.0이면 백워데이션** (단기 패닉 + 반등 가능성)
- ^VVIX 수준 → VIX 자체의 변동성 (꼬리 위험 가격)

**투자자 통찰**:
- VIX < 14: 콜 매도 매력 ↓, 신규 진입은 무방 / VIX > 25: 신규 매수 신중
- **백워데이션(VIX9D > VIX)은 단기 바닥의 고전적 신호** — 카지노 마켓이 자주 인용
- ^VVIX > 110은 꼬리 위험 격앙 — 시스템적 위험 가격 반영

**융합 위치**: Macro 탭의 신규 "변동성" 그룹. **카드 한 줄에 백워데이션 배지 자동 표시** (^VIX9D/^VIX 비율 > 1.0).

---

### 3.3. 시장 폭 다이버전스 ★★★

**무엇**: SPY 신고가 갱신 여부 vs RSP(동등가중), MAGS(Mag7), IWM(러셀2000)의 신고가 갱신 여부.

**투자자 통찰**:
- SPY는 신고가인데 RSP는 신고가 못함 → **시가총액 가중 인덱스가 소수 종목으로만 끌리고 있다** = 협소한 랠리.
- 협소한 랠리 환경에서 신규 Stage 2 진입은 성공률이 떨어진다 (O'Neil/Minervini도 강조).
- **MAGS > SPY > RSP > IWM 의 상대성과 순위** = 빅테크 일극 vs 광범위 강세 한눈에.

**융합 위치**:
- Macro 탭 신규 "폭(Breadth)" 그룹
- **일봉 탭 Stage 2 패널 옆에 "Breadth Warning" 배지** — SPY 신고가 + RSP 신고가 미달 동시 발생 시 빨강.

**구체 boolean 규칙** (sniperboard 스타일):
```
breadth_narrow = (SPY 20일 신고가) AND (RSP 20일 신고가 미달)
```
이 boolean을 Stage 2 응답에 추가. 7점이어도 breadth_narrow이면 UI에서 경고.

---

### 3.4. 신용 스트레스 ★★

**무엇**: HYG/IEF 비율(하이일드/중기국채) + 30일 변화율.

**투자자 통찰**:
- 신용 시장은 주식보다 선행하는 경향. HYG가 SPY와 다이버전스를 보이면 위험.
- **HYG/IEF 30일 RoC가 음수 + SPY 신고가 = 다이버전스 경고**
- 카지노 마켓의 "JNK/HYG" 언급은 이 개념.

**융합 위치**: Macro 탭 신규 "신용 스트레스" 그룹 + Regime 점수의 한 컴포넌트.

---

### 3.5. OPEX D-day 캘린더 ★★

**무엇**: 다음 월간 OPEX (3번째 금요일) 까지의 D-day. 주간 OPEX (매주 금요일) D-day.

**투자자 통찰**:
- OPEX 주간은 **딜러 헷지에 의한 가격 자기장 효과** — Max Pain 근처로 끌리는 경향(논쟁적이지만 실증 연구 다수).
- OPEX 다음 주 월요일은 헷지 해제 → 변동성 ↑.
- **D-3 이내면 단기 매매 시 OPEX 자기장 고려** — 신규 추세 진입은 만기 이후 권장.

**융합 위치**: Macro 탭 상단 작은 배지 + Daily 탭 헤더 옆 D-day 표시. **자동 계산** (외부 데이터 X — 달력만 있으면 가능).

---

### 3.6. 종목-매크로 상관계수 패널 ★★

**무엇**: 종목의 30일 일별 수익률 vs SPY, QQQ, BTC-USD, DX-Y.NYB, ^TNX 의 Pearson 상관계수.

**투자자 통찰**:
- TSLA의 BTC 상관이 0.6 = 위험자산 동조 모드 (BTC 약세시 TSLA도 약세 확률 ↑)
- DXY와 -0.7 = 달러 약세 베팅 자산 (DXY 강세시 역풍)
- ^TNX와 -0.5 = 듀레이션 자산 특성 (금리 상승시 역풍)
- 이 상관은 **시간에 따라 변한다** — 30일 롤링으로 보면 레짐 전환 감지 가능.

**융합 위치**: Daily 탭 Stage 2 패널 아래 신규 "Macro Correlation" 미니 패널. 5개 지표 가로 막대.

---

### 3.7. 예상 무브 ★ (best-effort)

**무엇**: 종목의 가장 가까운 만기 ATM 콜+풋 가격 / 종가 × 100% = 시장이 가격에 반영한 만기까지의 ±% 무브.

**투자자 통찰**:
- 카지노 마켓이 "예상무브 $XX" 자주 인용 — 시장의 단기 변동성 기대치.
- 어닝 직전엔 IV crush 위험 가격화 정도 측정.
- 진입 시 손절 폭이 예상 무브의 50% 이하면 과도하게 타이트.

**한계 + 명시적 경고**:
- yfinance 옵션 체인은 만기 누락/지연 빈번 → **데이터 없으면 "—" 표시, 추정 강요 X**
- 정확한 IV는 paid feed 영역. yfinance 값은 best-effort 추정.

**융합 위치**: Daily 탭 R:R 계산기 옆 작은 배지. 데이터 있을 때만 표시.

---

## 4. sniperboard 기존 자산과의 시너지

이 7개가 **새로운 탭을 만들지 않고** 기존 4탭에 흡수되는 방식:

| 기존 탭 | 추가되는 것 | 깨지는 것 |
|---|---|---|
| Intraday (단기) | (없음) | — |
| Daily (일봉) | Breadth Warning 배지 / Macro Correlation 패널 / OPEX D-day / 예상 무브 배지 | 기존 차트·Stage 2 무수정 |
| Watchlist | (없음) — 또는 Stage 2 score 옆에 breadth_narrow 배지 추가만 | 기존 정렬 무수정 |
| Macro | "변동성" / "신용 스트레스" / "폭" 그룹 신설, Distribution Day 카운터 헤더 | 기존 그룹은 재분류만 |

**Risk Regime 5요소 종합 점수** (이전 계획서의 핵심)는 위 4개 지표(Trend/Breadth/Credit/Vol/Momentum)를 자연스럽게 합성한 결과 → **Macro 탭 헤더에 Regime 카드**로 채택.

---

## 5. 우선순위 + Phased Rollout

### Phase 1 (필수 — sniperboard 정체성 핵심 보강)
- [ ] **Distribution Day Count** (SPY, QQQ) — Macro 탭 헤더 + Daily 탭 Stage 2 옆
- [ ] **VIX 환경 그룹** (^VIX, ^VVIX, ^VIX9D + 백워데이션 배지)
- [ ] **시장 폭 그룹** (RSP, MAGS, IWM) + **Breadth Warning boolean**을 Stage 2 응답에 추가
- [ ] **신용 스트레스 그룹** (HYG, JNK, LQD, IEF, HYG/IEF 비율)
- [ ] **Risk Regime 5요소 카드** (Macro 탭 최상단)

### Phase 2 (단기 의사결정 보조)
- [ ] **OPEX D-day 캘린더** (Macro 탭 헤더 + Daily 탭 헤더)
- [ ] **종목-매크로 상관계수 패널** (Daily 탭)

### Phase 3 (best-effort)
- [ ] **예상 무브 배지** (yfinance 옵션 체인, 결측 빈번 명시)

---

## 6. 명시적으로 안 할 것

- pbar 레벨 / 카지노 마켓 포스트 로그 / 예측 트래커 / FocusTab / 작성자 정확도 트래킹
- GEX, 딜러 감마, MOVE 인덱스, 0DTE 플로우 (paid feed 전용)
- 한글 NLP 자동 파싱
- 신규 5번째 탭 — 기존 4탭으로 충분

---

## 7. 핵심 판단 (확신도)

- **확신도 High**: Distribution Day, VIX 환경, 시장 폭, 신용 스트레스 — 네 개는 sniperboard에 즉시 추가하면 분명한 가치. O'Neil/Minervini 원전과도 정합.
- **확신도 Moderate**: OPEX D-day, 상관계수 패널 — 유용하지만 의사결정에 부차적.
- **확신도 Low**: 예상 무브 — yfinance 옵션 데이터 신뢰도 낮음. 시도하되 기대치 낮춰서.

**가장 큰 추가 가치는 #1 Distribution Day Count**. 이건 sniperboard가 자신의 정체성을 표방하면서도 빠뜨린 가장 큰 구멍이고, 카지노 마켓의 "디스트리뷰션" 화법이 정확히 이 개념이다. 단 하나만 추가한다면 이것.
