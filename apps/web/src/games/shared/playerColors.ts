export const PLAYER_COLORS = [
  { name: 'Red', bg: 'bg-rose-500', text: 'text-rose-400', hex: '#f43f5e' },
  { name: 'Blue', bg: 'bg-sky-500', text: 'text-sky-400', hex: '#0ea5e9' },
  { name: 'Green', bg: 'bg-emerald-500', text: 'text-emerald-400', hex: '#10b981' },
  { name: 'Yellow', bg: 'bg-amber-400', text: 'text-amber-300', hex: '#fbbf24' },
  { name: 'Purple', bg: 'bg-violet-500', text: 'text-violet-400', hex: '#8b5cf6' },
  { name: 'Orange', bg: 'bg-orange-500', text: 'text-orange-400', hex: '#f97316' },
] as const;

export function playerColor(seat: number) {
  return PLAYER_COLORS[seat % PLAYER_COLORS.length]!;
}
