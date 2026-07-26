# Insight Lab 신호 신뢰도 개선

> 목표: 소셜심리/신호가 "믿을만하지 않다"는 느낌을 데이터로 정직하게 설명하고,
> 분석 품질을 실질적으로 높인다.

## 진단 결론

현상: bullish divergence 5d avg = -2.17%, none = -0.59%, delta = -1.58%
실제 원인:
1. 전체 60일 구간이 하락장 → 모든 그룹이 음수 (시장 베이스라인 없음)
2. n=361이지만 23개 종목 × 5일 겹침 → 실효 n ≈ 70 (상관 과장)
3. bullish = 반대매매 단정은 단일 구간으로 불가 → 신호 의미 변경 금지

해결 방향: 신호 의미 변경 없이 정직한 분석 레이어 추가
- SPY 시장 베이스라인 행 (all-date forward return)
- 실효 n 경고 (correlated observations)
- 레짐 컨텍스트 (SPY 50SMA, display-only)

## 태스크

- [ ] 1. insight_engine.py: SPY 시장 베이스라인 계산
- [ ] 2. insight_engine.py: 실효 n / 상관 경고
- [ ] 3. insight_engine.py: 레짐 조건부 분석 (display only)
- [ ] 4. InsightBoard.tsx: MVP-1 시장 베이스라인 표시
- [ ] 5. InsightBoard.tsx: 실효 n + 레짐 상세 섹션
- [ ] 6. 검증 및 커밋
