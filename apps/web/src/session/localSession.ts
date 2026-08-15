import { create } from 'zustand';
import type { BaseState, GameDefinition, PlayerId } from '@bg/engine';
import type { AnyAction, GameSession, SeatConfig } from './types';

const BOT_DELAY_MS = 650;

interface LocalSessionStore extends GameSession {
  def: GameDefinition<any, any> | null;
  start(def: GameDefinition<any, any>, seats: SeatConfig[]): void;
  restart(): void;
}

let botTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;

/** A bot must act whenever it has legal actions — its turn, an auction bid,
 *  a trade response — regardless of whose turn the state nominally is. */
function botToAct(def: GameDefinition<any, any>, state: BaseState, seats: SeatConfig[]): PlayerId | null {
  if (!def.ai || state.result) return null;
  for (let seat = 0; seat < seats.length; seat++) {
    if (!seats[seat]?.isBot) continue;
    if (def.legalActions(state, seat).length > 0) return seat;
  }
  return null;
}

export const useLocalSession = create<LocalSessionStore>((set, get) => {
  function scheduleBot() {
    if (botTimer) clearTimeout(botTimer);
    const { def, state, seats } = get();
    if (!def || !state) return;
    const seat = botToAct(def, state, seats);
    if (seat === null) return;
    const gen = generation;
    botTimer = setTimeout(() => {
      const { def, state, seats } = get();
      if (gen !== generation || !def?.ai || !state) return;
      const seat = botToAct(def, state, seats);
      if (seat === null) return;
      applyAction(def.ai(state, seat), seat);
    }, BOT_DELAY_MS);
  }

  function applyAction(action: AnyAction, actor: PlayerId) {
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
      generation++;
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
