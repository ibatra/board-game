import type { BaseState, GameDefinition, PlayerId, ReduceResult } from '../core/types';
import { rollDie, seedRng } from '../core/rng';

export const TRACK_LEN = 52;
export const TOKENS_PER_PLAYER = 4;
/** Absolute track square where each seat enters from its yard. */
export const START_OFFSETS = [0, 13, 26, 39] as const;
/** Star squares where tokens cannot be captured (entries + mid-quadrant stars). */
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export type LudoToken =
  | { zone: 'yard' }
  | { zone: 'track'; index: number }   // absolute 0..51
  | { zone: 'homeRun'; index: number } // 0..4
  | { zone: 'home' };

export interface LudoState extends BaseState {
  tokens: LudoToken[][];
  phase: 'roll' | 'move';
  die: number | null;
  consecutiveSixes: number;
  lastEvent:
    | { kind: 'roll'; player: PlayerId; die: number }
    | { kind: 'move'; player: PlayerId; token: number; captured: Array<{ player: PlayerId; token: number }> }
    | { kind: 'noMoves'; player: PlayerId }
    | { kind: 'tripleSix'; player: PlayerId }
    | null;
}

export type LudoAction =
  | { type: 'roll' }
  | { type: 'moveToken'; token: number }
  | { type: 'pass' };

/** Steps traveled from own start for a track token. */
function relOf(player: PlayerId, abs: number): number {
  return (abs - START_OFFSETS[player]! + TRACK_LEN) % TRACK_LEN;
}

/** Where a token would land with the given die, or null if illegal. */
export function destinationOf(player: PlayerId, token: LudoToken, die: number): LudoToken | null {
  if (token.zone === 'home') return null;
  if (token.zone === 'yard') {
    return die === 6 ? { zone: 'track', index: START_OFFSETS[player]! } : null;
  }
  if (token.zone === 'homeRun') {
    const target = token.index + die;
    if (target < 5) return { zone: 'homeRun', index: target };
    if (target === 5) return { zone: 'home' };
    return null;
  }
  const rel = relOf(player, token.index) + die;
  if (rel <= 50) return { zone: 'track', index: (token.index + die) % TRACK_LEN };
  const h = rel - 51;
  if (h < 5) return { zone: 'homeRun', index: h };
  if (h === 5) return { zone: 'home' };
  return null;
}

export function movableTokens(state: LudoState, player: PlayerId): number[] {
  if (state.die === null) return [];
  const result: number[] = [];
  for (let t = 0; t < TOKENS_PER_PLAYER; t++) {
    if (destinationOf(player, state.tokens[player]![t]!, state.die)) result.push(t);
  }
  return result;
}

function nextPlayer(state: LudoState, from: PlayerId): PlayerId {
  return ((from + 1) % state.numPlayers) as PlayerId;
}

function reduce(state: LudoState, action: LudoAction, actor: PlayerId): ReduceResult<LudoState> {
  if (state.result) return { ok: false, error: 'Game is over' };
  if (actor !== state.currentPlayer) return { ok: false, error: 'Not your turn' };

  if (action.type === 'roll') {
    if (state.phase !== 'roll') return { ok: false, error: 'Already rolled' };
    const [die, rngState] = rollDie(state.rngState);
    const sixes = die === 6 ? state.consecutiveSixes + 1 : 0;
    // Three sixes in a row forfeits the turn.
    if (sixes >= 3) {
      return {
        ok: true,
        state: {
          ...state,
          rngState,
          die: null,
          phase: 'roll',
          consecutiveSixes: 0,
          currentPlayer: nextPlayer(state, actor),
          lastEvent: { kind: 'tripleSix', player: actor },
        },
      };
    }
    return {
      ok: true,
      state: {
        ...state,
        rngState,
        die,
        phase: 'move',
        consecutiveSixes: sixes,
        lastEvent: { kind: 'roll', player: actor, die },
      },
    };
  }

  if (action.type === 'pass') {
    if (state.phase !== 'move') return { ok: false, error: 'Nothing to pass' };
    if (movableTokens(state, actor).length > 0) return { ok: false, error: 'You have a legal move' };
    return {
      ok: true,
      state: {
        ...state,
        die: null,
        phase: 'roll',
        consecutiveSixes: state.die === 6 ? state.consecutiveSixes : 0,
        // A 6 still grants another roll even if the move was impossible.
        currentPlayer: state.die === 6 ? actor : nextPlayer(state, actor),
        lastEvent: { kind: 'noMoves', player: actor },
      },
    };
  }

  if (action.type === 'moveToken') {
    if (state.phase !== 'move' || state.die === null) return { ok: false, error: 'Roll first' };
    const token = state.tokens[actor]?.[action.token];
    if (!token) return { ok: false, error: 'Invalid token' };
    const dest = destinationOf(actor, token, state.die);
    if (!dest) return { ok: false, error: 'That token cannot move' };

    const tokens = state.tokens.map((row) => row.slice());
    tokens[actor]![action.token] = dest;

    // Capture: landing on a non-safe track square sends opponents there home.
    const captured: Array<{ player: PlayerId; token: number }> = [];
    if (dest.zone === 'track' && !SAFE_SQUARES.has(dest.index)) {
      for (let p = 0; p < state.numPlayers; p++) {
        if (p === actor) continue;
        for (let t = 0; t < TOKENS_PER_PLAYER; t++) {
          const other = tokens[p]![t]!;
          if (other.zone === 'track' && other.index === dest.index) {
            tokens[p]![t] = { zone: 'yard' };
            captured.push({ player: p, token: t });
          }
        }
      }
    }

    const won = tokens[actor]!.every((t) => t.zone === 'home');
    const extraTurn = state.die === 6 && !won;

    return {
      ok: true,
      state: {
        ...state,
        tokens,
        die: null,
        phase: 'roll',
        consecutiveSixes: extraTurn ? state.consecutiveSixes : 0,
        currentPlayer: won || extraTurn ? actor : nextPlayer(state, actor),
        result: won ? { kind: 'win', winner: actor } : null,
        lastEvent: { kind: 'move', player: actor, token: action.token, captured },
      },
    };
  }

  return { ok: false, error: 'Unknown action' };
}

export const ludo: GameDefinition<LudoState, LudoAction> = {
  id: 'ludo',
  name: 'Ludo',
  description: 'Race all four tokens home. Sixes set you free.',
  players: { min: 2, max: 4 },
  setup(numPlayers, seed) {
    return {
      rngState: seedRng(seed),
      currentPlayer: 0,
      numPlayers,
      result: null,
      tokens: Array.from({ length: numPlayers }, () =>
        Array.from({ length: TOKENS_PER_PLAYER }, () => ({ zone: 'yard' as const })),
      ),
      phase: 'roll',
      die: null,
      consecutiveSixes: 0,
      lastEvent: null,
    };
  },
  reduce,
  legalActions(state, player) {
    if (state.result || player !== state.currentPlayer) return [];
    if (state.phase === 'roll') return [{ type: 'roll' }];
    const movable = movableTokens(state, player);
    if (movable.length === 0) return [{ type: 'pass' }];
    return movable.map((token) => ({ type: 'moveToken' as const, token }));
  },
  view(state) {
    return state;
  },
};
