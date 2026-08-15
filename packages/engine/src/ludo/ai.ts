import type { PlayerId } from '../core/types';
import { destinationOf, movableTokens, SAFE_SQUARES, START_OFFSETS, TRACK_LEN, type LudoAction, type LudoState } from './engine';

// Heuristic move picker: capture > flee danger > finish > leave yard > advance.

function relOf(player: PlayerId, abs: number): number {
  return (abs - START_OFFSETS[player]! + TRACK_LEN) % TRACK_LEN;
}

/** True if an opponent token sits within 6 squares behind this track square. */
function inDanger(state: LudoState, player: PlayerId, abs: number): boolean {
  if (SAFE_SQUARES.has(abs)) return false;
  for (let p = 0; p < state.numPlayers; p++) {
    if (p === player) continue;
    for (const token of state.tokens[p]!) {
      if (token.zone !== 'track') continue;
      const gap = (abs - token.index + TRACK_LEN) % TRACK_LEN;
      if (gap >= 1 && gap <= 6) return true;
    }
  }
  return false;
}

export function ludoAi(state: LudoState, player: PlayerId): LudoAction {
  if (state.phase === 'roll') return { type: 'roll' };
  const movable = movableTokens(state, player);
  if (movable.length === 0) return { type: 'pass' };
  const die = state.die!;

  let best = movable[0]!;
  let bestScore = -Infinity;
  for (const t of movable) {
    const token = state.tokens[player]![t]!;
    const dest = destinationOf(player, token, die)!;
    let score = 0;

    if (dest.zone === 'track') {
      // Capture opportunity
      for (let p = 0; p < state.numPlayers; p++) {
        if (p === player) continue;
        if (
          !SAFE_SQUARES.has(dest.index) &&
          state.tokens[p]!.some((o) => o.zone === 'track' && o.index === dest.index)
        ) {
          score += 100;
        }
      }
      if (token.zone === 'track' && inDanger(state, player, token.index)) score += 40;
      if (inDanger(state, player, dest.index)) score -= 30;
      if (SAFE_SQUARES.has(dest.index)) score += 10;
      score += relOf(player, dest.index) * 0.5;
    }
    if (dest.zone === 'home') score += 80;
    if (dest.zone === 'homeRun') score += 30 + dest.index;
    if (token.zone === 'yard') score += 25;

    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return { type: 'moveToken', token: best };
}
