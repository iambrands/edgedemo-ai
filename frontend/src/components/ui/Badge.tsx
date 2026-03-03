import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'gray', size = 'md', className, ...props }: BadgeProps) {
  const variants = {
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    red: 'bg-red-50 text-red-700 border border-red-200',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    gray: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-semibold',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
