import { tileName, type MonopolyState } from '@bg/engine';
import { BottomSheet } from '../shared/BottomSheet';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { playerColor } from '../shared/playerColors';
import { canActFor, type GameSession } from '../../session/types';
import { DeedCard } from './DeedCard';
import { priceOf } from './theme';

export function AuctionSheet({ session }: { session: GameSession<MonopolyState> }) {
  const state = session.state;
  const auction = state.auction;
  if (state.phase !== 'auction' || !auction) return null;

  const bidder = auction.turn;
  const cash = state.players[bidder]!.cash;
  const iAct = canActFor(session, bidder);
  const name = session.seats[bidder]?.name ?? `Player ${bidder + 1}`;
  const listPrice = priceOf(auction.tile);

  return (
    <BottomSheet open title={`Auction · ${tileName(auction.tile)}`}>
      <div className="space-y-4">
        <DeedCard
          state={state}
          tile={auction.tile}
          compact
          seatNames={(seat) => session.seats[seat]?.name ?? `Player ${seat + 1}`}
        />

        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
          <span className="text-xs uppercase tracking-wider text-ink-400">High bid</span>
          {auction.highBidder !== null ? (
            <span className="flex items-center gap-2">
              <span className="tnum font-display text-2xl font-bold text-white">${auction.highBid}</span>
              <Avatar seat={auction.highBidder} name={session.seats[auction.highBidder]?.name} size="sm" />
            </span>
          ) : (
            <span className="tnum text-sm text-ink-500">no bids yet · list ${listPrice}</span>
          )}
        </div>

        {/* who's still in the running */}
        <div className="flex flex-wrap gap-1.5">
          {state.players.map((p, seat) =>
            p.bankrupt ? null : (
              <span
                key={seat}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  auction.out[seat] ? 'bg-white/[0.03] text-ink-600 line-through' : 'bg-white/8 text-ink-200'
                }`}
                style={
                  seat === bidder && !auction.out[seat]
                    ? { boxShadow: `0 0 0 1.5px ${playerColor(seat).hex}` }
                    : undefined
                }
              >
                <span className="h-2 w-2 rounded-full" style={{ background: playerColor(seat).hex }} />
                {session.seats[seat]?.name ?? `Player ${seat + 1}`}
              </span>
            ),
          )}
        </div>

        <p className="text-center text-sm">
          <span className="font-semibold" style={{ color: playerColor(bidder).hex }}>
            {name}
          </span>
          {iAct ? ' — your bid' : ' is deciding…'}
          <span className="tnum text-ink-400"> (has ${cash})</span>
        </p>

        {iAct ? (
          <>
            <div className="grid grid-cols-4 gap-2">
              {[1, 10, 50, 100].map((inc) => {
                const amount = auction.highBid + inc;
                return (
                  <Button
                    key={inc}
                    variant="secondary"
                    disabled={amount > cash}
                    onClick={() => session.dispatch({ type: 'bid', amount }, bidder)}
                  >
                    +${inc}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => session.dispatch({ type: 'auctionPass' }, bidder)}
            >
              Pass
            </Button>
          </>
        ) : null}
      </div>
    </BottomSheet>
  );
}
