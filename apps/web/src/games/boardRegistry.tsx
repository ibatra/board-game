import type { ComponentType } from 'react';
import type { GameSession } from '../session/types';
import { TicTacToeBoard } from './tictactoe/TicTacToeBoard';
import { Connect4Board } from './connect4/Connect4Board';
import { SnakesBoard } from './snakes/SnakesBoard';
import { LudoBoard } from './ludo/LudoBoard';
import { MonopolyGame } from './monopoly/MonopolyGame';

/** Maps engine game ids to their board components. */
export const BOARDS: Record<string, ComponentType<{ session: GameSession<any> }>> = {
  tictactoe: TicTacToeBoard,
  connect4: Connect4Board,
  snakes: SnakesBoard,
  ludo: LudoBoard,
  monopoly: MonopolyGame,
};
