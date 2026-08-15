import { GROUP_TILES, HOUSE_COST, TILES, tileName, type MonopolyState, type PlayerId } from '@bg/engine';
import { BottomSheet } from '../shared/BottomSheet';
import { GROUP_HEX } from './Board';
import { Button } from '../../ui/Button';
import type { GameSession } from '../../session/types';

/** Build / sell / mortgage / unmortgage — engine validation is the referee;
 *  buttons dispatch and any rejection shows as the session error toast. */
export function ManageSheet({
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
  const mine = Object.entries(state.properties)
    .filter(([, p]) => p.owner === seat)
    .map(([idx]) => Number(idx));

  const byGroup = new Map<string, number[]>();
  for (const tile of mine) {
    const def = TILES[tile]!;
    const group = def.kind === 'street' ? def.group : def.kind === 'railroad' ? 'railroad' : 'utility';
    byGroup.set(group, [...(byGroup.get(group) ?? []), tile]);
  }

  const inDebt = state.phase === 'debt';

  return (
    <BottomSheet open={open} title={`Properties — $${state.players[seat]!.cash}`} onClose={onClose}>
      {mine.length === 0 ? <p className="text-ink-400">You own nothing yet.</p> : null}
      <div className="space-y-4">
        {[...byGroup.entries()].map(([group, tiles]) => {
          const fullSet =
            group !== 'railroad' &&
            group !== 'utility' &&
            (GROUP_TILES[group] ?? []).every((t) => state.properties[t]!.owner === seat);
          return (
            <div key={group}>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-3 w-8 rounded" style={{ background: GROUP_HEX[group] }} />
                <span className="text-xs uppercase tracking-wide text-ink-400">
                  {group}
                  {fullSet ? ' · full set' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {tiles.map((tile) => {
                  const prop = state.properties[tile]!;
                  const def = TILES[tile]!;
                  const isStreet = def.kind === 'street';
                  const houseCost = isStreet && def.kind === 'street' ? HOUSE_COST[def.group]! : 0;
                  const mortgageValue = (def.kind === 'street' || def.kind === 'railroad' || def.kind === 'utility' ? def.price : 0) / 2;
                  return (
                    <div key={tile} className="flex items-center gap-2 rounded-lg bg-ink-900/60 p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {tileName(tile)}
                          {prop.mortgaged ? ' 🔒' : ''}
                          {prop.houses > 0 ? ` · ${prop.houses === 5 ? '🏨' : '🏠'.repeat(prop.houses)}` : ''}
                        </p>
                      </div>
                      {isStreet && fullSet && !inDebt && prop.houses < 5 ? (
                        <Button
                          variant="secondary"
                          className="min-h-9 px-2 text-xs"
                          onClick={() => session.dispatch({ type: 'build', tile }, seat)}
                        >
                          Build ${houseCost}
                        </Button>
                      ) : null}
                      {isStreet && prop.houses > 0 ? (
                        <Button
                          variant="secondary"
                          className="min-h-9 px-2 text-xs"
                          onClick={() => session.dispatch({ type: 'sellBuilding', tile }, seat)}
                        >
                          Sell ${houseCost / 2}
                        </Button>
                      ) : null}
                      {prop.houses === 0 && !prop.mortgaged ? (
                        <Button
                          variant="secondary"
                          className="min-h-9 px-2 text-xs"
                          onClick={() => session.dispatch({ type: 'mortgage', tile }, seat)}
                        >
                          Mortgage ${mortgageValue}
                        </Button>
                      ) : null}
                      {prop.mortgaged && !inDebt ? (
                        <Button
                          variant="secondary"
                          className="min-h-9 px-2 text-xs"
                          onClick={() => session.dispatch({ type: 'unmortgage', tile }, seat)}
                        >
                          Redeem ${Math.ceil(mortgageValue * 1.1)}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
