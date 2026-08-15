import type { ReactNode } from 'react';

/** Compact in-game header: leave on the left, game identity centred, action right. */
export function GameHeader({
  onBack,
  title,
  badge,
  right,
}: {
  onBack: () => void;
  title: string;
  badge?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-2 px-3 py-2">
      <button
        onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-ink-300 transition-colors active:bg-white/10"
        aria-label="Back"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-display font-bold text-white">{title}</span>
        {badge}
      </span>
      <span className="flex h-9 w-9 items-center justify-center">{right}</span>
    </header>
  );
}
