> English docs: [CLAUDE.md](./CLAUDE.md)

# SniperBoard — Claude Instructions

## 필수 선행 작업

새 세션 시작 시 반드시 다음 두 파일을 먼저 읽어라:
1. `PROJECT_CONTEXT.md` — 전체 구조·로직·API·파일 위치
2. `README.md` — 사용자 대면 기능 설명

이 두 파일로 전체 코드를 읽지 않아도 프로젝트를 즉시 파악할 수 있다.

---

## 코드 수정 후 필수 규칙

**코드 파일을 수정한 세션이 끝나기 전, 반드시 아래를 수행하라:**

1. `PROJECT_CONTEXT.md` 업데이트
   - 수정된 로직·API·파일 구조·상수·데이터 흐름을 반영
   - "AUTO-GENERATED" 날짜를 오늘 날짜로 갱신

2. `README.md` 업데이트
   - 사용자에게 보이는 기능 변경사항 반영
   - API 엔드포인트·신호 조건·화면 구성이 바뀌었으면 해당 섹션 수정

3. 두 파일 모두 수정했으면 git commit에 포함시켜라

**예외**: 스타일·주석·테스트만 수정한 경우는 생략 가능.

---

## 프로젝트 핵심 파악

- **백엔드**: `backend/core/signal_engine.py` — 신호 계산의 모든 것
- **프론트엔드 타입**: `frontend/app/types.ts` — 메타데이터 상수 집중 (BiLang: REGIME_META, DD_META, SIGNAL_META, STAGE2_META, SENTIMENT_META, TREND_META, VOLUME_META, MACRO_SYMBOL_NAMES, CONVICTION_LABEL_META)
- **i18n**: `frontend/app/i18n.ts` — `Locale`, `BiLang`, `t()`, `tField()`. 컴포넌트별 `const S: Record<string, BiLang>`로 정적 문자열 관리. `tField(en, ko, fallback, locale)`로 AI 데이터 렌더링.
- **API 라우터**: `backend/api/endpoints.py` — 엔드포인트 7개+. `MACRO_SYMBOLS`는 영어 이름 사용.
- **전역 상태**: `frontend/hooks/useStore.ts` — Zustand (symbol, board, theme, locale: 'en'|'ko' 기본 'ko')

자세한 내용은 `PROJECT_CONTEXT.md` 섹션 10 "코드 수정 시 참고 지점" 참조.
