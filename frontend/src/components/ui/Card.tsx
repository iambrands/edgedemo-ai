import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'feature' | 'pricing' | 'pricing-featured';
  hoverable?: boolean;
}

export function Card({
  children,
  className,
  variant = 'default',
  hoverable = false,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-white border border-slate-200 rounded-2xl p-8 shadow-sm',
    feature:
      'bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all',
    pricing: 'bg-white border border-slate-200 rounded-2xl p-8 shadow-sm',
    'pricing-featured':
      'bg-white border-2 border-primary-500 rounded-2xl p-8 shadow-pricing-featured',
  };

  return (
    <div
      className={clsx(
        variants[variant],
        hoverable && variant === 'default' && 'hover:border-primary-500 hover:shadow-card-hover transition-all cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
