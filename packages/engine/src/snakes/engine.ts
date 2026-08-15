import type { BaseState, GameDefinition, PlayerId, ReduceResult } from '../core/types';
import { rollDie, seedRng } from '../core/rng';
import { jumpFrom } from './board';

export interface SnakesState extends BaseState {
  /** 0 = off-board start; 100 = home. */
  positions: number[];
  lastRoll: { player: PlayerId; die: number; from: number; to: number; jumped: number | null } | null;
}

export type SnakesAction = { type: 'roll' };

function reduce(state: SnakesState, action: SnakesAction, actor: PlayerId): ReduceResult<SnakesState> {
  if (state.result) return { ok: false, error: 'Game is over' };
  if (actor !== state.currentPlayer) return { ok: false, error: 'Not your turn' };
  if (action.type !== 'roll') return { ok: false, error: 'Unknown action' };

  const [die, rngState] = rollDie(state.rngState);
  const from = state.positions[actor]!;
  // Must land exactly on 100; overshoot stays put (and does not re-trigger
  // a snake/ladder on the square it already occupies).
  const target = from + die;
  const overshot = target > 100;
  const landed = overshot ? from : target;
  const to = overshot ? from : jumpFrom(landed);

  const positions = state.positions.slice();
  positions[actor] = to;
  const won = to === 100;
  // Rolling a 6 grants another turn (classic house-standard rule).
  const extraTurn = die === 6 && !won;

  return {
    ok: true,
    state: {
      ...state,
      rngState,
      positions,
      lastRoll: { player: actor, die, from, to, jumped: to !== landed ? landed : null },
      currentPlayer: won || extraTurn ? actor : ((actor + 1) % state.numPlayers as PlayerId),
      result: won ? { kind: 'win', winner: actor } : null,
    },
  };
}

export const snakes: GameDefinition<SnakesState, SnakesAction> = {
  id: 'snakes',
  name: 'Snakes & Ladders',
  description: 'Climb ladders, dodge snakes, race to 100.',
  players: { min: 2, max: 6 },
  setup(numPlayers, seed) {
    return {
      rngState: seedRng(seed),
      currentPlayer: 0,
      numPlayers,
      result: null,
      positions: Array(numPlayers).fill(0),
      lastRoll: null,
    };
  },
  reduce,
  legalActions(state, player) {
    if (state.result || player !== state.currentPlayer) return [];
    return [{ type: 'roll' }];
  },
  view(state) {
    return state;
  },
};
