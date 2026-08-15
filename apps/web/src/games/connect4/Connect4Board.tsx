import { COLS, ROWS, type Connect4State } from '@bg/engine';
import type { GameSession } from '../../session/types';
import { canActFor } from '../../session/types';
import { playerColor } from '../shared/playerColors';

/** Disc with a lit rim and a gloss highlight, so the grid reads as physical. */
function Disc({ seat, last }: { seat: number; last: boolean }) {
  const hex = playerColor(seat).hex;
  return (
    <span
      className="absolute inset-[6%] rounded-full"
      style={{
        background: `radial-gradient(circle at 32% 28%, #ffffffcc, transparent 42%), radial-gradient(circle at 50% 60%, ${hex}, ${hex}dd 60%, #00000055)`,
        boxShadow: last ? `0 0 0 2px #ffffffaa, 0 0 22px -4px ${hex}` : `inset 0 -2px 6px #00000055`,
        animation: last ? 'c4drop 0.32s cubic-bezier(0.4, 0, 0.6, 1)' : undefined,
      }}
    />
  );
}

export function Connect4Board({ session }: { session: GameSession<Connect4State> }) {
  const { state } = session;
  const myTurn = !state.result && canActFor(session, state.currentPlayer);

  return (
    <div className="mx-auto w-full max-w-md px-3">
      {/* Column tap targets, with the disc that would drop shown above each. */}
      <div className="mb-1 grid grid-cols-7 gap-1 px-2">
        {Array.from({ length: COLS }, (_, col) => {
          const full = (state.cols[col]?.length ?? 0) >= ROWS;
          return (
            <span key={col} className="flex justify-center">
              {myTurn && !full ? (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: playerColor(state.currentPlayer).hex,
                    animation: 'breathe 1.6s ease-in-out infinite',
                  }}
                />
              ) : null}
            </span>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1e40af] to-[#132a6b] p-2 shadow-pop">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: COLS }, (_, col) => (
            <button
              key={col}
              disabled={!myTurn || (state.cols[col]?.length ?? 0) >= ROWS}
              onClick={() => session.dispatch({ type: 'drop', col })}
              className="flex flex-col-reverse gap-1 rounded-xl transition-colors enabled:active:bg-white/10"
              aria-label={`Drop in column ${col + 1}`}
            >
              {Array.from({ length: ROWS }, (_, row) => {
                const disc = state.cols[col]?.[row];
                const isLast = state.lastMove?.col === col && state.lastMove?.row === row;
                return (
                  <span
                    key={row}
                    className="relative aspect-square w-full rounded-full bg-[#0b1a45]"
                    style={{ boxShadow: 'inset 0 3px 6px #00000099' }}
                  >
                    {disc !== undefined ? <Disc seat={disc} last={isLast} /> : null}
                  </span>
                );
              })}
            </button>
          ))}
        </div>
        {/* Sheen across the plastic. */}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />
      </div>

      <style>{`@keyframes c4drop { from { transform: translateY(-420%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
