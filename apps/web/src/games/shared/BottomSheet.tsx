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
      <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} />
      <div
        className="relative max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-slate-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
        style={{ animation: 'sheetUp 0.22s ease-out' }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-600" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          {onClose ? (
            <button onClick={onClose} className="rounded-full p-2 text-slate-400" aria-label="Close">
              ✕
            </button>
          ) : null}
        </div>
        {children}
      </div>
      <style>{`@keyframes sheetUp { from { transform: translateY(40%); opacity: 0.4; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
