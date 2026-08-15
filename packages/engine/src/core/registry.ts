import type { GameDefinition, GameId } from './types';
import { tictactoe } from '../tictactoe/engine';
import { tictactoeAi } from '../tictactoe/ai';
import { connect4 } from '../connect4/engine';
import { connect4Ai } from '../connect4/ai';
import { snakes } from '../snakes/engine';
import { snakesAi } from '../snakes/ai';
import { ludo } from '../ludo/engine';
import { ludoAi } from '../ludo/ai';
import { monopoly } from '../monopoly/engine';
import { monopolyAi } from '../monopoly/ai';

// AI move pickers are attached here so engine files stay dependency-free.
const games: GameDefinition<any, any>[] = [
  { ...tictactoe, ai: tictactoeAi },
  { ...connect4, ai: connect4Ai },
  { ...snakes, ai: snakesAi },
  { ...ludo, ai: ludoAi },
  { ...monopoly, ai: monopolyAi },
];

export const GAMES: Partial<Record<GameId, GameDefinition<any, any>>> = Object.fromEntries(
  games.map((g) => [g.id, g]),
);

export function getGame(id: string): GameDefinition<any, any> | undefined {
  return GAMES[id as GameId];
}

export const GAME_LIST: GameDefinition<any, any>[] = games;
