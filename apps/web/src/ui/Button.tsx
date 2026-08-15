import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const styles: Record<Variant, string> = {
  primary: 'bg-emerald-500 text-emerald-950 active:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500',
  secondary: 'bg-slate-700 text-slate-100 active:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600',
  danger: 'bg-rose-600 text-white active:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600',
  ghost: 'bg-transparent text-slate-300 active:bg-slate-800 disabled:text-slate-600',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`min-h-12 rounded-xl px-4 font-semibold transition-colors ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
