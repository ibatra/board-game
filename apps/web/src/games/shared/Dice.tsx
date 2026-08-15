import { Button } from '../../ui/Button';

/** Pip coordinates on a 3×3 grid, per face value. */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};

/** A single physical-looking die. `value` of null shows a resting blank. */
export function Die({ value, size = 56 }: { value: number | null; size?: number }) {
  const pips = value ? (PIPS[value] ?? []) : [];
  return (
    <span
      key={value ?? 'empty'}
      className="inline-block animate-pop-in rounded-2xl bg-gradient-to-br from-white to-slate-300 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.9),inset_0_-3px_0_rgba(0,0,0,0.12)]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 60 60" className="h-full w-full">
        {pips.map(([c, r], i) => (
          <circle key={i} cx={14 + c * 16} cy={14 + r * 16} r="5.4" fill="#1c1930" />
        ))}
        {value === null ? (
          <text x="30" y="38" textAnchor="middle" fontSize="24" fontWeight="700" fill="#94a3b8">
            ?
          </text>
        ) : null}
      </svg>
    </span>
  );
}

export function Dice({
  value,
  canRoll,
  onRoll,
  label,
}: {
  value: number | null;
  canRoll: boolean;
  onRoll: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <Die value={value} />
      <Button onClick={onRoll} disabled={!canRoll} size="lg" className="min-w-32">
        {label ?? 'Roll'}
      </Button>
    </div>
  );
}
