import { GROUP_TILES, TILES, tileName, type MonopolyState, type PlayerId } from '@bg/engine';
import { BottomSheet } from '../shared/BottomSheet';
import { Avatar } from '../../ui/Avatar';
import type { GameSession } from '../../session/types';
import { GROUP_HEX, GROUP_LABEL, netWorth, priceOf } from './theme';

/** Every colour group, in board order, so "who's close to a set" is obvious. */
const GROUPS = [
  'brown',
  'lightblue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'darkblue',
  'railroad',
  'utility',
];

export function PortfolioSheet({
  session,
  seat,
  onClose,
  onSelectTile,
}: {
  session: GameSession<MonopolyState>;
  seat: PlayerId | null;
  onClose: () => void;
  onSelectTile: (tile: number) => void;
}) {
  if (seat === null) return null;
  const state = session.state;
  const player = state.players[seat];
  if (!player) return null;
  const name = session.seats[seat]?.name ?? `Player ${seat + 1}`;

  const owned = Object.entries(state.properties)
    .filter(([, p]) => p.owner === seat)
    .map(([k]) => Number(k));
  const buildings = owned.reduce((sum, t) => sum + (state.properties[t]?.houses ?? 0), 0);

  return (
    <BottomSheet open title={`${name}'s holdings`} onClose={onClose}>
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <Avatar seat={seat} name={name} size="lg" active />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-ink-400">Cash</p>
          <p className="tnum font-display text-2xl font-bold text-zest-400">${player.cash}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-ink-400">Net worth</p>
          <p className="tnum font-display text-2xl font-bold text-white">${netWorth(state, seat)}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Stat label="Properties" value={String(owned.length)} />
        {buildings > 0 ? <Stat label="Buildings" value={String(buildings)} /> : null}
        {player.getOutCards > 0 ? <Stat label="Jail cards" value={`🎟️ ${player.getOutCards}`} /> : null}
        {player.inJail ? <Stat label="Status" value="🚔 In jail" /> : null}
      </div>

      {owned.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">Nothing owned yet.</p>
      ) : (
        <div className="space-y-3">
          {GROUPS.map((group) => {
            const tiles = GROUP_TILES[group] ?? [];
            const mine = tiles.filter((t) => state.properties[t]?.owner === seat);
            if (mine.length === 0) return null;
            const complete = mine.length === tiles.length;
            return (
              <div key={group}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="h-2.5 w-6 rounded-full" style={{ background: GROUP_HEX[group] }} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                    {GROUP_LABEL[group]}
                  </span>
                  {/* progress toward the set — the number that decides trades */}
                  <span className="flex gap-1">
                    {tiles.map((t) => (
                      <span
                        key={t}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background:
                            state.properties[t]?.owner === seat ? GROUP_HEX[group] : 'rgba(255,255,255,0.15)',
                        }}
                      />
                    ))}
                  </span>
                  {complete ? (
                    <span className="rounded-full bg-zest-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zest-400">
                      Full set
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {mine.map((tile) => {
                    const prop = state.properties[tile]!;
                    const def = TILES[tile]!;
                    return (
                      <button
                        key={tile}
                        onClick={() => {
                          onClose();
                          onSelectTile(tile);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-left transition-colors active:bg-white/10"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                          {tileName(tile)}
                        </span>
                        {prop.houses > 0 ? (
                          <span className="text-xs">
                            {prop.houses === 5 ? '🏨' : '🏠'.repeat(prop.houses)}
                          </span>
                        ) : null}
                        {prop.mortgaged ? (
                          <span className="rounded-full bg-berry-500/15 px-2 py-0.5 text-[10px] font-semibold text-berry-500">
                            Mortgaged
                          </span>
                        ) : null}
                        <span className="tnum text-xs text-ink-400">
                          ${def.kind === 'street' ? def.price : priceOf(tile)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl bg-white/5 px-3 py-1.5">
      <span className="text-ink-400">{label} </span>
      <span className="tnum font-semibold text-white">{value}</span>
    </span>
  );
}
