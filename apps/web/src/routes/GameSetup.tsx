import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getGame } from '@bg/engine';
import { useLocalSession } from '../session/localSession';
import type { SeatConfig } from '../session/types';
import { playerColor } from '../games/shared/playerColors';
import { Button } from '../ui/Button';
import { GameArt, gameTheme } from '../ui/GameArt';
import { Screen, SectionLabel, TopBar } from '../ui/Screen';

export function GameSetup() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const def = getGame(gameId ?? '');
  const start = useLocalSession((s) => s.start);

  const [seats, setSeats] = useState<SeatConfig[]>(() => [
    { name: 'Player 1', isBot: false },
    { name: 'Player 2', isBot: true },
  ]);

  if (!def) {
    return (
      <Screen>
        <TopBar to="/" title="Game not found" />
        <p className="text-ink-400">That game doesn&apos;t exist.</p>
      </Screen>
    );
  }

  const theme = gameTheme(def.id);
  const canAdd = seats.length < def.players.max;
  const canRemove = seats.length > def.players.min;
  const hasHuman = seats.some((s) => !s.isBot);

  function update(i: number, patch: Partial<SeatConfig>) {
    setSeats((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  return (
    <Screen>
      <TopBar to="/" title={def.name} subtitle={def.description} />

      <div
        className={`grain relative flex h-32 items-center justify-center rounded-3xl bg-gradient-to-br ${theme.tile}`}
      >
        <GameArt id={def.id} className="h-20 w-20 drop-shadow-xl" />
      </div>

      <SectionLabel>Who&apos;s playing</SectionLabel>

      <div className="space-y-2">
        {seats.map((seat, i) => (
          <div key={i} className="flex items-center gap-2 rounded-2xl border border-white/8 bg-ink-850 p-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold text-ink-950"
              style={{ background: playerColor(i).hex }}
            >
              {i + 1}
            </span>
            <input
              value={seat.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-2 font-medium text-white outline-none focus:bg-ink-900 focus:ring-2 focus:ring-grape-500"
              maxLength={16}
              aria-label={`Player ${i + 1} name`}
            />
            {/* Segmented human/bot switch — reads at a glance across the table. */}
            <div className="flex shrink-0 rounded-xl bg-ink-900 p-0.5 text-sm font-semibold">
              {(['human', 'bot'] as const).map((kind) => {
                const active = (kind === 'bot') === seat.isBot;
                return (
                  <button
                    key={kind}
                    onClick={() =>
                      update(i, {
                        isBot: kind === 'bot',
                        name: kind === 'bot' ? `Bot ${i + 1}` : `Player ${i + 1}`,
                      })
                    }
                    className={`rounded-[10px] px-2.5 py-1.5 transition-colors ${
                      active ? 'bg-ink-600 text-white' : 'text-ink-500'
                    }`}
                    aria-pressed={active}
                  >
                    {kind === 'bot' ? '🤖' : '🧑'}
                  </button>
                );
              })}
            </div>
            {canRemove ? (
              <button
                className="shrink-0 rounded-xl px-2 py-2 text-ink-500 transition-colors active:text-berry-500"
                onClick={() => setSeats((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Remove player ${i + 1}`}
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {canAdd ? (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setSeats((prev) => [...prev, { name: `Player ${prev.length + 1}`, isBot: false }])}>
          + Add player
        </Button>
      ) : null}

      <div className="mt-8 space-y-3">
        <Button
          size="lg"
          className="w-full"
          disabled={!hasHuman}
          onClick={() => {
            start(def, seats);
            navigate(`/play/${def.id}/local`);
          }}
        >
          Start game
        </Button>
        {!hasHuman ? (
          <p className="text-center text-sm text-ink-500">Add at least one human player</p>
        ) : (
          <p className="text-center text-sm text-ink-500">
            On separate phones?{' '}
            <Link to="/online" className="font-semibold text-zest-400">
              Play online
            </Link>
          </p>
        )}
      </div>
    </Screen>
  );
}
