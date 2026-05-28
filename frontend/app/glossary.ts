// frontend/app/glossary.ts
export interface GlossaryEntry {
  key: string;
  term: string;
  body: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── Market / Regime ──────────────────────────────────────────
  {
    key: 'risk_regime',
    term: 'Risk Regime (리스크 레짐)',
    body: '시장이 지금 얼마나 투자하기 좋은 환경인지를 5가지 요소(추세·시장폭·신용·변동성·모멘텀)로 종합한 점수입니다. SPY EMA200 위치, RSP vs SPY 60일 격차, HYG/IEF 비율 변화, VIX 레벨, S&P500 20일 방향을 각각 채점해 합산하며, 100에 가까울수록 강세 환경입니다.',
  },
  {
    key: 'breadth',
    term: 'Breadth (시장 폭)',
    body: '소수 대형주만 오르는지, 많은 종목이 함께 오르는지를 봅니다. RSP(S&P500 동일가중 ETF)가 SPY(시가총액 비례)보다 강하면 건강한 장세, 약하면 대형주 소수에 의존하는 취약한 장세입니다.',
  },
  {
    key: 'credit',
    term: 'Credit Stress (신용 스트레스)',
    body: '회사채 시장의 건전성을 봅니다. HYG(고수익 채권 ETF)가 IEF(미국 국채 ETF)보다 강하면 투자자들이 위험을 기꺼이 감수한다는 신호(위험 선호)이며, 반대면 공포 신호입니다. 30일 HYG/IEF 비율 변화로 계산합니다.',
  },
  {
    key: 'volatility',
    term: 'Volatility (변동성 · VIX)',
    body: '향후 30일 S&P500의 예상 변동성을 나타내는 공포 지수입니다. 14 이하면 안정적, 20 전후면 경계, 30 이상이면 공포 국면입니다. 낮을수록 매수하기 좋은 환경입니다.',
  },
  {
    key: 'vix_backwardation',
    term: 'VIX 백워데이션',
    body: 'VIX9D(9일 단기 변동성)가 VIX(30일)보다 높아진 역전 상태입니다. 정상(콘탱고)은 장기 VIX가 더 높은데, 역전되면 지금 당장 시장이 더 불안하다는 뜻으로 단기 이벤트 공포를 나타내는 경고 신호입니다.',
  },
  {
    key: 'distribution_days',
    term: 'Distribution Days (분산일)',
    body: '최근 25거래일 내 기관 투자자들이 대량 매도한 날(S&P500/Nasdaq 하락 + 거래량 증가)의 수입니다. 4~5일이면 경계, 6일 이상이면 시장 상단 가능성이 높아 신규 진입을 자제해야 합니다.',
  },
  {
    key: 'market_breadth_spy_rsp',
    term: 'Market Breadth · SPY vs RSP',
    body: 'SPY는 시가총액 비례 지수(대형주 영향 큼), RSP는 모든 종목을 동일 비중으로 구성한 지수입니다. RSP가 SPY보다 약하면 소수 대형주만 시장을 끌고 있다는 경고로, 건강하지 않은 상승입니다.',
  },
  {
    key: 'sector_momentum',
    term: 'Sector Momentum (섹터 모멘텀)',
    body: '5개 테마 ETF(SMH 반도체, XLY 소비재, ITA 방산, XLE 에너지, XHB 홈빌더)의 최근 5일 수익률 순위입니다. 상위 섹터에 돈이 몰리고 있으므로 강세 섹터 내 종목에 집중하는 것이 유리합니다. ↑EMA는 21일 이평선 위 강세 상태입니다.',
  },
  // ── Stage 2 / Technical ───────────────────────────────────────
  {
    key: 'stage2',
    term: 'Stage 2 점수 (0~7)',
    body: 'Minervini가 정의한 이상적인 매수 구간 조건 7가지를 충족한 개수입니다: ①가격>EMA21>50>200 ②EMA200 상승 ③52주 고점 대비 -25% 이내 ④52주 저점 대비 +30% 이상 ⑤최근 조정 15% 이내 ⑥RS Score≥50 ⑦거래량 수축. 6~7점이면 진입 검토, 4~5점은 관망, 3 이하면 회피.',
  },
  {
    key: 'rs_score',
    term: 'RS Score (상대 강도)',
    body: 'S&P500과 비교해 최근 63일(약 3개월) 수익률이 얼마나 우수한지를 0~100으로 나타냅니다. 70 이상이면 시장 상위 30% 강세주입니다. Minervini Stage2 조건 중 하나(RS ≥ 50)이며, IBD의 EPS·RS 등급과 유사한 개념입니다.',
  },
  {
    key: 'gc_status',
    term: '가우시안 채널 (Gaussian Channel)',
    body: '인과 가우시안 커널로 그린 통계적 추세 밴드입니다(look-ahead bias 없음). Breakout=채널 상단 돌파(강한 모멘텀), Above=채널 위 강세, Retest=돌파 후 채널 재접촉(눌림 진입 기회), Below=채널 이탈 약세입니다.',
  },
  {
    key: 'conviction',
    term: 'Conviction (확신 점수)',
    body: 'Stage2(40%) + 소셜 심리(30%) + Risk Regime(30%)를 종합한 0~100 확신 점수입니다. 65 이상(Bull)이면 복수 지표가 일치하는 고확신 구간, 50 이상(Teal)은 보통, 35 미만(Bear)은 회피 권고입니다.',
  },
  {
    key: 'rr_ratio',
    term: 'R:R 비율 (Risk:Reward)',
    body: '내가 잃을 수 있는 금액 대비 벌 수 있는 금액의 비율입니다. 1:3이면 1만원 잃을 위험에 3만원을 노린다는 뜻으로, 3번 중 1번만 맞아도 수익이 납니다. 일반적으로 1:2 이상을 권장합니다.',
  },
  {
    key: 'monthly_phase',
    term: '월봉 추세 (Monthly Phase)',
    body: '일봉 데이터를 월봉으로 합산해 10개월 EMA 기준으로 추세를 판별합니다. "월봉 상승 확인(CONFIRMED_UPTREND)"이면 월봉 10EMA 위에서 기울기가 우상향인 강세 사이클로, 단기 진입 신호의 신뢰도가 높아집니다.',
  },
  // ── Intraday Signals ─────────────────────────────────────────
  {
    key: 'signal_vcp',
    term: 'VCP (변동성 수축 패턴)',
    body: '주가가 30봉 신고가를 돌파하면서 거래량이 평소의 2배 이상 급증할 때 나타나는 강력한 돌파 매수 신호입니다. ATR 8봉 연속 수축과 EMA21>50 조건도 필요합니다. 기관 투자자들의 대량 매수가 확인된 것으로 가장 신뢰도 높은 신호입니다.',
  },
  {
    key: 'signal_sniper',
    term: 'Sniper 신호',
    body: '가격이 EMA21(21봉 지수이동평균)에서 0.4% 이내로 접근하고 RSI가 38~58 구간에 있을 때 뜨는 매수 신호입니다. 추세 중 가장 좋은 눌림목 진입 타이밍을 포착하며, 직전 봉 대비 거래량 1.4배 이상도 필요합니다.',
  },
  {
    key: 'signal_pullback',
    term: 'Pullback (눌림목)',
    body: '15봉 고점 대비 4.5~9% 조정 후 이동평균선에서 지지를 받을 때 나타납니다. MACD 히스토그램 3봉 연속 반등과 거래량 감소도 조건입니다. 상승 추세가 잠깐 숨 고르기 후 재개될 가능성이 높은 진입 타이밍입니다.',
  },
  {
    key: 'signal_strong_trend',
    term: 'StrongTrend (강한 추세)',
    body: '가격 > EMA21 > EMA50 순서로 정렬되고, EMA21 기울기 +0.15% 이상, RSI 52~78일 때 표시됩니다. 현재 보유 중인 포지션을 계속 유지(홀딩)하라는 신호입니다.',
  },
  {
    key: 'signal_overbought',
    term: 'Overbought (과열)',
    body: 'RSI≥76이고 EMA21에서 +3.2% 이상 이격되어 있으며 5봉 중 4개가 양봉이고 거래량이 감소하는 과열 구간입니다. 일부 물량 분할 매도(익절)를 고려할 타이밍입니다.',
  },
  {
    key: 'signal_downtrend',
    term: 'Downtrend (하락 추세)',
    body: '가격이 EMA21 아래에 있고, EMA21이 음의 기울기이며, 거래량이 평균의 1.3배 이상이고 8봉 신저가인 상태입니다. 떨어지는 칼날을 잡지 마세요 — 이 신호가 있을 때는 매수 접근 금지입니다.',
  },
  // ── Macro ─────────────────────────────────────────────────────
  {
    key: 'vix_index',
    term: 'VIX (공포 지수)',
    body: '향후 30일간 S&P500의 예상 변동성입니다. 14 이하=안정, 20 전후=경계, 30 이상=공포. 높을수록 시장 참여자들이 불안해하고 있다는 뜻입니다.',
  },
  {
    key: 'rates_dollar',
    term: '달러·금리 (Rates & USD)',
    body: '달러(DXY)와 금리(TNX 10년물)는 주식 시장과 역관계입니다. 달러 강세·금리 상승은 유동성 축소로 이어져 주식에 불리합니다. TLT(장기국채 ETF)가 상승하면 금리 하락 신호(주식에 우호적). DXY 약세면 글로벌 자금이 미국 외 자산으로 이동, 원자재·신흥국 주식에 유리합니다.',
  },
  {
    key: 'commodities',
    term: '원자재 (Commodities)',
    body: '원유(CL=F)와 금(GLD)은 인플레이션과 글로벌 경기 신호입니다. 원유 상승은 경기 호조 신호이지만 인플레를 자극해 금리 인상 우려를 키웁니다. 금 상승은 안전자산 선호(Risk-Off) 또는 인플레 헤지 수요를 의미합니다. 두 자산이 동시에 상승하면 스태그플레이션 경계 신호입니다.',
  },
  {
    key: 'hyg_jnk',
    term: 'HYG / JNK (고수익 채권 ETF)',
    body: '신용등급이 낮은 기업의 채권(하이일드 본드)으로 구성된 ETF입니다. 이 ETF가 강하면 투자자들이 위험을 감수할 의향이 있다는 신호(Risk-On)입니다. IEF(국채)가 강하고 HYG가 약하면 공포 신호입니다.',
  },
  {
    key: 'market_structure',
    term: '시장 구조 (Market Structure)',
    body: 'UPTREND(상승 추세), DOWNTREND(하락 추세), DISTRIBUTION(분산·고점 형성 중), ACCUMULATION(축적·바닥 형성 중), NEUTRAL(방향성 없음) 5가지 상태를 기술적으로 판별합니다.',
  },
  // ── Sentiment ─────────────────────────────────────────────────
  {
    key: 'composite_score',
    term: '복합점수 (Composite Score, −2 ~ +2)',
    body: '소셜 미디어와 뉴스에서 수집한 심리를 종합한 점수입니다. +2에 가까울수록 극도의 낙관(과열 주의), −2에 가까울수록 극도의 공포입니다. 극단적 공포 구간(−1.5 이하)은 역발상 매수 기회가 될 수 있습니다.',
  },
  {
    key: 'sentiment_confidence',
    term: 'Confidence (신뢰도)',
    body: '이 심리 판단이 얼마나 신뢰할 수 있는지를 나타냅니다. HIGH는 데이터 품질이 좋고 신호가 명확함, LOW는 데이터가 부족하거나 신호가 혼재해 해석에 주의가 필요합니다.',
  },
  // ── DeepDive ──────────────────────────────────────────────────
  {
    key: 'institutional_activity',
    term: '세력참여도 (Institutional Activity)',
    body: '거래량의 상승봉/하락봉 비율, 최근 거래량 추세, 집중 매수·매도일, 세력점수(0~100), 10일 누적 매집/분산 그리드로 기관 투자자의 매집/분산 여부를 판단합니다. 세력점수 60 이상이면 매집 우위입니다.',
  },
];

// Key-based lookup: G.risk_regime.term / G.risk_regime.body
export const G = Object.fromEntries(GLOSSARY.map(e => [e.key, e])) as Record<
  string,
  GlossaryEntry
>;
