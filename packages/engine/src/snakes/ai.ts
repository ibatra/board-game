import type { PlayerId } from '../core/types';
import type { SnakesAction, SnakesState } from './engine';

// No decisions in this game — the bot simply rolls.
export function snakesAi(_state: SnakesState, _player: PlayerId): SnakesAction {
  return { type: 'roll' };
}
