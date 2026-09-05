/**
 * Bloomberg-style GO command parser for the ⌘K palette.
 * Pure: no store/DOM. Dispatch mapping is data the UI applies.
 */
export type GoBoard =
  | 'overview' | 'intraday' | 'daily' | 'watchlist' | 'macro' | 'sentiment'
  | 'deepdive' | 'backtest' | 'track' | 'briefing' | 'marketcap' | 'insight';

export type GoAction =
  | { kind: 'symbol'; symbol: string; board?: undefined; focus?: undefined; query?: undefined }
  | { kind: 'board'; board: GoBoard; symbol?: undefined; focus?: undefined; query?: undefined }
  | { kind: 'symbol-board'; symbol: string; board: GoBoard; focus?: 'insider'; query?: undefined }
  | { kind: 'glossary'; query: string; symbol?: undefined; board?: undefined; focus?: undefined }
  | { kind: 'shortcuts'; symbol?: undefined; board?: undefined; focus?: undefined; query?: undefined }
  | { kind: 'unknown'; raw: string; symbol?: undefined; board?: undefined; focus?: undefined; query?: undefined };

const BOARD_VERBS: Record<string, GoBoard> = {
  WATCH: 'watchlist',
  WATCHLIST: 'watchlist',
  REGIME: 'macro',
  MACRO: 'macro',
  OVERVIEW: 'overview',
  DAILY: 'daily',
  INTRADAY: 'intraday',
  SENTIMENT: 'sentiment',
  DEEPDIVE: 'deepdive',
  TRACK: 'track',
  BACKTEST: 'backtest',
  BRIEFING: 'briefing',
  INSIGHT: 'insight',
};

const SUFFIX_BOARD: Record<string, GoBoard> = {
  S2: 'deepdive',
  STAGE2: 'deepdive',
  RR: 'daily',
  PLAN: 'daily',
};

function isTicker(token: string): boolean {
  return /^[A-Z]{1,6}(?:[.=][A-Z]{1,4})?$/.test(token);
}

export function parseGoCommand(input: string): GoAction {
  const raw = (input ?? '').trim();
  if (!raw) return { kind: 'unknown', raw };

  if (raw.startsWith('?')) {
    const q = raw.slice(1).trim();
    if (!q) return { kind: 'shortcuts' };
    return { kind: 'glossary', query: q.toLowerCase() };
  }

  const tokens = raw.toUpperCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { kind: 'unknown', raw };

  if (tokens[0] === 'INSIDER' && tokens[1] && isTicker(tokens[1])) {
    return { kind: 'symbol-board', symbol: tokens[1], board: 'deepdive', focus: 'insider' };
  }

  if (tokens.length === 1) {
    const t = tokens[0];
    if (BOARD_VERBS[t]) return { kind: 'board', board: BOARD_VERBS[t] };
    if (isTicker(t)) return { kind: 'symbol', symbol: t };
    return { kind: 'unknown', raw };
  }

  if (tokens.length >= 2 && isTicker(tokens[0]) && SUFFIX_BOARD[tokens[1]]) {
    return { kind: 'symbol-board', symbol: tokens[0], board: SUFFIX_BOARD[tokens[1]] };
  }

  if (tokens.length >= 2 && tokens[0] === 'INSIDER' && isTicker(tokens[1])) {
    return { kind: 'symbol-board', symbol: tokens[1], board: 'deepdive', focus: 'insider' };
  }

  return { kind: 'unknown', raw };
}
