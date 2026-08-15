import { useNavigate } from 'react-router-dom';
import type { GameSession } from '../../session/types';
import { playerColor } from './playerColors';
import { Button } from '../../ui/Button';

export function WinnerOverlay({ session, onRestart }: { session: GameSession; onRestart?: () => void }) {
  const navigate = useNavigate();
  const result = session.state.result;
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-6 text-center shadow-xl">
        {result.kind === 'draw' ? (
          <p className="text-2xl font-bold">It&apos;s a draw!</p>
        ) : (
          <>
            <p className="text-5xl">🏆</p>
            <p className={`mt-2 text-2xl font-bold ${playerColor(result.winner).text}`}>
              {session.seats[result.winner]?.name ?? `Player ${result.winner + 1}`} wins!
            </p>
            {result.ranking && result.ranking.length > 1 ? (
              <ol className="mt-3 space-y-1 text-sm text-slate-300">
                {result.ranking.map((p, i) => (
                  <li key={p}>
                    {i + 1}. {session.seats[p]?.name ?? `Player ${p + 1}`}
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {onRestart ? (
            <Button onClick={onRestart}>Play again</Button>
          ) : null}
          <Button variant="secondary" onClick={() => navigate('/')}>
            Back to games
          </Button>
        </div>
      </div>
    </div>
  );
}
