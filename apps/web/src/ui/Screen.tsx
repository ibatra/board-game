import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Phone-width column used by every non-board screen. */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-md px-4 pb-10 ${className}`}>{children}</div>;
}

/** Back chevron + title, with an optional trailing control. */
export function TopBar({
  to,
  onBack,
  title,
  subtitle,
  action,
}: {
  to?: string;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const chevron = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const backClass =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-ink-300 ' +
    'transition-colors active:bg-white/10';

  return (
    <header className="flex items-center gap-3 py-4">
      {onBack ? (
        <button onClick={onBack} className={backClass} aria-label="Back">
          {chevron}
        </button>
      ) : to ? (
        <Link to={to} className={backClass} aria-label="Back">
          {chevron}
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-white">{title}</h1>
        {subtitle ? <p className="truncate text-sm text-ink-400">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

/** Small uppercase section heading. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">{children}</h2>
  );
}
