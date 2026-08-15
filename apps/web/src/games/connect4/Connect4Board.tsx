import { COLS, ROWS, type Connect4State } from '@bg/engine';
import type { GameSession } from '../../session/types';
import { canActFor } from '../../session/types';
import { playerColor } from '../shared/playerColors';

export function Connect4Board({ session }: { session: GameSession<Connect4State> }) {
  const { state } = session;
  const myTurn = !state.result && canActFor(session, state.currentPlayer);

  return (
    <div className="mx-auto w-full max-w-md p-3">
      <div className="grid grid-cols-7 gap-1 rounded-2xl bg-blue-900 p-2">
        {Array.from({ length: COLS }, (_, col) => (
          <button
            key={col}
            disabled={!myTurn || (state.cols[col]?.length ?? 0) >= ROWS}
            onClick={() => session.dispatch({ type: 'drop', col })}
            className="flex flex-col-reverse gap-1"
            aria-label={`Drop in column ${col + 1}`}
          >
            {Array.from({ length: ROWS }, (_, row) => {
              const disc = state.cols[col]?.[row];
              const isLast = state.lastMove?.col === col && state.lastMove?.row === row;
              return (
                <span
                  key={row}
                  className={`aspect-square w-full rounded-full transition-colors duration-200 ${
                    disc === undefined
                      ? 'bg-slate-950/70'
                      : `${playerColor(disc).bg} ${isLast ? 'ring-2 ring-white' : ''}`
                  }`}
                  style={disc !== undefined && isLast ? { animation: 'c4drop 0.3s ease-in' } : undefined}
                />
              );
            })}
          </button>
        ))}
      </div>
      <style>{`@keyframes c4drop { from { transform: translateY(-300%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
