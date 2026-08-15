import { GROUP_TILES, HOUSE_COST, RAILROAD_RENTS, TILES, tileName, type MonopolyState } from '@bg/engine';
import { playerColor } from '../shared/playerColors';
import { GROUP_HEX, groupOf, priceOf } from './theme';

type Row = { label: string; value: string; active?: boolean };

/**
 * A real title deed: the rent ladder is the point, and the row that applies
 * right now is highlighted, so "what does this cost me" needs no arithmetic.
 */
export function DeedCard({
  state,
  tile,
  seatNames,
  compact = false,
}: {
  state: MonopolyState;
  tile: number;
  seatNames?: (seat: number) => string;
  compact?: boolean;
}) {
  const def = TILES[tile]!;
  const prop = state.properties[tile];
  const group = groupOf(tile);
  const hue = group ? GROUP_HEX[group]! : '#57507d';
  const owner = prop?.owner ?? null;
  const ownsAll =
    group !== null &&
    owner !== null &&
    (GROUP_TILES[group] ?? []).every((t) => state.properties[t]?.owner === owner);

  const rows: Row[] = [];
  if (def.kind === 'street') {
    const houses = prop?.houses ?? 0;
    rows.push({ label: 'Rent', value: `$${def.rents[0]}`, active: houses === 0 && !ownsAll });
    rows.push({ label: 'With colour set', value: `$${def.rents[0] * 2}`, active: houses === 0 && ownsAll });
    for (let h = 1; h <= 4; h++) {
      rows.push({
        label: `${h} house${h > 1 ? 's' : ''}`,
        value: `$${def.rents[h]}`,
        active: houses === h,
      });
    }
    rows.push({ label: 'Hotel', value: `$${def.rents[5]}`, active: houses === 5 });
  } else if (def.kind === 'railroad') {
    const owned =
      owner === null
        ? 0
        : (GROUP_TILES['railroad'] ?? []).filter((t) => state.properties[t]?.owner === owner).length;
    for (let n = 1; n <= 4; n++) {
      rows.push({
        label: `${n} railroad${n > 1 ? 's' : ''}`,
        value: `$${RAILROAD_RENTS[n]}`,
        active: owned === n,
      });
    }
  } else if (def.kind === 'utility') {
    const owned =
      owner === null
        ? 0
        : (GROUP_TILES['utility'] ?? []).filter((t) => state.properties[t]?.owner === owner).length;
    rows.push({ label: 'One utility', value: '4 × dice', active: owned === 1 });
    rows.push({ label: 'Both utilities', value: '10 × dice', active: owned === 2 });
  }

  const price = priceOf(tile);
  const isDeed = rows.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl bg-[#f6f2e7] text-ink-950 shadow-xl">
      {/* Compact keeps the name and price on one line so the buttons under a
          buy decision stay above the fold on a phone. */}
      {compact ? (
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: hue }}>
          <p className="min-w-0 flex-1 truncate font-display text-base font-extrabold text-white drop-shadow-sm">
            {tileName(tile)}
          </p>
          {isDeed ? (
            <p className="tnum shrink-0 rounded-full bg-black/20 px-2.5 py-0.5 font-display text-sm font-bold text-white">
              ${price}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="px-3 pb-2.5 pt-3 text-center" style={{ background: hue }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
            {isDeed ? 'Title Deed' : 'Board space'}
          </p>
          <p className="font-display text-lg font-extrabold leading-tight text-white drop-shadow-sm">
            {tileName(tile)}
          </p>
        </div>
      )}

      <div className={compact ? 'px-3 py-2.5' : 'px-3.5 py-3'}>
        {isDeed ? (
          <>
            {!compact ? (
              <div className="flex items-baseline justify-between border-b border-ink-950/10 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-950/50">Price</span>
                <span className="tnum font-display text-lg font-bold">${price}</span>
              </div>
            ) : null}

            <dl
              className={
                compact
                  ? 'grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px]'
                  : 'mt-2 space-y-0.5 text-sm'
              }
            >
              {rows.map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between rounded-md px-1.5 py-1 ${
                    row.active ? 'font-bold' : 'text-ink-950/70'
                  }`}
                  style={row.active ? { background: `${hue}2b` } : undefined}
                >
                  <dt>{row.label}</dt>
                  <dd className="tnum">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div
              className={`flex flex-wrap gap-x-4 gap-y-1 border-t border-ink-950/10 text-[11px] text-ink-950/60 ${
                compact ? 'mt-1.5 pt-1.5' : 'mt-2.5 pt-2'
              }`}
            >
              {def.kind === 'street' ? (
                <span className="tnum">House ${HOUSE_COST[def.group]}</span>
              ) : null}
              <span className="tnum">Mortgage ${price / 2}</span>
            </div>
          </>
        ) : (
          <p className="py-1 text-sm text-ink-950/70">{describe(tile)}</p>
        )}

        {/* ownership state */}
        {/* In compact mode an "Unowned" chip is noise — the buy button says it. */}
        {prop && !(compact && owner === null && prop.houses === 0 && !prop.mortgaged) ? (
          <div
            className={`flex flex-wrap items-center gap-2 border-t border-ink-950/10 text-xs ${
              compact ? 'mt-1.5 pt-1.5' : 'mt-3 pt-2.5'
            }`}
          >
            {owner === null ? (
              <span className="rounded-full bg-ink-950/8 px-2.5 py-1 font-semibold text-ink-950/60">
                Unowned
              </span>
            ) : (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-white"
                style={{ background: playerColor(owner).hex }}
              >
                {seatNames ? seatNames(owner) : `Player ${owner + 1}`}
                {ownsAll ? ' · full set' : ''}
              </span>
            )}
            {prop.houses > 0 ? (
              <span className="rounded-full bg-ink-950/8 px-2.5 py-1 font-semibold">
                {prop.houses === 5 ? '1 hotel' : `${prop.houses} house${prop.houses > 1 ? 's' : ''}`}
              </span>
            ) : null}
            {prop.mortgaged ? (
              <span className="rounded-full bg-berry-500/15 px-2.5 py-1 font-semibold text-berry-500">
                Mortgaged
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function describe(tile: number): string {
  const def = TILES[tile]!;
  switch (def.kind) {
    case 'go':
      return 'Collect $200 salary as you pass.';
    case 'jail':
      return 'Just visiting — unless you were sent here.';
    case 'freeParking':
      return 'A quiet square. Nothing happens.';
    case 'goToJail':
      return 'Go directly to Jail. Do not pass GO, do not collect $200.';
    case 'tax':
      return `Pay $${def.amount} to the bank.`;
    case 'chance':
      return 'Draw a Chance card and do what it says.';
    case 'chest':
      return 'Draw a Community Chest card and do what it says.';
    default:
      return '';
  }
}
