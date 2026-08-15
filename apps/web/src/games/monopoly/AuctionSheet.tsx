import { tileName, type MonopolyState } from '@bg/engine';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../../ui/Button';
import { playerColor } from '../shared/playerColors';
import { canActFor, type GameSession } from '../../session/types';

export function AuctionSheet({ session }: { session: GameSession<MonopolyState> }) {
  const state = session.state;
  const auction = state.auction;
  if (state.phase !== 'auction' || !auction) return null;

  const bidder = auction.turn;
  const cash = state.players[bidder]!.cash;
  const iAct = canActFor(session, bidder);
  const name = session.seats[bidder]?.name ?? `Player ${bidder + 1}`;

  return (
    <BottomSheet open title={`Auction: ${tileName(auction.tile)}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3">
          <span className="text-slate-400">High bid</span>
          <span className="text-xl font-bold">
            {auction.highBidder !== null ? (
              <>
                ${auction.highBid}
                <span className={`ml-2 text-sm ${playerColor(auction.highBidder).text}`}>
                  {session.seats[auction.highBidder]?.name}
                </span>
              </>
            ) : (
              'none yet'
            )}
          </span>
        </div>

        <p className="text-center text-sm">
          <span className={`font-semibold ${playerColor(bidder).text}`}>{name}</span>
          {iAct ? ' — your bid' : ' is deciding…'}
          <span className="text-slate-400"> (has ${cash})</span>
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
            <Button variant="danger" className="w-full" onClick={() => session.dispatch({ type: 'auctionPass' }, bidder)}>
              Pass
            </Button>
          </>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          {state.players.map((p, seat) =>
            p.bankrupt ? null : (
              <span key={seat} className={auction.out[seat] ? 'line-through opacity-50' : ''}>
                {session.seats[seat]?.name}
              </span>
            ),
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
