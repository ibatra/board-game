import { useNavigate } from 'react-router-dom';
import type { GameSession } from '../../session/types';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { PLAYER_COLORS, playerColor } from './playerColors';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Deterministic confetti so re-renders don't reshuffle the pieces. */
function confettiPieces(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    return {
      left: r(1) * 100,
      delay: r(2) * 1.8,
      duration: 2.4 + r(3) * 1.8,
      rotate: r(4) * 360,
      color: PLAYER_COLORS[Math.floor(r(5) * PLAYER_COLORS.length)]!.hex,
      round: r(6) > 0.6,
    };
  });
}

const PIECES = confettiPieces(28);

export function WinnerOverlay({ session, onRestart }: { session: GameSession; onRestart?: () => void }) {
  const navigate = useNavigate();
  const result = session.state.result;
  if (!result) return null;

  const isDraw = result.kind === 'draw';
  const winner = isDraw ? null : result.winner;
  const winnerName =
    winner === null ? null : (session.seats[winner]?.name ?? `Player ${winner + 1}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink-950/85 p-6 backdrop-blur">
      {!isDraw ? (
        <div className="pointer-events-none absolute inset-0">
          {PIECES.map((p, i) => (
            <span
              key={i}
              className="absolute top-[-8%] block h-2.5 w-1.5"
              style={{
                left: `${p.left}%`,
                background: p.color,
                borderRadius: p.round ? '9999px' : '2px',
                animation: `confetti ${p.duration}s linear ${p.delay}s infinite`,
                transform: `rotate(${p.rotate}deg)`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="animate-pop-in panel relative w-full max-w-sm p-6 text-center">
        {isDraw ? (
          <>
            <p className="text-5xl">🤝</p>
            <p className="mt-3 font-display text-3xl font-extrabold text-white">It&apos;s a draw</p>
            <p className="mt-1 text-sm text-ink-400">Nobody blinked.</p>
          </>
        ) : (
          <>
            <p className="text-6xl drop-shadow-[0_0_20px_rgba(215,242,78,0.5)]">🏆</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink-400">Winner</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Avatar seat={winner!} name={winnerName ?? undefined} size="lg" active />
              <p
                className="font-display text-3xl font-extrabold"
                style={{ color: playerColor(winner!).hex }}
              >
                {winnerName}
              </p>
            </div>

            {result.ranking && result.ranking.length > 2 ? (
              <ol className="mt-5 space-y-1.5 text-left">
                {result.ranking.map((p, i) => (
                  <li
                    key={p}
                    className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-ink-200"
                  >
                    <span className="w-5 text-center">{MEDALS[i] ?? `${i + 1}.`}</span>
                    <Avatar seat={p} name={session.seats[p]?.name} size="sm" />
                    <span className="truncate">{session.seats[p]?.name ?? `Player ${p + 1}`}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {onRestart ? (
            <Button size="lg" onClick={onRestart}>
              Play again
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => navigate('/')}>
            Back to games
          </Button>
        </div>
      </div>

      <style>{`@keyframes confetti {
        0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
      }`}</style>
    </div>
  );
}
