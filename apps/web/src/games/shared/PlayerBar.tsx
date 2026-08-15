import type { GameSession } from '../../session/types';
import { playerColor } from './playerColors';

export function PlayerBar({ session, extra }: { session: GameSession; extra?: (seat: number) => string }) {
  const { state, seats } = session;
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2">
      {seats.map((seat, i) => {
        const color = playerColor(i);
        const isTurn = !state.result && state.currentPlayer === i;
        return (
          <div
            key={i}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
              isTurn ? 'bg-slate-700 ring-2 ring-emerald-400' : 'bg-slate-800/60'
            }`}
          >
            <span className={`h-3 w-3 rounded-full ${color.bg}`} />
            <span className="font-medium">
              {seat.name}
              {seat.isBot ? ' 🤖' : ''}
            </span>
            {extra ? <span className="text-slate-400">{extra(i)}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
