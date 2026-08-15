import type { BaseState, GameDefinition, PlayerId, ReduceResult } from '../core/types';
import { seedRng } from '../core/rng';

export interface TicTacToeState extends BaseState {
  cells: (PlayerId | null)[];
}

export type TicTacToeAction = { type: 'place'; cell: number };

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
] as const;

export function winnerOf(cells: (PlayerId | null)[]): PlayerId | null {
  for (const [a, b, c] of LINES) {
    const v = cells[a];
    if (v !== null && v !== undefined && v === cells[b] && v === cells[c]) return v;
  }
  return null;
}

function reduce(state: TicTacToeState, action: TicTacToeAction, actor: PlayerId): ReduceResult<TicTacToeState> {
  if (state.result) return { ok: false, error: 'Game is over' };
  if (actor !== state.currentPlayer) return { ok: false, error: 'Not your turn' };
  if (action.type !== 'place') return { ok: false, error: 'Unknown action' };
  if (action.cell < 0 || action.cell > 8 || !Number.isInteger(action.cell)) {
    return { ok: false, error: 'Invalid cell' };
  }
  if (state.cells[action.cell] !== null) return { ok: false, error: 'Cell already taken' };

  const cells = state.cells.slice();
  cells[action.cell] = actor;
  const winner = winnerOf(cells);
  const full = cells.every((c) => c !== null);
  return {
    ok: true,
    state: {
      ...state,
      cells,
      currentPlayer: winner || full ? state.currentPlayer : ((actor + 1) % 2 as PlayerId),
      result: winner !== null ? { kind: 'win', winner } : full ? { kind: 'draw' } : null,
    },
  };
}

export const tictactoe: GameDefinition<TicTacToeState, TicTacToeAction> = {
  id: 'tictactoe',
  name: 'Tic-Tac-Toe',
  description: 'Three in a row wins. Quick and classic.',
  players: { min: 2, max: 2 },
  setup(numPlayers, seed) {
    return {
      rngState: seedRng(seed),
      currentPlayer: 0,
      numPlayers,
      result: null,
      cells: Array(9).fill(null),
    };
  },
  reduce,
  legalActions(state, player) {
    if (state.result || player !== state.currentPlayer) return [];
    return state.cells
      .map((c, i) => (c === null ? i : -1))
      .filter((i) => i >= 0)
      .map((cell) => ({ type: 'place' as const, cell }));
  },
  view(state) {
    return state;
  },
};
