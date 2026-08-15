import type { PlayerId } from '../core/types';
import { GROUP_TILES, HOUSE_COST, JAIL_BAIL, TILES } from './data';
import { ownsFullGroup } from './helpers';
import type { MonopolyAction, MonopolyState, TradeBundle } from './types';

function priceOf(tile: number): number {
  const def = TILES[tile]!;
  return def.kind === 'street' || def.kind === 'railroad' || def.kind === 'utility' ? def.price : 0;
}

function groupOf(tile: number): string | null {
  const def = TILES[tile]!;
  if (def.kind === 'street') return def.group;
  if (def.kind === 'railroad') return 'railroad';
  if (def.kind === 'utility') return 'utility';
  return null;
}

/** How much the tile is worth to `player`: set synergies raise it. */
function tileValue(state: MonopolyState, player: PlayerId, tile: number): number {
  const base = priceOf(tile);
  const group = groupOf(tile);
  if (!group) return base;
  const tiles = GROUP_TILES[group]!;
  const mine = tiles.filter((t) => t !== tile && state.properties[t]!.owner === player).length;
  const others = tiles.filter((t) => {
    const o = state.properties[t]!.owner;
    return o !== null && o !== player;
  }).length;
  if (mine === tiles.length - 1) return base * 1.4; // completes my set
  if (others === tiles.length - 1) return base * 1.1; // denies an opponent's set
  if (mine > 0) return base * 1.05;
  return base * 0.8;
}

function bundleValue(state: MonopolyState, player: PlayerId, bundle: TradeBundle): number {
  let total = bundle.cash + bundle.jailCards * 50;
  for (const tile of bundle.properties) {
    total += tileValue(state, player, tile);
    if (state.properties[tile]!.mortgaged) total -= priceOf(tile) / 2;
  }
  return total;
}

function findBuild(state: MonopolyState, player: PlayerId): MonopolyAction | null {
  const cash = state.players[player]!.cash;
  for (const [group, tiles] of Object.entries(GROUP_TILES)) {
    if (group === 'railroad' || group === 'utility') continue;
    if (!ownsFullGroup(state, player, group)) continue;
    if (tiles.some((t) => state.properties[t]!.mortgaged)) continue;
    const cost = HOUSE_COST[group]!;
    if (cash - cost < 250) continue;
    const minHouses = Math.min(...tiles.map((t) => state.properties[t]!.houses));
    if (minHouses >= 5) continue;
    if (minHouses === 4 && state.hotelsRemaining < 1) continue;
    if (minHouses < 4 && state.housesRemaining < 1) continue;
    const target = tiles.find((t) => state.properties[t]!.houses === minHouses)!;
    return { type: 'build', tile: target };
  }
  return null;
}

function raiseFunds(state: MonopolyState, player: PlayerId): MonopolyAction | null {
  // Sell buildings first (most cash back), then mortgage cheapest singles.
  for (const [idxStr, prop] of Object.entries(state.properties)) {
    if (prop.owner !== player || prop.houses === 0) continue;
    const tiles = GROUP_TILES[groupOf(Number(idxStr))!]!;
    const maxHouses = Math.max(...tiles.map((t) => state.properties[t]!.houses));
    if (prop.houses === maxHouses) return { type: 'sellBuilding', tile: Number(idxStr) };
  }
  const mortgageable = Object.entries(state.properties)
    .filter(([idxStr, prop]) => {
      if (prop.owner !== player || prop.mortgaged) return false;
      const group = groupOf(Number(idxStr));
      return !(GROUP_TILES[group!] ?? []).some((t) => state.properties[t]!.houses > 0);
    })
    .sort(([a], [b]) => priceOf(Number(a)) - priceOf(Number(b)));
  if (mortgageable.length > 0) return { type: 'mortgage', tile: Number(mortgageable[0]![0]) };
  return null;
}

export function monopolyAi(state: MonopolyState, player: PlayerId): MonopolyAction {
  const me = state.players[player]!;

  switch (state.phase) {
    case 'preRoll': {
      if (me.inJail) {
        if (me.getOutCards > 0) return { type: 'useJailCard' };
        // Early game: get out and buy property. Late game: hide in jail.
        const unowned = Object.values(state.properties).filter((p) => p.owner === null).length;
        if (me.cash >= JAIL_BAIL + 150 && unowned > 8) return { type: 'payBail' };
      }
      return { type: 'roll' };
    }
    case 'awaitBuy': {
      const price = priceOf(me.pos);
      const value = tileValue(state, player, me.pos);
      if (me.cash >= price && (me.cash - price >= 150 || value > price)) return { type: 'buy' };
      return { type: 'declineBuy' };
    }
    case 'auction': {
      const auction = state.auction!;
      if (auction.turn !== player) return { type: 'auctionPass' };
      if (auction.highBidder === player) return { type: 'auctionPass' };
      const ceiling = Math.min(tileValue(state, player, auction.tile), me.cash - 100);
      for (const inc of [25, 10, 1]) {
        const amount = auction.highBid + inc;
        if (amount <= ceiling && amount <= me.cash) return { type: 'bid', amount };
      }
      return { type: 'auctionPass' };
    }
    case 'trade': {
      const trade = state.trade!;
      if (trade.to !== player) return { type: 'cancelTrade' };
      const gain = bundleValue(state, player, trade.give);
      const cost = bundleValue(state, player, trade.get);
      return gain >= cost * 1.2 ? { type: 'acceptTrade' } : { type: 'rejectTrade' };
    }
    case 'debt': {
      const debt = state.debt!;
      if (me.cash >= debt.amount) return { type: 'payDebt' };
      const raise = raiseFunds(state, player);
      if (raise) return raise;
      return { type: 'declareBankruptcy' };
    }
    case 'postRoll': {
      const build = findBuild(state, player);
      if (build) return build;
      // Unmortgage when flush.
      for (const [idxStr, prop] of Object.entries(state.properties)) {
        if (prop.owner !== player || !prop.mortgaged) continue;
        const cost = Math.ceil((priceOf(Number(idxStr)) / 2) * 1.1);
        if (me.cash - cost >= 500) return { type: 'unmortgage', tile: Number(idxStr) };
      }
      return { type: 'endTurn' };
    }
    default:
      return { type: 'endTurn' };
  }
}
