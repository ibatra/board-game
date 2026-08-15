import { playerColor } from '../games/shared/playerColors';

const SIZES = { sm: 'h-6 w-6 text-[11px]', md: 'h-9 w-9 text-sm', lg: 'h-11 w-11 text-base' };

/** Colour-coded seat token with the player's initial. */
export function Avatar({
  seat,
  name,
  size = 'md',
  active = false,
  className = '',
}: {
  seat: number;
  name?: string;
  size?: keyof typeof SIZES;
  active?: boolean;
  className?: string;
}) {
  const color = playerColor(seat);
  // Default names ("Player 2", "Bot 3") would all collapse to one letter, so
  // those fall back to the seat number instead.
  const trimmed = (name ?? '').trim();
  const generic = /^(player|bot|guest)\s*\d*$/i.test(trimmed);
  const initial = !trimmed || generic ? String(seat + 1) : trimmed.charAt(0).toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-ink-950 ring-2 transition-all ${
        SIZES[size]
      } ${active ? 'ring-white/80' : 'ring-white/15'} ${className}`}
      style={{ background: color.hex }}
    >
      {initial}
    </span>
  );
}
