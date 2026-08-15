import type { PlayerId } from '../core/types';
import type { TicTacToeAction, TicTacToeState } from './engine';
import { winnerOf } from './engine';

// Full minimax — the state space is tiny, so perfect play is cheap.

function score(cells: (PlayerId | null)[], me: PlayerId, turn: PlayerId, depth: number): number {
  const winner = winnerOf(cells);
  if (winner !== null) return winner === me ? 10 - depth : depth - 10;
  if (cells.every((c) => c !== null)) return 0;

  const scores: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (cells[i] !== null) continue;
    cells[i] = turn;
    scores.push(score(cells, me, (turn + 1) % 2 as PlayerId, depth + 1));
    cells[i] = null;
  }
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}

export function tictactoeAi(state: TicTacToeState, player: PlayerId): TicTacToeAction {
  const cells = state.cells.slice();
  let bestCell = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < 9; i++) {
    if (cells[i] !== null) continue;
    cells[i] = player;
    const s = score(cells, player, (player + 1) % 2 as PlayerId, 1);
    cells[i] = null;
    if (s > bestScore) {
      bestScore = s;
      bestCell = i;
    }
  }
  return { type: 'place', cell: bestCell };
}
