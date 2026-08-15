import { useEffect, useState } from 'react';
import { JAIL_BAIL, TILES, tileName, type MonopolyState } from '@bg/engine';
import { canActFor, type GameSession } from '../../session/types';
import { Button } from '../../ui/Button';
import { playerColor } from '../shared/playerColors';
import { MonopolyBoard } from './Board';
import { TileDetailSheet } from './TileDetailSheet';
import { ManageSheet } from './ManageSheet';
import { AuctionSheet } from './AuctionSheet';
import { TradeComposeSheet, TradeRespondSheet } from './TradeSheet';

export function MonopolyGame({ session }: { session: GameSession<MonopolyState> }) {
  const state = session.state;
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface engine rejections briefly.
  useEffect(() => {
    if (!session.lastError) return;
    setError(session.lastError);
    const t = setTimeout(() => setError(null), 2500);
    return () => clearTimeout(t);
  }, [session.lastError]);

  const current = state.currentPlayer;
  const me = state.players[current]!;
  const iAct = !state.result && canActFor(session, current);
  const currentName = session.seats[current]?.name ?? `Player ${current + 1}`;

  const tileHere = TILES[me.pos]!;
  const priceHere =
    tileHere.kind === 'street' || tileHere.kind === 'railroad' || tileHere.kind === 'utility'
      ? tileHere.price
      : 0;

  return (
    <div className="px-2 pb-4">
      <MonopolyBoard state={state} selected={selectedTile} onSelect={setSelectedTile} />

      {/* current tile + action dock */}
      <div className="mx-auto mt-3 max-w-lg rounded-2xl bg-slate-800 p-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>
            <span className={`font-semibold ${playerColor(current).text}`}>{currentName}</span>
            <span className="text-slate-400"> on </span>
            <button className="font-medium underline decoration-dotted" onClick={() => setSelectedTile(me.pos)}>
              {tileName(me.pos)}
            </button>
            {me.inJail ? <span className="text-slate-400"> (in Jail)</span> : null}
          </span>
          <span className="font-semibold">${me.cash}</span>
        </div>

        {state.phase === 'debt' && state.debt ? (
          <p className="mb-2 rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
            Owes ${state.debt.amount}
            {state.debt.creditor === 'bank'
              ? ' to the bank'
              : ` to ${session.seats[state.debt.creditor]?.name}`}
            {' — '}sell or mortgage to raise funds.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {iAct && state.phase === 'preRoll' ? (
            <>
              {me.inJail && me.getOutCards > 0 ? (
                <Button variant="secondary" onClick={() => session.dispatch({ type: 'useJailCard' }, current)}>
                  🎟️ Use card
                </Button>
              ) : null}
              {me.inJail && me.cash >= JAIL_BAIL ? (
                <Button variant="secondary" onClick={() => session.dispatch({ type: 'payBail' }, current)}>
                  Pay ${JAIL_BAIL} bail
                </Button>
              ) : null}
              <Button className="flex-1" onClick={() => session.dispatch({ type: 'roll' }, current)}>
                🎲 Roll
              </Button>
            </>
          ) : null}

          {iAct && state.phase === 'awaitBuy' ? (
            <>
              <Button
                className="flex-1"
                disabled={me.cash < priceHere}
                onClick={() => session.dispatch({ type: 'buy' }, current)}
              >
                Buy for ${priceHere}
              </Button>
              <Button variant="danger" onClick={() => session.dispatch({ type: 'declineBuy' }, current)}>
                Auction it
              </Button>
            </>
          ) : null}

          {iAct && state.phase === 'debt' && state.debt ? (
            <>
              <Button
                className="flex-1"
                disabled={me.cash < state.debt.amount}
                onClick={() => session.dispatch({ type: 'payDebt' }, current)}
              >
                Pay ${state.debt.amount}
              </Button>
              <Button variant="danger" onClick={() => session.dispatch({ type: 'declareBankruptcy' }, current)}>
                Go bankrupt
              </Button>
            </>
          ) : null}

          {iAct && state.phase === 'postRoll' ? (
            <Button className="flex-1" onClick={() => session.dispatch({ type: 'endTurn' }, current)}>
              End turn ➤
            </Button>
          ) : null}

          {iAct && (state.phase === 'preRoll' || state.phase === 'postRoll' || state.phase === 'debt') ? (
            <>
              <Button variant="secondary" onClick={() => setManageOpen(true)}>
                🏘️
              </Button>
              {state.phase !== 'debt' ? (
                <Button variant="secondary" onClick={() => setTradeOpen(true)}>
                  🤝
                </Button>
              ) : null}
            </>
          ) : null}

          {!iAct && !state.result ? (
            <p className="w-full py-1 text-center text-sm text-slate-400">Waiting for {currentName}…</p>
          ) : null}
        </div>
      </div>

      {/* event log */}
      <div className="mx-auto mt-3 max-w-lg rounded-xl bg-slate-900/60 p-3 text-xs text-slate-400">
        {state.log.slice(-4).map((line, i) => (
          <p key={`${state.log.length}-${i}`} className="truncate">
            {formatLog(line, session)}
          </p>
        ))}
      </div>

      {error ? (
        <div className="fixed inset-x-4 top-4 z-50 rounded-xl bg-rose-600 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
          {error}
        </div>
      ) : null}

      <TileDetailSheet session={session} tile={selectedTile} onClose={() => setSelectedTile(null)} />
      <ManageSheet session={session} seat={current} open={manageOpen && iAct} onClose={() => setManageOpen(false)} />
      <TradeComposeSheet session={session} seat={current} open={tradeOpen && iAct} onClose={() => setTradeOpen(false)} />
      <TradeRespondSheet session={session} />
      <AuctionSheet session={session} />
    </div>
  );
}

/** Replace P1/P2… engine labels with the real seat names. */
function formatLog(line: string, session: GameSession<MonopolyState>): string {
  return line.replace(/P(\d+)/g, (match, n) => session.seats[Number(n) - 1]?.name ?? match);
}
