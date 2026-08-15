import type { GameId, GameResult } from './types';

/** One seat in a lobby, as broadcast to clients. */
export interface LobbySeat {
  name: string;
  connected: boolean;
  ready: boolean;
  isBot: boolean;
}

export type ClientMsg =
  | { t: 'createRoom'; gameId: GameId; name: string }
  | { t: 'joinRoom'; code: string; name: string }
  | { t: 'rejoin'; code: string; token: string }
  | { t: 'leaveRoom' }
  | { t: 'setReady'; ready: boolean }
  | { t: 'startGame' }
  | { t: 'addBot' }
  | { t: 'removeSeat'; seat: number }
  | { t: 'action'; seq: number; action: { type: string } & Record<string, unknown> }
  | { t: 'requestSync' };

export type ServerErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_STARTED'
  | 'BAD_TOKEN'
  | 'NOT_HOST'
  | 'BAD_MESSAGE';

export type ServerMsg =
  | { t: 'roomJoined'; code: string; token: string; seat: number; gameId: GameId }
  | { t: 'lobby'; code: string; gameId: GameId; hostSeat: number; started: boolean; seats: LobbySeat[] }
  | { t: 'state'; view: unknown; seq: number; yourSeat: number }
  | { t: 'actionRejected'; seq: number; error: string }
  | { t: 'gameOver'; result: GameResult }
  | { t: 'error'; code: ServerErrorCode; msg: string };
