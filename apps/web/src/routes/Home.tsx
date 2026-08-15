import { Link } from 'react-router-dom';
import { GAME_LIST } from '@bg/engine';
import { GameArt, gameTheme } from '../ui/GameArt';
import { Screen, SectionLabel } from '../ui/Screen';

export function Home() {
  return (
    <Screen>
      <header className="pb-6 pt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-grape-400">Pull up a chair</p>
        <h1 className="mt-2 text-5xl font-extrabold leading-none text-white">
          Games
          <span className="text-zest-400">.</span>
          <br />
          Night
        </h1>
        <p className="mt-3 text-ink-400">Five board games, everyone on their own phone.</p>
      </header>

      <Link
        to="/online"
        className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-grape-500 to-grape-600 p-5 shadow-pop transition-transform active:scale-[0.985]"
      >
        <div className="relative z-10 flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl">
            📱
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-white">Start a games night</p>
            <p className="mt-0.5 text-sm text-white/70">
              {__STATIC_DEMO__
                ? 'Needs the game server — tap to see how'
                : 'Share a code — everyone joins from their own phone'}
            </p>
          </div>
        </div>
        {/* Soft light bloom in the corner. */}
        <span className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
      </Link>

      <SectionLabel>Pick a game</SectionLabel>

      <div className="grid grid-cols-2 gap-3">
        {GAME_LIST.map((game, i) => {
          const theme = gameTheme(game.id);
          return (
            <Link
              key={game.id}
              to={`/play/${game.id}`}
              className="panel animate-rise group overflow-hidden p-3 transition-transform active:scale-[0.97]"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div
                className={`grain relative mb-3 flex aspect-4/3 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.tile}`}
              >
                <GameArt id={game.id} className="h-3/5 w-3/5 drop-shadow-lg" />
              </div>
              <p className="font-display font-bold leading-tight text-white">{game.name}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-ink-400">{game.description}</p>
              <p className="tnum mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-ink-300">
                {game.players.min === game.players.max
                  ? `${game.players.min} players`
                  : `${game.players.min}–${game.players.max} players`}
              </p>
            </Link>
          );
        })}
      </div>

      {__STATIC_DEMO__ ? null : (
        <p className="mt-8 text-center text-xs text-ink-500">
          Got a code?{' '}
          <Link to="/online?join=1" className="font-semibold text-zest-400">
            Join a room
          </Link>
        </p>
      )}
    </Screen>
  );
}
