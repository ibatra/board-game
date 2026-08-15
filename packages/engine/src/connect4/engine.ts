import type { BaseState, GameDefinition, PlayerId, ReduceResult } from '../core/types';
import { seedRng } from '../core/rng';

export const COLS = 7;
export const ROWS = 6;

export interface Connect4State extends BaseState {
  /** cols[c] is bottom-up: cols[c][0] is the lowest disc in column c. */
  cols: PlayerId[][];
  lastMove: { col: number; row: number } | null;
}

export type Connect4Action = { type: 'drop'; col: number };

function cellAt(cols: PlayerId[][], c: number, r: number): PlayerId | null {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  const v = cols[c]?.[r];
  return v === undefined ? null : v;
}

export function winsAt(cols: PlayerId[][], col: number, row: number): boolean {
  const player = cellAt(cols, col, row);
  if (player === null) return false;
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ] as const;
  for (const [dc, dr] of dirs) {
    let count = 1;
    for (const sign of [1, -1]) {
      let c = col + dc * sign;
      let r = row + dr * sign;
      while (cellAt(cols, c, r) === player) {
        count++;
        c += dc * sign;
        r += dr * sign;
      }
    }
    if (count >= 4) return true;
  }
  return false;
}

function reduce(state: Connect4State, action: Connect4Action, actor: PlayerId): ReduceResult<Connect4State> {
  if (state.result) return { ok: false, error: 'Game is over' };
  if (actor !== state.currentPlayer) return { ok: false, error: 'Not your turn' };
  if (action.type !== 'drop') return { ok: false, error: 'Unknown action' };
  const col = action.col;
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return { ok: false, error: 'Invalid column' };
  const column = state.cols[col]!;
  if (column.length >= ROWS) return { ok: false, error: 'Column is full' };

  const cols = state.cols.map((c, i) => (i === col ? [...c, actor] : c));
  const row = column.length;
  const won = winsAt(cols, col, row);
  const full = cols.every((c) => c.length >= ROWS);
  return {
    ok: true,
    state: {
      ...state,
      cols,
      lastMove: { col, row },
      currentPlayer: won || full ? state.currentPlayer : ((actor + 1) % 2 as PlayerId),
      result: won ? { kind: 'win', winner: actor } : full ? { kind: 'draw' } : null,
    },
  };
}

export const connect4: GameDefinition<Connect4State, Connect4Action> = {
  id: 'connect4',
  name: 'Connect Four',
  description: 'Drop discs, connect four in a row.',
  players: { min: 2, max: 2 },
  setup(numPlayers, seed) {
    return {
      rngState: seedRng(seed),
      currentPlayer: 0,
      numPlayers,
      result: null,
      cols: Array.from({ length: COLS }, () => []),
      lastMove: null,
    };
  },
  reduce,
  legalActions(state, player) {
    if (state.result || player !== state.currentPlayer) return [];
    return state.cols
      .map((c, i) => (c.length < ROWS ? i : -1))
      .filter((i) => i >= 0)
      .map((col) => ({ type: 'drop' as const, col }));
  },
  view(state) {
    return state;
  },
};
