import { monopoly } from '../../src/monopoly/engine';
import type { MonopolyAction, MonopolyState } from '../../src/monopoly/types';
import type { PlayerId } from '../../src/core/types';

export function fresh(numPlayers = 2, seed = 1): MonopolyState {
  return monopoly.setup(numPlayers, seed);
}

export function apply(state: MonopolyState, action: MonopolyAction, actor: PlayerId): MonopolyState {
  const r = monopoly.reduce(state, action, actor);
  if (!r.ok) throw new Error(`${JSON.stringify(action)} by P${actor + 1}: ${r.error}`);
  return r.state;
}

export function expectReject(state: MonopolyState, action: MonopolyAction, actor: PlayerId): string {
  const r = monopoly.reduce(state, action, actor);
  if (r.ok) throw new Error(`expected rejection of ${JSON.stringify(action)}`);
  return r.error;
}

/** Force deterministic scenarios without simulating dice. */
export function withPatch(state: MonopolyState, patch: Partial<MonopolyState>): MonopolyState {
  return { ...structuredClone(state), ...patch };
}

export function giveProperty(state: MonopolyState, tile: number, owner: PlayerId, opts: { houses?: 0 | 1 | 2 | 3 | 4 | 5; mortgaged?: boolean } = {}): MonopolyState {
  const next = structuredClone(state);
  next.properties[tile] = { owner, houses: opts.houses ?? 0, mortgaged: opts.mortgaged ?? false };
  return next;
}

export function setCash(state: MonopolyState, player: PlayerId, cash: number): MonopolyState {
  const next = structuredClone(state);
  next.players[player]!.cash = cash;
  return next;
}
