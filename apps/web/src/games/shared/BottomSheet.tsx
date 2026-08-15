import type { ReactNode } from 'react';

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative max-h-[86dvh] overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-ink-850 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)]"
        style={{ animation: 'sheet-up 0.26s cubic-bezier(0.2,0.9,0.2,1)' }}
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-white/15" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {onClose ? (
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-ink-400 transition-colors active:bg-white/10"
              aria-label="Close"
            >
              ✕
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
