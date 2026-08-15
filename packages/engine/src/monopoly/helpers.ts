import type { PlayerId } from '../core/types';
import {
  CHANCE_CARDS,
  CHEST_CARDS,
  GO_SALARY,
  HOUSE_COST,
  GROUP_TILES,
  JAIL_TILE,
  RAILROAD_RENTS,
  TILES,
  tileName,
  type CardEffect,
} from './data';
import type { MonopolyState } from './types';

export function log(state: MonopolyState, msg: string): void {
  state.log.push(msg);
  if (state.log.length > 60) state.log.shift();
}

export function activePlayers(state: MonopolyState): PlayerId[] {
  return state.players.map((_, i) => i).filter((i) => !state.players[i]!.bankrupt);
}

export function ownedInGroup(state: MonopolyState, owner: PlayerId, group: string): number {
  return (GROUP_TILES[group] ?? []).filter((t) => state.properties[t]?.owner === owner).length;
}

export function ownsFullGroup(state: MonopolyState, owner: PlayerId, group: string): boolean {
  const tiles = GROUP_TILES[group] ?? [];
  return tiles.length > 0 && tiles.every((t) => state.properties[t]?.owner === owner);
}

/** Rent owed for landing on `tile`, given the dice sum rolled to get there. */
export function rentFor(
  state: MonopolyState,
  tile: number,
  diceSum: number,
  opts: { railroadDouble?: boolean; utilityTimesTen?: boolean } = {},
): number {
  const prop = state.properties[tile];
  const def = TILES[tile]!;
  if (!prop || prop.owner === null || prop.mortgaged) return 0;
  const owner = prop.owner;

  if (def.kind === 'railroad') {
    const count = ownedInGroup(state, owner, 'railroad');
    const base = RAILROAD_RENTS[count] ?? 0;
    return opts.railroadDouble ? base * 2 : base;
  }
  if (def.kind === 'utility') {
    if (opts.utilityTimesTen) return diceSum * 10;
    const count = ownedInGroup(state, owner, 'utility');
    return diceSum * (count >= 2 ? 10 : 4);
  }
  if (def.kind === 'street') {
    if (prop.houses > 0) return def.rents[prop.houses]!;
    const full = ownsFullGroup(state, owner, def.group);
    const anyMortgaged = (GROUP_TILES[def.group] ?? []).some((t) => state.properties[t]!.mortgaged);
    return full && !anyMortgaged ? def.rents[0]! * 2 : def.rents[0]!;
  }
  return 0;
}

export function credit(state: MonopolyState, player: PlayerId, amount: number): void {
  state.players[player]!.cash += amount;
}

/**
 * Charge `amount` to `player`. If they can pay, cash transfers immediately;
 * otherwise the game enters the debt phase and the turn blocks until the
 * debtor raises funds or goes bankrupt.
 */
export function charge(
  state: MonopolyState,
  player: PlayerId,
  amount: number,
  creditor: PlayerId | 'bank',
): boolean {
  const p = state.players[player]!;
  if (p.cash >= amount) {
    p.cash -= amount;
    if (creditor !== 'bank') credit(state, creditor, amount);
    return true;
  }
  state.phase = 'debt';
  state.debt = { debtor: player, creditor, amount };
  log(state, `${playerLabel(player)} owes $${amount} and must raise funds`);
  return false;
}

export function playerLabel(p: PlayerId): string {
  return `P${p + 1}`;
}

export function sendToJail(state: MonopolyState, player: PlayerId): void {
  const p = state.players[player]!;
  p.pos = JAIL_TILE;
  p.inJail = true;
  p.jailTurns = 0;
  // Landing in jail ends movement; doubles no longer grant another roll.
  state.doublesCount = 0;
  log(state, `${playerLabel(player)} goes to Jail`);
}

/** Move forward `steps`, collecting GO salary when passing it. */
export function advancePlayer(state: MonopolyState, player: PlayerId, steps: number): number {
  const p = state.players[player]!;
  const next = (p.pos + steps) % 40;
  if (steps > 0 && next < p.pos) {
    credit(state, player, GO_SALARY);
    log(state, `${playerLabel(player)} passes GO, collects $${GO_SALARY}`);
  }
  p.pos = next;
  return next;
}

export function moveTo(state: MonopolyState, player: PlayerId, tile: number): number {
  const p = state.players[player]!;
  const steps = (tile - p.pos + 40) % 40;
  return advancePlayer(state, player, steps);
}

function drawFrom(state: MonopolyState, deck: 'chance' | 'chest', keep: boolean): number {
  const ids = deck === 'chance' ? state.chanceDeck : state.chestDeck;
  const id = ids.shift()!;
  // Get Out of Jail Free is held by the player instead of returning to the deck.
  if (!keep) ids.push(id);
  return id;
}

/** Return a held Get Out of Jail Free card to whichever deck is missing its copy. */
export function returnJailCard(state: MonopolyState): void {
  const chanceJailFree = CHANCE_CARDS.findIndex((c) => c.effect.kind === 'jailFree');
  const chestJailFree = CHEST_CARDS.findIndex((c) => c.effect.kind === 'jailFree');
  if (!state.chanceDeck.includes(chanceJailFree)) state.chanceDeck.push(chanceJailFree);
  else if (!state.chestDeck.includes(chestJailFree)) state.chestDeck.push(chestJailFree);
}

export function countBuildings(state: MonopolyState, player: PlayerId): { houses: number; hotels: number } {
  let houses = 0;
  let hotels = 0;
  for (const prop of Object.values(state.properties)) {
    if (prop.owner !== player) continue;
    if (prop.houses === 5) hotels++;
    else houses += prop.houses;
  }
  return { houses, hotels };
}

/**
 * Resolve the tile the player just landed on. May start awaitBuy, debt, a
 * card chain, or jail. `diceSum` is the roll that produced the landing.
 */
export function resolveLanding(
  state: MonopolyState,
  player: PlayerId,
  diceSum: number,
  opts: { railroadDouble?: boolean; utilityTimesTen?: boolean } = {},
): void {
  const pos = state.players[player]!.pos;
  const def = TILES[pos]!;

  switch (def.kind) {
    case 'street':
    case 'railroad':
    case 'utility': {
      const prop = state.properties[pos]!;
      if (prop.owner === null) {
        state.phase = 'awaitBuy';
        return;
      }
      if (prop.owner !== player && !prop.mortgaged) {
        const rent = rentFor(state, pos, diceSum, opts);
        if (rent > 0) {
          const paid = charge(state, player, rent, prop.owner);
          if (paid) log(state, `${playerLabel(player)} pays $${rent} rent to ${playerLabel(prop.owner)}`);
        }
      }
      state.phase = state.phase === 'debt' ? 'debt' : 'postRoll';
      return;
    }
    case 'tax': {
      const paid = charge(state, player, def.amount, 'bank');
      if (paid) log(state, `${playerLabel(player)} pays ${def.name} of $${def.amount}`);
      if (state.phase !== 'debt') state.phase = 'postRoll';
      return;
    }
    case 'goToJail':
      sendToJail(state, player);
      state.phase = 'postRoll';
      return;
    case 'chance':
    case 'chest': {
      applyCard(state, player, def.kind, diceSum);
      return;
    }
    default:
      state.phase = 'postRoll';
      return;
  }
}

export function applyCard(
  state: MonopolyState,
  player: PlayerId,
  deck: 'chance' | 'chest',
  diceSum: number,
): void {
  const ids = deck === 'chance' ? state.chanceDeck : state.chestDeck;
  const peek = (deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS)[ids[0]!]!;
  const id = drawFrom(state, deck, peek.effect.kind === 'jailFree');
  const card = (deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS)[id]!;
  state.lastCard = { deck, text: card.text };
  log(state, `${playerLabel(player)} draws: ${card.text}`);
  applyEffect(state, player, card.effect, diceSum);
}

function applyEffect(state: MonopolyState, player: PlayerId, effect: CardEffect, diceSum: number): void {
  switch (effect.kind) {
    case 'moveTo':
      moveTo(state, player, effect.tile);
      resolveLanding(state, player, diceSum);
      return;
    case 'moveBack': {
      const p = state.players[player]!;
      p.pos = (p.pos - effect.n + 40) % 40;
      resolveLanding(state, player, diceSum);
      return;
    }
    case 'nearestRailroad': {
      const pos = state.players[player]!.pos;
      const next = [5, 15, 25, 35].find((t) => t > pos) ?? 5;
      moveTo(state, player, next);
      resolveLanding(state, player, diceSum, { railroadDouble: true });
      return;
    }
    case 'nearestUtility': {
      const pos = state.players[player]!.pos;
      const next = [12, 28].find((t) => t > pos) ?? 12;
      moveTo(state, player, next);
      resolveLanding(state, player, diceSum, { utilityTimesTen: true });
      return;
    }
    case 'goToJail':
      sendToJail(state, player);
      state.phase = 'postRoll';
      return;
    case 'jailFree':
      state.players[player]!.getOutCards++;
      state.phase = 'postRoll';
      return;
    case 'collect':
      credit(state, player, effect.amount);
      state.phase = 'postRoll';
      return;
    case 'pay':
      charge(state, player, effect.amount, 'bank');
      if (state.phase !== 'debt') state.phase = 'postRoll';
      return;
    case 'collectEach': {
      // Simplified: each opponent pays what they can afford (no cascading debt).
      for (const other of activePlayers(state)) {
        if (other === player) continue;
        const pay = Math.min(effect.amount, state.players[other]!.cash);
        state.players[other]!.cash -= pay;
        credit(state, player, pay);
      }
      state.phase = 'postRoll';
      return;
    }
    case 'payEach': {
      const others = activePlayers(state).filter((p) => p !== player);
      const total = effect.amount * others.length;
      const p = state.players[player]!;
      if (p.cash >= total) {
        p.cash -= total;
        for (const other of others) credit(state, other, effect.amount);
        state.phase = 'postRoll';
      } else {
        // Simplified: when short, the obligation becomes a single bank debt
        // rather than tracking one debt per opponent.
        charge(state, player, total, 'bank');
      }
      return;
    }
    case 'repairs': {
      const { houses, hotels } = countBuildings(state, player);
      const total = houses * effect.house + hotels * effect.hotel;
      if (total > 0) charge(state, player, total, 'bank');
      if (state.phase !== 'debt') state.phase = 'postRoll';
      return;
    }
  }
}

/** Sum of assets a debtor could still liquidate (buildings at half price + mortgages). */
export function liquidationValue(state: MonopolyState, player: PlayerId): number {
  let total = 0;
  for (const [idxStr, prop] of Object.entries(state.properties)) {
    if (prop.owner !== player) continue;
    const def = TILES[Number(idxStr)]!;
    if (def.kind === 'street') {
      const houseCost = HOUSE_COST[def.group] ?? 0;
      total += prop.houses === 5 ? (houseCost / 2) * 5 : (houseCost / 2) * prop.houses;
    }
    if (!prop.mortgaged) {
      const price = def.kind === 'street' || def.kind === 'railroad' || def.kind === 'utility' ? def.price : 0;
      total += price / 2;
    }
  }
  return total;
}

export function nextActivePlayer(state: MonopolyState, from: PlayerId): PlayerId {
  let p = from;
  do {
    p = ((p + 1) % state.numPlayers) as PlayerId;
  } while (state.players[p]!.bankrupt && p !== from);
  return p;
}

export function tileNameOf(idx: number): string {
  return tileName(idx);
}
