import { describe, expect, test } from 'bun:test';
import { monopoly } from '../../src/monopoly/engine';
import { monopolyAi } from '../../src/monopoly/ai';
import type { MonopolyState } from '../../src/monopoly/types';
import type { PlayerId } from '../../src/core/types';

/** Whoever has legal actions must act; mirrors the client/server bot driver. */
function actorsWithMoves(state: MonopolyState): PlayerId[] {
  return state.players
    .map((_, i) => i)
    .filter((i) => monopoly.legalActions(state, i).length > 0);
}

function checkInvariants(state: MonopolyState, step: number): void {
  for (const [i, p] of state.players.entries()) {
    if (p.cash < 0) throw new Error(`step ${step}: P${i + 1} has negative cash ${p.cash}`);
    if (p.pos < 0 || p.pos > 39) throw new Error(`step ${step}: bad position`);
  }
  let houses = 0;
  let hotels = 0;
  for (const prop of Object.values(state.properties)) {
    if (prop.houses === 5) hotels++;
    else houses += prop.houses;
  }
  if (houses + state.housesRemaining !== 32) {
    throw new Error(`step ${step}: house stock leak (${houses} built, ${state.housesRemaining} banked)`);
  }
  if (hotels + state.hotelsRemaining !== 12) {
    throw new Error(`step ${step}: hotel stock leak`);
  }
  // The view must never leak deck order.
  const view = monopoly.view(state, 0);
  if (view.chanceDeck.length !== 0 || view.chestDeck.length !== 0) {
    throw new Error('view leaks deck order');
  }
}

describe('monopoly full-game smoke', () => {
  for (const [numPlayers, seed] of [
    [2, 11],
    [3, 22],
    [4, 33],
    [6, 44],
  ] as const) {
    test(`AI-driven ${numPlayers}-player game (seed ${seed}) stays legal`, () => {
      let state = monopoly.setup(numPlayers, seed);
      let steps = 0;
      const CAP = 20000;
      while (!state.result && steps < CAP) {
        const actors = actorsWithMoves(state);
        expect(actors.length).toBeGreaterThan(0); // the game must never stall
        const actor = actors[0]!;
        const action = monopolyAi(state, actor);
        const r = monopoly.reduce(state, action, actor);
        if (!r.ok) {
          throw new Error(
            `AI illegal action at step ${steps} (phase ${state.phase}, actor P${actor + 1}): ${JSON.stringify(action)} -> ${r.error}`,
          );
        }
        state = r.state;
        steps++;
        if (steps % 50 === 0) checkInvariants(state, steps);
      }
      checkInvariants(state, steps);
      // Games either finish with a winner or hit the cap while still legal.
      if (state.result) {
        expect(state.result.kind).toBe('win');
      }
    });
  }

  test('determinism: same seed and driver produce identical games', () => {
    const run = () => {
      let state = monopoly.setup(3, 555);
      for (let i = 0; i < 2000 && !state.result; i++) {
        const actor = actorsWithMoves(state)[0]!;
        const r = monopoly.reduce(state, monopolyAi(state, actor), actor);
        if (!r.ok) throw new Error(r.error);
        state = r.state;
      }
      return state;
    };
    expect(run()).toEqual(run());
  });
});
