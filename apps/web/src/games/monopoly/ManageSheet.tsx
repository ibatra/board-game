import { GROUP_TILES, TILES, tileName, type MonopolyState, type PlayerId } from '@bg/engine';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../../ui/Button';
import type { GameSession } from '../../session/types';
import { GROUP_HEX, GROUP_LABEL, houseCostOf, priceOf } from './theme';

/** Build / sell / mortgage / unmortgage — the engine is the referee, so every
 *  button just dispatches and any rejection surfaces as the error toast. */
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
  const cash = state.players[seat]?.cash ?? 0;
  const inDebt = state.phase === 'debt';

  const owned = Object.entries(state.properties)
    .filter(([, p]) => p.owner === seat)
    .map(([k]) => Number(k));

  const groups = [...new Set(owned.map(groupKey))];

  return (
    <BottomSheet open={open} title={inDebt ? 'Raise funds' : 'Build & mortgage'} onClose={onClose}>
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-2.5 text-sm">
        <span className="text-ink-400">Cash</span>
        <span className="tnum font-display text-xl font-bold text-zest-400">${cash}</span>
        <span className="tnum text-xs text-ink-500">
          bank: {state.housesRemaining} 🏠 · {state.hotelsRemaining} 🏨
        </span>
      </div>

      {owned.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">You don&apos;t own anything yet.</p>
      ) : null}

      <div className="space-y-4">
        {groups.map((group) => {
          const tiles = (GROUP_TILES[group] ?? []).filter((t) => state.properties[t]?.owner === seat);
          const fullSet =
            group !== 'railroad' &&
            group !== 'utility' &&
            (GROUP_TILES[group] ?? []).every((t) => state.properties[t]?.owner === seat);
          const houseCost = houseCostOf(group);

          return (
            <div key={group}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-2.5 w-6 rounded-full" style={{ background: GROUP_HEX[group] }} />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                  {GROUP_LABEL[group]}
                </span>
                {fullSet ? (
                  <span className="rounded-full bg-zest-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zest-400">
                    Full set · can build
                  </span>
                ) : group !== 'railroad' && group !== 'utility' ? (
                  <span className="text-[11px] text-ink-500">need the full set to build</span>
                ) : null}
              </div>

              <div className="space-y-1.5">
                {tiles.map((tile) => {
                  const prop = state.properties[tile]!;
                  const def = TILES[tile]!;
                  const isStreet = def.kind === 'street';
                  const mortgageValue = priceOf(tile) / 2;

                  return (
                    <div key={tile} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                        {tileName(tile)}
                      </span>
                      {prop.mortgaged ? (
                        <span className="rounded-full bg-berry-500/15 px-2 py-0.5 text-[10px] font-semibold text-berry-500">
                          Mortgaged
                        </span>
                      ) : isStreet && (fullSet || prop.houses > 0) ? (
                        <BuildingPips houses={prop.houses} />
                      ) : null}

                      <div className="flex flex-wrap gap-1.5">
                        {isStreet && fullSet && !inDebt && !prop.mortgaged && prop.houses < 5 ? (
                          <Button
                            size="sm"
                            onClick={() => session.dispatch({ type: 'build', tile }, seat)}
                            disabled={cash < houseCost}
                          >
                            {prop.houses === 4 ? `Hotel · $${houseCost}` : `Build · $${houseCost}`}
                          </Button>
                        ) : null}
                        {isStreet && prop.houses > 0 ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => session.dispatch({ type: 'sellBuilding', tile }, seat)}
                          >
                            Sell · +${houseCost / 2}
                          </Button>
                        ) : null}
                        {prop.houses === 0 && !prop.mortgaged ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => session.dispatch({ type: 'mortgage', tile }, seat)}
                          >
                            Mortgage +${mortgageValue}
                          </Button>
                        ) : null}
                        {prop.mortgaged && !inDebt ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={cash < Math.ceil(mortgageValue * 1.1)}
                            onClick={() => session.dispatch({ type: 'unmortgage', tile }, seat)}
                          >
                            Redeem · ${Math.ceil(mortgageValue * 1.1)}
                          </Button>
                        ) : null}
                      </div>
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

function groupKey(tile: number): string {
  const def = TILES[tile]!;
  return def.kind === 'street' ? def.group : def.kind === 'railroad' ? 'railroad' : 'utility';
}

/** Four house slots, filled left to right; a hotel replaces the row. */
function BuildingPips({ houses }: { houses: number }) {
  if (houses === 5) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-white">
        <span className="h-3 w-5 rounded-[2px] bg-[#d92b2b]" /> Hotel
      </span>
    );
  }
  return (
    <span className="flex gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-[2px] ${i < houses ? 'bg-[#1f9e4b]' : 'bg-white/10'}`}
        />
      ))}
    </span>
  );
}
