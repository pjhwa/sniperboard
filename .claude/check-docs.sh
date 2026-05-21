#!/usr/bin/env bash
# 코드 파일이 수정되었는데 PROJECT_CONTEXT.md / README.md 가 업데이트되지 않았으면 경고 출력

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

# git이 없거나 변경사항이 없으면 조용히 종료
git rev-parse --git-dir &>/dev/null || exit 0

# 스테이징된(+unstaged) 수정 파일 목록
CHANGED=$(git diff --name-only HEAD 2>/dev/null; git diff --name-only 2>/dev/null)

[ -z "$CHANGED" ] && exit 0

# 코드 파일 변경 감지 (docs 제외)
CODE_CHANGED=$(echo "$CHANGED" | grep -vE '^(PROJECT_CONTEXT\.md|README\.md|docs/|\.claude/)' | grep -E '\.(py|ts|tsx|js|json|css)$')

[ -z "$CODE_CHANGED" ] && exit 0

# 문서 업데이트 여부 확인
DOCS_CHANGED=$(echo "$CHANGED" | grep -E '^(PROJECT_CONTEXT\.md|README\.md)$')

if [ -z "$DOCS_CHANGED" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ⚠  코드 변경 감지 — 문서 업데이트 필요"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  변경된 코드 파일:"
  echo "$CODE_CHANGED" | sed 's/^/    /'
  echo ""
  echo "  PROJECT_CONTEXT.md 와 README.md 를 업데이트해야 합니다."
  echo "  CLAUDE.md 의 '코드 수정 후 필수 규칙' 을 참고하세요."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

exit 0
