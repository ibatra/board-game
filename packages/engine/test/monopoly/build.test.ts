import { describe, expect, test } from 'bun:test';
import { apply, expectReject, fresh, giveProperty, setCash, withPatch } from './setup';

/** P1 owns the brown set (tiles 1, 3) in postRoll. */
function brownSet() {
  let s = fresh(2, 5);
  s = giveProperty(s, 1, 0);
  s = giveProperty(s, 3, 0);
  return withPatch(s, { phase: 'postRoll' });
}

describe('monopoly building', () => {
  test('building requires the full set', () => {
    let s = fresh(2, 5);
    s = giveProperty(s, 1, 0);
    s = withPatch(s, { phase: 'postRoll' });
    expectReject(s, { type: 'build', tile: 1 }, 0);
  });

  test('even-build rule enforced', () => {
    let s = brownSet();
    s = apply(s, { type: 'build', tile: 1 }, 0);
    expectReject(s, { type: 'build', tile: 1 }, 0); // 1 has a house, 3 has none
    s = apply(s, { type: 'build', tile: 3 }, 0);
    s = apply(s, { type: 'build', tile: 1 }, 0);
    expect(s.properties[1]!.houses).toBe(2);
    expect(s.players[0]!.cash).toBe(1500 - 150);
    expect(s.housesRemaining).toBe(29);
  });

  test('fifth build converts to hotel, returning houses to the bank', () => {
    let s = brownSet();
    for (let i = 0; i < 4; i++) {
      s = apply(s, { type: 'build', tile: 1 }, 0);
      s = apply(s, { type: 'build', tile: 3 }, 0);
    }
    s = setCash(s, 0, 1000);
    expect(s.housesRemaining).toBe(32 - 8);
    s = apply(s, { type: 'build', tile: 1 }, 0);
    expect(s.properties[1]!.houses).toBe(5);
    expect(s.housesRemaining).toBe(28); // 4 houses back
    expect(s.hotelsRemaining).toBe(11);
  });

  test('mortgaged tile in set blocks building', () => {
    let s = brownSet();
    s = giveProperty(s, 3, 0, { mortgaged: true });
    expectReject(s, { type: 'build', tile: 1 }, 0);
  });

  test('house shortage blocks building', () => {
    let s = brownSet();
    s = withPatch(s, { housesRemaining: 0 });
    expectReject(s, { type: 'build', tile: 1 }, 0);
  });

  test('selling returns half price and respects even-sell', () => {
    let s = brownSet();
    s = apply(s, { type: 'build', tile: 1 }, 0);
    s = apply(s, { type: 'build', tile: 3 }, 0);
    const cash = s.players[0]!.cash;
    s = apply(s, { type: 'sellBuilding', tile: 1 }, 0);
    expect(s.players[0]!.cash).toBe(cash + 25);
    expect(s.housesRemaining).toBe(31);
    // Now tile 3 has the only house; selling tile 1 again is impossible,
    // and tile 3 is the forced even-sell target.
    expectReject(s, { type: 'sellBuilding', tile: 1 }, 0);
    s = apply(s, { type: 'sellBuilding', tile: 3 }, 0);
    expect(s.properties[3]!.houses).toBe(0);
  });

  test('mortgage and unmortgage with 10% interest', () => {
    let s = brownSet();
    s = apply(s, { type: 'mortgage', tile: 1 }, 0);
    expect(s.players[0]!.cash).toBe(1530);
    expect(s.properties[1]!.mortgaged).toBe(true);
    expectReject(s, { type: 'mortgage', tile: 1 }, 0);
    s = apply(s, { type: 'unmortgage', tile: 1 }, 0);
    expect(s.players[0]!.cash).toBe(1530 - 33);
    expect(s.properties[1]!.mortgaged).toBe(false);
  });

  test('cannot mortgage while the set has buildings', () => {
    let s = brownSet();
    s = apply(s, { type: 'build', tile: 1 }, 0);
    expectReject(s, { type: 'mortgage', tile: 3 }, 0);
  });
});
