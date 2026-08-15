import { LADDERS, SNAKES, type SnakesState } from '@bg/engine';
import type { GameSession } from '../../session/types';
import { canActFor } from '../../session/types';
import { playerColor } from '../shared/playerColors';
import { Dice } from '../shared/Dice';

/** Center of square n (1..100) as percentages of the board, boustrophedon layout. */
function cellCenter(square: number): { x: number; y: number } {
  const i = square - 1;
  const rowFromBottom = Math.floor(i / 10);
  const colInRow = i % 10;
  const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
  return { x: col * 10 + 5, y: (9 - rowFromBottom) * 10 + 5 };
}

export function SnakesBoard({ session }: { session: GameSession<SnakesState> }) {
  const { state } = session;
  const myTurn = !state.result && canActFor(session, state.currentPlayer);

  // Group tokens per square so stacked tokens fan out.
  const bySquare = new Map<number, number[]>();
  state.positions.forEach((pos, p) => {
    const list = bySquare.get(pos) ?? [];
    list.push(p);
    bySquare.set(pos, list);
  });

  return (
    <div className="mx-auto w-full max-w-md px-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-emerald-950">
        {/* squares */}
        {Array.from({ length: 100 }, (_, i) => {
          const n = i + 1;
          const { x, y } = cellCenter(n);
          const isSnake = n in SNAKES;
          const isLadder = n in LADDERS;
          return (
            <div
              key={n}
              className={`absolute flex items-center justify-center text-[2vw] font-medium sm:text-[9px] ${
                isSnake ? 'text-rose-300' : isLadder ? 'text-amber-300' : 'text-emerald-200/60'
              }`}
              style={{
                left: `${x - 5}%`,
                top: `${y - 5}%`,
                width: '10%',
                height: '10%',
                background: (Math.floor(i / 10) + i) % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
              }}
            >
              {n}
            </div>
          );
        })}

        {/* snakes and ladders overlay */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Object.entries(LADDERS).map(([from, to]) => {
            const a = cellCenter(Number(from));
            const b = cellCenter(to);
            return (
              <g key={`l${from}`} stroke="#fbbf24" strokeWidth="1.4" opacity="0.85">
                <line x1={a.x - 1.2} y1={a.y} x2={b.x - 1.2} y2={b.y} />
                <line x1={a.x + 1.2} y1={a.y} x2={b.x + 1.2} y2={b.y} />
              </g>
            );
          })}
          {Object.entries(SNAKES).map(([from, to]) => {
            const a = cellCenter(Number(from));
            const b = cellCenter(to);
            const mx = (a.x + b.x) / 2 + (a.x > b.x ? -8 : 8);
            const my = (a.y + b.y) / 2;
            return (
              <path
                key={`s${from}`}
                d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.8"
              />
            );
          })}
        </svg>

        {/* tokens */}
        {state.positions.map((pos, p) => {
          if (pos === 0) return null;
          const { x, y } = cellCenter(pos);
          const stack = bySquare.get(pos)!;
          const idx = stack.indexOf(p);
          const offset = (idx - (stack.length - 1) / 2) * 3;
          return (
            <span
              key={p}
              className={`absolute z-10 h-[6%] w-[6%] rounded-full border-2 border-white/80 shadow ${playerColor(p).bg}`}
              style={{
                left: `${x + offset - 3}%`,
                top: `${y - 3}%`,
                transition: 'left 0.5s ease, top 0.5s ease',
              }}
            />
          );
        })}
      </div>

      {/* start area for tokens still off-board */}
      <div className="mt-2 flex min-h-8 items-center gap-2 px-1">
        <span className="text-xs text-slate-500">Start:</span>
        {state.positions.map((pos, p) =>
          pos === 0 ? (
            <span key={p} className={`h-4 w-4 rounded-full border border-white/60 ${playerColor(p).bg}`} />
          ) : null,
        )}
      </div>

      <Dice
        value={state.lastRoll?.die ?? null}
        canRoll={myTurn}
        onRoll={() => session.dispatch({ type: 'roll' })}
      />
      {state.lastRoll && state.lastRoll.jumped !== null ? (
        <p className="pb-2 text-center text-sm text-slate-400">
          {state.lastRoll.to > state.lastRoll.jumped ? '🪜 Ladder!' : '🐍 Snake!'} {state.lastRoll.jumped} →{' '}
          {state.lastRoll.to}
        </p>
      ) : null}
    </div>
  );
}
