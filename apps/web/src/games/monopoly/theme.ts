import { HOUSE_COST, TILES, type MonopolyState } from '@bg/engine';

export const GROUP_HEX: Record<string, string> = {
  brown: '#8b5a2b',
  lightblue: '#38bdf8',
  pink: '#ec4899',
  orange: '#f97316',
  red: '#dc2626',
  yellow: '#facc15',
  green: '#16a34a',
  darkblue: '#2563eb',
  railroad: '#4b5563',
  utility: '#94a3b8',
};

export const GROUP_LABEL: Record<string, string> = {
  brown: 'Brown',
  lightblue: 'Light Blue',
  pink: 'Pink',
  orange: 'Orange',
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  darkblue: 'Dark Blue',
  railroad: 'Railroads',
  utility: 'Utilities',
};

/** Colour group of any purchasable tile; null for corners, cards and taxes. */
export function groupOf(tile: number): string | null {
  const def = TILES[tile];
  if (!def) return null;
  if (def.kind === 'street') return def.group;
  if (def.kind === 'railroad') return 'railroad';
  if (def.kind === 'utility') return 'utility';
  return null;
}

export function priceOf(tile: number): number {
  const def = TILES[tile];
  if (!def) return 0;
  return def.kind === 'street' || def.kind === 'railroad' || def.kind === 'utility' ? def.price : 0;
}

/** Cash plus everything sellable — the number players actually compare. */
export function netWorth(state: MonopolyState, seat: number): number {
  let total = state.players[seat]?.cash ?? 0;
  for (const [key, prop] of Object.entries(state.properties)) {
    if (prop.owner !== seat) continue;
    const tile = Number(key);
    const def = TILES[tile]!;
    total += prop.mortgaged ? priceOf(tile) / 2 : priceOf(tile);
    if (def.kind === 'street' && prop.houses > 0) {
      // Buildings sell back to the bank at half price.
      total += prop.houses * (houseCostOf(def.group) / 2);
    }
  }
  return Math.round(total);
}

export function houseCostOf(group: string): number {
  return HOUSE_COST[group] ?? 0;
}
