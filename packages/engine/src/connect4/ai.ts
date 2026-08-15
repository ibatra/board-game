import type { PlayerId } from '../core/types';
import { COLS, ROWS, winsAt, type Connect4Action, type Connect4State } from './engine';

// Alpha-beta minimax, depth 6, with a center-weighted open-line heuristic.

const ORDER = [3, 2, 4, 1, 5, 0, 6];
const DEPTH = 6;

function drop(cols: PlayerId[][], col: number, player: PlayerId): number {
  cols[col]!.push(player);
  return cols[col]!.length - 1;
}

function undrop(cols: PlayerId[][], col: number): void {
  cols[col]!.pop();
}

function evaluate(cols: PlayerId[][], me: PlayerId): number {
  // Score every 4-window: open windows with 2-3 of one player's discs matter,
  // center column control gets a bonus.
  const cell = (c: number, r: number): PlayerId | null => {
    const v = cols[c]?.[r];
    return v === undefined ? null : v;
  };
  let score = 0;
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ] as const;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      for (const [dc, dr] of dirs) {
        if (c + dc * 3 >= COLS || r + dr * 3 >= ROWS || r + dr * 3 < 0) continue;
        let mine = 0;
        let theirs = 0;
        for (let k = 0; k < 4; k++) {
          const v = cell(c + dc * k, r + dr * k);
          if (v === me) mine++;
          else if (v !== null) theirs++;
        }
        if (mine > 0 && theirs > 0) continue;
        if (mine === 3) score += 60;
        else if (mine === 2) score += 8;
        else if (theirs === 3) score -= 70;
        else if (theirs === 2) score -= 8;
      }
    }
  }
  for (let r = 0; r < ROWS; r++) {
    const v = cell(3, r);
    if (v === me) score += 5;
    else if (v !== null) score -= 5;
  }
  return score;
}

function search(
  cols: PlayerId[][],
  depth: number,
  alpha: number,
  beta: number,
  turn: PlayerId,
  me: PlayerId,
): number {
  const legal = ORDER.filter((c) => cols[c]!.length < ROWS);
  if (legal.length === 0) return 0;
  if (depth === 0) return evaluate(cols, me);

  let best = turn === me ? -Infinity : Infinity;
  for (const col of legal) {
    const row = drop(cols, col, turn);
    let value: number;
    if (winsAt(cols, col, row)) {
      value = turn === me ? 100000 + depth : -100000 - depth;
    } else {
      value = search(cols, depth - 1, alpha, beta, (turn + 1) % 2 as PlayerId, me);
    }
    undrop(cols, col);
    if (turn === me) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, value);
    }
    if (alpha >= beta) break;
  }
  return best;
}

export function connect4Ai(state: Connect4State, player: PlayerId): Connect4Action {
  const cols = state.cols.map((c) => c.slice());
  const legal = ORDER.filter((c) => cols[c]!.length < ROWS);

  let bestCol = legal[0]!;
  let bestScore = -Infinity;
  for (const col of legal) {
    const row = drop(cols, col, player);
    const score = winsAt(cols, col, row)
      ? 100000 + DEPTH
      : search(cols, DEPTH - 1, -Infinity, Infinity, (player + 1) % 2 as PlayerId, player);
    undrop(cols, col);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }
  return { type: 'drop', col: bestCol };
}
