import type { TicTacToeState } from '@bg/engine';
import type { GameSession } from '../../session/types';
import { canActFor } from '../../session/types';
import { playerColor } from '../shared/playerColors';

const MARKS = ['✕', '◯'];

export function TicTacToeBoard({ session }: { session: GameSession<TicTacToeState> }) {
  const { state } = session;
  const myTurn = !state.result && canActFor(session, state.currentPlayer);

  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2 p-4">
      {state.cells.map((cell, i) => (
        <button
          key={i}
          disabled={!myTurn || cell !== null}
          onClick={() => session.dispatch({ type: 'place', cell: i })}
          className={`aspect-square rounded-xl bg-slate-800 text-5xl font-bold transition-colors ${
            cell === null && myTurn ? 'active:bg-slate-700' : ''
          } ${cell !== null ? playerColor(cell).text : 'text-transparent'}`}
        >
          {cell !== null ? MARKS[cell] : '·'}
        </button>
      ))}
    </div>
  );
}
