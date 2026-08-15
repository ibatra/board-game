import { describe, expect, test } from 'bun:test';
import { apply, expectReject, fresh, giveProperty, setCash, withPatch } from './setup';

function tradeSetup() {
  let s = fresh(3, 5);
  s = giveProperty(s, 1, 0);  // P1 owns Mediterranean
  s = giveProperty(s, 3, 1);  // P2 owns Baltic
  return withPatch(s, { phase: 'preRoll' });
}

describe('monopoly trading', () => {
  test('propose, accept: cash and properties swap', () => {
    let s = tradeSetup();
    s = apply(
      s,
      {
        type: 'proposeTrade',
        to: 1,
        give: { cash: 100, properties: [1], jailCards: 0 },
        get: { cash: 0, properties: [3], jailCards: 0 },
      },
      0,
    );
    expect(s.phase).toBe('trade');
    // Only the target may accept.
    expectReject(s, { type: 'acceptTrade' }, 2);
    s = apply(s, { type: 'acceptTrade' }, 1);
    expect(s.properties[1]!.owner).toBe(1);
    expect(s.properties[3]!.owner).toBe(0);
    expect(s.players[0]!.cash).toBe(1400);
    expect(s.players[1]!.cash).toBe(1600);
    expect(s.phase).toBe('preRoll'); // returns to the pre-trade phase
  });

  test('reject returns to the original phase unchanged', () => {
    let s = tradeSetup();
    s = withPatch(s, { phase: 'postRoll' });
    s = apply(
      s,
      { type: 'proposeTrade', to: 1, give: { cash: 50, properties: [], jailCards: 0 }, get: { cash: 0, properties: [3], jailCards: 0 } },
      0,
    );
    s = apply(s, { type: 'rejectTrade' }, 1);
    expect(s.phase).toBe('postRoll');
    expect(s.properties[3]!.owner).toBe(1);
    expect(s.players[0]!.cash).toBe(1500);
  });

  test('proposer can cancel', () => {
    let s = tradeSetup();
    s = apply(
      s,
      { type: 'proposeTrade', to: 1, give: { cash: 50, properties: [], jailCards: 0 }, get: { cash: 0, properties: [3], jailCards: 0 } },
      0,
    );
    expectReject(s, { type: 'cancelTrade' }, 1);
    s = apply(s, { type: 'cancelTrade' }, 0);
    expect(s.phase).toBe('preRoll');
  });

  test('cannot trade properties from a built-up set', () => {
    let s = tradeSetup();
    s = giveProperty(s, 3, 0);
    s = giveProperty(s, 1, 0, { houses: 1 });
    expectReject(
      s,
      { type: 'proposeTrade', to: 1, give: { cash: 0, properties: [3], jailCards: 0 }, get: { cash: 100, properties: [], jailCards: 0 } },
      0,
    );
  });

  test('cannot offer cash you do not have', () => {
    let s = tradeSetup();
    s = setCash(s, 0, 40);
    expectReject(
      s,
      { type: 'proposeTrade', to: 1, give: { cash: 100, properties: [], jailCards: 0 }, get: { cash: 0, properties: [3], jailCards: 0 } },
      0,
    );
  });

  test('mortgaged property transfer charges the recipient a 10% fee', () => {
    let s = tradeSetup();
    s = giveProperty(s, 3, 1, { mortgaged: true }); // Baltic mortgaged (price 60, mortgage 30, fee 3)
    s = apply(
      s,
      { type: 'proposeTrade', to: 1, give: { cash: 50, properties: [], jailCards: 0 }, get: { cash: 0, properties: [3], jailCards: 0 } },
      0,
    );
    s = apply(s, { type: 'acceptTrade' }, 1);
    expect(s.properties[3]!.owner).toBe(0);
    expect(s.players[0]!.cash).toBe(1500 - 50 - 3);
    expect(s.players[1]!.cash).toBe(1550);
  });

  test('jail cards can be traded', () => {
    let s = tradeSetup();
    s.players[0]!.getOutCards = 1;
    s = apply(
      s,
      { type: 'proposeTrade', to: 1, give: { cash: 0, properties: [], jailCards: 1 }, get: { cash: 30, properties: [], jailCards: 0 } },
      0,
    );
    s = apply(s, { type: 'acceptTrade' }, 1);
    expect(s.players[0]!.getOutCards).toBe(0);
    expect(s.players[1]!.getOutCards).toBe(1);
  });
});
