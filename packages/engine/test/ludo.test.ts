import { describe, expect, test } from 'bun:test';
import {
  destinationOf,
  ludo,
  movableTokens,
  START_OFFSETS,
  type LudoState,
  type LudoToken,
} from '../src/ludo/engine';
import { ludoAi } from '../src/ludo/ai';

function withDie(state: LudoState, die: number): LudoState {
  return { ...state, die, phase: 'move' };
}

function token(state: LudoState, p: number, t: number, tok: LudoToken): LudoState {
  const tokens = state.tokens.map((r) => r.slice());
  tokens[p]![t] = tok;
  return { ...state, tokens };
}

describe('ludo movement', () => {
  test('yard tokens only leave on a six, entering at the start offset', () => {
    expect(destinationOf(0, { zone: 'yard' }, 5)).toBeNull();
    expect(destinationOf(0, { zone: 'yard' }, 6)).toEqual({ zone: 'track', index: 0 });
    expect(destinationOf(2, { zone: 'yard' }, 6)).toEqual({ zone: 'track', index: 26 });
  });

  test('track wraps and feeds into the home run at 51 steps', () => {
    // Player 1 starts at 13; 50 steps out is square 11.
    expect(destinationOf(1, { zone: 'track', index: 11 }, 1)).toEqual({ zone: 'homeRun', index: 0 });
    expect(destinationOf(1, { zone: 'track', index: 11 }, 6)).toEqual({ zone: 'home' });
    // Wrap-around move for player 1 crossing square 51 -> 0.
    expect(destinationOf(1, { zone: 'track', index: 50 }, 4)).toEqual({ zone: 'track', index: 2 });
  });

  test('home run requires exact roll', () => {
    expect(destinationOf(0, { zone: 'homeRun', index: 3 }, 2)).toEqual({ zone: 'home' });
    expect(destinationOf(0, { zone: 'homeRun', index: 3 }, 3)).toBeNull();
    expect(destinationOf(0, { zone: 'homeRun', index: 1 }, 2)).toEqual({ zone: 'homeRun', index: 3 });
  });
});

describe('ludo rules', () => {
  test('landing on an opponent captures it (non-safe square)', () => {
    let state = ludo.setup(2, 1);
    state = token(state, 0, 0, { zone: 'track', index: 2 });
    state = token(state, 1, 0, { zone: 'track', index: 5 });
    state = withDie(state, 3);
    const r = ludo.reduce(state, { type: 'moveToken', token: 0 }, 0);
    if (!r.ok) throw new Error(r.error);
    expect(r.state.tokens[0]![0]).toEqual({ zone: 'track', index: 5 });
    expect(r.state.tokens[1]![0]).toEqual({ zone: 'yard' });
    expect(r.state.lastEvent).toMatchObject({ kind: 'move', captured: [{ player: 1, token: 0 }] });
  });

  test('safe squares protect from capture', () => {
    let state = ludo.setup(2, 1);
    state = token(state, 0, 0, { zone: 'track', index: 5 });
    state = token(state, 1, 0, { zone: 'track', index: 8 }); // 8 is a star square
    state = withDie(state, 3);
    const r = ludo.reduce(state, { type: 'moveToken', token: 0 }, 0);
    if (!r.ok) throw new Error(r.error);
    expect(r.state.tokens[1]![0]).toEqual({ zone: 'track', index: 8 });
  });

  test('no legal moves forces pass; six still re-rolls after pass', () => {
    let state = ludo.setup(2, 1);
    // All tokens in yard and die is not 6 -> nothing movable.
    state = withDie(state, 3);
    expect(movableTokens(state, 0)).toEqual([]);
    expect(ludo.legalActions(state, 0)).toEqual([{ type: 'pass' }]);
    const r = ludo.reduce(state, { type: 'pass' }, 0);
    if (!r.ok) throw new Error(r.error);
    expect(r.state.currentPlayer).toBe(1);
  });

  test('moving all four tokens home wins', () => {
    let state = ludo.setup(2, 1);
    for (let t = 0; t < 3; t++) state = token(state, 0, t, { zone: 'home' });
    state = token(state, 0, 3, { zone: 'homeRun', index: 3 });
    state = withDie(state, 2);
    const r = ludo.reduce(state, { type: 'moveToken', token: 3 }, 0);
    if (!r.ok) throw new Error(r.error);
    expect(r.state.result).toEqual({ kind: 'win', winner: 0 });
  });

  test('three consecutive sixes forfeit the turn', () => {
    let state = ludo.setup(2, 1);
    state = { ...state, consecutiveSixes: 2 };
    // Find an rngState whose next roll is a six so the forfeit path triggers.
    for (let seed = 0; seed < 3000; seed++) {
      const probe = { ...state, rngState: seed >>> 0 };
      const r = ludo.reduce(probe, { type: 'roll' }, 0);
      if (!r.ok) throw new Error(r.error);
      if (r.state.lastEvent?.kind === 'tripleSix') {
        expect(r.state.currentPlayer).toBe(1);
        expect(r.state.die).toBeNull();
        return;
      }
    }
    throw new Error('no seed produced a third six');
  });

  test('random AI-driven game terminates and stays legal', () => {
    let state = ludo.setup(4, 2024);
    let guard = 0;
    while (!state.result && guard++ < 20000) {
      const action = ludoAi(state, state.currentPlayer);
      const r = ludo.reduce(state, action, state.currentPlayer);
      if (!r.ok) throw new Error(`AI produced illegal action: ${r.error}`);
      state = r.state;
    }
    expect(state.result).not.toBeNull();
  });

  test('start offsets are the four quadrant entries', () => {
    expect(START_OFFSETS).toEqual([0, 13, 26, 39]);
  });
});
