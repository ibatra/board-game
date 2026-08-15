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

/** Two rails plus evenly spaced rungs between the two squares. */
function Ladder({ from, to }: { from: number; to: number }) {
  const a = cellCenter(from);
  const b = cellCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const px = (-dy / len) * 1.6;
  const py = (dx / len) * 1.6;
  const rungs = Math.max(2, Math.round(len / 5));

  return (
    <g stroke="#f0b429" strokeLinecap="round" opacity="0.9">
      <line x1={a.x + px} y1={a.y + py} x2={b.x + px} y2={b.y + py} strokeWidth="1.1" />
      <line x1={a.x - px} y1={a.y - py} x2={b.x - px} y2={b.y - py} strokeWidth="1.1" />
      {Array.from({ length: rungs - 1 }, (_, i) => {
        const t = (i + 1) / rungs;
        const cx = a.x + dx * t;
        const cy = a.y + dy * t;
        return (
          <line key={i} x1={cx + px} y1={cy + py} x2={cx - px} y2={cy - py} strokeWidth="0.8" opacity="0.75" />
        );
      })}
    </g>
  );
}

const SNAKE_HUES = ['#4ade9b', '#22d3ee', '#a78bfa', '#f472b6', '#facc15'];

/** Tapered body from head (high square) to tail, with a wiggle. */
function Snake({ from, to, hue }: { from: number; to: number; hue: string }) {
  const a = cellCenter(from);
  const b = cellCenter(to);
  const bend = a.x > b.x ? -9 : 9;
  const mx = (a.x + b.x) / 2 + bend;
  const my = (a.y + b.y) / 2;
  const path = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;

  return (
    <g>
      <path d={path} fill="none" stroke="#00000055" strokeWidth="2.6" strokeLinecap="round" transform="translate(0.4 0.6)" />
      <path d={path} fill="none" stroke={hue} strokeWidth="2.2" strokeLinecap="round" />
      <path d={path} fill="none" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" strokeDasharray="1.6 3" opacity="0.5" />
      <circle cx={a.x} cy={a.y} r="2.2" fill={hue} stroke="#00000033" strokeWidth="0.4" />
      <circle cx={a.x - 0.8} cy={a.y - 0.7} r="0.45" fill="#08070f" />
      <circle cx={a.x + 0.8} cy={a.y - 0.7} r="0.45" fill="#08070f" />
    </g>
  );
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

  const landed = state.lastRoll?.to ?? null;

  return (
    <div className="mx-auto w-full max-w-md px-3">
      <div className="grain relative aspect-square w-full overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-felt-700 to-felt-800 shadow-pop">
        {/* squares */}
        {Array.from({ length: 100 }, (_, i) => {
          const n = i + 1;
          const { x, y } = cellCenter(n);
          const isSnake = n in SNAKES;
          const isLadder = n in LADDERS;
          // Checkerboard by on-screen position, not by square number.
          const shaded = (Math.round(x / 10) + Math.round(y / 10)) % 2 === 0;
          return (
            <div
              key={n}
              className={`tnum absolute flex items-start justify-start p-[3%] text-[1.7vw] font-semibold leading-none sm:text-[9px] ${
                isSnake ? 'text-berry-500/80' : isLadder ? 'text-[#f0b429]/80' : 'text-white/20'
              }`}
              style={{
                left: `${x - 5}%`,
                top: `${y - 5}%`,
                width: '10%',
                height: '10%',
                background: shaded ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderRadius: '6px',
              }}
            >
              {n === 100 ? '🏁' : n}
            </div>
          );
        })}

        {/* landing pulse on the square the current token just reached */}
        {landed && landed > 0 ? (
          <span
            className="pointer-events-none absolute rounded-lg ring-2 ring-white/50"
            style={{
              left: `${cellCenter(landed).x - 5}%`,
              top: `${cellCenter(landed).y - 5}%`,
              width: '10%',
              height: '10%',
              animation: 'breathe 1.4s ease-in-out infinite',
            }}
          />
        ) : null}

        {/* snakes and ladders overlay */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          {Object.entries(LADDERS).map(([from, to]) => (
            <Ladder key={`l${from}`} from={Number(from)} to={to} />
          ))}
          {Object.entries(SNAKES).map(([from, to], i) => (
            <Snake key={`s${from}`} from={Number(from)} to={to} hue={SNAKE_HUES[i % SNAKE_HUES.length]!} />
          ))}
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
              className="absolute z-10 h-[7%] w-[7%] rounded-full border-2 border-white shadow-lg"
              style={{
                background: playerColor(p).hex,
                left: `${x + offset - 3.5}%`,
                top: `${y - 3.5}%`,
                transition: 'left 0.45s cubic-bezier(0.3,0.9,0.3,1), top 0.45s cubic-bezier(0.3,0.9,0.3,1)',
                boxShadow: `0 2px 8px #000a, 0 0 14px -3px ${playerColor(p).hex}`,
              }}
            />
          );
        })}
      </div>

      {/* start area for tokens still off-board */}
      <div className="mt-2 flex min-h-6 items-center gap-2 px-1 text-xs text-ink-500">
        {state.positions.some((p) => p === 0) ? (
          <>
            <span>Waiting to start:</span>
            {state.positions.map((pos, p) =>
              pos === 0 ? (
                <span
                  key={p}
                  className="h-3.5 w-3.5 rounded-full border border-white/70"
                  style={{ background: playerColor(p).hex }}
                />
              ) : null,
            )}
          </>
        ) : null}
      </div>

      <Dice
        value={state.lastRoll?.die ?? null}
        canRoll={myTurn}
        onRoll={() => session.dispatch({ type: 'roll' })}
      />

      {state.lastRoll && state.lastRoll.jumped !== null ? (
        <p
          className={`animate-pop-in mx-auto mb-3 w-fit rounded-full px-4 py-1.5 text-sm font-semibold ${
            state.lastRoll.to > state.lastRoll.jumped
              ? 'bg-[#f0b429]/15 text-[#f0b429]'
              : 'bg-berry-500/15 text-berry-500'
          }`}
        >
          {state.lastRoll.to > state.lastRoll.jumped ? '🪜 Ladder!' : '🐍 Snake!'} {state.lastRoll.jumped} →{' '}
          {state.lastRoll.to}
        </p>
      ) : null}
    </div>
  );
}
