import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getGame } from '@bg/engine';
import { useOnlineSession } from '../session/onlineSession';
import { BOARDS } from '../games/boardRegistry';
import { PlayerBar } from '../games/shared/PlayerBar';
import { TurnBanner } from '../games/shared/TurnBanner';
import { WinnerOverlay } from '../games/shared/WinnerOverlay';

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
      <div className="p-8 text-center">
        <p className="text-rose-300">{session.errorMsg}</p>
        <button className="mt-4 text-emerald-400 underline" onClick={() => { session.leave(); navigate('/online'); }}>
          Back to online
        </button>
      </div>
    );
  }

  if (!def || !session.state) {
    return <p className="p-8 text-center text-slate-400">Loading game…</p>;
  }

  const Board = BOARDS[def.id];
  if (!Board) return <p className="p-8 text-center">Board not implemented.</p>;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-3 py-2">
        <button onClick={() => { session.leave(); navigate('/'); }} className="p-2 text-xl" aria-label="Leave">
          ←
        </button>
        <span className="font-bold">
          {def.name} <span className="text-sm font-normal text-slate-500">· {code}</span>
        </span>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            session.status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
          }`}
          title={session.status}
        />
      </header>
      <PlayerBar
        session={session}
        extra={
          def.id === 'monopoly'
            ? (seat) => {
                const p = (session.state as { players?: { cash: number; bankrupt: boolean }[] }).players?.[seat];
                return p ? (p.bankrupt ? '💀' : `$${p.cash}`) : '';
              }
            : undefined
        }
      />
      {def.id !== 'monopoly' ? <TurnBanner session={session} /> : null}
      <main className="flex flex-1 flex-col justify-center">
        <Board session={session} />
      </main>
      {session.status === 'reconnecting' ? (
        <p className="fixed inset-x-0 top-0 z-50 bg-amber-500 py-1 text-center text-sm font-medium text-amber-950">
          Reconnecting…
        </p>
      ) : null}
      <WinnerOverlay session={session} />
    </div>
  );
}
