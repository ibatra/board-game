import { describe, expect, test } from 'bun:test';
import { snakes, type SnakesState } from '../src/snakes/engine';
import { jumpFrom, LADDERS, SNAKES } from '../src/snakes/board';

function play(state: SnakesState): SnakesState {
  const r = snakes.reduce(state, { type: 'roll' }, state.currentPlayer);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

describe('snakes & ladders', () => {
  test('board jumps map snakes down and ladders up', () => {
    for (const [from, to] of Object.entries(SNAKES)) {
      expect(to).toBeLessThan(Number(from));
      expect(jumpFrom(Number(from))).toBe(to);
    }
    for (const [from, to] of Object.entries(LADDERS)) {
      expect(to).toBeGreaterThan(Number(from));
    }
    expect(jumpFrom(50)).toBe(50);
  });

  test('rolls advance the mover and record the die', () => {
    let state = snakes.setup(2, 123);
    state = play(state);
    const roll = state.lastRoll!;
    expect(roll.die).toBeGreaterThanOrEqual(1);
    expect(roll.die).toBeLessThanOrEqual(6);
    expect(roll.to).toBe(jumpFrom(roll.die > 6 ? 0 : roll.die));
  });

  test('six grants an extra turn, otherwise turn passes', () => {
    let state = snakes.setup(2, 1);
    const before = state.currentPlayer;
    state = play(state);
    if (state.lastRoll!.die === 6) expect(state.currentPlayer).toBe(before);
    else expect(state.currentPlayer).toBe((before + 1) % 2);
  });

  test('overshooting 100 stays put; exact landing wins', () => {
    let state = snakes.setup(2, 5);
    // Force a near-win position.
    state = { ...state, positions: [98, 0] };
    let guard = 0;
    while (!state.result && guard++ < 500) {
      state = play(state);
      const roll = state.lastRoll!;
      if (roll.player === 0) {
        // From 98 only a 2 can move (to 100); everything else must stay.
        expect([98, 100]).toContain(state.positions[0]!);
      }
    }
    expect(state.result).toEqual({ kind: 'win', winner: 0 });
  });

  test('a full random game between 4 players terminates', () => {
    let state = snakes.setup(4, 999);
    let guard = 0;
    while (!state.result && guard++ < 5000) state = play(state);
    expect(state.result).not.toBeNull();
  });

  test('determinism: same seed gives the same rolls', () => {
    let a = snakes.setup(3, 77);
    let b = snakes.setup(3, 77);
    for (let i = 0; i < 30 && !a.result; i++) {
      a = play(a);
      b = play(b);
    }
    expect(a).toEqual(b);
  });
});
