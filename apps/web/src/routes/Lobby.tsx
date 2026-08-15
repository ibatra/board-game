import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getGame } from '@bg/engine';
import { useOnlineSession } from '../session/onlineSession';
import { playerColor } from '../games/shared/playerColors';
import { Button } from '../ui/Button';

export function Lobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const session = useOnlineSession();

  // Refresh or direct link: try to rejoin with the stored token, once.
  useEffect(() => {
    const s = useOnlineSession.getState();
    if (!s.roomCode && code && s.status === 'idle') {
      s.connect({ kind: 'rejoin', code });
    }
  }, [code]);

  useEffect(() => {
    if (session.started) navigate(`/room/${code}/game`, { replace: true });
  }, [session.started, code, navigate]);

  const def = session.gameId ? getGame(session.gameId) : undefined;
  const isHost = session.myPlayerId === session.hostSeat;
  const count = session.lobbySeats.length;
  const canStart =
    def !== undefined && count >= def.players.min && count <= def.players.max;

  if (session.status === 'error') {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-rose-300">{session.errorMsg}</p>
        <Button className="mt-4" onClick={() => { session.leave(); navigate('/online'); }}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8">
      <header className="py-6 text-center">
        <p className="text-sm text-slate-400">{def?.name ?? 'Game'} · share this code</p>
        <p className="mt-1 text-5xl font-black tracking-[0.3em]">{code}</p>
        <button
          className="mt-2 text-sm text-emerald-400 underline"
          onClick={() => {
            const url = `${location.origin}/online?code=${code}`;
            if (navigator.share) navigator.share({ title: 'Join my game', url }).catch(() => {});
            else navigator.clipboard?.writeText(url);
          }}
        >
          Share invite link
        </button>
      </header>

      <div className="space-y-2">
        {session.lobbySeats.map((seat, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800 p-3">
            <span className={`h-3.5 w-3.5 rounded-full ${playerColor(i).bg}`} />
            <span className="flex-1 font-medium">
              {seat.name}
              {seat.isBot ? ' 🤖' : ''}
              {i === session.hostSeat ? ' 👑' : ''}
              {i === session.myPlayerId ? ' (you)' : ''}
            </span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${seat.connected ? 'bg-emerald-400' : 'bg-slate-600'}`}
              title={seat.connected ? 'connected' : 'disconnected'}
            />
            {isHost && !seat.isBot && i !== session.hostSeat ? (
              <button className="p-1 text-slate-500" onClick={() => session.removeSeat(i)} aria-label="Remove">
                ✕
              </button>
            ) : null}
            {isHost && seat.isBot ? (
              <button className="p-1 text-slate-500" onClick={() => session.removeSeat(i)} aria-label="Remove bot">
                ✕
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {session.status === 'reconnecting' ? (
        <p className="mt-4 text-center text-sm text-amber-400">Reconnecting…</p>
      ) : null}

      <div className="mt-6 space-y-3">
        {isHost ? (
          <>
            {def && count < def.players.max ? (
              <Button variant="secondary" className="w-full" onClick={() => session.addBot()}>
                + Add a bot
              </Button>
            ) : null}
            <Button className="w-full text-lg" disabled={!canStart} onClick={() => session.startGame()}>
              Start game
            </Button>
            {def && !canStart ? (
              <p className="text-center text-sm text-slate-500">
                Needs {def.players.min}–{def.players.max} players (currently {count})
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-center text-sm text-slate-400">Waiting for the host to start…</p>
        )}
        <Button variant="ghost" className="w-full" onClick={() => { session.leave(); navigate('/online'); }}>
          Leave room
        </Button>
      </div>
    </div>
  );
}
