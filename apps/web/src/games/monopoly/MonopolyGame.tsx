import { useEffect, useState } from 'react';
import { JAIL_BAIL, TILES, tileName, type MonopolyState } from '@bg/engine';
import { canActFor, type GameSession } from '../../session/types';
import { Button } from '../../ui/Button';
import { playerColor } from '../shared/playerColors';
import { GROUP_HEX, MonopolyBoard } from './Board';
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
  const tileHue =
    tileHere.kind === 'street'
      ? GROUP_HEX[tileHere.group]
      : tileHere.kind === 'railroad'
        ? GROUP_HEX['railroad']
        : tileHere.kind === 'utility'
          ? GROUP_HEX['utility']
          : '#57507d';

  return (
    <div className="px-2 pb-4">
      <MonopolyBoard state={state} selected={selectedTile} onSelect={setSelectedTile} />

      {/* current tile + action dock */}
      <div className="panel mx-auto mt-3 max-w-lg p-3">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: tileHue ?? '#57507d' }} />
          <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedTile(me.pos)}>
            <span className="block text-xs text-ink-400">
              <span className="font-semibold" style={{ color: playerColor(current).hex }}>
                {currentName}
              </span>{' '}
              is on{me.inJail ? ' · in jail' : ''}
            </span>
            <span className="block truncate font-display font-bold text-white">
              {tileName(me.pos)}
              <span className="ml-1 text-ink-500">›</span>
            </span>
          </button>
          <span className="tnum shrink-0 font-display text-xl font-bold text-zest-400">${me.cash}</span>
        </div>

        {state.phase === 'debt' && state.debt ? (
          <p className="mb-2 rounded-xl border border-berry-500/30 bg-berry-500/10 px-3 py-2 text-sm text-berry-500">
            Owes ${state.debt.amount}
            {state.debt.creditor === 'bank' ? ' to the bank' : ` to ${session.seats[state.debt.creditor]?.name}`}
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
                  Pay ${JAIL_BAIL}
                </Button>
              ) : null}
              <Button className="flex-1" onClick={() => session.dispatch({ type: 'roll' }, current)}>
                Roll dice
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
                Buy · ${priceHere}
              </Button>
              <Button variant="secondary" onClick={() => session.dispatch({ type: 'declineBuy' }, current)}>
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
              End turn →
            </Button>
          ) : null}

          {iAct && (state.phase === 'preRoll' || state.phase === 'postRoll' || state.phase === 'debt') ? (
            <>
              <Button variant="secondary" onClick={() => setManageOpen(true)} aria-label="Manage properties">
                🏘️
              </Button>
              {state.phase !== 'debt' ? (
                <Button variant="secondary" onClick={() => setTradeOpen(true)} aria-label="Trade">
                  🤝
                </Button>
              ) : null}
            </>
          ) : null}

          {!iAct && !state.result ? (
            <p className="flex w-full items-center justify-center gap-2 py-2 text-sm text-ink-400">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: playerColor(current).hex, animation: 'breathe 1.4s ease-in-out infinite' }}
              />
              Waiting for {currentName}…
            </p>
          ) : null}
        </div>
      </div>

      {/* event log */}
      {state.log.length > 0 ? (
        <div className="mx-auto mt-3 max-w-lg rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2">
          {state.log.slice(-4).map((line, i, arr) => (
            <p
              key={`${state.log.length}-${i}`}
              className={`truncate py-0.5 text-xs ${
                i === arr.length - 1 ? 'font-medium text-ink-200' : 'text-ink-500'
              }`}
            >
              {formatLog(line, session)}
            </p>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="animate-pop-in fixed inset-x-4 top-4 z-50 rounded-2xl bg-berry-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
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
