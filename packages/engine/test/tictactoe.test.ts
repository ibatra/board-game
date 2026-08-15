import { describe, expect, test } from 'bun:test';
import { tictactoe, type TicTacToeAction } from '../src/tictactoe/engine';
import { tictactoeAi } from '../src/tictactoe/ai';
import { applyAll } from '../src/core/replay';
import type { PlayerId } from '../src/core/types';

const place = (cell: number): TicTacToeAction => ({ type: 'place', cell });

describe('tictactoe', () => {
  test('players alternate and X wins on a row', () => {
    const state = applyAll(tictactoe, 2, 1, [
      [0, place(0)],
      [1, place(3)],
      [0, place(1)],
      [1, place(4)],
      [0, place(2)],
    ]);
    expect(state.result).toEqual({ kind: 'win', winner: 0 });
  });

  test('rejects out-of-turn and occupied cells', () => {
    let state = tictactoe.setup(2, 1);
    expect(tictactoe.reduce(state, place(0), 1).ok).toBe(false);
    const r = tictactoe.reduce(state, place(0), 0);
    if (!r.ok) throw new Error('should be legal');
    state = r.state;
    expect(tictactoe.reduce(state, place(0), 1).ok).toBe(false);
  });

  test('full board with no line is a draw', () => {
    const state = applyAll(tictactoe, 2, 1, [
      [0, place(0)], [1, place(1)], [0, place(2)],
      [1, place(4)], [0, place(3)], [1, place(5)],
      [0, place(7)], [1, place(6)], [0, place(8)],
    ]);
    expect(state.result).toEqual({ kind: 'draw' });
  });

  test('no actions legal after game over', () => {
    const state = applyAll(tictactoe, 2, 1, [
      [0, place(0)], [1, place(3)], [0, place(1)], [1, place(4)], [0, place(2)],
    ]);
    expect(tictactoe.legalActions(state, 0)).toEqual([]);
    expect(tictactoe.legalActions(state, 1)).toEqual([]);
  });

  test('AI blocks an immediate winning threat', () => {
    // X (player 0) threatens 0-1-2; O must play cell 2.
    const state = applyAll(tictactoe, 2, 1, [
      [0, place(0)], [1, place(4)], [0, place(1)],
    ]);
    expect(tictactoeAi(state, 1)).toEqual({ type: 'place', cell: 2 });
  });

  test('AI never loses to itself (always draws)', () => {
    let state = tictactoe.setup(2, 42);
    while (!state.result) {
      const action = tictactoeAi(state, state.currentPlayer);
      const r = tictactoe.reduce(state, action, state.currentPlayer);
      if (!r.ok) throw new Error(r.error);
      state = r.state;
    }
    expect(state.result).toEqual({ kind: 'draw' });
  });

  test('determinism: same seed and actions give identical states', () => {
    const steps: Array<[PlayerId, TicTacToeAction]> = [
      [0, place(4)], [1, place(0)], [0, place(8)],
    ];
    expect(applyAll(tictactoe, 2, 7, steps)).toEqual(applyAll(tictactoe, 2, 7, steps));
  });
});
