# Phase 2 설계 논의 자료실

이 폴더는 **SniperBoard × market-sentiment-data 연계 강화 프로젝트**의 Phase 2 설계 논의를 위해 정리한 자료입니다.

## 파일 구성

| 파일명 | 용도 | 설명 |
|--------|------|------|
| `phase2-design-context.md` | 사전 컨텍스트 정리 | Phase 2 논의에 필요한 배경, Phase 1 성과, 목표, 현재 상태, 주요 질문을 한데 모은 문서 |
| `phase2-session-starter-prompt.md` | **새 세션 시작용 프롬프트** | 새로운 Grok 세션(또는 다른 LLM)에 바로 붙여넣어서 Phase 2 설계 논의를 시작할 수 있는 고품질 프롬프트 |

## 사용 방법

### 새 세션에서 Phase 2 논의를 시작할 때

1. `phase2-session-starter-prompt.md` 파일 전체 내용을 복사
2. 새로운 Grok (또는 Claude, Cursor 등) 세션에 붙여넣기
3. 그 후 `phase2-design-context.md`도 필요에 따라 함께 제공

### 논의 중 참고할 때

- `phase2-design-context.md`를 중심으로 현재 상태와 열린 질문들을 확인
- 필요 시 원본 문서(`yf-accuracy-harden-executive-summary.md`, `yf-accuracy-harden-complete-plan.md` 등)도 함께 참조

## 참고: 주요 원본 문서 위치

- `/sniperboard/docs/yf-accuracy-harden-executive-summary.md` — 전체 Phase 로드맵
- `/sniperboard/docs/yf-accuracy-harden-complete-plan.md` — Phase 1 완료 보고서 + Phase 2 힌트
- `/sniperboard/docs/claude-code-brief.md` — 다른 Phase 2 후보 기능들
- `/sniperboard/docs/sniperboard-integration-plan.md`

---

**목표**: Phase 2 설계 논의가 효율적이고 맥락 손실 없이 진행될 수 있도록 하는 것.