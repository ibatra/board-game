import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GAME_LIST, type GameId } from '@bg/engine';
import { useOnlineSession } from '../session/onlineSession';
import { GAME_EMOJI } from '../games/boardRegistry';
import { Button } from '../ui/Button';

export function OnlineEntry() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const session = useOnlineSession();
  const [name, setName] = useState(() => localStorage.getItem('playerName') ?? '');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>(params.get('code') ? 'join' : 'menu');
  const [code, setCode] = useState(params.get('code') ?? '');
  const [game, setGame] = useState<GameId | null>((params.get('game') as GameId) ?? null);

  useEffect(() => {
    if (session.roomCode && session.status === 'connected') {
      navigate(`/room/${session.roomCode}`);
    }
  }, [session.roomCode, session.status, navigate]);

  function remember() {
    localStorage.setItem('playerName', name.trim());
  }

  const nameInput = (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Your name"
      maxLength={16}
      className="w-full rounded-xl bg-slate-800 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-emerald-500"
    />
  );

  return (
    <div className="mx-auto max-w-md px-4 pb-8">
      <header className="flex items-center gap-3 py-4">
        <Link to="/" className="text-2xl">←</Link>
        <h1 className="text-xl font-bold">Play online</h1>
      </header>

      <p className="mb-6 text-sm text-slate-400">
        One person creates a room and shares the code — everyone else joins on their own phone.
      </p>

      {session.errorMsg ? (
        <p className="mb-4 rounded-xl bg-rose-950/60 px-4 py-3 text-sm text-rose-300">{session.errorMsg}</p>
      ) : null}

      {mode === 'menu' ? (
        <div className="space-y-3">
          <Button className="w-full text-lg" onClick={() => setMode('create')}>
            Create a room
          </Button>
          <Button variant="secondary" className="w-full text-lg" onClick={() => setMode('join')}>
            Join with a code
          </Button>
        </div>
      ) : null}

      {mode === 'create' ? (
        <div className="space-y-4">
          {nameInput}
          <div className="grid grid-cols-2 gap-2">
            {GAME_LIST.map((g) => (
              <button
                key={g.id}
                onClick={() => setGame(g.id)}
                className={`rounded-xl p-3 text-left ${game === g.id ? 'bg-emerald-600' : 'bg-slate-800'}`}
              >
                <span className="text-2xl">{GAME_EMOJI[g.id]}</span>
                <p className="mt-1 text-sm font-semibold">{g.name}</p>
              </button>
            ))}
          </div>
          <Button
            className="w-full text-lg"
            disabled={!name.trim() || !game || session.status === 'connecting'}
            onClick={() => {
              remember();
              session.connect({ kind: 'create', gameId: game!, name: name.trim() });
            }}
          >
            {session.status === 'connecting' ? 'Creating…' : 'Create room'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setMode('menu')}>
            Back
          </Button>
        </div>
      ) : null}

      {mode === 'join' ? (
        <div className="space-y-4">
          {nameInput}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            maxLength={5}
            autoCapitalize="characters"
            autoCorrect="off"
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button
            className="w-full text-lg"
            disabled={!name.trim() || code.length < 5 || session.status === 'connecting'}
            onClick={() => {
              remember();
              session.connect({ kind: 'join', code, name: name.trim() });
            }}
          >
            {session.status === 'connecting' ? 'Joining…' : 'Join room'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setMode('menu')}>
            Back
          </Button>
        </div>
      ) : null}
    </div>
  );
}
