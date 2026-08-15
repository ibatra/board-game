import { rentFor, TILES, tileName, type MonopolyState } from '@bg/engine';
import { BottomSheet } from '../shared/BottomSheet';
import { DeedCard } from './DeedCard';
import type { GameSession } from '../../session/types';

export function TileDetailSheet({
  session,
  tile,
  onClose,
}: {
  session: GameSession<MonopolyState>;
  tile: number | null;
  onClose: () => void;
}) {
  if (tile === null) return null;
  const state = session.state;
  const def = TILES[tile]!;
  const prop = state.properties[tile];
  const owned = prop != null && prop.owner !== null;

  return (
    <BottomSheet open title={tileName(tile)} onClose={onClose}>
      <DeedCard
        state={state}
        tile={tile}
        seatNames={(seat) => session.seats[seat]?.name ?? `Player ${seat + 1}`}
      />
      {owned && !prop!.mortgaged ? (
        <p className="mt-3 text-center text-sm text-ink-400">
          {def.kind === 'utility' ? (
            'Rent here depends on the roll that lands on it.'
          ) : (
            <>
              Landing here right now costs{' '}
              <span className="tnum font-semibold text-white">${rentFor(state, tile, 7)}</span>
            </>
          )}
        </p>
      ) : null}
    </BottomSheet>
  );
}
