import { GROUP_TILES, HOUSE_COST, rentFor, TILES, tileName, type MonopolyState } from '@bg/engine';
import { BottomSheet } from '../shared/BottomSheet';
import { playerColor } from '../shared/playerColors';
import { GROUP_HEX } from './Board';
import type { GameSession } from '../../session/types';

export function TileDetailSheet({
  session,
  tile,
  onClose,
}: {
  session: GameSession<MonopolyState>;
  tile: number | null;
  onClose: () => void;
}) {
  if (tile === null) return null;
  const state = session.state;
  const def = TILES[tile]!;
  const prop = state.properties[tile];

  return (
    <BottomSheet open title={tileName(tile)} onClose={onClose}>
      {def.kind === 'street' ? (
        <div className="space-y-3">
          <div className="h-2 rounded" style={{ background: GROUP_HEX[def.group] }} />
          <Ownership state={state} session={session} tile={tile} />
          <table className="w-full text-sm">
            <tbody>
              <Row label="Price" value={`$${def.price}`} />
              <Row label="Rent" value={`$${def.rents[0]}`} />
              <Row label="Rent with full set" value={`$${def.rents[0]! * 2}`} />
              <Row label="With 1 house" value={`$${def.rents[1]}`} />
              <Row label="With 2 houses" value={`$${def.rents[2]}`} />
              <Row label="With 3 houses" value={`$${def.rents[3]}`} />
              <Row label="With 4 houses" value={`$${def.rents[4]}`} />
              <Row label="With hotel" value={`$${def.rents[5]}`} />
              <Row label="Mortgage value" value={`$${def.price / 2}`} />
              <Row label="House cost" value={`$${HOUSE_COST[def.group]}`} />
            </tbody>
          </table>
          {prop && prop.owner !== null ? (
            <p className="text-sm text-slate-400">
              Current rent: <span className="font-semibold text-slate-200">${rentFor(state, tile, 7)}</span>
              {(GROUP_TILES[def.group] ?? []).every((t) => state.properties[t]!.owner === prop.owner)
                ? ' (full set)'
                : ''}
            </p>
          ) : null}
        </div>
      ) : def.kind === 'railroad' ? (
        <div className="space-y-3">
          <Ownership state={state} session={session} tile={tile} />
          <table className="w-full text-sm">
            <tbody>
              <Row label="Price" value={`$${def.price}`} />
              <Row label="1 railroad owned" value="$25" />
              <Row label="2 railroads" value="$50" />
              <Row label="3 railroads" value="$100" />
              <Row label="4 railroads" value="$200" />
              <Row label="Mortgage value" value={`$${def.price / 2}`} />
            </tbody>
          </table>
        </div>
      ) : def.kind === 'utility' ? (
        <div className="space-y-3">
          <Ownership state={state} session={session} tile={tile} />
          <table className="w-full text-sm">
            <tbody>
              <Row label="Price" value={`$${def.price}`} />
              <Row label="One utility" value="4 × dice roll" />
              <Row label="Both utilities" value="10 × dice roll" />
              <Row label="Mortgage value" value={`$${def.price / 2}`} />
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-300">
          {def.kind === 'go' && 'Collect $200 salary as you pass.'}
          {def.kind === 'jail' && 'Just visiting — unless you were sent here.'}
          {def.kind === 'freeParking' && 'Free resting spot. Nothing happens.'}
          {def.kind === 'goToJail' && 'Go directly to Jail. Do not pass GO.'}
          {def.kind === 'tax' && `Pay $${def.amount} to the bank.`}
          {(def.kind === 'chance' || def.kind === 'chest') && 'Draw a card and follow it.'}
        </p>
      )}
    </BottomSheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-700/60 last:border-0">
      <td className="py-1.5 text-slate-400">{label}</td>
      <td className="py-1.5 text-right font-medium">{value}</td>
    </tr>
  );
}

function Ownership({
  state,
  session,
  tile,
}: {
  state: MonopolyState;
  session: GameSession<MonopolyState>;
  tile: number;
}) {
  const prop = state.properties[tile];
  if (!prop) return null;
  if (prop.owner === null) return <p className="text-sm text-slate-400">Unowned</p>;
  const color = playerColor(prop.owner);
  return (
    <p className="flex items-center gap-2 text-sm">
      <span className={`h-3 w-3 rounded-full ${color.bg}`} />
      Owned by {session.seats[prop.owner]?.name ?? `Player ${prop.owner + 1}`}
      {prop.mortgaged ? <span className="text-slate-400"> · mortgaged 🔒</span> : null}
      {prop.houses > 0 ? (
        <span className="text-slate-400"> · {prop.houses === 5 ? 'hotel' : `${prop.houses} house${prop.houses > 1 ? 's' : ''}`}</span>
      ) : null}
    </p>
  );
}
