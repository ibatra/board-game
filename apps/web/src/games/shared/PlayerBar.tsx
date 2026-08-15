import type { GameSession } from '../../session/types';
import { Avatar } from '../../ui/Avatar';
import { playerColor } from './playerColors';

export function PlayerBar({ session, extra }: { session: GameSession; extra?: (seat: number) => string }) {
  const { state, seats } = session;
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {seats.map((seat, i) => {
        const color = playerColor(i);
        const isTurn = !state.result && state.currentPlayer === i;
        const isMe = session.myPlayerId === i;
        return (
          <div
            key={i}
            className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition-all ${
              isTurn ? 'bg-white/10' : 'bg-white/[0.03] opacity-60'
            }`}
            style={isTurn ? { boxShadow: `0 0 0 1.5px ${color.hex}, 0 0 18px -6px ${color.hex}` } : undefined}
          >
            <Avatar seat={i} name={seat.name} size="sm" active={isTurn} />
            <span className="font-medium text-white">
              {seat.name}
              {seat.isBot ? ' 🤖' : ''}
              {isMe ? <span className="text-ink-400"> (you)</span> : null}
            </span>
            {extra ? <span className="tnum text-ink-300">{extra(i)}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
