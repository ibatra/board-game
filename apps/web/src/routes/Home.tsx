import { Link } from 'react-router-dom';
import { GAME_LIST } from '@bg/engine';
import { GAME_EMOJI } from '../games/boardRegistry';

export function Home() {
  return (
    <div className="mx-auto max-w-md px-4 pb-8">
      <header className="py-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">🎲 Games Night</h1>
        <p className="mt-1 text-slate-400">Board games on every phone</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {GAME_LIST.map((game) => (
          <Link
            key={game.id}
            to={`/play/${game.id}`}
            className="rounded-2xl bg-slate-800 p-4 shadow transition-colors active:bg-slate-700"
          >
            <span className="text-4xl">{GAME_EMOJI[game.id] ?? '🎮'}</span>
            <p className="mt-2 font-bold">{game.name}</p>
            <p className="mt-1 text-xs text-slate-400">{game.description}</p>
            <p className="mt-2 text-xs text-slate-500">
              {game.players.min === game.players.max
                ? `${game.players.min} players`
                : `${game.players.min}–${game.players.max} players`}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
