import { describe, expect, test } from 'bun:test';
import { apply, expectReject, fresh, withPatch } from './setup';

/** P1 stands on Baltic (tile 3) with the buy decision pending. */
function auctionSetup(numPlayers = 3) {
  let s = fresh(numPlayers, 5);
  s = withPatch(s, { phase: 'awaitBuy' });
  s.players[0]!.pos = 3;
  return s;
}

describe('monopoly auction', () => {
  test('declining a purchase always starts an auction', () => {
    let s = auctionSetup();
    s = apply(s, { type: 'declineBuy' }, 0);
    expect(s.phase).toBe('auction');
    expect(s.auction).toMatchObject({ tile: 3, highBid: 0, highBidder: null, turn: 1 });
  });

  test('turn-based bidding with minimum increments, winner pays', () => {
    let s = auctionSetup();
    s = apply(s, { type: 'declineBuy' }, 0);
    s = apply(s, { type: 'bid', amount: 10 }, 1);
    expectReject(s, { type: 'bid', amount: 10 }, 2); // must beat high bid
    s = apply(s, { type: 'bid', amount: 25 }, 2);
    s = apply(s, { type: 'auctionPass' }, 0);
    s = apply(s, { type: 'auctionPass' }, 1);
    expect(s.phase).toBe('postRoll');
    expect(s.properties[3]!.owner).toBe(2);
    expect(s.players[2]!.cash).toBe(1500 - 25);
  });

  test('all passing leaves the property with the bank', () => {
    let s = auctionSetup();
    s = apply(s, { type: 'declineBuy' }, 0);
    s = apply(s, { type: 'auctionPass' }, 1);
    s = apply(s, { type: 'auctionPass' }, 2);
    s = apply(s, { type: 'auctionPass' }, 0);
    expect(s.phase).toBe('postRoll');
    expect(s.properties[3]!.owner).toBeNull();
  });

  test('cannot bid more than your cash', () => {
    let s = auctionSetup();
    s = apply(s, { type: 'declineBuy' }, 0);
    expectReject(s, { type: 'bid', amount: 2000 }, 1);
  });

  test('out-of-turn bids are rejected', () => {
    let s = auctionSetup();
    s = apply(s, { type: 'declineBuy' }, 0);
    expectReject(s, { type: 'bid', amount: 10 }, 2);
  });

  test('decliner can win their own auction cheap', () => {
    let s = auctionSetup();
    s = apply(s, { type: 'declineBuy' }, 0);
    s = apply(s, { type: 'auctionPass' }, 1);
    s = apply(s, { type: 'auctionPass' }, 2);
    s = apply(s, { type: 'bid', amount: 1 }, 0);
    expect(s.phase).toBe('postRoll');
    expect(s.properties[3]!.owner).toBe(0);
    expect(s.players[0]!.cash).toBe(1499);
  });
});
