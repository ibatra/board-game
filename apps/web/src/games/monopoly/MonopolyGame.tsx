import { useEffect, useRef, useState } from 'react';
import { JAIL_BAIL, TILES, tileName, type MonopolyState, type PlayerId } from '@bg/engine';
import { canActFor, type GameSession } from '../../session/types';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { playerColor } from '../shared/playerColors';
import { MonopolyBoard } from './Board';
import { DeedCard } from './DeedCard';
import { TileDetailSheet } from './TileDetailSheet';
import { ManageSheet } from './ManageSheet';
import { AuctionSheet } from './AuctionSheet';
import { PortfolioSheet } from './PortfolioSheet';
import { TradeComposeSheet, TradeRespondSheet } from './TradeSheet';
import { GROUP_HEX, groupOf, priceOf } from './theme';

export function MonopolyGame({ session }: { session: GameSession<MonopolyState> }) {
  const state = session.state;
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [portfolioSeat, setPortfolioSeat] = useState<PlayerId | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const beat = useLatestBeat(state.log);

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
  const price = priceOf(me.pos);

  return (
    <div className="px-2 pb-4">
      <TableStrip session={session} onSelect={setPortfolioSeat} />

      <div className="relative mx-auto max-w-lg">
        <MonopolyBoard state={state} selected={selectedTile} onSelect={setSelectedTile} />
        {/* The beat lands on the empty felt, where eyes already are. */}
        {beat ? (
          <div className="pointer-events-none absolute inset-x-8 bottom-[22%] flex justify-center">
            <p
              key={beat.id}
              className="animate-pop-in flex items-center gap-2 rounded-2xl bg-ink-950/85 px-3.5 py-2 text-center text-[13px] font-semibold text-white shadow-pop backdrop-blur"
            >
              <span className="text-base">{beat.icon}</span>
              {formatLog(beat.text, session)}
            </p>
          </div>
        ) : null}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-ink-500">Tap any square to see its deed</p>

      <div className="panel mx-auto mt-2 max-w-lg overflow-hidden">
        {/* who's up */}
        <div className="flex items-center gap-2.5 border-b border-white/5 px-3 py-2.5">
          <Avatar seat={current} name={currentName} size="sm" active />
          <span className="min-w-0 flex-1 truncate font-display font-bold text-white">
            {iAct ? 'Your turn' : `${currentName}'s turn`}
            {me.inJail ? <span className="ml-1.5 text-sm font-medium text-flame-400">· in jail</span> : null}
          </span>
          <span className="tnum font-display text-lg font-bold text-zest-400">${me.cash}</span>
        </div>

        <div className="p-3">
          {/* ── Buy decision: the deed makes the case for itself ── */}
          {state.phase === 'awaitBuy' ? (
            <div className="space-y-3">
              <DeedCard state={state} tile={me.pos} compact seatNames={(s) => session.seats[s]?.name ?? `P${s + 1}`} />
              {iAct ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={me.cash < price}
                    onClick={() => session.dispatch({ type: 'buy' }, current)}
                  >
                    {me.cash < price ? `Need $${price - me.cash} more` : `Buy · $${price}`}
                  </Button>
                  <Button variant="secondary" onClick={() => session.dispatch({ type: 'declineBuy' }, current)}>
                    Auction
                  </Button>
                </div>
              ) : (
                <Waiting name={currentName} what="deciding whether to buy" seat={current} />
              )}
            </div>
          ) : null}

          {/* ── Debt ── */}
          {state.phase === 'debt' && state.debt ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-berry-500/30 bg-berry-500/10 p-3">
                <p className="text-sm text-berry-500">
                  Owes{' '}
                  <span className="tnum font-display text-xl font-bold">${state.debt.amount}</span>{' '}
                  {state.debt.creditor === 'bank'
                    ? 'to the bank'
                    : `to ${session.seats[state.debt.creditor]?.name ?? 'another player'}`}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  Sell buildings or mortgage properties to raise the cash — or declare bankruptcy.
                </p>
              </div>
              {iAct ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="flex-1"
                    disabled={me.cash < state.debt.amount}
                    onClick={() => session.dispatch({ type: 'payDebt' }, current)}
                  >
                    Pay ${state.debt.amount}
                  </Button>
                  <Button variant="secondary" onClick={() => setManageOpen(true)}>
                    Raise funds
                  </Button>
                  <Button variant="danger" onClick={() => session.dispatch({ type: 'declareBankruptcy' }, current)}>
                    Bankrupt
                  </Button>
                </div>
              ) : (
                <Waiting name={currentName} what="raising funds" seat={current} />
              )}
            </div>
          ) : null}

          {/* ── Roll / end turn ── */}
          {state.phase === 'preRoll' || state.phase === 'postRoll' ? (
            <div className="space-y-3">
              <LandedOn session={session} seat={current} />

              {iAct && state.phase === 'preRoll' ? (
                <>
                  {me.inJail ? (
                    <p className="text-xs text-ink-400">
                      Roll doubles to get out (attempt {Math.min(me.jailTurns + 1, 3)} of 3), or buy your way
                      out.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
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
                    <Button size="lg" className="flex-1" onClick={() => session.dispatch({ type: 'roll' }, current)}>
                      🎲 Roll dice
                    </Button>
                  </div>
                </>
              ) : null}

              {iAct && state.phase === 'postRoll' ? (
                <Button size="lg" className="w-full" onClick={() => session.dispatch({ type: 'endTurn' }, current)}>
                  End turn →
                </Button>
              ) : null}

              {!iAct ? (
                <Waiting
                  name={currentName}
                  what={state.phase === 'preRoll' ? 'about to roll' : 'finishing their turn'}
                  seat={current}
                />
              ) : null}
            </div>
          ) : null}

          {/* ── Always-available management ── */}
          {iAct && state.phase !== 'auction' && state.phase !== 'trade' ? (
            <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setManageOpen(true)}>
                🏘️ Build & mortgage
              </Button>
              {state.phase !== 'debt' ? (
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setTradeOpen(true)}>
                  🤝 Trade
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setPortfolioSeat(current)}>
                📋 My deeds
              </Button>
            </div>
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
      <PortfolioSheet
        session={session}
        seat={portfolioSeat}
        onClose={() => setPortfolioSeat(null)}
        onSelectTile={setSelectedTile}
      />
      <ManageSheet session={session} seat={current} open={manageOpen && iAct} onClose={() => setManageOpen(false)} />
      <TradeComposeSheet session={session} seat={current} open={tradeOpen && iAct} onClose={() => setTradeOpen(false)} />
      <TradeRespondSheet session={session} />
      <AuctionSheet session={session} />
    </div>
  );
}

/** Money, property count and set progress for everyone at the table. */
function TableStrip({
  session,
  onSelect,
}: {
  session: GameSession<MonopolyState>;
  onSelect: (seat: PlayerId) => void;
}) {
  const state = session.state;
  return (
    <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {state.players.map((p, seat) => {
        const name = session.seats[seat]?.name ?? `Player ${seat + 1}`;
        const isTurn = !state.result && state.currentPlayer === seat;
        const owned = Object.values(state.properties).filter((prop) => prop.owner === seat).length;
        const color = playerColor(seat);
        return (
          <button
            key={seat}
            onClick={() => onSelect(seat)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-left transition-all ${
              p.bankrupt ? 'opacity-40' : isTurn ? 'bg-white/10' : 'bg-white/[0.03]'
            }`}
            style={isTurn ? { boxShadow: `0 0 0 1.5px ${color.hex}, 0 0 18px -6px ${color.hex}` } : undefined}
          >
            <Avatar seat={seat} name={name} size="sm" active={isTurn} />
            <span>
              <span className="block max-w-20 truncate text-[11px] font-semibold leading-tight text-white">
                {name}
                {session.seats[seat]?.isBot ? ' 🤖' : ''}
              </span>
              <span className="tnum block text-[11px] leading-tight text-ink-400">
                {p.bankrupt ? 'bankrupt' : `$${p.cash} · ${owned} deeds`}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The tile the current player is standing on, at a glance. */
function LandedOn({ session, seat }: { session: GameSession<MonopolyState>; seat: PlayerId }) {
  const state = session.state;
  const pos = state.players[seat]!.pos;
  const group = groupOf(pos);
  const prop = state.properties[pos];
  const owner = prop?.owner ?? null;
  const ownerName = owner === null ? null : (session.seats[owner]?.name ?? `Player ${owner + 1}`);

  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.04] px-3 py-2">
      <span
        className="h-8 w-1.5 shrink-0 rounded-full"
        style={{ background: group ? GROUP_HEX[group] : '#57507d' }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] uppercase tracking-wider text-ink-500">Standing on</span>
        <span className="block truncate text-sm font-semibold text-white">{tileName(pos)}</span>
      </span>
      <span className="shrink-0 text-right text-[11px]">
        {owner === seat ? (
          <span className="text-zest-400">Yours</span>
        ) : owner !== null ? (
          <span style={{ color: playerColor(owner).hex }}>{ownerName}&apos;s</span>
        ) : TILES[pos]!.kind === 'street' || TILES[pos]!.kind === 'railroad' || TILES[pos]!.kind === 'utility' ? (
          <span className="text-ink-400">Unowned</span>
        ) : null}
      </span>
    </div>
  );
}

function Waiting({ name, what, seat }: { name: string; what: string; seat: number }) {
  return (
    <p className="flex items-center justify-center gap-2 py-1.5 text-sm text-ink-400">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: playerColor(seat).hex, animation: 'breathe 1.4s ease-in-out infinite' }}
      />
      {name} is {what}…
    </p>
  );
}

type Beat = { id: number; text: string; icon: string };

/** Pulls the newest log line worth shouting about and shows it for a moment. */
function useLatestBeat(log: string[]): Beat | null {
  const [beat, setBeat] = useState<Beat | null>(null);
  const seen = useRef(log.length);

  useEffect(() => {
    if (log.length <= seen.current) {
      seen.current = log.length;
      return;
    }
    const fresh = log.slice(seen.current);
    seen.current = log.length;
    for (let i = fresh.length - 1; i >= 0; i--) {
      const line = fresh[i]!;
      const icon = iconFor(line);
      if (!icon) continue;
      setBeat({ id: seen.current * 100 + i, text: line, icon });
      break;
    }
  }, [log]);

  useEffect(() => {
    if (!beat) return;
    const t = setTimeout(() => setBeat(null), 2600);
    return () => clearTimeout(t);
  }, [beat]);

  return beat;
}

function iconFor(line: string): string | null {
  // Card draws are already shown full-size in the middle of the board.
  if (line.includes('draws:')) return null;
  if (line.includes('rent')) return '💸';
  if (line.includes('goes to Jail')) return '🚔';
  if (line.includes('bankrupt')) return '💀';
  if (line.includes('wins the auction')) return '🔨';
  if (line.includes('buys')) return '🤝';
  if (line.includes('builds')) return '🏗️';
  if (line.includes('passes GO')) return '💰';
  if (line.includes('accepts the trade')) return '✅';
  return null;
}

/** Replace P1/P2… engine labels with the real seat names. */
function formatLog(line: string, session: GameSession<MonopolyState>): string {
  return line.replace(/P(\d+)/g, (match, n) => session.seats[Number(n) - 1]?.name ?? match);
}
