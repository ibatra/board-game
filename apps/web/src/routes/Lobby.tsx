import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getGame } from '@bg/engine';
import { useOnlineSession } from '../session/onlineSession';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { GameArt, gameTheme } from '../ui/GameArt';
import { Screen, SectionLabel } from '../ui/Screen';

export function Lobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const session = useOnlineSession();
  const [copied, setCopied] = useState(false);

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
  const canStart = def !== undefined && count >= def.players.min && count <= def.players.max;

  if (session.status === 'error') {
    return (
      <Screen className="pt-16 text-center">
        <p className="text-berry-500">{session.errorMsg}</p>
        <Button
          className="mt-4"
          onClick={() => {
            session.leave();
            navigate('/online');
          }}
        >
          Back
        </Button>
      </Screen>
    );
  }

  function share() {
    const url = `${location.origin}/online?code=${code}`;
    if (navigator.share) {
      navigator.share({ title: 'Join my games night', url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  const theme = gameTheme(def?.id ?? '');

  return (
    <Screen>
      <header className="pb-5 pt-8 text-center">
        {def ? (
          <span
            className={`grain relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.tile}`}
          >
            <GameArt id={def.id} className="h-10 w-10" />
          </span>
        ) : null}
        <p className="text-sm text-ink-400">{def?.name ?? 'Game'} · share this code</p>
        <p className="tnum mt-2 font-display text-6xl font-extrabold tracking-[0.12em] text-white">{code}</p>
        <button
          onClick={share}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-zest-400 transition-colors active:bg-white/10"
        >
          {copied ? '✓ Link copied' : '↗ Share invite link'}
        </button>
      </header>

      <SectionLabel>
        At the table · {count}
        {def ? `/${def.players.max}` : ''}
      </SectionLabel>

      <div className="space-y-2">
        {session.lobbySeats.map((seat, i) => (
          <div
            key={i}
            className="animate-rise flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-850 p-3"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Avatar seat={i} name={seat.name} active={seat.connected} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-white">
                {seat.name}
                {i === session.myPlayerId ? <span className="text-ink-400"> (you)</span> : null}
              </span>
              <span className="text-xs text-ink-400">
                {seat.isBot
                  ? '🤖 Bot'
                  : i === session.hostSeat
                    ? '👑 Host'
                    : seat.connected
                      ? 'Ready'
                      : 'Disconnected'}
              </span>
            </span>
            {!seat.isBot ? (
              <span
                className={`h-2.5 w-2.5 rounded-full ${seat.connected ? 'bg-mint-400' : 'bg-ink-600'}`}
                title={seat.connected ? 'connected' : 'disconnected'}
              />
            ) : null}
            {isHost && i !== session.hostSeat ? (
              <button
                className="rounded-lg px-1.5 py-1 text-ink-500 transition-colors active:text-berry-500"
                onClick={() => session.removeSeat(i)}
                aria-label={seat.isBot ? 'Remove bot' : 'Remove player'}
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}

        {/* Empty seats so the table reads as "room for more". */}
        {def && count < def.players.max
          ? Array.from({ length: Math.min(def.players.max - count, 2) }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-white/8 p-3 text-sm text-ink-600"
              >
                <span className="h-9 w-9 rounded-full border border-dashed border-white/10" />
                Waiting for a player…
              </div>
            ))
          : null}
      </div>

      {session.status === 'reconnecting' ? (
        <p className="mt-4 text-center text-sm text-flame-400">Reconnecting…</p>
      ) : null}

      <div className="mt-6 space-y-3">
        {isHost ? (
          <>
            {def && count < def.players.max ? (
              <Button variant="secondary" className="w-full" onClick={() => session.addBot()}>
                + Add a bot
              </Button>
            ) : null}
            <Button size="lg" className="w-full" disabled={!canStart} onClick={() => session.startGame()}>
              Start game
            </Button>
            {def && !canStart ? (
              <p className="text-center text-sm text-ink-500">
                Needs {def.players.min}–{def.players.max} players (currently {count})
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-center text-sm text-ink-400">Waiting for the host to start…</p>
        )}
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            session.leave();
            navigate('/online');
          }}
        >
          Leave room
        </Button>
      </div>
    </Screen>
  );
}
