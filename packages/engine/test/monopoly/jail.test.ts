import { describe, expect, test } from 'bun:test';
import { apply, expectReject, fresh, setCash, withPatch } from './setup';
import type { MonopolyState } from '../../src/monopoly/types';
import { monopoly } from '../../src/monopoly/engine';

function jailed(): MonopolyState {
  let s = fresh(2, 5);
  s = withPatch(s, {});
  s.players[0]!.inJail = true;
  s.players[0]!.pos = 10;
  return s;
}

/** Find an rngState whose next two dice match the predicate. */
function findSeed(pred: (d1: number, d2: number) => boolean): number {
  for (let seed = 1; seed < 50000; seed++) {
    const probe = monopoly.setup(2, seed);
    const r = monopoly.reduce(probe, { type: 'roll' }, 0);
    if (r.ok && r.state.dice && pred(r.state.dice[0], r.state.dice[1])) return seed;
  }
  throw new Error('no seed found');
}

describe('monopoly jail', () => {
  test('paying bail frees you before rolling', () => {
    let s = jailed();
    s = apply(s, { type: 'payBail' }, 0);
    expect(s.players[0]!.inJail).toBe(false);
    expect(s.players[0]!.cash).toBe(1450);
    expect(s.phase).toBe('preRoll'); // still gets to roll
  });

  test('jail card frees you and returns to a deck', () => {
    let s = jailed();
    s.players[0]!.getOutCards = 1;
    // Mimic a real draw: the held card is out of its deck.
    s.chanceDeck = s.chanceDeck.filter((id) => id !== 7);
    const chanceLen = s.chanceDeck.length + s.chestDeck.length;
    s = apply(s, { type: 'useJailCard' }, 0);
    expect(s.players[0]!.inJail).toBe(false);
    expect(s.chanceDeck.length + s.chestDeck.length).toBe(chanceLen + 1);
  });

  test('cannot use a card you do not hold', () => {
    const s = jailed();
    expectReject(s, { type: 'useJailCard' }, 0);
  });

  test('failing to roll doubles keeps you in jail', () => {
    const seed = findSeed((a, b) => a !== b);
    let s = monopoly.setup(2, seed);
    s.players[0]!.inJail = true;
    s.players[0]!.pos = 10;
    s = apply(s, { type: 'roll' }, 0);
    expect(s.players[0]!.inJail).toBe(true);
    expect(s.players[0]!.jailTurns).toBe(1);
    expect(s.players[0]!.pos).toBe(10);
    expect(s.phase).toBe('postRoll');
  });

  test('rolling doubles escapes and moves, with no bonus roll', () => {
    const seed = findSeed((a, b) => a === b);
    let s = monopoly.setup(2, seed);
    s.players[0]!.inJail = true;
    s.players[0]!.pos = 10;
    s = apply(s, { type: 'roll' }, 0);
    expect(s.players[0]!.inJail).toBe(false);
    expect(s.players[0]!.pos).not.toBe(10);
    expect(s.doublesCount).toBe(0);
  });

  test('three doubles in a row sends you to jail', () => {
    // Simulate directly: doublesCount already at 2, then roll doubles.
    const seed = findSeed((a, b) => a === b);
    let s = monopoly.setup(2, seed);
    s.doublesCount = 2;
    s = apply(s, { type: 'roll' }, 0);
    expect(s.players[0]!.inJail).toBe(true);
    expect(s.players[0]!.pos).toBe(10);
  });

  test('broke player without doubles stays in jail past three turns', () => {
    const seed = findSeed((a, b) => a !== b);
    let s = monopoly.setup(2, seed);
    s.players[0]!.inJail = true;
    s.players[0]!.jailTurns = 2;
    s.players[0]!.pos = 10;
    s = setCash(s, 0, 10);
    s = apply(s, { type: 'roll' }, 0);
    expect(s.players[0]!.inJail).toBe(true);
  });
});
