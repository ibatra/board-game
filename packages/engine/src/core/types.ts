export type PlayerId = number;

export type GameId = 'tictactoe' | 'connect4' | 'snakes' | 'ludo' | 'monopoly';

export type GameResult =
  | { kind: 'win'; winner: PlayerId; ranking?: PlayerId[] }
  | { kind: 'draw' };

export interface BaseState {
  rngState: number;
  currentPlayer: PlayerId;
  numPlayers: number;
  result: GameResult | null;
}

export interface GameAction {
  type: string;
}

export type ReduceResult<S> = { ok: true; state: S } | { ok: false; error: string };

export interface GameDefinition<S extends BaseState = BaseState, A extends GameAction = GameAction> {
  id: GameId;
  name: string;
  description: string;
  players: { min: number; max: number };
  setup(numPlayers: number, seed: number): S;
  reduce(state: S, action: A, actor: PlayerId): ReduceResult<S>;
  legalActions(state: S, player: PlayerId): A[];
  view(state: S, player: PlayerId | 'spectator'): S;
  ai?(state: S, player: PlayerId): A;
}
