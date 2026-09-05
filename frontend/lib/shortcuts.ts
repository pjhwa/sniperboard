export interface Shortcut {
  keys: string;
  descEn: string;
  descKo: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: '⌘K / Ctrl+K', descEn: 'Command palette', descKo: '커맨드 팔레트' },
  { keys: '?', descEn: 'This shortcuts overlay (empty query)', descKo: '단축키 도움말 (빈 쿼리)' },
  { keys: '?term', descEn: 'Glossary search', descKo: '용어 검색' },
  { keys: 'TSLA', descEn: 'Select symbol', descKo: '심볼 선택' },
  { keys: 'TSLA S2', descEn: 'Symbol + DeepDive / Stage2', descKo: '심볼 + DeepDive / Stage2' },
  { keys: 'TSLA RR', descEn: 'Symbol + Daily Entry Plan', descKo: '심볼 + 일봉 Entry Plan' },
  { keys: 'WATCH', descEn: 'Watchlist board', descKo: '워치리스트' },
  { keys: 'REGIME', descEn: 'Macro board', descKo: '매크로 보드' },
  { keys: 'INSIDER TSLA', descEn: 'DeepDive insider overlay', descKo: 'DeepDive 내부자 오버레이' },
  { keys: 'Esc', descEn: 'Close palette / overlay', descKo: '팔레트·오버레이 닫기' },
];
