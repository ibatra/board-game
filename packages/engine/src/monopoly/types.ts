import type { BaseState, PlayerId } from '../core/types';

export interface MonopolyPlayer {
  cash: number;
  pos: number;
  inJail: boolean;
  jailTurns: number;
  getOutCards: number;
  bankrupt: boolean;
}

export interface PropertyState {
  owner: PlayerId | null;
  /** 0-4 houses; 5 = hotel. */
  houses: 0 | 1 | 2 | 3 | 4 | 5;
  mortgaged: boolean;
}

export type MonopolyPhase =
  | 'preRoll'
  | 'awaitBuy'
  | 'auction'
  | 'trade'
  | 'debt'
  | 'postRoll'
  | 'gameOver';

export interface AuctionState {
  tile: number;
  /** Seat whose turn it is to bid or pass. */
  turn: PlayerId;
  highBid: number;
  highBidder: PlayerId | null;
  /** Seats that dropped out (or are bankrupt). */
  out: boolean[];
}

export interface TradeBundle {
  cash: number;
  properties: number[];
  jailCards: number;
}

export interface TradeState {
  from: PlayerId;
  to: PlayerId;
  give: TradeBundle;
  get: TradeBundle;
  returnPhase: 'preRoll' | 'postRoll';
}

export interface DebtState {
  debtor: PlayerId;
  creditor: PlayerId | 'bank';
  amount: number;
}

export interface DrawnCard {
  deck: 'chance' | 'chest';
  text: string;
}

export interface MonopolyState extends BaseState {
  players: MonopolyPlayer[];
  properties: Record<number, PropertyState>;
  phase: MonopolyPhase;
  dice: [number, number] | null;
  doublesCount: number;
  /** Whether the movement roll already happened this turn. */
  hasRolled: boolean;
  chanceDeck: number[];
  chestDeck: number[];
  auction: AuctionState | null;
  trade: TradeState | null;
  debt: DebtState | null;
  housesRemaining: number;
  hotelsRemaining: number;
  /** Most recent card drawn, for the UI. */
  lastCard: DrawnCard | null;
  /** Seats in the order they went bankrupt (for final ranking). */
  eliminated: PlayerId[];
  log: string[];
}

export type MonopolyAction =
  | { type: 'roll' }
  | { type: 'buy' }
  | { type: 'declineBuy' }
  | { type: 'bid'; amount: number }
  | { type: 'auctionPass' }
  | { type: 'build'; tile: number }
  | { type: 'sellBuilding'; tile: number }
  | { type: 'mortgage'; tile: number }
  | { type: 'unmortgage'; tile: number }
  | { type: 'proposeTrade'; to: PlayerId; give: TradeBundle; get: TradeBundle }
  | { type: 'acceptTrade' }
  | { type: 'rejectTrade' }
  | { type: 'cancelTrade' }
  | { type: 'payBail' }
  | { type: 'useJailCard' }
  | { type: 'payDebt' }
  | { type: 'declareBankruptcy' }
  | { type: 'endTurn' };
