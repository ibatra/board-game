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

/** The four finishing triangles that meet at the middle of the cross. */
const CENTER_TRIANGLES = [
  '6,9 9,9 7.5,7.5',
  '6,6 6,9 7.5,7.5',
  '6,6 9,6 7.5,7.5',
  '9,6 9,9 7.5,7.5',
];

export function LudoBoard({ session }: { session: GameSession<LudoState> }) {
  const { state } = session;
  const current = state.currentPlayer;
  const myTurn = !state.result && canActFor(session, current);
  const movable = state.phase === 'move' ? movableTokens(state, current) : [];
  const mustPass = myTurn && state.phase === 'move' && movable.length === 0;

  return (
    <div className="mx-auto w-full max-w-md px-3">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full rounded-3xl border border-white/10 bg-[#f2eee3] shadow-pop"
      >
        <defs>
          <filter id="tokenShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* yards */}
        {YARDS.map(([ox, oy], seat) => {
          const active = seat < state.numPlayers;
          return (
            <g key={seat} opacity={active ? 1 : 0.18}>
              <rect
                x={ox * CELL + 6}
                y={oy * CELL + 6}
                width={6 * CELL - 12}
                height={6 * CELL - 12}
                fill={playerColor(seat).hex}
                rx={20}
                opacity={0.9}
              />
              <rect
                x={(ox + 1) * CELL}
                y={(oy + 1) * CELL}
                width={4 * CELL}
                height={4 * CELL}
                fill="#faf8f2"
                rx={14}
              />
              {yardSpots(seat).map(([sx, sy], i) => (
                <circle
                  key={i}
                  cx={sx * CELL}
                  cy={sy * CELL}
                  r={CELL * 0.44}
                  fill={playerColor(seat).hex}
                  fillOpacity={0.12}
                  stroke={playerColor(seat).hex}
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                />
              ))}
            </g>
          );
        })}

        {/* track cells */}
        {TRACK_PATH.map(([x, y], i) => {
          const entrySeat = START_OFFSETS.indexOf(i as 0 | 13 | 26 | 39);
          const isSafe = SAFE_SQUARES.has(i);
          const entry = entrySeat >= 0;
          return (
            <g key={i}>
              <rect
                x={x * CELL + 1.5}
                y={y * CELL + 1.5}
                width={CELL - 3}
                height={CELL - 3}
                rx={7}
                fill={entry ? playerColor(entrySeat).hex : '#ffffff'}
                fillOpacity={entry ? (entrySeat < state.numPlayers ? 0.9 : 0.18) : 1}
                stroke="#0f172a"
                strokeOpacity={0.14}
                strokeWidth={1}
              />
              {isSafe && !entry ? (
                <text
                  x={(x + 0.5) * CELL}
                  y={(y + 0.7) * CELL}
                  textAnchor="middle"
                  fontSize={CELL * 0.6}
                  fill="#0f172a"
                  fillOpacity={0.3}
                >
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
              x={x * CELL + 1.5}
              y={y * CELL + 1.5}
              width={CELL - 3}
              height={CELL - 3}
              rx={7}
              fill={playerColor(seat).hex}
              opacity={seat < state.numPlayers ? 0.3 + i * 0.13 : 0.08}
            />
          )),
        )}

        {/* center: four finishing triangles */}
        {CENTER_TRIANGLES.map((points, seat) => (
          <polygon
            key={seat}
            points={points.replace(/(\d+(\.\d+)?)/g, (m) => String(Number(m) * CELL))}
            fill={playerColor(seat).hex}
            opacity={seat < state.numPlayers ? 0.9 : 0.12}
            stroke="#0e0c1a"
            strokeWidth={2}
          />
        ))}
        <circle cx={7.5 * CELL} cy={7.5 * CELL} r={CELL * 0.42} fill="#0e0c1a" />
        <text x={7.5 * CELL} y={7.5 * CELL + CELL * 0.2} textAnchor="middle" fontSize={CELL * 0.55}>
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
            const cx = x * CELL + dx;
            const cy = y * CELL;
            return (
              <g
                key={`${seat}-${t}`}
                style={{
                  transition: 'transform 0.35s cubic-bezier(0.3,0.9,0.3,1)',
                  cursor: isMovable ? 'pointer' : 'default',
                  animation: isMovable ? 'breathe 1.1s ease-in-out infinite' : undefined,
                  transformOrigin: `${cx}px ${cy}px`,
                }}
                onClick={isMovable ? () => session.dispatch({ type: 'moveToken', token: t }) : undefined}
              >
                {isMovable ? (
                  <>
                    <circle cx={cx} cy={cy} r={CELL * 0.56} fill={playerColor(seat).hex} opacity={0.3} />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={CELL * 0.5}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      strokeDasharray="5 4"
                      opacity={0.8}
                    />
                  </>
                ) : null}
                <circle
                  cx={cx}
                  cy={cy}
                  r={CELL * 0.34}
                  fill={playerColor(seat).hex}
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  filter="url(#tokenShadow)"
                  style={{ transition: 'cx 0.35s cubic-bezier(0.3,0.9,0.3,1), cy 0.35s cubic-bezier(0.3,0.9,0.3,1)' }}
                />
                <circle cx={cx - CELL * 0.1} cy={cy - CELL * 0.12} r={CELL * 0.08} fill="#ffffff" opacity={0.65} />
              </g>
            );
          }),
        )}
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
        <p className="pb-2 text-center text-sm text-ink-400">Tap a glowing token to move</p>
      ) : null}
      {state.lastEvent?.kind === 'tripleSix' ? (
        <p className="animate-pop-in mx-auto mb-2 w-fit rounded-full bg-berry-500/15 px-4 py-1.5 text-sm font-semibold text-berry-500">
          Three sixes! Turn forfeited.
        </p>
      ) : null}
      {state.lastEvent?.kind === 'move' && state.lastEvent.captured.length > 0 ? (
        <p className="animate-pop-in mx-auto mb-2 w-fit rounded-full bg-flame-400/15 px-4 py-1.5 text-sm font-semibold text-flame-400">
          Capture! Token sent home.
        </p>
      ) : null}
    </div>
  );
}
