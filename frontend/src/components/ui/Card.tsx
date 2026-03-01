import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type CardSize = 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'feature' | 'pricing' | 'pricing-featured';
  hoverable?: boolean;
  /** Padding size: sm (p-4), md (p-5), lg (p-8, default) */
  size?: CardSize;
}

const sizeClasses: Record<CardSize, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-8',
};

export function Card({
  children,
  className,
  variant = 'default',
  hoverable = false,
  size = 'lg',
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-white border border-slate-200 rounded-xl shadow-sm',
    feature:
      'bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all',
    pricing: 'bg-white border border-slate-200 rounded-xl shadow-sm',
    'pricing-featured':
      'bg-white border-2 border-primary-500 rounded-xl shadow-pricing-featured',
  };

  return (
    <div
      className={clsx(
        variants[variant],
        sizeClasses[size],
        hoverable && variant === 'default' && 'hover:border-primary-500 hover:shadow-card-hover transition-all cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
