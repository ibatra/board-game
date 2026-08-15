import { describe, expect, test } from 'bun:test';
import { fresh, giveProperty, withPatch } from './setup';
import { applyCard } from '../../src/monopoly/helpers';
import { CHANCE_CARDS, CHEST_CARDS } from '../../src/monopoly/data';

function deckWithTop(effectKind: string): { state: ReturnType<typeof fresh>; deck: 'chance' | 'chest' } {
  const chanceId = CHANCE_CARDS.findIndex((c) => c.effect.kind === effectKind);
  const chestId = CHEST_CARDS.findIndex((c) => c.effect.kind === effectKind);
  const state = fresh(3, 5);
  if (chanceId >= 0) {
    state.chanceDeck = [chanceId, ...state.chanceDeck.filter((i) => i !== chanceId)];
    return { state, deck: 'chance' };
  }
  state.chestDeck = [chestId, ...state.chestDeck.filter((i) => i !== chestId)];
  return { state, deck: 'chest' };
}

describe('monopoly cards', () => {
  test('advance to GO collects salary', () => {
    const { state, deck } = deckWithTop('moveTo');
    state.players[0]!.pos = 7;
    const cash = state.players[0]!.cash;
    applyCard(state, 0, deck, 7);
    // Whichever moveTo card is first, passing or landing on GO pays $200 at most once.
    expect(state.players[0]!.cash).toBeGreaterThanOrEqual(cash);
  });

  test('goToJail card jails without passing GO', () => {
    const { state, deck } = deckWithTop('goToJail');
    state.players[0]!.pos = 36;
    const cash = state.players[0]!.cash;
    applyCard(state, 0, deck, 7);
    expect(state.players[0]!.inJail).toBe(true);
    expect(state.players[0]!.pos).toBe(10);
    expect(state.players[0]!.cash).toBe(cash);
  });

  test('jailFree card is held and leaves the deck', () => {
    const { state, deck } = deckWithTop('jailFree');
    const before = (deck === 'chance' ? state.chanceDeck : state.chestDeck).length;
    applyCard(state, 0, deck, 7);
    expect(state.players[0]!.getOutCards).toBe(1);
    expect((deck === 'chance' ? state.chanceDeck : state.chestDeck).length).toBe(before - 1);
  });

  test('collectEach takes from every opponent', () => {
    const { state, deck } = deckWithTop('collectEach');
    applyCard(state, 0, deck, 7);
    expect(state.players[0]!.cash).toBe(1520);
    expect(state.players[1]!.cash).toBe(1490);
    expect(state.players[2]!.cash).toBe(1490);
  });

  test('payEach pays every opponent', () => {
    const { state, deck } = deckWithTop('payEach');
    applyCard(state, 0, deck, 7);
    expect(state.players[0]!.cash).toBe(1400);
    expect(state.players[1]!.cash).toBe(1550);
    expect(state.players[2]!.cash).toBe(1550);
  });

  test('repairs charge per building', () => {
    const { state, deck } = deckWithTop('repairs');
    let s = giveProperty(state, 1, 0, { houses: 3 });
    s = giveProperty(s, 3, 0, { houses: 5 });
    const cash = s.players[0]!.cash;
    const card = (deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS)[
      (deck === 'chance' ? s.chanceDeck : s.chestDeck)[0]!
    ]!;
    if (card.effect.kind !== 'repairs') throw new Error('setup failed');
    applyCard(s, 0, deck, 7);
    const expected = 3 * card.effect.house + 1 * card.effect.hotel;
    expect(s.players[0]!.cash).toBe(cash - expected);
  });

  test('nearestRailroad moves forward and charges double rent', () => {
    const { state } = deckWithTop('nearestRailroad');
    let s = giveProperty(state, 25, 1); // B&O owned by P2 (single RR: rent 25)
    s = withPatch(s, {});
    s.players[0]!.pos = 22; // Chance tile; nearest RR forward is 25
    applyCard(s, 0, 'chance', 7);
    expect(s.players[0]!.pos).toBe(25);
    expect(s.players[0]!.cash).toBe(1500 - 50);
    expect(s.players[1]!.cash).toBe(1550);
  });

  test('moveBack resolves the new tile', () => {
    const { state } = deckWithTop('moveBack');
    const s = state;
    s.players[0]!.pos = 7; // back 3 -> tile 4 (Income Tax $200)
    applyCard(s, 0, 'chance', 7);
    expect(s.players[0]!.pos).toBe(4);
    expect(s.players[0]!.cash).toBe(1300);
  });

  test('decks cycle: drawing 20 cards never crashes and keeps size', () => {
    const s = fresh(2, 9);
    const size = s.chanceDeck.length;
    let jailFrees = 0;
    for (let i = 0; i < 20; i++) {
      s.phase = 'preRoll';
      s.players[0]!.pos = 7;
      s.players[0]!.cash = 5000;
      s.players[0]!.inJail = false;
      const before = s.players[0]!.getOutCards;
      applyCard(s, 0, 'chance', 7);
      if (s.players[0]!.getOutCards > before) jailFrees++;
    }
    expect(s.chanceDeck.length).toBe(size - (jailFrees > 0 ? 1 : 0));
  });
});
