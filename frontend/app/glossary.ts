import type { BiLang } from './i18n'

export interface GlossaryEntry {
  key: string
  term: BiLang
  body: BiLang
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── Market / Regime ──────────────────────────────────────────
  {
    key: 'risk_regime',
    term: { en: 'Risk Regime', ko: 'Risk Regime (리스크 레짐)' },
    body: {
      en: 'A composite score (0-100) summarizing how favorable the market environment is for investing, based on 5 factors: trend (SPY vs EMA200), breadth (RSP vs SPY 60d), credit (HYG/IEF ratio change), volatility (VIX level), and momentum (S&P500 20d direction). Higher = more bullish environment.',
      ko: '시장이 지금 얼마나 투자하기 좋은 환경인지를 5가지 요소(추세·시장폭·신용·변동성·모멘텀)로 종합한 점수입니다. SPY EMA200 위치, RSP vs SPY 60일 격차, HYG/IEF 비율 변화, VIX 레벨, S&P500 20일 방향을 각각 채점해 합산하며, 100에 가까울수록 강세 환경입니다.',
    },
  },
  {
    key: 'breadth',
    term: { en: 'Market Breadth', ko: 'Breadth (시장 폭)' },
    body: {
      en: 'Measures whether the rally is broad (many stocks rising) or narrow (only a few large caps). RSP (equal-weight S&P500 ETF) outperforming SPY (market-cap weighted) signals a healthy market. The reverse signals fragile, mega-cap-dependent conditions.',
      ko: '소수 대형주만 오르는지, 많은 종목이 함께 오르는지를 봅니다. RSP(S&P500 동일가중 ETF)가 SPY(시가총액 비례)보다 강하면 건강한 장세, 약하면 대형주 소수에 의존하는 취약한 장세입니다.',
    },
  },
  {
    key: 'credit',
    term: { en: 'Credit Stress', ko: 'Credit Stress (신용 스트레스)' },
    body: {
      en: 'Measures corporate bond market health. HYG (high-yield ETF) outperforming IEF (treasury ETF) signals risk appetite; the reverse signals fear. Calculated from 30-day HYG/IEF ratio change.',
      ko: '회사채 시장의 건전성을 봅니다. HYG(고수익 채권 ETF)가 IEF(미국 국채 ETF)보다 강하면 위험 선호 신호, 반대면 공포 신호입니다. 30일 HYG/IEF 비율 변화로 계산합니다.',
    },
  },
  {
    key: 'volatility',
    term: { en: 'Volatility · VIX', ko: 'Volatility (변동성 · VIX)' },
    body: {
      en: 'The fear index measuring expected S&P500 volatility over the next 30 days. Below 14 = calm, around 20 = caution, above 30 = fear. Lower is better for entering positions.',
      ko: '향후 30일 S&P500의 예상 변동성을 나타내는 공포 지수입니다. 14 이하면 안정적, 20 전후면 경계, 30 이상이면 공포 국면입니다. 낮을수록 매수하기 좋은 환경입니다.',
    },
  },
  {
    key: 'vix_backwardation',
    term: { en: 'VIX Backwardation', ko: 'VIX 백워데이션' },
    body: {
      en: 'When VIX9D (9-day short-term volatility) exceeds VIX (30-day). Normal (contango) has longer-term VIX higher. Inversion means the market is more fearful right now than expected — a warning signal for near-term event risk.',
      ko: 'VIX9D(9일 단기 변동성)가 VIX(30일)보다 높아진 역전 상태입니다. 정상(콘탱고)은 장기 VIX가 더 높은데, 역전되면 지금 당장 시장이 더 불안하다는 경고 신호입니다.',
    },
  },
  {
    key: 'distribution_days',
    term: { en: 'Distribution Days', ko: 'Distribution Days (분산일)' },
    body: {
      en: 'Count of days in the past 25 trading days where institutional investors sold heavily (S&P500/Nasdaq down + volume up). 4-5 days = caution; 6+ days = likely market top, avoid new entries.',
      ko: '최근 25거래일 내 기관 투자자들이 대량 매도한 날의 수입니다. 4~5일이면 경계, 6일 이상이면 시장 상단 가능성이 높아 신규 진입을 자제해야 합니다.',
    },
  },
  {
    key: 'market_breadth_spy_rsp',
    term: { en: 'Market Breadth · SPY vs RSP', ko: 'Market Breadth · SPY vs RSP' },
    body: {
      en: 'SPY weights by market cap (large caps dominate); RSP weights all 500 stocks equally. RSP underperforming SPY warns that only a few mega-caps are carrying the index — an unhealthy rally.',
      ko: 'SPY는 시가총액 비례 지수(대형주 영향 큼), RSP는 모든 종목을 동일 비중으로 구성한 지수입니다. RSP가 SPY보다 약하면 소수 대형주만 시장을 끌고 있다는 경고입니다.',
    },
  },
  {
    key: 'sector_momentum',
    term: { en: 'Sector Momentum', ko: 'Sector Momentum (섹터 모멘텀)' },
    body: {
      en: '5-day return rankings for 5 theme ETFs (SMH semiconductors, XLY consumer discretionary, ITA defense, XLE energy, XHB homebuilders). Money flows into top-ranked sectors — focus on stocks within leading sectors. ↑EMA means above 21-day moving average.',
      ko: '5개 테마 ETF(SMH 반도체, XLY 소비재, ITA 방산, XLE 에너지, XHB 홈빌더)의 최근 5일 수익률 순위입니다. 상위 섹터에 돈이 몰리고 있으므로 강세 섹터 내 종목에 집중하는 것이 유리합니다.',
    },
  },
  // ── Stage 2 / Technical ───────────────────────────────────────
  {
    key: 'stage2',
    term: { en: 'Stage 2 Score (0-7)', ko: 'Stage 2 점수 (0~7)' },
    body: {
      en: "Count of Minervini's 7 ideal buy-zone conditions met: ①Price>EMA21>50>200 ②EMA200 rising ③Within 25% of 52w high ④30%+ above 52w low ⑤Recent correction <15% ⑥RS Score≥50 ⑦Volume contracting. Score 6-7: consider entry. 4-5: watch. ≤3: avoid.",
      ko: 'Minervini가 정의한 이상적인 매수 구간 조건 7가지를 충족한 개수입니다. 6~7점이면 진입 검토, 4~5점은 관망, 3 이하면 회피.',
    },
  },
  {
    key: 'rs_score',
    term: { en: 'RS Score (Relative Strength)', ko: 'RS Score (상대 강도)' },
    body: {
      en: "Measures the stock's 63-day return relative to S&P500, scaled 0-100. Above 70 = top 30% performer. One of Minervini's Stage2 criteria (RS ≥ 50). Similar concept to IBD's EPS/RS ratings.",
      ko: 'S&P500과 비교해 최근 63일(약 3개월) 수익률이 얼마나 우수한지를 0~100으로 나타냅니다. 70 이상이면 시장 상위 30% 강세주입니다.',
    },
  },
  {
    key: 'gc_status',
    term: { en: 'Gaussian Channel', ko: '가우시안 채널 (Gaussian Channel)' },
    body: {
      en: "The blue band on the chart. Shows statistically whether price is in a 'normal range' without using future data, so it's reliable in real time.\n\n• Breakout — price pierces the upper band upward. Strong buying signal, consider entry.\n• Above Channel — price stays above channel in a sustained uptrend. Hold.\n• Retest — price drops back to touch the upper band after breakout. Pullback entry opportunity.\n• Below Channel — price drops below the lower band. Bearish, avoid new entries.",
      ko: '차트에 표시된 파란 밴드입니다. 미래 데이터를 쓰지 않아 실시간으로 신뢰할 수 있습니다.\n\n• Breakout — 주가가 채널 상단을 뚫고 위로 솟음. 강한 매수 에너지 신호\n• Above Channel — 채널 위에 머물며 강세 지속 중. 보유 유지\n• Retest — 상단 돌파 후 채널로 다시 내려와 닿음. 눌림목 진입 기회\n• Below Channel — 채널 하단 아래로 이탈. 약세, 신규 진입 자제',
    },
  },
  {
    key: 'conviction',
    term: { en: 'Conviction Score', ko: 'Conviction (확신 점수)' },
    body: {
      en: 'A 0-100 composite score combining Stage2 (40%) + Social Sentiment (30%) + Risk Regime (30%). Above 65 (Bull) = high conviction with multiple signals aligned. Above 50 (Teal) = moderate. Below 35 (Bear) = avoid.',
      ko: 'Stage2(40%) + 소셜 심리(30%) + Risk Regime(30%)를 종합한 0~100 확신 점수입니다. 65 이상(Bull)이면 고확신 구간, 50 이상(Teal)은 보통, 35 미만(Bear)은 회피 권고입니다.',
    },
  },
  {
    key: 'rr_ratio',
    term: { en: 'R:R Ratio (Risk:Reward)', ko: 'R:R 비율 (Risk:Reward)' },
    body: {
      en: 'The ratio of potential loss to potential gain. 1:3 means you risk 1 unit to make 3 — you only need to be right 1 in 3 times to be profitable. Generally recommend 1:2 or better.',
      ko: '내가 잃을 수 있는 금액 대비 벌 수 있는 금액의 비율입니다. 1:3이면 1만원 잃을 위험에 3만원을 노린다는 뜻. 일반적으로 1:2 이상을 권장합니다.',
    },
  },
  {
    key: 'monthly_phase',
    term: { en: 'Monthly Phase', ko: '월봉 추세 (Monthly Phase)' },
    body: {
      en: 'Daily data aggregated to monthly candles, then evaluated against a 10-month EMA. "CONFIRMED_UPTREND" means price is above the 10M EMA with a rising slope — a bullish cycle that increases the reliability of shorter-term entry signals.',
      ko: '일봉 데이터를 월봉으로 합산해 10개월 EMA 기준으로 추세를 판별합니다. "월봉 상승 확인(CONFIRMED_UPTREND)"이면 강세 사이클로, 단기 진입 신호의 신뢰도가 높아집니다.',
    },
  },
  // ── Intraday Signals ─────────────────────────────────────────
  {
    key: 'signal_vcp',
    term: { en: 'VCP (Volatility Contraction Pattern)', ko: 'VCP (변동성 수축 패턴)' },
    body: {
      en: 'A powerful breakout buy signal: price breaks a 30-candle high with 2x+ average volume, while ATR contracts over 8 candles and EMA21 > EMA50. Confirms institutional accumulation — the highest-confidence signal.',
      ko: '주가가 30봉 신고가를 돌파하면서 거래량이 평소의 2배 이상 급증할 때 나타나는 강력한 돌파 매수 신호입니다. ATR 8봉 연속 수축과 EMA21>50 조건도 필요합니다.',
    },
  },
  {
    key: 'signal_sniper',
    term: { en: 'Sniper Signal', ko: 'Sniper 신호' },
    body: {
      en: 'A buy signal when price comes within 0.4% of EMA21 (21-candle exponential moving average) and RSI is in the 38-58 range. Captures the best pullback entry timing within a trend. Also requires 1.4x+ volume vs. prior candle.',
      ko: '가격이 EMA21(21봉 지수이동평균)에서 0.4% 이내로 접근하고 RSI가 38~58 구간에 있을 때 뜨는 매수 신호입니다. 추세 중 가장 좋은 눌림목 진입 타이밍을 포착합니다.',
    },
  },
  {
    key: 'signal_pullback',
    term: { en: 'Pullback', ko: 'Pullback (눌림목)' },
    body: {
      en: 'Appears when price corrects 4.5-9% from a 15-candle high and finds moving average support. Also requires MACD histogram rebounding for 3 consecutive candles and volume declining. High probability of trend resumption.',
      ko: '15봉 고점 대비 4.5~9% 조정 후 이동평균선에서 지지를 받을 때 나타납니다. MACD 히스토그램 3봉 연속 반등과 거래량 감소도 조건입니다.',
    },
  },
  {
    key: 'signal_strong_trend',
    term: { en: 'StrongTrend', ko: 'StrongTrend (강한 추세)' },
    body: {
      en: 'Displayed when Price > EMA21 > EMA50 are properly aligned, EMA21 slope is +0.15%+, and RSI is 52-78. This is a signal to hold existing positions.',
      ko: '가격 > EMA21 > EMA50 순서로 정렬되고, EMA21 기울기 +0.15% 이상, RSI 52~78일 때 표시됩니다. 현재 보유 중인 포지션을 계속 유지(홀딩)하라는 신호입니다.',
    },
  },
  {
    key: 'signal_overbought',
    term: { en: 'Overbought', ko: 'Overbought (과열)' },
    body: {
      en: 'RSI ≥ 76, price +3.2% above EMA21, 4 of 5 candles bullish, volume declining — an overheated zone. Consider partial profit-taking.',
      ko: 'RSI≥76이고 EMA21에서 +3.2% 이상 이격되어 있으며 5봉 중 4개가 양봉이고 거래량이 감소하는 과열 구간입니다. 일부 물량 분할 매도(익절)를 고려할 타이밍입니다.',
    },
  },
  {
    key: 'signal_downtrend',
    term: { en: 'Downtrend', ko: 'Downtrend (하락 추세)' },
    body: {
      en: 'Price is below EMA21 with a negative slope, volume is 1.3x+ average, and price is at an 8-candle low. Do not catch a falling knife — avoid buying when this signal is active.',
      ko: '가격이 EMA21 아래에 있고, EMA21이 음의 기울기이며, 거래량이 평균의 1.3배 이상이고 8봉 신저가인 상태입니다. 떨어지는 칼날을 잡지 마세요.',
    },
  },
  // ── Macro ─────────────────────────────────────────────────────
  {
    key: 'vix_index',
    term: { en: 'VIX (Fear Index)', ko: 'VIX (공포 지수)' },
    body: {
      en: 'Expected S&P500 volatility over the next 30 days. Below 14 = calm, around 20 = caution, above 30 = fear. Higher means market participants are more anxious.',
      ko: '향후 30일간 S&P500의 예상 변동성입니다. 14 이하=안정, 20 전후=경계, 30 이상=공포. 높을수록 시장 참여자들이 불안해하고 있다는 뜻입니다.',
    },
  },
  {
    key: 'rates_dollar',
    term: { en: 'Rates & USD', ko: '달러·금리 (Rates & USD)' },
    body: {
      en: 'Dollar (DXY) and rates (TNX 10-year) are generally inverse to equities. Strong dollar + rising rates = tighter liquidity, headwind for stocks. TLT rising = rates falling (favorable for stocks). Weak DXY = global capital rotating out of USD assets, favorable for commodities and EM stocks.',
      ko: '달러(DXY)와 금리(TNX 10년물)는 주식 시장과 역관계입니다. 달러 강세·금리 상승은 유동성 축소로 이어져 주식에 불리합니다. TLT 상승하면 금리 하락 신호(주식에 우호적).',
    },
  },
  {
    key: 'commodities',
    term: { en: 'Commodities', ko: '원자재 (Commodities)' },
    body: {
      en: 'Crude oil (CL=F) and gold (GLD) signal inflation and global economic health. Rising oil = economic strength signal but can fuel rate-hike fears. Rising gold = risk-off or inflation hedge demand. Both rising simultaneously = stagflation warning.',
      ko: '원유(CL=F)와 금(GLD)은 인플레이션과 글로벌 경기 신호입니다. 원유 상승은 경기 호조 신호이지만 인플레를 자극합니다. 두 자산이 동시에 상승하면 스태그플레이션 경계 신호입니다.',
    },
  },
  {
    key: 'hyg_jnk',
    term: { en: 'HYG / JNK (High-Yield ETF)', ko: 'HYG / JNK (고수익 채권 ETF)' },
    body: {
      en: 'ETFs composed of below-investment-grade corporate bonds. Strong HYG = investors willing to take risk (Risk-On). Weak HYG + strong IEF (treasuries) = fear signal.',
      ko: '신용등급이 낮은 기업의 채권(하이일드 본드)으로 구성된 ETF입니다. 이 ETF가 강하면 위험 선호 신호(Risk-On). IEF가 강하고 HYG가 약하면 공포 신호입니다.',
    },
  },
  {
    key: 'market_structure',
    term: { en: 'Market Structure', ko: '시장 구조 (Market Structure)' },
    body: {
      en: 'Technically determines one of 5 states: UPTREND (rising highs and lows), DOWNTREND (falling highs and lows), DISTRIBUTION (forming a top), ACCUMULATION (forming a bottom), NEUTRAL (no clear direction).',
      ko: 'UPTREND(상승 추세), DOWNTREND(하락 추세), DISTRIBUTION(분산·고점 형성 중), ACCUMULATION(축적·바닥 형성 중), NEUTRAL(방향성 없음) 5가지 상태를 기술적으로 판별합니다.',
    },
  },
  // ── Sentiment ─────────────────────────────────────────────────
  {
    key: 'composite_score',
    term: { en: 'Composite Score (−2 to +2)', ko: '복합점수 (Composite Score, −2 ~ +2)' },
    body: {
      en: 'A score synthesizing social media and news sentiment. Near +2 = extreme optimism (overheating risk). Near -2 = extreme fear. Extreme fear zones (≤-1.5) can be contrarian buy opportunities.',
      ko: '소셜 미디어와 뉴스에서 수집한 심리를 종합한 점수입니다. +2에 가까울수록 극도의 낙관(과열 주의), −2에 가까울수록 극도의 공포입니다.',
    },
  },
  {
    key: 'sentiment_confidence',
    term: { en: 'Sentiment Confidence', ko: 'Confidence (신뢰도)' },
    body: {
      en: 'Reliability of the sentiment judgment. HIGH = good data quality and clear signal. LOW = insufficient data or mixed signals — interpret with caution.',
      ko: '이 심리 판단이 얼마나 신뢰할 수 있는지를 나타냅니다. HIGH는 데이터 품질이 좋고 신호가 명확함, LOW는 데이터가 부족하거나 신호가 혼재해 해석에 주의가 필요합니다.',
    },
  },
  // ── DeepDive ──────────────────────────────────────────────────
  {
    key: 'institutional_activity',
    term: { en: 'Institutional Activity', ko: '세력참여도 (Institutional Activity)' },
    body: {
      en: 'Measures institutional buying/selling via: up/down volume ratio, recent volume trend, concentrated buy/sell days, an institutional score (0-100), and a 10-day accumulation/distribution grid. Score ≥ 60 = accumulation dominant.',
      ko: '거래량의 상승봉/하락봉 비율, 최근 거래량 추세, 집중 매수·매도일, 세력점수(0~100), 10일 누적 매집/분산 그리드로 기관 투자자의 매집/분산 여부를 판단합니다. 세력점수 60 이상이면 매집 우위입니다.',
    },
  },
]

// Key-based lookup: G.risk_regime.term / G.risk_regime.body
export const G = Object.fromEntries(GLOSSARY.map(e => [e.key, e])) as Record<string, GlossaryEntry>
