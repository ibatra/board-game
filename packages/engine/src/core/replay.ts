import type { BaseState, GameAction, GameDefinition, PlayerId } from './types';

/**
 * Test helper: apply a scripted list of [actor, action] pairs from setup.
 * Throws on the first rejected action so tests fail loudly.
 */
export function applyAll<S extends BaseState, A extends GameAction>(
  def: GameDefinition<S, A>,
  numPlayers: number,
  seed: number,
  steps: Array<[PlayerId, A]>,
): S {
  let state = def.setup(numPlayers, seed);
  for (const [actor, action] of steps) {
    const result = def.reduce(state, action, actor);
    if (!result.ok) {
      throw new Error(`Rejected action ${JSON.stringify(action)} by player ${actor}: ${result.error}`);
    }
    state = result.state;
  }
  return state;
}
