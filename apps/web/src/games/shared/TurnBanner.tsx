import type { GameSession } from '../../session/types';
import { playerColor } from './playerColors';

export function TurnBanner({ session, label }: { session: GameSession; label?: string }) {
  const { state, seats, myPlayerId } = session;
  if (state.result) return null;
  const current = state.currentPlayer;
  const name = seats[current]?.name ?? `Player ${current + 1}`;
  const isMe = myPlayerId !== null && myPlayerId === current;
  return (
    <div className="px-4 py-2 text-center">
      <span className={`text-lg font-semibold ${playerColor(current).text}`}>
        {label ?? (isMe ? 'Your turn' : `${name}'s turn`)}
      </span>
    </div>
  );
}
