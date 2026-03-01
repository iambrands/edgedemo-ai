import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface PageHeaderProps {
  /** Page title (h1) */
  title: string;
  /** Subtitle / description text below title */
  subtitle?: string;
  /** Right-aligned action area (buttons, filters, etc.) */
  actions?: ReactNode;
  /** Optional badge or count to show after title */
  badge?: ReactNode;
  /** Additional className for the container */
  className?: string;
}

/**
 * Standardized page header component for consistent layout across all pages.
 *
 * @example
 * <PageHeader
 *   title="Households"
 *   subtitle="Manage your client households"
 *   badge={<Badge variant="blue">12</Badge>}
 *   actions={<Button>Add Household</Button>}
 * />
 */
export function PageHeader({ title, subtitle, actions, badge, className }: PageHeaderProps) {
  return (
    <div className={clsx('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4', className)}>
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
