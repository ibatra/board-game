import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getGame } from '@bg/engine';
import { useOnlineSession } from '../session/onlineSession';
import { BOARDS } from '../games/boardRegistry';
import { GameHeader } from '../games/shared/GameHeader';
import { PlayerBar } from '../games/shared/PlayerBar';
import { TurnBanner } from '../games/shared/TurnBanner';
import { WinnerOverlay } from '../games/shared/WinnerOverlay';
import { Button } from '../ui/Button';

export function OnlineGame() {
  const { code } = useParams();
  const navigate = useNavigate();
  const session = useOnlineSession();

  // Refresh or direct link: rejoin with the stored token, once.
  useEffect(() => {
    const s = useOnlineSession.getState();
    if (!s.roomCode && code && s.status === 'idle') {
      s.connect({ kind: 'rejoin', code });
    }
  }, [code]);

  const def = session.gameId ? getGame(session.gameId) : undefined;

  if (session.status === 'error') {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-berry-500">{session.errorMsg}</p>
        <Button
          className="mt-4"
          onClick={() => {
            session.leave();
            navigate('/online');
          }}
        >
          Back to online
        </Button>
      </div>
    );
  }

  if (!def || !session.state) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-ink-400">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-grape-400" />
        <p className="text-sm">Joining room {code}…</p>
      </div>
    );
  }

  const Board = BOARDS[def.id];
  if (!Board) return <p className="p-8 text-center">Board not implemented.</p>;

  return (
    <div className="flex min-h-dvh flex-col">
      <GameHeader
        onBack={() => {
          session.leave();
          navigate('/');
        }}
        title={def.name}
        badge={
          <span className="tnum rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold tracking-widest text-ink-400">
            {code}
          </span>
        }
        right={
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              session.status === 'connected' ? 'bg-mint-400' : 'animate-pulse bg-flame-400'
            }`}
            title={session.status}
          />
        }
      />
      {/* Monopoly brings its own richer table strip and turn panel. */}
      {def.id !== 'monopoly' ? (
        <>
          <PlayerBar session={session} />
          <TurnBanner session={session} />
        </>
      ) : null}
      <main className="flex flex-1 flex-col justify-center">
        <Board session={session} />
      </main>
      {session.status === 'reconnecting' ? (
        <p className="fixed inset-x-0 top-0 z-50 bg-flame-500 py-1.5 text-center text-sm font-semibold text-white">
          Reconnecting…
        </p>
      ) : null}
      <WinnerOverlay session={session} />
    </div>
  );
}
