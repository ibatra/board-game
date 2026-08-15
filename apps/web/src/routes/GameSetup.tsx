import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getGame } from '@bg/engine';
import { useLocalSession } from '../session/localSession';
import type { SeatConfig } from '../session/types';
import { playerColor } from '../games/shared/playerColors';
import { Button } from '../ui/Button';

export function GameSetup() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const def = getGame(gameId ?? '');
  const start = useLocalSession((s) => s.start);

  const [seats, setSeats] = useState<SeatConfig[]>(() => [
    { name: 'Player 1', isBot: false },
    { name: 'Player 2', isBot: false },
  ]);

  if (!def) {
    return (
      <div className="p-8 text-center">
        <p>Game not found.</p>
        <Link to="/" className="text-emerald-400 underline">
          Back home
        </Link>
      </div>
    );
  }

  const canAdd = seats.length < def.players.max;
  const canRemove = seats.length > def.players.min;
  const hasHuman = seats.some((s) => !s.isBot);

  function update(i: number, patch: Partial<SeatConfig>) {
    setSeats((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8">
      <header className="flex items-center gap-3 py-4">
        <Link to="/" className="text-2xl">
          ←
        </Link>
        <h1 className="text-xl font-bold">{def.name}</h1>
      </header>

      <h2 className="mb-2 font-semibold text-slate-300">Players</h2>
      <div className="space-y-2">
        {seats.map((seat, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-800 p-2">
            <span className={`h-4 w-4 shrink-0 rounded-full ${playerColor(i).bg}`} />
            <input
              value={seat.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="min-w-0 flex-1 rounded-lg bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={16}
            />
            <Button
              variant={seat.isBot ? 'primary' : 'secondary'}
              className="min-h-10 shrink-0 px-3 text-sm"
              onClick={() => update(i, { isBot: !seat.isBot, name: seat.isBot ? `Player ${i + 1}` : `Bot ${i + 1}` })}
            >
              {seat.isBot ? '🤖 Bot' : '🧑 Human'}
            </Button>
            {canRemove ? (
              <Button
                variant="ghost"
                className="min-h-10 shrink-0 px-2"
                onClick={() => setSeats((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remove player"
              >
                ✕
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      {canAdd ? (
        <Button
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => setSeats((prev) => [...prev, { name: `Player ${prev.length + 1}`, isBot: false }])}
        >
          + Add player
        </Button>
      ) : null}

      <div className="mt-8 space-y-3">
        <Button
          className="w-full text-lg"
          disabled={!hasHuman}
          onClick={() => {
            start(def, seats);
            navigate(`/play/${def.id}/local`);
          }}
        >
          Start game
        </Button>
        {!hasHuman ? <p className="text-center text-sm text-slate-500">At least one human player needed</p> : null}
        <p className="text-center text-sm text-slate-500">
          Playing on separate phones? <Link to="/online" className="text-emerald-400 underline">Play online</Link>
        </p>
      </div>
    </div>
  );
}
