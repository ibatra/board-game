import type { TicTacToeState } from '@bg/engine';
import type { GameSession } from '../../session/types';
import { canActFor } from '../../session/types';
import { playerColor } from '../shared/playerColors';

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winningLine(cells: (number | null)[]): number[] | null {
  for (const line of LINES) {
    const [a, b, c] = line as [number, number, number];
    if (cells[a] !== null && cells[a] === cells[b] && cells[b] === cells[c]) return line;
  }
  return null;
}

/** Seat 0 draws a cross, seat 1 a ring — both stroked on so they land with weight. */
function Mark({ seat, dim }: { seat: number; dim?: boolean }) {
  const color = playerColor(seat).hex;
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth: 9,
    strokeLinecap: 'round' as const,
    opacity: dim ? 0.22 : 1,
  };
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-[18%]">
      {seat % 2 === 0 ? (
        <g {...common} style={{ animation: dim ? undefined : 'pop-in 0.25s cubic-bezier(0.2,1.2,0.4,1)' }}>
          <path d="M12 12L88 88" />
          <path d="M88 12L12 88" />
        </g>
      ) : (
        <circle
          cx="50"
          cy="50"
          r="38"
          {...common}
          style={{ animation: dim ? undefined : 'pop-in 0.25s cubic-bezier(0.2,1.2,0.4,1)' }}
        />
      )}
    </svg>
  );
}

export function TicTacToeBoard({ session }: { session: GameSession<TicTacToeState> }) {
  const { state } = session;
  const myTurn = !state.result && canActFor(session, state.currentPlayer);
  const win = winningLine(state.cells);

  return (
    <div className="mx-auto w-full max-w-sm p-4">
      <div className="panel grid grid-cols-3 gap-2 p-2">
        {state.cells.map((cell, i) => {
          const isWinning = win?.includes(i) ?? false;
          const playable = cell === null && myTurn;
          return (
            <button
              key={i}
              disabled={!playable}
              onClick={() => session.dispatch({ type: 'place', cell: i })}
              className={`group relative aspect-square rounded-2xl transition-all duration-200 ${
                isWinning ? 'bg-white/12' : 'bg-white/[0.04]'
              } ${playable ? 'active:scale-95 active:bg-white/10' : ''}`}
              style={
                isWinning
                  ? { boxShadow: `0 0 0 2px ${playerColor(state.cells[i]!).hex}, 0 0 26px -6px ${playerColor(state.cells[i]!).hex}` }
                  : undefined
              }
              aria-label={`Cell ${i + 1}`}
            >
              {cell !== null ? (
                <Mark seat={cell} />
              ) : playable ? (
                /* Ghost preview of the mark you'd place. */
                <span className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <Mark seat={state.currentPlayer} dim />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
