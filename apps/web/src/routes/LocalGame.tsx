import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLocalSession } from '../session/localSession';
import { BOARDS } from '../games/boardRegistry';
import { GameHeader } from '../games/shared/GameHeader';
import { PlayerBar } from '../games/shared/PlayerBar';
import { TurnBanner } from '../games/shared/TurnBanner';
import { WinnerOverlay } from '../games/shared/WinnerOverlay';

export function LocalGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const session = useLocalSession();

  if (!session.def || session.def.id !== gameId || !session.state) {
    return <Navigate to={`/play/${gameId}`} replace />;
  }

  const Board = BOARDS[session.def.id];
  if (!Board) return <p className="p-8 text-center">Board not implemented yet.</p>;

  return (
    <div className="flex min-h-dvh flex-col">
      <GameHeader
        onBack={() => navigate(`/play/${gameId}`)}
        title={session.def.name}
        right={
          <button
            onClick={() => session.restart()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-ink-300 transition-colors active:bg-white/10"
            aria-label="Restart"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 12a8 8 0 1 1 2.5 5.8" strokeLinecap="round" />
              <path d="M4 19v-5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        }
      />
      {/* Monopoly brings its own richer table strip and turn panel. */}
      {session.def.id !== 'monopoly' ? (
        <>
          <PlayerBar session={session} />
          <TurnBanner session={session} />
        </>
      ) : null}
      <main className="flex flex-1 flex-col justify-center">
        <Board session={session} />
      </main>
      <WinnerOverlay session={session} onRestart={() => session.restart()} />
    </div>
  );
}
