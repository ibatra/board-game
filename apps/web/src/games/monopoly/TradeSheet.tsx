import { useState } from 'react';
import { tileName, type MonopolyState, type PlayerId, type TradeBundle } from '@bg/engine';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../../ui/Button';
import { playerColor } from '../shared/playerColors';
import { canActFor, type GameSession } from '../../session/types';

const emptyBundle: TradeBundle = { cash: 0, properties: [], jailCards: 0 };

/** Compose a new trade offer (current player) — opened from the dock. */
export function TradeComposeSheet({
  session,
  seat,
  open,
  onClose,
}: {
  session: GameSession<MonopolyState>;
  seat: PlayerId;
  open: boolean;
  onClose: () => void;
}) {
  const state = session.state;
  const partners = state.players
    .map((_, i) => i)
    .filter((i) => i !== seat && !state.players[i]!.bankrupt);
  const [to, setTo] = useState<PlayerId | null>(null);
  const [give, setGive] = useState<TradeBundle>(emptyBundle);
  const [get, setGet] = useState<TradeBundle>(emptyBundle);

  function reset() {
    setTo(null);
    setGive(emptyBundle);
    setGet(emptyBundle);
  }

  const propsOf = (owner: PlayerId) =>
    Object.entries(state.properties)
      .filter(([, p]) => p.owner === owner)
      .map(([idx]) => Number(idx));

  function toggle(bundle: TradeBundle, setBundle: (b: TradeBundle) => void, tile: number) {
    setBundle({
      ...bundle,
      properties: bundle.properties.includes(tile)
        ? bundle.properties.filter((t) => t !== tile)
        : [...bundle.properties, tile],
    });
  }

  return (
    <BottomSheet open={open} title="Propose a trade" onClose={() => { reset(); onClose(); }}>
      {to === null ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Trade with…</p>
          {partners.map((p) => (
            <Button key={p} variant="secondary" className="w-full" onClick={() => setTo(p)}>
              <span className={playerColor(p).text}>{session.seats[p]?.name ?? `Player ${p + 1}`}</span>
            </Button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(
            [
              ['You give', seat, give, setGive],
              [`${session.seats[to]?.name} gives`, to, get, setGet],
            ] as const
          ).map(([label, owner, bundle, setBundle]) => (
            <div key={label} className="rounded-xl bg-slate-900/60 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-300">{label}</p>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm text-slate-400">Cash $</span>
                <input
                  type="number"
                  min={0}
                  max={state.players[owner]!.cash}
                  value={bundle.cash || ''}
                  placeholder="0"
                  onChange={(e) => setBundle({ ...bundle, cash: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-24 rounded-lg bg-slate-800 px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500">of ${state.players[owner]!.cash}</span>
                {state.players[owner]!.getOutCards > 0 ? (
                  <label className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={bundle.jailCards > 0}
                      onChange={(e) => setBundle({ ...bundle, jailCards: e.target.checked ? 1 : 0 })}
                    />
                    Jail card
                  </label>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {propsOf(owner).map((tile) => (
                  <button
                    key={tile}
                    onClick={() => toggle(bundle, setBundle, tile)}
                    className={`rounded-full px-2.5 py-1.5 text-xs ${
                      bundle.properties.includes(tile)
                        ? 'bg-emerald-500 text-emerald-950'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tileName(tile)}
                    {state.properties[tile]!.mortgaged ? ' 🔒' : ''}
                  </button>
                ))}
                {propsOf(owner).length === 0 ? <span className="text-xs text-slate-500">No properties</span> : null}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setTo(null)}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                session.dispatch({ type: 'proposeTrade', to, give, get }, seat);
                reset();
                onClose();
              }}
            >
              Propose
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

/** A pending proposal awaiting the target's answer. */
export function TradeRespondSheet({ session }: { session: GameSession<MonopolyState> }) {
  const state = session.state;
  const trade = state.trade;
  if (state.phase !== 'trade' || !trade) return null;

  const responderActs = canActFor(session, trade.to);
  const proposerActs = canActFor(session, trade.from);
  const fromName = session.seats[trade.from]?.name ?? `Player ${trade.from + 1}`;
  const toName = session.seats[trade.to]?.name ?? `Player ${trade.to + 1}`;

  const renderBundle = (bundle: TradeBundle) => (
    <ul className="space-y-1 text-sm">
      {bundle.cash > 0 ? <li>💵 ${bundle.cash}</li> : null}
      {bundle.properties.map((t) => (
        <li key={t}>
          🏘️ {tileName(t)}
          {state.properties[t]!.mortgaged ? ' 🔒' : ''}
        </li>
      ))}
      {bundle.jailCards > 0 ? <li>🎟️ Get Out of Jail Free ×{bundle.jailCards}</li> : null}
      {bundle.cash === 0 && bundle.properties.length === 0 && bundle.jailCards === 0 ? (
        <li className="text-slate-500">nothing</li>
      ) : null}
    </ul>
  );

  return (
    <BottomSheet open title={`Trade: ${fromName} → ${toName}`}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-900/60 p-3">
          <p className={`mb-2 text-xs font-semibold uppercase ${playerColor(trade.from).text}`}>{fromName} gives</p>
          {renderBundle(trade.give)}
        </div>
        <div className="rounded-xl bg-slate-900/60 p-3">
          <p className={`mb-2 text-xs font-semibold uppercase ${playerColor(trade.to).text}`}>{toName} gives</p>
          {renderBundle(trade.get)}
        </div>
      </div>
      {responderActs ? (
        <div className="mt-4 flex gap-2">
          <Button variant="danger" className="flex-1" onClick={() => session.dispatch({ type: 'rejectTrade' }, trade.to)}>
            Reject
          </Button>
          <Button className="flex-1" onClick={() => session.dispatch({ type: 'acceptTrade' }, trade.to)}>
            Accept
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-slate-400">Waiting for {toName}…</p>
      )}
      {proposerActs && !responderActs ? (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => session.dispatch({ type: 'cancelTrade' }, trade.from)}>
          Withdraw offer
        </Button>
      ) : null}
    </BottomSheet>
  );
}
