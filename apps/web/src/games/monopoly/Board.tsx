import { TILES, type MonopolyState } from '@bg/engine';
import { playerColor } from '../shared/playerColors';

export const GROUP_HEX: Record<string, string> = {
  brown: '#92400e',
  lightblue: '#38bdf8',
  pink: '#ec4899',
  orange: '#f97316',
  red: '#dc2626',
  yellow: '#facc15',
  green: '#16a34a',
  darkblue: '#2563eb',
  railroad: '#64748b',
  utility: '#94a3b8',
};

const CORNER_EMOJI: Record<number, string> = { 0: '🏁', 10: '🚔', 20: '🅿️', 30: '👮' };
const SPECIAL_EMOJI: Record<string, string> = { chance: '❓', chest: '📦', tax: '💰' };

/** Grid row/col (0-indexed, 11x11) for each of the 40 tiles. */
export function gridPos(tile: number): [number, number] {
  if (tile === 0) return [10, 10];
  if (tile < 10) return [10, 10 - tile];
  if (tile === 10) return [10, 0];
  if (tile < 20) return [10 - (tile - 10), 0];
  if (tile === 20) return [0, 0];
  if (tile < 30) return [0, tile - 20];
  if (tile === 30) return [0, 10];
  return [tile - 30, 10];
}

export function MonopolyBoard({
  state,
  selected,
  onSelect,
}: {
  state: MonopolyState;
  selected: number | null;
  onSelect: (tile: number) => void;
}) {
  return (
    <div
      className="relative mx-auto grid aspect-square w-full max-w-lg gap-[1px] rounded-xl bg-slate-700 p-[2px]"
      style={{ gridTemplateRows: 'repeat(11, 1fr)', gridTemplateColumns: 'repeat(11, 1fr)' }}
    >
      {/* center: last card / branding */}
      <div
        className="flex flex-col items-center justify-center rounded-lg bg-emerald-900/60 p-2 text-center"
        style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
      >
        {state.lastCard ? (
          <>
            <span className="text-2xl">{state.lastCard.deck === 'chance' ? '❓' : '📦'}</span>
            <p className="mt-1 max-w-[90%] text-[11px] leading-tight text-emerald-100 sm:text-sm">
              {state.lastCard.text}
            </p>
          </>
        ) : (
          <span className="rotate-[-20deg] text-lg font-black tracking-widest text-emerald-200/70 sm:text-2xl">
            MONOPOLY
          </span>
        )}
        {state.dice ? (
          <p className="mt-2 text-xl text-white">
            {['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][state.dice[0]]} {['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][state.dice[1]]}
          </p>
        ) : null}
      </div>

      {TILES.map((tile, i) => {
        const [row, col] = gridPos(i);
        const prop = state.properties[i];
        const owner = prop?.owner ?? null;
        const players = state.players
          .map((p, seat) => ({ p, seat }))
          .filter(({ p }) => !p.bankrupt && p.pos === i);
        const groupColor =
          tile.kind === 'street' ? GROUP_HEX[tile.group]
          : tile.kind === 'railroad' ? GROUP_HEX['railroad']
          : tile.kind === 'utility' ? GROUP_HEX['utility']
          : null;

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`relative flex flex-col items-stretch overflow-hidden bg-slate-100 ${
              selected === i ? 'ring-2 ring-emerald-400' : ''
            } ${i === 0 || i === 10 || i === 20 || i === 30 ? 'rounded-md' : ''}`}
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
            aria-label={`Tile ${i}`}
          >
            {groupColor ? <span className="h-1/4 w-full shrink-0" style={{ background: groupColor }} /> : null}
            <span className="flex flex-1 items-center justify-center text-[2.4vw] leading-none sm:text-sm">
              {i in CORNER_EMOJI
                ? CORNER_EMOJI[i]
                : tile.kind === 'chance' || tile.kind === 'chest'
                  ? SPECIAL_EMOJI[tile.kind]
                  : tile.kind === 'tax'
                    ? SPECIAL_EMOJI['tax']
                    : tile.kind === 'railroad'
                      ? '🚂'
                      : tile.kind === 'utility'
                        ? '💡'
                        : ''}
            </span>
            {/* owner strip + buildings */}
            {owner !== null ? (
              <span
                className="absolute bottom-0 left-0 right-0 h-[18%]"
                style={{ background: playerColor(owner).hex, opacity: prop!.mortgaged ? 0.35 : 0.9 }}
              />
            ) : null}
            {prop && prop.houses > 0 ? (
              <span className="absolute left-0 right-0 top-[26%] text-center text-[1.8vw] leading-none sm:text-[10px]">
                {prop.houses === 5 ? '🏨' : '🏠'.repeat(prop.houses)}
              </span>
            ) : null}
            {prop?.mortgaged ? (
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/30 text-[2vw] sm:text-xs">
                🔒
              </span>
            ) : null}
            {/* player tokens */}
            {players.length > 0 ? (
              <span className="absolute bottom-[20%] left-0 right-0 flex justify-center gap-[2%]">
                {players.map(({ seat }) => (
                  <span
                    key={seat}
                    className="aspect-square w-[22%] max-w-3 rounded-full border border-white"
                    style={{ background: playerColor(seat).hex }}
                  />
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
