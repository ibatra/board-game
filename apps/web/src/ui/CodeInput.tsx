import { useRef } from 'react';

/** Five character boxes driven by one invisible input, so mobile keyboards behave. */
export function CodeInput({
  value,
  onChange,
  length = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');
  const focusIdx = Math.min(value.length, length - 1);

  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, length))}
        maxLength={length}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        aria-label="Room code"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <div className="pointer-events-none flex justify-between gap-2">
        {chars.map((c, i) => (
          <span
            key={i}
            className={`flex h-16 flex-1 items-center justify-center rounded-2xl border-2 font-display text-3xl font-extrabold text-white transition-colors ${
              i === focusIdx && value.length < length
                ? 'border-grape-400 bg-grape-500/10'
                : c
                  ? 'border-white/15 bg-ink-800'
                  : 'border-white/8 bg-ink-900'
            }`}
          >
            {c || <span className="text-ink-600">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
