import { create } from 'zustand';
import type { BaseState, GameAction, GameDefinition, PlayerId } from '@bg/engine';
import type { GameSession, SeatConfig } from './types';

const BOT_DELAY_MS = 650;

interface LocalSessionStore extends GameSession {
  def: GameDefinition<any, any> | null;
  start(def: GameDefinition<any, any>, seats: SeatConfig[]): void;
  restart(): void;
}

let botTimer: ReturnType<typeof setTimeout> | null = null;

export const useLocalSession = create<LocalSessionStore>((set, get) => {
  function scheduleBot() {
    if (botTimer) clearTimeout(botTimer);
    const { def, state, seats } = get();
    if (!def || !state || state.result) return;
    const seat = seats[state.currentPlayer];
    if (!seat?.isBot || !def.ai) return;
    botTimer = setTimeout(() => {
      const { def, state, seats } = get();
      if (!def?.ai || !state || state.result) return;
      // The bot to act may have changed if the user restarted mid-delay.
      const current = state.currentPlayer;
      if (!seats[current]?.isBot) return;
      applyAction(def.ai(state, current), current);
    }, BOT_DELAY_MS);
  }

  function applyAction(action: GameAction, actor: PlayerId) {
    const { def, state } = get();
    if (!def || !state) return;
    const result = def.reduce(state, action, actor);
    if (!result.ok) {
      set({ lastError: result.error });
      return;
    }
    set({ state: result.state, lastError: null });
    scheduleBot();
  }

  return {
    def: null,
    state: null as unknown as BaseState,
    seats: [],
    myPlayerId: null,
    lastError: null,
    start(def, seats) {
      if (botTimer) clearTimeout(botTimer);
      const seed = (Math.random() * 0xffffffff) >>> 0;
      set({ def, seats, state: def.setup(seats.length, seed), lastError: null });
      scheduleBot();
    },
    restart() {
      const { def, seats } = get();
      if (def) get().start(def, seats);
    },
    dispatch(action, actor) {
      const { state } = get();
      if (!state) return;
      applyAction(action, actor ?? state.currentPlayer);
    },
  };
});
