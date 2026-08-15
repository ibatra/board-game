import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GAME_LIST, type GameId } from '@bg/engine';
import { useOnlineSession } from '../session/onlineSession';
import { Button } from '../ui/Button';
import { CodeInput } from '../ui/CodeInput';
import { GameArt, gameTheme } from '../ui/GameArt';
import { Screen, SectionLabel, TopBar } from '../ui/Screen';

export function OnlineEntry() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const session = useOnlineSession();
  const [name, setName] = useState(() => localStorage.getItem('playerName') ?? '');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>(
    params.get('code') || params.get('join') ? 'join' : 'menu',
  );
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
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
        Your name
      </span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        maxLength={16}
        className="w-full rounded-2xl border border-white/8 bg-ink-850 px-4 py-3.5 text-lg font-medium text-white outline-none placeholder:text-ink-600 focus:border-grape-400 focus:ring-2 focus:ring-grape-500/40"
      />
    </label>
  );

  return (
    <Screen>
      <TopBar
        to="/"
        onBack={mode === 'menu' ? undefined : () => setMode('menu')}
        title="Games night mode"
        subtitle="One room, everyone on their own phone"
      />

      {session.errorMsg ? (
        <p className="mb-4 rounded-2xl border border-berry-500/30 bg-berry-500/10 px-4 py-3 text-sm text-berry-500">
          {session.errorMsg}
        </p>
      ) : null}

      {mode === 'menu' ? (
        <div className="space-y-3">
          <button
            onClick={() => setMode('create')}
            className="grain relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-grape-500 to-grape-600 p-5 text-left shadow-pop transition-transform active:scale-[0.985]"
          >
            <p className="font-display text-xl font-bold text-white">Create a room</p>
            <p className="mt-1 text-sm text-white/70">Pick a game, get a code, invite the table</p>
            <span className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          </button>
          <button
            onClick={() => setMode('join')}
            className="block w-full rounded-3xl border border-white/8 bg-ink-850 p-5 text-left shadow-pop transition-transform active:scale-[0.985]"
          >
            <p className="font-display text-xl font-bold text-white">Join with a code</p>
            <p className="mt-1 text-sm text-ink-400">Someone already started one</p>
          </button>
        </div>
      ) : null}

      {mode === 'create' ? (
        <div className="space-y-5">
          {nameInput}
          <div>
            <SectionLabel>Choose a game</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {GAME_LIST.map((g) => {
                const theme = gameTheme(g.id);
                const active = game === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGame(g.id)}
                    className={`rounded-2xl border p-2 text-center transition-colors ${
                      active ? 'border-zest-400 bg-zest-400/10' : 'border-white/8 bg-ink-850'
                    }`}
                    aria-pressed={active}
                  >
                    <span
                      className={`grain relative mx-auto flex aspect-square w-full items-center justify-center rounded-xl bg-gradient-to-br ${theme.tile}`}
                    >
                      <GameArt id={g.id} className="h-3/5 w-3/5" />
                    </span>
                    <span className="mt-1.5 block text-[11px] font-semibold leading-tight text-ink-200">
                      {g.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={!name.trim() || !game || session.status === 'connecting'}
            onClick={() => {
              remember();
              session.connect({ kind: 'create', gameId: game!, name: name.trim() });
            }}
          >
            {session.status === 'connecting' ? 'Creating…' : 'Create room'}
          </Button>
        </div>
      ) : null}

      {mode === 'join' ? (
        <div className="space-y-5">
          {nameInput}
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Room code
            </span>
            <CodeInput value={code} onChange={setCode} />
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={!name.trim() || code.length < 5 || session.status === 'connecting'}
            onClick={() => {
              remember();
              session.connect({ kind: 'join', code, name: name.trim() });
            }}
          >
            {session.status === 'connecting' ? 'Joining…' : 'Join room'}
          </Button>
        </div>
      ) : null}
    </Screen>
  );
}
