import { Link, Navigate, useParams } from 'react-router-dom';
import { useLocalSession } from '../session/localSession';
import { BOARDS } from '../games/boardRegistry';
import { PlayerBar } from '../games/shared/PlayerBar';
import { TurnBanner } from '../games/shared/TurnBanner';
import { WinnerOverlay } from '../games/shared/WinnerOverlay';

export function LocalGame() {
  const { gameId } = useParams();
  const session = useLocalSession();

  if (!session.def || session.def.id !== gameId || !session.state) {
    return <Navigate to={`/play/${gameId}`} replace />;
  }

  const Board = BOARDS[session.def.id];
  if (!Board) {
    return <p className="p-8 text-center">Board not implemented yet.</p>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-3 py-2">
        <Link to={`/play/${gameId}`} className="p-2 text-xl" aria-label="Back">
          ←
        </Link>
        <span className="font-bold">{session.def.name}</span>
        <button onClick={() => session.restart()} className="p-2 text-xl" aria-label="Restart">
          ↺
        </button>
      </header>
      <PlayerBar
        session={session}
        extra={
          session.def.id === 'monopoly'
            ? (seat) => {
                const p = (session.state as { players?: { cash: number; bankrupt: boolean }[] }).players?.[seat];
                return p ? (p.bankrupt ? '💀' : `$${p.cash}`) : '';
              }
            : undefined
        }
      />
      {session.def.id !== 'monopoly' ? <TurnBanner session={session} /> : null}
      <main className="flex flex-1 flex-col justify-center">
        <Board session={session} />
      </main>
      <WinnerOverlay session={session} onRestart={() => session.restart()} />
    </div>
  );
}
