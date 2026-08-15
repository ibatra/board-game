import { TILES, type MonopolyState } from '@bg/engine';
import { playerColor } from '../shared/playerColors';
import { Die } from '../shared/Dice';

export const GROUP_HEX: Record<string, string> = {
  brown: '#8b5a2b',
  lightblue: '#38bdf8',
  pink: '#ec4899',
  orange: '#f97316',
  red: '#dc2626',
  yellow: '#facc15',
  green: '#16a34a',
  darkblue: '#2563eb',
  railroad: '#4b5563',
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

/** Which edge a tile sits on — decides which way its bands face. */
function edgeOf(tile: number): 'bottom' | 'left' | 'top' | 'right' {
  if (tile < 10) return 'bottom';
  if (tile < 20) return 'left';
  if (tile < 30) return 'top';
  return 'right';
}

const BAND_INNER: Record<string, string> = {
  bottom: 'top-0 left-0 right-0 h-[24%]',
  top: 'bottom-0 left-0 right-0 h-[24%]',
  left: 'top-0 bottom-0 right-0 w-[24%]',
  right: 'top-0 bottom-0 left-0 w-[24%]',
};

const STRIP_OUTER: Record<string, string> = {
  bottom: 'bottom-0 left-0 right-0 h-[15%]',
  top: 'top-0 left-0 right-0 h-[15%]',
  left: 'top-0 bottom-0 left-0 w-[15%]',
  right: 'top-0 bottom-0 right-0 w-[15%]',
};

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
      className="relative mx-auto grid aspect-square w-full max-w-lg gap-px overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1 shadow-pop"
      style={{ gridTemplateRows: 'repeat(11, 1fr)', gridTemplateColumns: 'repeat(11, 1fr)' }}
    >
      {/* centre: felt, showing the last card drawn or the wordmark */}
      <div
        className="grain relative flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-felt-700 to-felt-800 p-3 text-center"
        style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
      >
        {state.lastCard ? (
          <div className="animate-pop-in w-[88%] max-w-52 -rotate-2 rounded-xl bg-[#f6f2e7] p-3 text-ink-950 shadow-xl">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-500">
              {state.lastCard.deck === 'chance' ? '❓ Chance' : '📦 Community Chest'}
            </p>
            <p className="mt-1.5 text-[11px] font-medium leading-snug sm:text-sm">{state.lastCard.text}</p>
          </div>
        ) : (
          <span className="rotate-[-16deg] font-display text-xl font-black tracking-[0.28em] text-white/25 sm:text-3xl">
            MONOPOLY
          </span>
        )}

        {state.dice ? (
          <div className="flex gap-2">
            <Die value={state.dice[0]} size={26} />
            <Die value={state.dice[1]} size={26} />
          </div>
        ) : null}
      </div>

      {TILES.map((tile, i) => {
        const [row, col] = gridPos(i);
        const prop = state.properties[i];
        const owner = prop?.owner ?? null;
        const here = state.players
          .map((p, seat) => ({ p, seat }))
          .filter(({ p }) => !p.bankrupt && p.pos === i);
        const groupColor =
          tile.kind === 'street'
            ? GROUP_HEX[tile.group]
            : tile.kind === 'railroad'
              ? GROUP_HEX['railroad']
              : tile.kind === 'utility'
                ? GROUP_HEX['utility']
                : null;
        const isCorner = i % 10 === 0;
        const edge = edgeOf(i);

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`relative overflow-hidden bg-[#f4f0e5] ${isCorner ? 'rounded-md' : ''} ${
              selected === i ? 'z-10 ring-2 ring-zest-400' : ''
            }`}
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
            aria-label={`Tile ${i}`}
          >
            {/* colour band, always facing the middle of the board */}
            {groupColor ? (
              <span
                className={`absolute ${BAND_INNER[edge]}`}
                style={{ background: groupColor, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.25)' }}
              />
            ) : null}

            <span className="absolute inset-0 flex items-center justify-center text-[2.4vw] leading-none sm:text-sm">
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

            {prop && prop.houses > 0 ? (
              <span className="absolute inset-x-0 top-[26%] flex justify-center gap-px text-[1.6vw] leading-none sm:text-[10px]">
                {prop.houses === 5 ? '🏨' : '🏠'.repeat(prop.houses)}
              </span>
            ) : null}

            {prop?.mortgaged ? (
              <span className="absolute inset-0 flex items-center justify-center bg-ink-950/45 text-[2vw] sm:text-xs">
                🔒
              </span>
            ) : null}

            {/* owner strip hugging the outer rim */}
            {owner !== null ? (
              <span
                className={`absolute ${STRIP_OUTER[edge]}`}
                style={{ background: playerColor(owner).hex, opacity: prop!.mortgaged ? 0.4 : 1 }}
              />
            ) : null}

            {here.length > 0 ? (
              <span className="absolute inset-x-0 bottom-[20%] flex justify-center gap-[4%]">
                {here.map(({ seat }) => (
                  <span
                    key={seat}
                    className="aspect-square w-[26%] max-w-3.5 rounded-full border border-white"
                    style={{
                      background: playerColor(seat).hex,
                      boxShadow: `0 0 8px -1px ${playerColor(seat).hex}`,
                      transition: 'all 0.3s ease',
                    }}
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
