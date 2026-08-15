import { describe, expect, test } from 'bun:test';
import { rentFor } from '../../src/monopoly/helpers';
import { fresh, giveProperty } from './setup';

describe('monopoly rent', () => {
  test('base street rent', () => {
    let s = fresh();
    s = giveProperty(s, 1, 1); // Mediterranean, owner P2
    expect(rentFor(s, 1, 7)).toBe(2);
  });

  test('full unmortgaged set doubles base rent', () => {
    let s = fresh();
    s = giveProperty(s, 1, 1);
    s = giveProperty(s, 3, 1);
    expect(rentFor(s, 1, 7)).toBe(4);
    expect(rentFor(s, 3, 7)).toBe(8);
  });

  test('mortgaged tile in the set cancels the double', () => {
    let s = fresh();
    s = giveProperty(s, 1, 1);
    s = giveProperty(s, 3, 1, { mortgaged: true });
    expect(rentFor(s, 1, 7)).toBe(2);
    expect(rentFor(s, 3, 7)).toBe(0); // mortgaged collects nothing
  });

  test('house and hotel rents come from the rent table', () => {
    let s = fresh();
    s = giveProperty(s, 39, 1, { houses: 3 }); // Boardwalk 3 houses
    expect(rentFor(s, 39, 7)).toBe(1400);
    s = giveProperty(s, 39, 1, { houses: 5 });
    expect(rentFor(s, 39, 7)).toBe(2000);
  });

  test('railroad rent ladder: 25/50/100/200', () => {
    let s = fresh();
    s = giveProperty(s, 5, 1);
    expect(rentFor(s, 5, 7)).toBe(25);
    s = giveProperty(s, 15, 1);
    expect(rentFor(s, 5, 7)).toBe(50);
    s = giveProperty(s, 25, 1);
    s = giveProperty(s, 35, 1);
    expect(rentFor(s, 5, 7)).toBe(200);
  });

  test('utility rent: 4x dice for one, 10x for both', () => {
    let s = fresh();
    s = giveProperty(s, 12, 1);
    expect(rentFor(s, 12, 9)).toBe(36);
    s = giveProperty(s, 28, 1);
    expect(rentFor(s, 12, 9)).toBe(90);
  });

  test('card-driven multipliers: double railroad, 10x utility', () => {
    let s = fresh();
    s = giveProperty(s, 5, 1);
    expect(rentFor(s, 5, 7, { railroadDouble: true })).toBe(50);
    s = giveProperty(s, 12, 1);
    expect(rentFor(s, 12, 7, { utilityTimesTen: true })).toBe(70);
  });
});
