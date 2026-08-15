import type { GameDefinition, PlayerId, ReduceResult } from '../core/types';
import { rollDie, seedRng, shuffle } from '../core/rng';
import {
  CHANCE_CARDS,
  CHEST_CARDS,
  GROUP_TILES,
  HOUSE_COST,
  JAIL_BAIL,
  PURCHASABLE,
  STARTING_CASH,
  TILES,
  TOTAL_HOTELS,
  TOTAL_HOUSES,
  tileName,
} from './data';
import {
  activePlayers,
  advancePlayer,
  charge,
  credit,
  liquidationValue,
  log,
  nextActivePlayer,
  ownsFullGroup,
  playerLabel,
  resolveLanding,
  returnJailCard,
  sendToJail,
} from './helpers';
import type {
  MonopolyAction,
  MonopolyState,
  TradeBundle,
} from './types';

type R = ReduceResult<MonopolyState>;

const ok = (state: MonopolyState): R => ({ ok: true, state });
const err = (error: string): R => ({ ok: false, error });

const MANAGE_PHASES = new Set(['preRoll', 'postRoll', 'debt']);

function groupOf(tile: number): string | null {
  const def = TILES[tile]!;
  if (def.kind === 'street') return def.group;
  if (def.kind === 'railroad') return 'railroad';
  if (def.kind === 'utility') return 'utility';
  return null;
}

function groupHasBuildings(state: MonopolyState, group: string | null): boolean {
  if (!group || group === 'railroad' || group === 'utility') return false;
  return (GROUP_TILES[group] ?? []).some((t) => state.properties[t]!.houses > 0);
}

function priceOf(tile: number): number {
  const def = TILES[tile]!;
  return def.kind === 'street' || def.kind === 'railroad' || def.kind === 'utility' ? def.price : 0;
}

/** Validate one side of a trade against its owner's current holdings. */
function validBundle(state: MonopolyState, owner: PlayerId, bundle: TradeBundle): string | null {
  if (bundle.cash < 0 || !Number.isInteger(bundle.cash)) return 'Invalid cash amount';
  if (bundle.cash > state.players[owner]!.cash) return `${playerLabel(owner)} lacks the cash`;
  if (bundle.jailCards < 0 || bundle.jailCards > state.players[owner]!.getOutCards) return 'Invalid jail cards';
  for (const tile of bundle.properties) {
    const prop = state.properties[tile];
    if (!prop || prop.owner !== owner) return `${playerLabel(owner)} does not own ${tileName(tile)}`;
    if (groupHasBuildings(state, groupOf(tile))) return `${tileName(tile)}'s group has buildings`;
  }
  return null;
}

function executeBankruptcy(state: MonopolyState, debtor: PlayerId): void {
  const creditor = state.debt?.creditor ?? 'bank';
  const p = state.players[debtor]!;

  // Buildings sell back to the bank at half price before assets transfer.
  for (const [idxStr, prop] of Object.entries(state.properties)) {
    if (prop.owner !== debtor || prop.houses === 0) continue;
    const def = TILES[Number(idxStr)]!;
    if (def.kind !== 'street') continue;
    const half = (HOUSE_COST[def.group] ?? 0) / 2;
    if (prop.houses === 5) {
      state.hotelsRemaining++;
      credit(state, debtor, half * 5);
    } else {
      state.housesRemaining += prop.houses;
      credit(state, debtor, half * prop.houses);
    }
    prop.houses = 0;
  }

  if (creditor === 'bank') {
    for (const prop of Object.values(state.properties)) {
      if (prop.owner === debtor) {
        prop.owner = null;
        prop.mortgaged = false;
      }
    }
    while (p.getOutCards > 0) {
      returnJailCard(state);
      p.getOutCards--;
    }
  } else {
    credit(state, creditor, p.cash);
    for (const prop of Object.values(state.properties)) {
      if (prop.owner === debtor) prop.owner = creditor;
    }
    state.players[creditor]!.getOutCards += p.getOutCards;
    p.getOutCards = 0;
  }

  p.cash = 0;
  p.bankrupt = true;
  state.eliminated.push(debtor);
  state.debt = null;
  log(state, `${playerLabel(debtor)} is bankrupt`);

  const remaining = activePlayers(state);
  if (remaining.length === 1) {
    const winner = remaining[0]!;
    state.phase = 'gameOver';
    state.result = {
      kind: 'win',
      winner,
      ranking: [winner, ...state.eliminated.slice().reverse()],
    };
    log(state, `${playerLabel(winner)} wins!`);
    return;
  }

  if (debtor === state.currentPlayer) {
    startNextTurn(state);
  }
}

function startNextTurn(state: MonopolyState): void {
  state.currentPlayer = nextActivePlayer(state, state.currentPlayer);
  state.phase = 'preRoll';
  state.dice = null;
  state.doublesCount = 0;
  state.hasRolled = false;
  state.lastCard = null;
}

function finishAuction(state: MonopolyState): void {
  const auction = state.auction!;
  if (auction.highBidder !== null) {
    const winner = auction.highBidder;
    state.players[winner]!.cash -= auction.highBid;
    state.properties[auction.tile]!.owner = winner;
    log(state, `${playerLabel(winner)} wins the auction for ${tileName(auction.tile)} at $${auction.highBid}`);
  } else {
    log(state, `No bids — ${tileName(auction.tile)} stays with the bank`);
  }
  state.auction = null;
  state.phase = 'postRoll';
}

function auctionRemaining(state: MonopolyState): PlayerId[] {
  const auction = state.auction!;
  return activePlayers(state).filter((p) => !auction.out[p]);
}

function reduce(state0: MonopolyState, action: MonopolyAction, actor: PlayerId): R {
  if (state0.result) return err('Game is over');
  if (state0.players[actor]?.bankrupt) return err('You are bankrupt');
  const state = structuredClone(state0);
  const current = state.currentPlayer;
  const me = state.players[actor]!;

  switch (action.type) {
    case 'roll': {
      if (actor !== current || state.phase !== 'preRoll') return err('Cannot roll now');
      const [d1, r1] = rollDie(state.rngState);
      const [d2, r2] = rollDie(r1);
      state.rngState = r2;
      state.dice = [d1, d2];
      state.hasRolled = true;
      const sum = d1 + d2;
      const doubles = d1 === d2;

      if (me.inJail) {
        if (doubles) {
          me.inJail = false;
          me.jailTurns = 0;
          state.doublesCount = 0; // no bonus roll after escaping jail
          log(state, `${playerLabel(actor)} rolls doubles and leaves Jail`);
          advancePlayer(state, actor, sum);
          resolveLanding(state, actor, sum);
        } else {
          me.jailTurns++;
          if (me.jailTurns >= 3 && me.cash >= JAIL_BAIL) {
            // Third failed attempt: bail is due, then the roll moves you.
            me.cash -= JAIL_BAIL;
            me.inJail = false;
            me.jailTurns = 0;
            log(state, `${playerLabel(actor)} pays $${JAIL_BAIL} bail after three attempts`);
            advancePlayer(state, actor, sum);
            resolveLanding(state, actor, sum);
          } else {
            // Broke players simply stay and keep trying — see engine notes.
            log(state, `${playerLabel(actor)} fails to roll doubles in Jail`);
            state.phase = 'postRoll';
          }
        }
        return ok(state);
      }

      state.doublesCount = doubles ? state.doublesCount + 1 : 0;
      if (state.doublesCount >= 3) {
        log(state, `${playerLabel(actor)} rolls three doubles in a row!`);
        sendToJail(state, actor);
        state.phase = 'postRoll';
        return ok(state);
      }
      advancePlayer(state, actor, sum);
      log(state, `${playerLabel(actor)} rolls ${d1}+${d2}, lands on ${tileName(me.pos)}`);
      resolveLanding(state, actor, sum);
      return ok(state);
    }

    case 'buy': {
      if (actor !== current || state.phase !== 'awaitBuy') return err('Nothing to buy');
      const tile = me.pos;
      const price = priceOf(tile);
      const prop = state.properties[tile]!;
      if (prop.owner !== null) return err('Already owned');
      if (me.cash < price) return err('Not enough cash — decline to start an auction');
      me.cash -= price;
      prop.owner = actor;
      log(state, `${playerLabel(actor)} buys ${tileName(tile)} for $${price}`);
      state.phase = 'postRoll';
      return ok(state);
    }

    case 'declineBuy': {
      if (actor !== current || state.phase !== 'awaitBuy') return err('Nothing to decline');
      const tile = me.pos;
      state.auction = {
        tile,
        turn: nextActivePlayer(state, actor),
        highBid: 0,
        highBidder: null,
        out: state.players.map((p) => p.bankrupt),
      };
      state.phase = 'auction';
      log(state, `${tileName(tile)} goes to auction`);
      return ok(state);
    }

    case 'bid': {
      if (state.phase !== 'auction' || !state.auction) return err('No auction running');
      if (actor !== state.auction.turn) return err('Not your turn to bid');
      const amount = action.amount;
      if (!Number.isInteger(amount) || amount <= state.auction.highBid) {
        return err(`Bid must beat $${state.auction.highBid}`);
      }
      if (amount > me.cash) return err('You cannot afford that bid');
      state.auction.highBid = amount;
      state.auction.highBidder = actor;
      const remaining = auctionRemaining(state);
      if (remaining.length === 1) {
        finishAuction(state);
        return ok(state);
      }
      let turn = nextActivePlayer(state, actor);
      while (state.auction.out[turn]) turn = nextActivePlayer(state, turn);
      state.auction.turn = turn;
      return ok(state);
    }

    case 'auctionPass': {
      if (state.phase !== 'auction' || !state.auction) return err('No auction running');
      if (actor !== state.auction.turn) return err('Not your turn to bid');
      state.auction.out[actor] = true;
      const remaining = auctionRemaining(state);
      if (remaining.length === 0) {
        finishAuction(state);
        return ok(state);
      }
      if (remaining.length === 1) {
        if (state.auction.highBidder === remaining[0]) {
          finishAuction(state);
        } else {
          // Last player standing may still bid $1+ or pass.
          state.auction.turn = remaining[0]!;
        }
        return ok(state);
      }
      let turn = nextActivePlayer(state, actor);
      while (state.auction.out[turn]) turn = nextActivePlayer(state, turn);
      state.auction.turn = turn;
      return ok(state);
    }

    case 'build': {
      if (actor !== current || (state.phase !== 'preRoll' && state.phase !== 'postRoll')) {
        return err('Cannot build now');
      }
      const def = TILES[action.tile];
      const prop = state.properties[action.tile];
      if (!def || def.kind !== 'street' || !prop) return err('Not a buildable property');
      if (prop.owner !== actor) return err('You do not own that');
      if (!ownsFullGroup(state, actor, def.group)) return err('You need the full color set');
      const groupTiles = GROUP_TILES[def.group]!;
      if (groupTiles.some((t) => state.properties[t]!.mortgaged)) return err('Unmortgage the set first');
      if (prop.houses >= 5) return err('Already has a hotel');
      const minHouses = Math.min(...groupTiles.map((t) => state.properties[t]!.houses));
      if (prop.houses > minHouses) return err('Build evenly across the set');
      const cost = HOUSE_COST[def.group]!;
      if (me.cash < cost) return err('Not enough cash');
      if (prop.houses === 4) {
        if (state.hotelsRemaining < 1) return err('No hotels left in the bank');
        state.hotelsRemaining--;
        state.housesRemaining += 4;
        prop.houses = 5;
        log(state, `${playerLabel(actor)} builds a hotel on ${def.name}`);
      } else {
        if (state.housesRemaining < 1) return err('No houses left in the bank');
        state.housesRemaining--;
        prop.houses = (prop.houses + 1) as 1 | 2 | 3 | 4;
        log(state, `${playerLabel(actor)} builds a house on ${def.name}`);
      }
      me.cash -= cost;
      return ok(state);
    }

    case 'sellBuilding': {
      if (actor !== current || !MANAGE_PHASES.has(state.phase)) return err('Cannot sell now');
      if (state.phase === 'debt' && state.debt?.debtor !== actor) return err('Not your debt');
      const def = TILES[action.tile];
      const prop = state.properties[action.tile];
      if (!def || def.kind !== 'street' || !prop || prop.owner !== actor) return err('Not yours to sell');
      if (prop.houses === 0) return err('Nothing built there');
      const groupTiles = GROUP_TILES[def.group]!;
      const maxHouses = Math.max(...groupTiles.map((t) => state.properties[t]!.houses));
      if (prop.houses < maxHouses) return err('Sell evenly across the set');
      const half = HOUSE_COST[def.group]! / 2;
      if (prop.houses === 5) {
        if (state.housesRemaining < 4) return err('Bank has no houses to break up the hotel');
        state.hotelsRemaining++;
        state.housesRemaining -= 4;
        prop.houses = 4;
      } else {
        state.housesRemaining++;
        prop.houses = (prop.houses - 1) as 0 | 1 | 2 | 3;
      }
      credit(state, actor, half);
      log(state, `${playerLabel(actor)} sells a building on ${def.name} for $${half}`);
      return ok(state);
    }

    case 'mortgage': {
      if (actor !== current || !MANAGE_PHASES.has(state.phase)) return err('Cannot mortgage now');
      if (state.phase === 'debt' && state.debt?.debtor !== actor) return err('Not your debt');
      const prop = state.properties[action.tile];
      if (!prop || prop.owner !== actor) return err('Not yours to mortgage');
      if (prop.mortgaged) return err('Already mortgaged');
      if (groupHasBuildings(state, groupOf(action.tile))) return err('Sell the buildings in this set first');
      prop.mortgaged = true;
      const value = priceOf(action.tile) / 2;
      credit(state, actor, value);
      log(state, `${playerLabel(actor)} mortgages ${tileName(action.tile)} for $${value}`);
      return ok(state);
    }

    case 'unmortgage': {
      if (actor !== current || (state.phase !== 'preRoll' && state.phase !== 'postRoll')) {
        return err('Cannot unmortgage now');
      }
      const prop = state.properties[action.tile];
      if (!prop || prop.owner !== actor) return err('Not yours');
      if (!prop.mortgaged) return err('Not mortgaged');
      const cost = Math.ceil((priceOf(action.tile) / 2) * 1.1);
      if (me.cash < cost) return err('Not enough cash');
      me.cash -= cost;
      prop.mortgaged = false;
      log(state, `${playerLabel(actor)} unmortgages ${tileName(action.tile)} for $${cost}`);
      return ok(state);
    }

    case 'proposeTrade': {
      if (actor !== current || (state.phase !== 'preRoll' && state.phase !== 'postRoll')) {
        return err('Trades happen on your turn, before or after rolling');
      }
      const { to, give, get } = action;
      if (to === actor || !state.players[to] || state.players[to]!.bankrupt) return err('Invalid trade partner');
      const giveError = validBundle(state, actor, give);
      if (giveError) return err(giveError);
      const getError = validBundle(state, to, get);
      if (getError) return err(getError);
      if (
        give.cash === 0 && give.properties.length === 0 && give.jailCards === 0 &&
        get.cash === 0 && get.properties.length === 0 && get.jailCards === 0
      ) {
        return err('Trade is empty');
      }
      state.trade = { from: actor, to, give, get, returnPhase: state.phase };
      state.phase = 'trade';
      log(state, `${playerLabel(actor)} proposes a trade to ${playerLabel(to)}`);
      return ok(state);
    }

    case 'acceptTrade': {
      if (state.phase !== 'trade' || !state.trade) return err('No trade pending');
      if (actor !== state.trade.to) return err('This trade is not for you');
      const { from, to, give, get } = state.trade;
      const giveError = validBundle(state, from, give);
      if (giveError) return err(giveError);
      const getError = validBundle(state, to, get);
      if (getError) return err(getError);

      // Mortgage transfer fee: 10% of mortgage value, charged to the recipient.
      const feeFor = (tiles: number[]) =>
        tiles.reduce(
          (sum, t) => sum + (state.properties[t]!.mortgaged ? Math.ceil((priceOf(t) / 2) * 0.1) : 0),
          0,
        );
      const toFee = feeFor(give.properties);
      const fromFee = feeFor(get.properties);
      const fromCashAfter = state.players[from]!.cash - give.cash + get.cash - fromFee;
      const toCashAfter = state.players[to]!.cash - get.cash + give.cash - toFee;
      if (fromCashAfter < 0) return err(`${playerLabel(from)} cannot cover the mortgage fees`);
      if (toCashAfter < 0) return err(`${playerLabel(to)} cannot cover the mortgage fees`);

      state.players[from]!.cash = fromCashAfter;
      state.players[to]!.cash = toCashAfter;
      for (const t of give.properties) state.properties[t]!.owner = to;
      for (const t of get.properties) state.properties[t]!.owner = from;
      state.players[from]!.getOutCards += get.jailCards - give.jailCards;
      state.players[to]!.getOutCards += give.jailCards - get.jailCards;

      log(state, `${playerLabel(to)} accepts the trade`);
      state.phase = state.trade.returnPhase;
      state.trade = null;
      return ok(state);
    }

    case 'rejectTrade':
    case 'cancelTrade': {
      if (state.phase !== 'trade' || !state.trade) return err('No trade pending');
      const allowed = action.type === 'rejectTrade' ? state.trade.to : state.trade.from;
      if (actor !== allowed) return err('Not your call');
      log(state, action.type === 'rejectTrade' ? 'Trade rejected' : 'Trade withdrawn');
      state.phase = state.trade.returnPhase;
      state.trade = null;
      return ok(state);
    }

    case 'payBail': {
      if (actor !== current || state.phase !== 'preRoll' || !me.inJail) return err('Not in jail');
      if (me.cash < JAIL_BAIL) return err('Not enough cash for bail');
      me.cash -= JAIL_BAIL;
      me.inJail = false;
      me.jailTurns = 0;
      log(state, `${playerLabel(actor)} pays $${JAIL_BAIL} bail`);
      return ok(state);
    }

    case 'useJailCard': {
      if (actor !== current || state.phase !== 'preRoll' || !me.inJail) return err('Not in jail');
      if (me.getOutCards < 1) return err('No Get Out of Jail Free card');
      me.getOutCards--;
      returnJailCard(state);
      me.inJail = false;
      me.jailTurns = 0;
      log(state, `${playerLabel(actor)} uses a Get Out of Jail Free card`);
      return ok(state);
    }

    case 'payDebt': {
      if (state.phase !== 'debt' || !state.debt) return err('No debt to pay');
      if (actor !== state.debt.debtor) return err('Not your debt');
      if (me.cash < state.debt.amount) return err('Still short — mortgage or sell first');
      me.cash -= state.debt.amount;
      if (state.debt.creditor !== 'bank') credit(state, state.debt.creditor, state.debt.amount);
      log(state, `${playerLabel(actor)} pays off the $${state.debt.amount} debt`);
      state.debt = null;
      state.phase = 'postRoll';
      return ok(state);
    }

    case 'declareBankruptcy': {
      if (state.phase !== 'debt' || !state.debt) return err('You are not in debt');
      if (actor !== state.debt.debtor) return err('Not your debt');
      executeBankruptcy(state, actor);
      return ok(state);
    }

    case 'endTurn': {
      if (actor !== current || state.phase !== 'postRoll') return err('Cannot end turn now');
      const rolledDoubles = state.dice !== null && state.dice[0] === state.dice[1];
      if (rolledDoubles && state.doublesCount > 0 && !me.inJail) {
        // Doubles grant another full roll.
        state.phase = 'preRoll';
        state.dice = null;
        state.hasRolled = false;
        log(state, `${playerLabel(actor)} rolls again after doubles`);
      } else {
        startNextTurn(state);
      }
      return ok(state);
    }

    default:
      return err('Unknown action');
  }
}

export const monopoly: GameDefinition<MonopolyState, MonopolyAction> = {
  id: 'monopoly',
  name: 'Monopoly',
  description: 'Full classic rules: auctions, trades, mortgages.',
  players: { min: 2, max: 6 },
  setup(numPlayers, seed) {
    let rng = seedRng(seed);
    const [chanceDeck, r1] = shuffle(CHANCE_CARDS.map((_, i) => i), rng);
    const [chestDeck, r2] = shuffle(CHEST_CARDS.map((_, i) => i), r1);
    rng = r2;
    return {
      rngState: rng,
      currentPlayer: 0,
      numPlayers,
      result: null,
      players: Array.from({ length: numPlayers }, () => ({
        cash: STARTING_CASH,
        pos: 0,
        inJail: false,
        jailTurns: 0,
        getOutCards: 0,
        bankrupt: false,
      })),
      properties: Object.fromEntries(
        PURCHASABLE.map((i) => [i, { owner: null, houses: 0 as const, mortgaged: false }]),
      ),
      phase: 'preRoll',
      dice: null,
      doublesCount: 0,
      hasRolled: false,
      chanceDeck,
      chestDeck,
      auction: null,
      trade: null,
      debt: null,
      housesRemaining: TOTAL_HOUSES,
      hotelsRemaining: TOTAL_HOTELS,
      lastCard: null,
      eliminated: [],
      log: [],
    };
  },
  reduce,
  legalActions(state, player) {
    if (state.result) return [];
    const me = state.players[player];
    if (!me || me.bankrupt) return [];
    const actions: MonopolyAction[] = [];
    const isCurrent = player === state.currentPlayer;

    switch (state.phase) {
      case 'preRoll':
        if (isCurrent) {
          if (me.inJail) {
            if (me.getOutCards > 0) actions.push({ type: 'useJailCard' });
            if (me.cash >= JAIL_BAIL) actions.push({ type: 'payBail' });
          }
          actions.push({ type: 'roll' });
        }
        break;
      case 'awaitBuy':
        if (isCurrent) {
          if (me.cash >= priceOf(me.pos)) actions.push({ type: 'buy' });
          actions.push({ type: 'declineBuy' });
        }
        break;
      case 'auction':
        if (state.auction && state.auction.turn === player) {
          actions.push({ type: 'auctionPass' });
          for (const inc of [1, 10, 50, 100]) {
            const amount = state.auction.highBid + inc;
            if (amount <= me.cash) actions.push({ type: 'bid', amount });
          }
        }
        break;
      case 'trade':
        if (state.trade?.to === player) {
          actions.push({ type: 'acceptTrade' }, { type: 'rejectTrade' });
        }
        if (state.trade?.from === player) actions.push({ type: 'cancelTrade' });
        break;
      case 'debt':
        if (state.debt?.debtor === player) {
          if (me.cash >= state.debt.amount) actions.push({ type: 'payDebt' });
          for (const [idxStr, prop] of Object.entries(state.properties)) {
            const tile = Number(idxStr);
            if (prop.owner !== player) continue;
            if (prop.houses > 0) actions.push({ type: 'sellBuilding', tile });
            else if (!prop.mortgaged && !groupHasBuildings(state, groupOf(tile))) {
              actions.push({ type: 'mortgage', tile });
            }
          }
          actions.push({ type: 'declareBankruptcy' });
        }
        break;
      case 'postRoll':
        if (isCurrent) actions.push({ type: 'endTurn' });
        break;
    }
    return actions;
  },
  view(state) {
    // Deck order is the only hidden information.
    return { ...state, chanceDeck: [], chestDeck: [] };
  },
};

export { liquidationValue };
