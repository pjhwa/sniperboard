# Claude Code 작업 지침 — SniperBoard 신규 지표 통합

> 사전 컨텍스트 필독: `sniperboard-integration-plan.md` (§2 선별 결과 7개, §3 융합 위치, §5 Phase 구조)
> 작업 방식: **Phase별로 별도 PR**. 1 → 2 → 3 순서. 절대 일괄 머지 X.

---

## 0. 미션

카지노 마켓 대화 분석에서 추출된 **7개 지표**를 sniperboard에 흡수한다. 새 탭은 만들지 않고, 기존 4탭(Intraday/Daily/Watchlist/Macro)에 자연스럽게 배치.

추가할 7개:
1. **Distribution Day Count** (Macro 헤더 + Daily Stage 2 옆) ★★★
2. **VIX 환경** ^VIX/^VVIX/^VIX9D + 백워데이션 배지 (Macro) ★★★
3. **시장 폭** RSP/MAGS/IWM + Breadth Warning boolean (Macro + Daily) ★★★
4. **신용 스트레스** HYG/JNK/LQD/IEF + HYG/IEF 비율 (Macro) ★★
5. **Risk Regime 5요소** 종합 점수 카드 (Macro 헤더) ★★★
6. **OPEX D-day** (Macro + Daily 헤더) — Phase 2
7. **종목-매크로 상관계수 패널** (Daily) — Phase 2
8. **예상 무브** (Daily R:R 옆, best-effort) — Phase 3

---

## 1. 절대 금지 (Constraints)

| # | 금지 | 이유 |
|---|---|---|
| 1 | `core/signal_engine.py`의 기존 함수 시그니처 수정 | 6신호/Stage2는 검증된 코어. 인덱스 시프트 한 줄로 회귀 |
| 2 | 기존 Pydantic 스키마 필드 삭제·재명명 | 프론트와의 계약. 추가만 허용 |
| 3 | `MacroItemSchema`의 기존 nullable 아닌 필드를 nullable로 강제 변경 | **단, `price`/`change_pct_1d`/`change_pct_5d`는 결측 표시를 위해 Optional 완화 — 이건 §3.1에서 의도적으로 허용** |
| 4 | 신규 외부 의존성 추가 | yfinance/pandas/numpy/FastAPI/lightweight-charts 외 금지 |
| 5 | 새로운 탭 추가 | 기존 4탭에 흡수. UI 단순함 보호 |
| 6 | Next.js 버전 변경 (`frontend/AGENTS.md` 명시) | App Router 컨벤션만 |
| 7 | Tailwind 신규 팔레트 색 | 기존 zinc/emerald/red/orange/blue/teal/yellow만 |

---

## 2. 사전 준비

```bash
cd sniperboard
git status                                  # clean
git checkout -b feat/oneil-distribution-day  # Phase 1 브랜치
mkdir -p tasks
touch tasks/todo.md tasks/lessons.md
```

`tasks/todo.md`에 본 문서 §9 체크리스트를 복사.

---

## 3. Phase 1 — 백엔드 변경

### 3.1. `backend/api/endpoints.py` — MACRO_SYMBOLS 확장

라인 151~167 `MACRO_SYMBOLS` 딕셔너리 끝에 **추가만** (기존 키 순서·이름 보존):

```python
    # 변동서 (지표 #2)
    "^VIX":     "VIX 변동성",
    "^VVIX":    "VIX의 변동성 (^VVIX)",
    "^VIX9D":   "9일 VIX (^VIX9D)",
    # 신용 스트레스 (지표 #4)
    "HYG":      "하이일드 ETF (HYG)",
    "JNK":      "정크본드 ETF (JNK)",
    "LQD":      "투자등급 ETF (LQD)",
    "IEF":      "중기국채 ETF (IEF)",
    # 폭(Breadth) (지표 #3)
    "RSP":      "S&P 동등가중 (RSP)",
    "MAGS":     "Magnificent 7 (MAGS)",
    "IWM":      "러셀2000 (IWM)",
```

### 3.2. `MacroItemSchema` 결측 허용 완화

`backend/api/schemas.py` 라인 95~106. **신규 심볼이 결측되어도 앱이 죽지 않게**:

```python
class MacroItemSchema(BaseModel):
    symbol: str
    name: str
    price: Optional[float] = None            # 변경: 결측 허용
    change_pct_1d: Optional[float] = None    # 변경
    change_pct_5d: Optional[float] = None    # 변경
    ema8: Optional[float] = None
    ema21: Optional[float] = None
    above_ema8: bool = False
    above_ema21: bool = False
    market_structure: str = 'NEUTRAL'
    rsi14: Optional[float] = None
```

`/macro` 엔드포인트(라인 178~) — 데이터 결측시 `continue` 대신 **null 필드로 응답 포함**하도록 수정:

```python
for sym, name in MACRO_SYMBOLS.items():
    df = dfs.get(sym)
    if df is None or df.empty or len(df) < 10:
        result.append({
            "symbol": sym, "name": name,
            "price": None, "change_pct_1d": None, "change_pct_5d": None,
            "ema8": None, "ema21": None, "above_ema8": False, "above_ema21": False,
            "market_structure": "NEUTRAL", "rsi14": None,
        })
        continue
    # 기존 로직 그대로 ...
```

### 3.3. `backend/core/distribution_day.py` 신규 (지표 #1)

```python
"""Distribution Day Count — O'Neil 정통 시장 상단 선행 지표.

지난 N(=25) 거래일 중,
거래량이 전일 대비 증가 + 종가가 전일 대비 -0.2% 이하 인 날의 개수.
"""
from typing import Optional
import pandas as pd

DD_LOOKBACK = 25
DD_THRESHOLD_PCT = -0.2  # 종가 변화율 임계값
DD_WARNING = 4   # 경계
DD_DANGER = 6    # 위험


def count_distribution_days(df: pd.DataFrame, lookback: int = DD_LOOKBACK) -> Optional[dict]:
    """
    df: 일봉 OHLCV ('close', 'volume' 컬럼)
    반환: { 'count': int, 'level': str, 'dates': List[str] }
    """
    if df is None or len(df) < lookback + 1:
        return None
    recent = df.iloc[-(lookback + 1):].copy()
    recent['close_change'] = recent['close'].pct_change() * 100
    recent['vol_increase'] = recent['volume'] > recent['volume'].shift(1)
    recent['is_dd'] = (recent['close_change'] <= DD_THRESHOLD_PCT) & recent['vol_increase']

    dd_window = recent.iloc[1:]  # 첫 행은 비교 불가
    count = int(dd_window['is_dd'].sum())

    if count >= DD_DANGER:
        level = 'DANGER'
    elif count >= DD_WARNING:
        level = 'WARNING'
    else:
        level = 'OK'

    dd_dates = [d.strftime('%Y-%m-%d') for d in dd_window.index[dd_window['is_dd']]]
    return {'count': count, 'level': level, 'dates': dd_dates}
```

### 3.4. `backend/core/regime_engine.py` 신규 (지표 #5)

```python
"""Risk Regime 5요소 종합 점수 — 매크로 환경 분류.

5요소 각 0~20점. 누락은 None. 유효 컴포넌트 ≥ 3개일 때만 합산.
임계값은 명시 상수 (매직넘버 금지).
"""
from typing import Optional, Dict
import pandas as pd

TREND_LOW, TREND_HIGH = -5.0, 10.0          # SPY EMA200 이격 %
BREADTH_LOW, BREADTH_HIGH = -5.0, 3.0       # RSP - SPY 60일 상대성과 %
CREDIT_LOW, CREDIT_HIGH = -2.0, 1.0         # HYG/IEF 30일 변화 %
VOL_LOW, VOL_HIGH = 14.0, 30.0              # ^VIX (낮을수록 risk-on)
MOMENTUM_LOW, MOMENTUM_HIGH = -5.0, 5.0     # SPY 20일 RoC %


def _linear(value: float, lo: float, hi: float, invert: bool = False) -> Optional[float]:
    if pd.isna(value):
        return None
    if invert:
        lo, hi = hi, lo
    clamped = max(min(value, max(lo, hi)), min(lo, hi))
    return (clamped - lo) / (hi - lo) * 20.0


def compute_regime(dfs: Dict[str, Optional[pd.DataFrame]]) -> dict:
    def _close(s: str) -> pd.Series:
        df = dfs.get(s)
        return df['close'] if df is not None and not df.empty else pd.Series(dtype=float)

    spy, rsp, hyg, ief, vix = (_close(s) for s in ['SPY', 'RSP', 'HYG', 'IEF', '^VIX'])

    # 1. Trend: SPY vs EMA200
    trend = None
    if len(spy) >= 200:
        ema200 = spy.ewm(span=200, adjust=False).mean().iloc[-1]
        trend = _linear((spy.iloc[-1] - ema200) / ema200 * 100, TREND_LOW, TREND_HIGH)

    # 2. Breadth: RSP - SPY 60일 상대성과
    breadth = None
    if len(rsp) >= 60 and len(spy) >= 60:
        rsp_ret = (rsp.iloc[-1] / rsp.iloc[-60] - 1) * 100
        spy_ret = (spy.iloc[-1] / spy.iloc[-60] - 1) * 100
        breadth = _linear(rsp_ret - spy_ret, BREADTH_LOW, BREADTH_HIGH)

    # 3. Credit: HYG/IEF 30일 변화
    credit = None
    if len(hyg) >= 30 and len(ief) >= 30:
        ratio = hyg / ief
        credit = _linear((ratio.iloc[-1] / ratio.iloc[-30] - 1) * 100, CREDIT_LOW, CREDIT_HIGH)

    # 4. Volatility: ^VIX (낮을수록 risk-on)
    vol = None
    if len(vix) >= 1:
        vol = _linear(vix.iloc[-1], VOL_LOW, VOL_HIGH, invert=True)

    # 5. Momentum: SPY 20일 RoC
    momentum = None
    if len(spy) >= 20:
        momentum = _linear((spy.iloc[-1] / spy.iloc[-20] - 1) * 100, MOMENTUM_LOW, MOMENTUM_HIGH)

    components = {
        'trend': round(trend, 1) if trend is not None else None,
        'breadth': round(breadth, 1) if breadth is not None else None,
        'credit': round(credit, 1) if credit is not None else None,
        'volatility': round(vol, 1) if vol is not None else None,
        'momentum': round(momentum, 1) if momentum is not None else None,
    }
    valid = [v for v in components.values() if v is not None]
    if len(valid) < 3:
        return {'total': None, 'regime': 'UNKNOWN', 'components': components, 'valid_count': len(valid)}

    total = sum(valid) / len(valid) * 5
    if   total >= 80: regime = 'RISK_ON'
    elif total >= 60: regime = 'CONSTRUCTIVE'
    elif total >= 40: regime = 'MIXED'
    elif total >= 20: regime = 'DEFENSIVE'
    else:             regime = 'RISK_OFF'

    return {'total': round(total, 1), 'regime': regime,
            'components': components, 'valid_count': len(valid)}
```

### 3.5. `core/signal_engine.py` — Stage 2에 breadth_warning 추가 (지표 #3)

`calculate_stage2_analysis` 함수 시그니처에 선택적 인수 추가:

```python
def calculate_stage2_analysis(
    df: pd.DataFrame,
    spy_close: pd.Series = None,
    rsp_close: pd.Series = None,    # 신규 (Optional, 기존 호출과 호환)
) -> dict:
```

함수 마지막의 반환 dict에 추가:

```python
    # Breadth Warning: SPY 20일 신고가 + RSP 20일 신고가 미달
    breadth_narrow = False
    if spy_close is not None and rsp_close is not None and len(spy_close) >= 20 and len(rsp_close) >= 20:
        spy_at_high = spy_close.iloc[-1] >= spy_close.iloc[-20:].max() * 0.999
        rsp_at_high = rsp_close.iloc[-1] >= rsp_close.iloc[-20:].max() * 0.999
        breadth_narrow = bool(spy_at_high and not rsp_at_high)

    # ... 기존 return dict에 추가:
    return {
        # ... 기존 필드 그대로 ...
        'breadth_narrow': breadth_narrow,
    }
```

`Stage2Schema`에 추가:
```python
class Stage2Schema(BaseModel):
    # ... 기존 필드 그대로 ...
    breadth_narrow: bool = False
```

### 3.6. `/daily`, `/watchlist` 엔드포인트 — RSP 데이터 함께 받아오기

`endpoints.py`의 `/daily`:
```python
dfs = get_multi_daily([symbol.upper(), "SPY", "RSP"], period="2y")
spy_close = dfs["SPY"]["close"] if dfs.get("SPY") is not None and not dfs["SPY"].empty else None
rsp_close = dfs["RSP"]["close"] if dfs.get("RSP") is not None and not dfs["RSP"].empty else None
stage2 = calculate_stage2_analysis(df, spy_close, rsp_close)
```

`/watchlist`도 동일하게 RSP를 함께 다운로드, 모든 종목 stage2에 전달.

### 3.7. 신규 엔드포인트 추가

```python
from core.distribution_day import count_distribution_days
from core.regime_engine import compute_regime

@router.get("/regime", response_model=RegimeResponse)
async def get_regime_endpoint():
    try:
        dfs = get_multi_daily(['SPY', 'RSP', 'HYG', 'IEF', '^VIX'], period="6mo")
        return compute_regime(dfs)
    except Exception as e:
        logger.error(f"Error in /regime: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Regime computation failed")


@router.get("/distribution-days", response_model=DistributionDayResponse)
async def get_distribution_days_endpoint():
    try:
        dfs = get_multi_daily(['SPY', 'QQQ'], period="3mo")
        result = {}
        for sym in ['SPY', 'QQQ']:
            df = dfs.get(sym)
            dd = count_distribution_days(df) if df is not None else None
            result[sym] = dd if dd is not None else {'count': 0, 'level': 'OK', 'dates': []}
        return {'spy': result['SPY'], 'qqq': result['QQQ']}
    except Exception as e:
        logger.error(f"Error in /distribution-days: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="DD computation failed")
```

신규 Pydantic 스키마:
```python
class RegimeComponentsSchema(BaseModel):
    trend: Optional[float] = None
    breadth: Optional[float] = None
    credit: Optional[float] = None
    volatility: Optional[float] = None
    momentum: Optional[float] = None

class RegimeResponse(BaseModel):
    total: Optional[float] = None
    regime: str
    components: RegimeComponentsSchema
    valid_count: int

class DDDetailSchema(BaseModel):
    count: int
    level: str  # 'OK' | 'WARNING' | 'DANGER'
    dates: List[str]

class DistributionDayResponse(BaseModel):
    spy: DDDetailSchema
    qqq: DDDetailSchema
```

### 3.8. 단위 테스트

`backend/tests/test_distribution_day.py`:
- 정상 데이터: 임계값 정확히 -0.2% 인 날의 포함/제외
- 거래량 감소 + 종가 하락 = DD 아님
- 25일 lookback 윈도우 경계
- 빈 DataFrame → None

`backend/tests/test_regime_engine.py`:
- 모든 컴포넌트 정상 → 0~100 범위
- 2개만 유효 → 'UNKNOWN'
- ^VIX=10 → volatility ≈ 20
- ^VIX=40 → volatility ≈ 0
- 임계값 경계

```bash
cd backend && pytest tests/ -v
```

---

## 4. Phase 1 — 프론트엔드 변경

### 4.1. `frontend/app/types.ts` — 타입 추가

```typescript
// MacroItem의 가격/변화율을 nullable로 (결측 표시용)
export interface MacroItem {
  symbol: string;
  name: string;
  price: number | null;           // 변경
  change_pct_1d: number | null;   // 변경
  change_pct_5d: number | null;   // 변경
  ema8: number | null;
  ema21: number | null;
  above_ema8: boolean;
  above_ema21: boolean;
  market_structure: string;
  rsi14: number | null;
}

// Stage2에 breadth_narrow 추가
export interface Stage2 {
  // ... 기존 그대로 ...
  breadth_narrow: boolean;
}

// 신규
export interface RegimeComponents {
  trend: number | null;
  breadth: number | null;
  credit: number | null;
  volatility: number | null;
  momentum: number | null;
}

export interface RegimeData {
  total: number | null;
  regime: 'RISK_ON' | 'CONSTRUCTIVE' | 'MIXED' | 'DEFENSIVE' | 'RISK_OFF' | 'UNKNOWN';
  components: RegimeComponents;
  valid_count: number;
}

export interface DDDetail {
  count: number;
  level: 'OK' | 'WARNING' | 'DANGER';
  dates: string[];
}

export interface DistributionDayData {
  spy: DDDetail;
  qqq: DDDetail;
}

export const REGIME_META: Record<RegimeData['regime'], { label: string; color: string; bg: string }> = {
  RISK_ON:      { label: 'Risk-On',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  CONSTRUCTIVE: { label: 'Constructive', color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/30' },
  MIXED:        { label: 'Mixed',        color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30' },
  DEFENSIVE:    { label: 'Defensive',    color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30' },
  RISK_OFF:     { label: 'Risk-Off',     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
  UNKNOWN:      { label: 'Unknown',      color: 'text-zinc-400',    bg: 'bg-zinc-800/60 border-zinc-700/40' },
};

export const DD_META: Record<DDDetail['level'], { label: string; color: string; bg: string }> = {
  OK:      { label: '정상',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  WARNING: { label: '경계',     color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30' },
  DANGER:  { label: '시장 상단', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
};
```

### 4.2. 신규 훅 두 개

`frontend/hooks/useRegime.ts` / `frontend/hooks/useDistributionDays.ts` — `useMacro.ts`와 동일 패턴. queryKey/staleTime/refetchInterval 모두 동일.

### 4.3. `frontend/components/MacroTab.tsx` 수정

**MACRO_GROUPS 재구성**:
```typescript
const MACRO_GROUPS: { label: string; symbols: string[] }[] = [
  { label: '변동성',          symbols: ['^VIX', '^VVIX', '^VIX9D'] },
  { label: '폭(Breadth)',     symbols: ['SPY', 'QQQ', 'RSP', 'MAGS', 'IWM'] },
  { label: '신용 스트레스',    symbols: ['HYG', 'JNK', 'LQD', 'IEF', 'TLT'] },
  { label: '달러 / 금리',     symbols: ['DX-Y.NYB', '^TNX'] },
  { label: '원자재',          symbols: ['CL=F', 'GLD'] },
  { label: '섹터 ETF',        symbols: ['SMH', 'XLE', 'XLY', 'XHB', 'ITA'] },
];
```

**상단 추가 컴포넌트** (섹터 로테이션 바 위):
1. `<RegimeCard regime={regimeData} />` — 5요소 점수 + 합계 (≤계획서 §3.4 디자인)
2. `<DistributionDayCard dd={ddData} />` — SPY/QQQ 카운터 (≥5면 빨강 배지)

**MacroCard에 null 가드**:
```tsx
{item.price == null ? (
  <div className="text-xs text-zinc-500 italic py-2">데이터 없음</div>
) : (
  // 기존 가격 표시
)}
```

**VIX 백워데이션 자동 배지**: `MacroTab` 본문에서 ^VIX와 ^VIX9D 둘 다 있을 때 비율 계산. >1.0이면 변동성 그룹 상단에 작은 배지 "VIX9D > VIX (백워데이션, 단기 패닉)".

### 4.4. `frontend/components/DailyTab.tsx` 수정

Stage 2 패널 인접에 **Breadth Warning 배지**:
```tsx
{stage2.breadth_narrow && (
  <div className="px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold tracking-wide">
    ⚠ 협소한 랠리 — RSP 신고가 미달
  </div>
)}
```

이건 Stage 2 score가 높아도 표시되어야 함 — 종목 신호와 시장 폭을 분리해서 보여주는 게 핵심.

---

## 5. Phase 1 검증

```bash
# 백엔드 테스트
cd backend && pytest tests/ -v

# 빌드 & 기동
cd .. && ./run_docker.sh

# API 회귀
curl http://localhost:5001/api/ohlcv?symbol=TSLA | jq '.signals | keys'
# → 기존 6개 키 동일 ['downtrend','overbought','pullback','sniper','strong_trend','vcp']

curl http://localhost:5001/api/daily?symbol=TSLA | jq '.stage2 | keys'
# → 기존 키 + 'breadth_narrow' 한 개 추가

# 신규
curl http://localhost:5001/api/regime | jq
curl http://localhost:5001/api/distribution-days | jq
curl http://localhost:5001/api/macro | jq '.macro[] | select(.symbol == "^VIX")'

# 타입 컴파일
cd frontend && npx tsc --noEmit
```

**회귀 체크 (사람 눈)**:
- Intraday 탭: 100% 동일
- Daily 탭: Stage 2 옆에 Breadth Warning 배지(해당 시) 외 모든 것 동일
- Watchlist 탭: 100% 동일 (breadth_narrow는 보이지 않음, 데이터에만)
- Macro 탭: 상단에 Regime + DD 카드, 그룹 재편 (변동성/폭/신용/달러금리/원자재/섹터)

---

## 6. Phase 2 — OPEX D-day + 상관계수 패널

**시작 조건**: Phase 1 머지 후 최소 3일 운영 + 회귀 없음 확인.

### 6.1. OPEX D-day (지표 #6)

`backend/core/calendar.py` 신규:
- 다음 월간 OPEX = 다음 (현재월 또는 다음월) 3번째 금요일 — 외부 데이터 X, 순수 달력 계산
- 미국 시장 휴장일은 단순화: 휴장이면 직전 영업일로 (간단한 데이터 결손 허용)

엔드포인트 `/calendar` → `{ next_monthly_opex: 'YYYY-MM-DD', dday: int, next_weekly_opex: ... }`

프론트: MacroTab 상단 + DailyTab 헤더 옆에 작은 배지 "OPEX D-3".

### 6.2. 상관계수 패널 (지표 #7)

`backend/core/correlations.py`:
- 30일 일별 수익률 Pearson 상관 (종목 vs SPY, QQQ, BTC-USD, DX-Y.NYB, ^TNX)
- 응답: `{ spy: 0.85, qqq: 0.91, btc: 0.42, dxy: -0.31, tnx: -0.55 }`

엔드포인트 `/correlations?symbol=TSLA`

프론트: DailyTab Stage 2 패널 아래 가로 막대 5개.

---

## 7. Phase 3 — 예상 무브 (best-effort)

**경고**: yfinance 옵션 체인은 만기 누락/지연 빈번. 데이터 없으면 UI에 "—" 표시. **추정값 강요 금지**.

`backend/core/options_engine.py`:
```python
import yfinance as yf

def expected_move(symbol: str) -> Optional[dict]:
    try:
        ticker = yf.Ticker(symbol)
        expirations = ticker.options
        if not expirations:
            return None
        nearest = expirations[0]
        chain = ticker.option_chain(nearest)
        spot = ticker.history(period='1d')['Close'].iloc[-1]
        # ATM 찾기
        chain_calls = chain.calls.copy()
        chain_calls['dist'] = abs(chain_calls['strike'] - spot)
        atm_call = chain_calls.nsmallest(1, 'dist').iloc[0]
        atm_put = chain.puts[chain.puts['strike'] == atm_call['strike']].iloc[0]
        em_dollar = atm_call['lastPrice'] + atm_put['lastPrice']
        em_pct = em_dollar / spot * 100
        return {
            'expiration': nearest,
            'em_dollar': round(em_dollar, 2),
            'em_pct': round(em_pct, 2),
            'spot': round(spot, 2),
        }
    except Exception:
        return None
```

엔드포인트 `/expected-move?symbol=TSLA` — 데이터 있으면 반환, 없으면 `{"available": false}`.

프론트: DailyTab R:R 계산기 옆에 작은 배지. `available: false` 시 표시 안 함.

---

## 8. 자기 검증 — staff engineer 승인 기준

PR 머지 전 모두 yes:
1. 기존 4탭 픽셀 회귀 없음?
2. 기존 6신호 / Stage 2 / Watchlist 점수 산출 결과 동일?
3. 신규 yfinance 심볼 결측이어도 앱 크래시 X?
4. Pydantic `None` 직렬화 정상?
5. Distribution Day 임계값(-0.2%, 25일, 4/6 단계)이 매직넘버 아닌 상수?
6. Regime 5요소 임계값 마찬가지로 상수?
7. UI에 "후행 지표, 매매 신호 X" 경고 (Regime 카드)?
8. Stage 2 score 높아도 `breadth_narrow=true`면 별도 경고 배지 표시?
9. 단위 테스트 커버: 임계값 경계 / 결측 / 빈 입력?

---

## 9. Phase 1 체크리스트 (`tasks/todo.md`)

### 백엔드
- [ ] `MACRO_SYMBOLS`에 ^VIX/^VVIX/^VIX9D/HYG/JNK/LQD/IEF/RSP/MAGS/IWM 추가
- [ ] `MacroItemSchema` price/change_pct_* nullable로
- [ ] `/macro` 결측시 null 응답으로 변경
- [ ] `core/distribution_day.py` 신규
- [ ] `core/regime_engine.py` 신규
- [ ] `signal_engine.calculate_stage2_analysis`에 `rsp_close` 인수 + `breadth_narrow` boolean
- [ ] `Stage2Schema`에 `breadth_narrow` 추가
- [ ] `/daily`, `/watchlist`에서 RSP 함께 다운로드 후 stage2에 전달
- [ ] `/regime`, `/distribution-days` 엔드포인트 추가
- [ ] `tests/test_distribution_day.py` 4시나리오
- [ ] `tests/test_regime_engine.py` 5시나리오
- [ ] 기존 `tests/` 전체 통과

### 프론트
- [ ] `types.ts` Stage2/MacroItem/RegimeData/DistributionDayData
- [ ] `hooks/useRegime.ts`, `hooks/useDistributionDays.ts`
- [ ] `MacroTab` 상단에 RegimeCard + DistributionDayCard
- [ ] `MACRO_GROUPS` 재구성 (변동성/폭/신용/달러금리/원자재/섹터)
- [ ] `MacroCard` null 가드
- [ ] VIX9D/VIX 백워데이션 배지
- [ ] `DailyTab` Stage 2 옆 Breadth Warning 배지
- [ ] `npx tsc --noEmit` 0 에러

### 문서
- [ ] README.md Macro 탭 절 업데이트
- [ ] PROJECT_CONTEXT.md에 `distribution_day.py`, `regime_engine.py` 추가
- [ ] `tasks/lessons.md`에 함정 기록 (yfinance 결측 패턴 / Pydantic v2)

---

## 10. 작업 순서 권장

1. **백엔드 먼저 100% 완료 + 단위 테스트 통과** → curl로 모든 신규 엔드포인트 검증
2. **프론트 타입만 먼저** → `tsc --noEmit` 통과
3. **MacroTab** → 신규 그룹 + null 가드
4. **RegimeCard + DistributionDayCard** → MacroTab 상단
5. **DailyTab Breadth Warning 배지** (가장 작은 변경, 마지막)

각 단계 끝나면 `git commit`. 한 번에 다 하지 말 것 — 회귀 디버깅 시간 폭증.

**Phase 1 완료까지만 한다. Phase 2/3는 별도 브리프 호출 전까지 대기.**
