import type { GameSession } from '../../session/types';
import { playerColor } from './playerColors';

export function TurnBanner({ session, label }: { session: GameSession; label?: string }) {
  const { state, seats, myPlayerId } = session;
  if (state.result) return null;
  const current = state.currentPlayer;
  const name = seats[current]?.name ?? `Player ${current + 1}`;
  const isMe = myPlayerId !== null && myPlayerId === current;
  const color = playerColor(current);

  return (
    <div className="flex justify-center px-4 py-1.5">
      <span
        key={current}
        className="animate-pop-in inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 font-display text-base font-bold"
        style={{ color: color.hex, boxShadow: `inset 0 0 0 1px ${color.hex}40` }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: color.hex, animation: 'breathe 1.6s ease-in-out infinite' }} />
        {label ?? (isMe ? 'Your turn' : `${name}'s turn`)}
      </span>
    </div>
  );
}
