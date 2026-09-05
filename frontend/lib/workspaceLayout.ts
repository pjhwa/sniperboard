/**
 * Desktop Trade / Research / Macro workspace persist.
 * Version bump in LAYOUT_VERSION resets stale payloads to Trade.
 */
import type { GoBoard } from './goCommand';

export type Board = GoBoard;

export const LAYOUT_VERSION = 1;

export type WorkspaceId = 'trade' | 'research' | 'macro';

export const WORKSPACE_BOARDS: Record<WorkspaceId, Board> = {
  trade: 'daily',
  research: 'deepdive',
  macro: 'macro',
};

export const DESKTOP_MIN_WIDTH = 768;

export interface WorkspaceState {
  version: number;
  workspace: WorkspaceId;
  board: Board;
  symbol?: string;
}

const DEFAULT: WorkspaceState = {
  version: LAYOUT_VERSION,
  workspace: 'trade',
  board: WORKSPACE_BOARDS.trade,
};

function isWorkspaceId(v: unknown): v is WorkspaceId {
  return v === 'trade' || v === 'research' || v === 'macro';
}

export function serializeWorkspace(state: {
  workspace: WorkspaceId;
  board: Board;
  symbol?: string;
}): string {
  const payload: WorkspaceState = {
    version: LAYOUT_VERSION,
    workspace: state.workspace,
    board: state.board,
    symbol: state.symbol,
  };
  return JSON.stringify(payload);
}

export function restoreWorkspace(raw: string | null | undefined): WorkspaceState {
  if (!raw) return { ...DEFAULT };
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    if (parsed.version !== LAYOUT_VERSION) return { ...DEFAULT };
    if (!isWorkspaceId(parsed.workspace)) return { ...DEFAULT };
    const board = (parsed.board as Board) || WORKSPACE_BOARDS[parsed.workspace];
    return {
      version: LAYOUT_VERSION,
      workspace: parsed.workspace,
      board,
      symbol: typeof parsed.symbol === 'string' ? parsed.symbol : undefined,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function isDesktopWorkspaceEnabled(widthPx: number): boolean {
  return widthPx >= DESKTOP_MIN_WIDTH;
}

export function applyWorkspace(id: WorkspaceId): { workspace: WorkspaceId; board: Board } {
  return { workspace: id, board: WORKSPACE_BOARDS[id] };
}
