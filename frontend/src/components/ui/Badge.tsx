import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray';
}

export function Badge({ children, variant = 'gray', className, ...props }: BadgeProps) {
  const variants = {
    green: 'bg-green-50 text-green-500',
    amber: 'bg-amber-50 text-amber-500',
    red: 'bg-red-50 text-red-500',
    blue: 'bg-primary-50 text-primary-600',
    gray: 'bg-gray-100 text-gray-500',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
