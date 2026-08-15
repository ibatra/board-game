import type { BaseState, PlayerId } from '@bg/engine';

/** Loose action shape so boards can dispatch their game's actions directly. */
export type AnyAction = { type: string } & Record<string, unknown>;

export interface SeatConfig {
  name: string;
  isBot: boolean;
}

/**
 * The contract board components program against, identical for local
 * pass-and-play and online play. `myPlayerId` is null in pass-and-play
 * (the device acts for whoever's turn it is) and fixed online.
 */
export interface GameSession<S extends BaseState = BaseState> {
  state: S;
  seats: SeatConfig[];
  myPlayerId: PlayerId | null;
  lastError: string | null;
  dispatch(action: AnyAction, actor?: PlayerId): void;
}

/** True if this device may act for the given player right now. */
export function canActFor(session: GameSession, player: PlayerId): boolean {
  if (session.seats[player]?.isBot) return false;
  return session.myPlayerId === null || session.myPlayerId === player;
}
