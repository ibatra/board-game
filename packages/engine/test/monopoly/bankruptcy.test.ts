import { describe, expect, test } from 'bun:test';
import { apply, fresh, giveProperty, setCash, withPatch } from './setup';
import type { MonopolyState } from '../../src/monopoly/types';

/** P1 owes P2 more than they can pay. */
function indebted(amount = 500): MonopolyState {
  let s = fresh(3, 5);
  s = giveProperty(s, 1, 0);
  s = setCash(s, 0, 50);
  return withPatch(s, { phase: 'debt', debt: { debtor: 0, creditor: 1, amount } });
}

describe('monopoly debt & bankruptcy', () => {
  test('debtor can mortgage to raise funds then pay', () => {
    let s = indebted(60);
    s = apply(s, { type: 'mortgage', tile: 1 }, 0);
    expect(s.players[0]!.cash).toBe(80);
    s = apply(s, { type: 'payDebt' }, 0);
    expect(s.debt).toBeNull();
    expect(s.phase).toBe('postRoll');
    expect(s.players[1]!.cash).toBe(1560);
  });

  test('bankruptcy to a player transfers everything', () => {
    let s = indebted(5000);
    s.players[0]!.getOutCards = 1;
    s = giveProperty(s, 3, 0, { houses: 2 });
    s = apply(s, { type: 'declareBankruptcy' }, 0);
    const p0 = s.players[0]!;
    expect(p0.bankrupt).toBe(true);
    expect(p0.cash).toBe(0);
    // Buildings liquidated (2 houses × $25) into the transferred cash.
    expect(s.players[1]!.cash).toBe(1500 + 50 + 50);
    expect(s.properties[1]!.owner).toBe(1);
    expect(s.properties[3]!.owner).toBe(1);
    expect(s.properties[3]!.houses).toBe(0);
    expect(s.players[1]!.getOutCards).toBe(1);
    // Fixture granted houses without debiting the bank, so 32 + 2 liquidated.
    expect(s.housesRemaining).toBe(34);
  });

  test('bankruptcy to the bank frees the properties', () => {
    let s = fresh(3, 5);
    s = giveProperty(s, 1, 0, { mortgaged: true });
    s = setCash(s, 0, 10);
    s = withPatch(s, { phase: 'debt', debt: { debtor: 0, creditor: 'bank', amount: 400 } });
    s = apply(s, { type: 'declareBankruptcy' }, 0);
    expect(s.properties[1]!.owner).toBeNull();
    expect(s.properties[1]!.mortgaged).toBe(false);
  });

  test('bankruptcy of the second-to-last player ends the game with ranking', () => {
    let s = fresh(2, 5);
    s = setCash(s, 0, 10);
    s = withPatch(s, { phase: 'debt', debt: { debtor: 0, creditor: 1, amount: 400 } });
    s = apply(s, { type: 'declareBankruptcy' }, 0);
    expect(s.result).toEqual({ kind: 'win', winner: 1, ranking: [1, 0] });
    expect(s.phase).toBe('gameOver');
  });

  test('turn passes to the next active player after mid-game bankruptcy', () => {
    let s = indebted(5000);
    s = apply(s, { type: 'declareBankruptcy' }, 0);
    expect(s.result).toBeNull();
    expect(s.currentPlayer).toBe(1);
    expect(s.phase).toBe('preRoll');
  });
});
