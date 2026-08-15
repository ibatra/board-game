import { Button } from '../../ui/Button';

const FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

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
    <div className="flex items-center justify-center gap-4 py-3">
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-6xl leading-none text-slate-900 shadow-lg ${
          value === null ? 'opacity-40' : ''
        }`}
        key={value ?? 'empty'}
        style={value !== null ? { animation: 'diceIn 0.25s ease-out' } : undefined}
      >
        {value !== null ? FACES[value] : '?'}
      </span>
      <Button onClick={onRoll} disabled={!canRoll} className="min-w-28 text-lg">
        {label ?? 'Roll 🎲'}
      </Button>
      <style>{`@keyframes diceIn { from { transform: scale(0.5) rotate(-20deg); opacity: 0.3; } to { transform: scale(1) rotate(0); opacity: 1; } }`}</style>
    </div>
  );
}
