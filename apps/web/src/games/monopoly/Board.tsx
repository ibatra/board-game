import { useEffect, useRef, useState } from 'react';
import { TILES, TOTAL_HOTELS, TOTAL_HOUSES, type MonopolyState } from '@bg/engine';
import { playerColor } from '../shared/playerColors';
import { Die } from '../shared/Dice';
import { GROUP_HEX, groupOf } from './theme';

export { GROUP_HEX } from './theme';

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
  bottom: 'top-0 left-0 right-0 h-[26%]',
  top: 'bottom-0 left-0 right-0 h-[26%]',
  left: 'top-0 bottom-0 right-0 w-[26%]',
  right: 'top-0 bottom-0 left-0 w-[26%]',
};

const STRIP_OUTER: Record<string, string> = {
  bottom: 'bottom-0 left-0 right-0 h-[22%]',
  top: 'top-0 left-0 right-0 h-[22%]',
  left: 'top-0 bottom-0 left-0 w-[22%]',
  right: 'top-0 bottom-0 right-0 w-[22%]',
};

/** Centre of a tile as a percentage of the board, for the token layer. */
function tileCenter(tile: number): { x: number; y: number } {
  const [row, col] = gridPos(tile);
  return { x: ((col + 0.5) / 11) * 100, y: ((row + 0.5) / 11) * 100 };
}

/**
 * Walks each token one tile at a time toward its real position, so a roll of
 * seven looks like seven steps around the board. Long jumps (Go To Jail, card
 * teleports) snap instead — nobody wants to watch 30 hops.
 */
function useHoppingPositions(targets: number[], stepMs = 105): number[] {
  const [shown, setShown] = useState(targets);
  const ref = useRef(targets);
  const key = targets.join(',');

  useEffect(() => {
    // Seat count changed (or first run): adopt positions without animating.
    if (ref.current.length !== targets.length) {
      ref.current = targets;
      setShown(targets);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const cur = ref.current;
      let moving = false;
      const next = cur.map((c, i) => {
        const t = targets[i] ?? c;
        if (c === t) return c;
        moving = true;
        const forward = (t - c + 40) % 40;
        return forward <= 12 ? (c + 1) % 40 : t;
      });
      if (!moving) return;
      ref.current = next;
      setShown(next);
      timer = setTimeout(step, stepMs);
    };
    timer = setTimeout(step, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stepMs]);

  return shown;
}

/** Green pips for houses, one red block for a hotel. */
function Buildings({ houses, edge }: { houses: number; edge: string }) {
  const vertical = edge === 'left' || edge === 'right';
  const place =
    edge === 'bottom'
      ? 'top-[27%] inset-x-0'
      : edge === 'top'
        ? 'bottom-[27%] inset-x-0'
        : edge === 'left'
          ? 'right-[27%] inset-y-0'
          : 'left-[27%] inset-y-0';
  return (
    <span
      className={`pointer-events-none absolute flex items-center justify-center gap-[6%] ${place} ${
        vertical ? 'flex-col' : ''
      }`}
    >
      {houses === 5 ? (
        <span className="block h-[26%] w-[46%] rounded-[2px] bg-[#d92b2b] shadow-sm" />
      ) : (
        Array.from({ length: houses }, (_, i) => (
          <span key={i} className="block aspect-square w-[16%] rounded-[1.5px] bg-[#1f9e4b] shadow-sm" />
        ))
      )}
    </span>
  );
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
  const shownPositions = useHoppingPositions(state.players.map((p) => p.pos));
  const activeTile = shownPositions[state.currentPlayer] ?? 0;

  // Group tokens by the tile they are *displayed* on, so stacks fan out.
  const stacks = new Map<number, number[]>();
  shownPositions.forEach((pos, seat) => {
    if (state.players[seat]?.bankrupt) return;
    stacks.set(pos, [...(stacks.get(pos) ?? []), seat]);
  });

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div
        className="relative grid aspect-square w-full gap-px overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1 shadow-pop"
        style={{ gridTemplateRows: 'repeat(11, 1fr)', gridTemplateColumns: 'repeat(11, 1fr)' }}
      >
        {/* centre table: the card just drawn, the dice just rolled, bank stock */}
        <div
          className="grain relative flex flex-col items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-felt-700 to-felt-800 p-3 text-center"
          style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
        >
          {state.lastCard ? (
            <div className="animate-pop-in w-[86%] max-w-52 -rotate-2 rounded-xl bg-[#f6f2e7] p-3 text-ink-950 shadow-xl">
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
            <div className="flex items-center gap-2">
              <Die value={state.dice[0]} size={26} />
              <Die value={state.dice[1]} size={26} />
              <span className="tnum ml-1 font-display text-lg font-bold text-white/70">
                {state.dice[0] + state.dice[1]}
              </span>
            </div>
          ) : null}

          <p className="tnum absolute bottom-2 text-[10px] font-medium text-white/40">
            Bank · {state.housesRemaining}/{TOTAL_HOUSES} houses · {state.hotelsRemaining}/{TOTAL_HOTELS} hotels
          </p>
        </div>

        {TILES.map((tile, i) => {
          const [row, col] = gridPos(i);
          const prop = state.properties[i];
          const owner = prop?.owner ?? null;
          const group = groupOf(i);
          const groupColor = group ? GROUP_HEX[group] : null;
          const isCorner = i % 10 === 0;
          const edge = edgeOf(i);
          const isActive = i === activeTile;

          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`relative overflow-hidden bg-[#f4f0e5] ${isCorner ? 'rounded-md' : ''} ${
                selected === i ? 'z-20 ring-2 ring-zest-400' : ''
              }`}
              style={{ gridRow: row + 1, gridColumn: col + 1 }}
              aria-label={`Tile ${i}`}
            >
              {/* Faint owner wash: enough to scan ownership, light enough that it
                  never gets mistaken for the property's own colour group. */}
              {owner !== null ? (
                <span
                  className="absolute inset-0"
                  style={{ background: playerColor(owner).hex, opacity: prop!.mortgaged ? 0.08 : 0.15 }}
                />
              ) : null}

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

              {prop && prop.houses > 0 ? <Buildings houses={prop.houses} edge={edge} /> : null}

              {prop?.mortgaged ? (
                <span className="absolute inset-0 flex items-center justify-center bg-ink-950/45 text-[2vw] sm:text-xs">
                  🔒
                </span>
              ) : null}

              {owner !== null ? (
                <span
                  className={`absolute ${STRIP_OUTER[edge]}`}
                  style={{ background: playerColor(owner).hex, opacity: prop!.mortgaged ? 0.4 : 1 }}
                />
              ) : null}

              {/* where the current player stands */}
              {isActive ? (
                <span
                  className="pointer-events-none absolute inset-0 rounded-[3px]"
                  style={{
                    boxShadow: `inset 0 0 0 2px ${playerColor(state.currentPlayer).hex}`,
                    animation: 'breathe 1.6s ease-in-out infinite',
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* token layer: hops tile to tile above the grid */}
      <div className="pointer-events-none absolute inset-0">
        {shownPositions.map((pos, seat) => {
          if (state.players[seat]?.bankrupt) return null;
          const { x, y } = tileCenter(pos);
          const stack = stacks.get(pos) ?? [seat];
          const idx = stack.indexOf(seat);
          const spread = (idx - (stack.length - 1) / 2) * 2.4;
          return (
            <span
              key={seat}
              className="absolute flex h-[4.6%] w-[4.6%] items-center justify-center rounded-full border-2 border-white font-display text-[7px] font-bold text-white"
              style={{
                left: `calc(${x + spread}% - 2.3%)`,
                top: `calc(${y}% - 2.3%)`,
                background: playerColor(seat).hex,
                boxShadow: `0 2px 6px #000a, 0 0 12px -2px ${playerColor(seat).hex}`,
                transition: 'left 0.1s linear, top 0.1s linear',
                zIndex: 30 + idx,
              }}
            >
              {seat + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}
