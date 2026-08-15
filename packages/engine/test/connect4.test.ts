import { describe, expect, test } from 'bun:test';
import { connect4, ROWS, type Connect4Action } from '../src/connect4/engine';
import { connect4Ai } from '../src/connect4/ai';
import { applyAll } from '../src/core/replay';

const drop = (col: number): Connect4Action => ({ type: 'drop', col });

describe('connect4', () => {
  test('vertical four wins', () => {
    const state = applyAll(connect4, 2, 1, [
      [0, drop(0)], [1, drop(1)],
      [0, drop(0)], [1, drop(1)],
      [0, drop(0)], [1, drop(1)],
      [0, drop(0)],
    ]);
    expect(state.result).toEqual({ kind: 'win', winner: 0 });
  });

  test('horizontal four wins', () => {
    const state = applyAll(connect4, 2, 1, [
      [0, drop(0)], [1, drop(0)],
      [0, drop(1)], [1, drop(1)],
      [0, drop(2)], [1, drop(2)],
      [0, drop(3)],
    ]);
    expect(state.result).toEqual({ kind: 'win', winner: 0 });
  });

  test('diagonal four wins', () => {
    const state = applyAll(connect4, 2, 1, [
      [0, drop(0)], [1, drop(1)],
      [0, drop(1)], [1, drop(2)],
      [0, drop(2)], [1, drop(3)],
      [0, drop(2)], [1, drop(3)],
      [0, drop(3)], [1, drop(6)],
      [0, drop(3)],
    ]);
    expect(state.result).toEqual({ kind: 'win', winner: 0 });
  });

  test('rejects drops into a full column', () => {
    let state = connect4.setup(2, 1);
    for (let i = 0; i < ROWS; i++) {
      const r = connect4.reduce(state, drop(3), state.currentPlayer);
      if (!r.ok) throw new Error(r.error);
      state = r.state;
    }
    expect(connect4.reduce(state, drop(3), state.currentPlayer).ok).toBe(false);
  });

  test('AI takes an immediate win', () => {
    const state = applyAll(connect4, 2, 1, [
      [0, drop(0)], [1, drop(6)],
      [0, drop(0)], [1, drop(6)],
      [0, drop(0)], [1, drop(5)],
    ]);
    expect(connect4Ai(state, 0)).toEqual({ type: 'drop', col: 0 });
  });

  test('AI blocks an immediate loss', () => {
    const state = applyAll(connect4, 2, 1, [
      [0, drop(0)], [1, drop(6)],
      [0, drop(0)], [1, drop(6)],
      [0, drop(0)],
    ]);
    expect(connect4Ai(state, 1)).toEqual({ type: 'drop', col: 0 });
  });
});
