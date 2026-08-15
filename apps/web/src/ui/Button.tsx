import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

/* Buttons sit on a coloured "edge" that collapses when pressed, so taps feel
   like pressing a physical piece rather than changing a background colour. */
const styles: Record<Variant, string> = {
  primary:
    'bg-zest-400 text-ink-950 shadow-[0_4px_0_0_var(--color-zest-600)] hover:bg-zest-400/90 ' +
    'disabled:bg-ink-700 disabled:text-ink-500 disabled:shadow-[0_4px_0_0_var(--color-ink-800)]',
  secondary:
    'bg-ink-700 text-ink-200 shadow-[0_4px_0_0_var(--color-ink-800)] hover:bg-ink-600 ' +
    'disabled:bg-ink-800 disabled:text-ink-500',
  danger:
    'bg-berry-500 text-white shadow-[0_4px_0_0_#a81b4c] hover:bg-berry-500/90 ' +
    'disabled:bg-ink-800 disabled:text-ink-500 disabled:shadow-[0_4px_0_0_var(--color-ink-800)]',
  ghost: 'bg-white/5 text-ink-300 shadow-none hover:bg-white/10 disabled:text-ink-600',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-5 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-display font-semibold ' +
        'tracking-tight transition-[transform,background-color,box-shadow] duration-100 ' +
        'active:translate-y-[3px] active:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed ' +
        `${sizes[size]} ${styles[variant]} ${className}`
      }
      {...props}
    />
  );
}
