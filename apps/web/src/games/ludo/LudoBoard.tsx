import { movableTokens, SAFE_SQUARES, START_OFFSETS, type LudoState, type LudoToken } from '@bg/engine';
import type { GameSession } from '../../session/types';
import { canActFor } from '../../session/types';
import { playerColor } from '../shared/playerColors';
import { Dice } from '../shared/Dice';
import { Button } from '../../ui/Button';
import { CELL, HOME_RUNS, HOME_SPOTS, SIZE, TRACK_PATH, YARDS, yardSpots } from './geometry';

function tokenXY(seat: number, token: LudoToken, tokenIdx: number): [number, number] {
  if (token.zone === 'yard') return yardSpots(seat)[tokenIdx]!;
  if (token.zone === 'track') {
    const [x, y] = TRACK_PATH[token.index]!;
    return [x + 0.5, y + 0.5];
  }
  if (token.zone === 'homeRun') {
    const [x, y] = HOME_RUNS[seat]![token.index]!;
    return [x + 0.5, y + 0.5];
  }
  const [x, y] = HOME_SPOTS[seat]!;
  return [x, y];
}

export function LudoBoard({ session }: { session: GameSession<LudoState> }) {
  const { state } = session;
  const current = state.currentPlayer;
  const myTurn = !state.result && canActFor(session, current);
  const movable = state.phase === 'move' ? movableTokens(state, current) : [];
  const mustPass = myTurn && state.phase === 'move' && movable.length === 0;

  return (
    <div className="mx-auto w-full max-w-md px-3">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full rounded-2xl bg-slate-100">
        {/* yards */}
        {YARDS.map(([ox, oy], seat) => (
          <g key={seat} opacity={seat < state.numPlayers ? 1 : 0.25}>
            <rect x={ox * CELL} y={oy * CELL} width={6 * CELL} height={6 * CELL} fill={playerColor(seat).hex} rx={12} />
            <rect
              x={(ox + 1) * CELL}
              y={(oy + 1) * CELL}
              width={4 * CELL}
              height={4 * CELL}
              fill="#f1f5f9"
              rx={10}
            />
            {yardSpots(seat).map(([sx, sy], i) => (
              <circle key={i} cx={sx * CELL} cy={sy * CELL} r={CELL * 0.42} fill="#e2e8f0" stroke="#94a3b8" />
            ))}
          </g>
        ))}

        {/* track cells */}
        {TRACK_PATH.map(([x, y], i) => {
          const entrySeat = START_OFFSETS.indexOf(i as 0 | 13 | 26 | 39);
          const isSafe = SAFE_SQUARES.has(i);
          return (
            <g key={i}>
              <rect
                x={x * CELL}
                y={y * CELL}
                width={CELL}
                height={CELL}
                fill={entrySeat >= 0 ? playerColor(entrySeat).hex : '#ffffff'}
                stroke="#cbd5e1"
                strokeWidth={1}
              />
              {isSafe && entrySeat < 0 ? (
                <text x={(x + 0.5) * CELL} y={(y + 0.68) * CELL} textAnchor="middle" fontSize={CELL * 0.55} fill="#94a3b8">
                  ★
                </text>
              ) : null}
            </g>
          );
        })}

        {/* home runs */}
        {HOME_RUNS.map((run, seat) =>
          run.map(([x, y], i) => (
            <rect
              key={`${seat}-${i}`}
              x={x * CELL}
              y={y * CELL}
              width={CELL}
              height={CELL}
              fill={playerColor(seat).hex}
              opacity={seat < state.numPlayers ? 0.85 : 0.15}
              stroke="#cbd5e1"
            />
          )),
        )}

        {/* center home */}
        <rect x={6 * CELL} y={6 * CELL} width={3 * CELL} height={3 * CELL} fill="#334155" rx={8} />
        <text x={7.5 * CELL} y={7.7 * CELL} textAnchor="middle" fontSize={CELL} fill="#f8fafc">
          🏠
        </text>

        {/* tokens */}
        {state.tokens.map((row, seat) =>
          row.map((token, t) => {
            const [x, y] = tokenXY(seat, token, t);
            const isMovable = myTurn && seat === current && movable.includes(t);
            // Fan out stacked tokens on the same track square.
            let dx = 0;
            if (token.zone === 'track') {
              const stack = state.tokens.flatMap((r2, s2) =>
                r2
                  .map((tk, i2) => ({ s2, i2, tk }))
                  .filter(({ tk }) => tk.zone === 'track' && tk.index === token.index),
              );
              const pos = stack.findIndex(({ s2, i2 }) => s2 === seat && i2 === t);
              dx = (pos - (stack.length - 1) / 2) * CELL * 0.22;
            }
            return (
              <circle
                key={`${seat}-${t}`}
                cx={x * CELL + dx}
                cy={y * CELL}
                r={CELL * 0.36}
                fill={playerColor(seat).hex}
                stroke={isMovable ? '#0f172a' : '#ffffff'}
                strokeWidth={isMovable ? 4 : 2.5}
                style={{
                  transition: 'cx 0.35s ease, cy 0.35s ease',
                  cursor: isMovable ? 'pointer' : 'default',
                  animation: isMovable ? 'ludoPulse 1s ease-in-out infinite' : undefined,
                }}
                onClick={isMovable ? () => session.dispatch({ type: 'moveToken', token: t }) : undefined}
              />
            );
          }),
        )}
        <style>{`@keyframes ludoPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </svg>

      <Dice
        value={state.die ?? (state.lastEvent?.kind === 'roll' ? state.lastEvent.die : null)}
        canRoll={myTurn && state.phase === 'roll'}
        onRoll={() => session.dispatch({ type: 'roll' })}
      />

      {mustPass ? (
        <div className="flex justify-center pb-2">
          <Button variant="secondary" onClick={() => session.dispatch({ type: 'pass' })}>
            No moves — pass
          </Button>
        </div>
      ) : null}
      {myTurn && state.phase === 'move' && movable.length > 0 ? (
        <p className="pb-2 text-center text-sm text-slate-400">Tap a highlighted token to move</p>
      ) : null}
      {state.lastEvent?.kind === 'tripleSix' ? (
        <p className="pb-2 text-center text-sm text-rose-400">Three sixes! Turn forfeited.</p>
      ) : null}
      {state.lastEvent?.kind === 'move' && state.lastEvent.captured.length > 0 ? (
        <p className="pb-2 text-center text-sm text-amber-400">Capture! Token sent back to its yard.</p>
      ) : null}
    </div>
  );
}
