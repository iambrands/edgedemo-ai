import { clsx } from 'clsx';

/* ─── Base Skeleton ─── */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx('bg-slate-200 animate-pulse rounded', className)}
      aria-hidden="true"
    />
  );
}

/* ─── SkeletonText: Multiple lines of text ─── */

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={clsx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'h-4 bg-slate-200 animate-pulse rounded',
            i === lines - 1 && 'w-3/4' // Last line is shorter
          )}
        />
      ))}
    </div>
  );
}

/* ─── SkeletonCard: Placeholder for Card components ─── */

interface SkeletonCardProps {
  className?: string;
  /** Show icon circle placeholder */
  hasIcon?: boolean;
}

export function SkeletonCard({ className, hasIcon = true }: SkeletonCardProps) {
  return (
    <div
      className={clsx('bg-white border border-slate-200 rounded-xl p-5 shadow-sm', className)}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-3 w-24 bg-slate-200 animate-pulse rounded" />
        {hasIcon && <div className="h-8 w-8 bg-slate-200 animate-pulse rounded-lg" />}
      </div>
      <div className="h-8 w-32 bg-slate-200 animate-pulse rounded mb-2" />
      <div className="h-3 w-20 bg-slate-200 animate-pulse rounded" />
    </div>
  );
}

/* ─── SkeletonTable: Placeholder for Table components ─── */

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, cols = 6, className }: SkeletonTableProps) {
  return (
    <div className={clsx('bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm', className)} aria-hidden="true">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-slate-200 animate-pulse rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className={clsx('px-6 py-4 flex gap-6', rowIdx < rows - 1 && 'border-b border-slate-100')}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={clsx(
                'h-4 bg-slate-200 animate-pulse rounded flex-1',
                colIdx === 0 && 'max-w-[100px]',
                colIdx === 1 && 'max-w-[200px]'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── SkeletonChart: Placeholder for Recharts ─── */

interface SkeletonChartProps {
  className?: string;
  variant?: 'bar' | 'pie' | 'line';
}

export function SkeletonChart({ className, variant = 'bar' }: SkeletonChartProps) {
  return (
    <div className={clsx('bg-white border border-slate-200 rounded-xl p-6 shadow-sm', className)} aria-hidden="true">
      <div className="h-4 w-40 bg-slate-200 animate-pulse rounded mb-6" />
      {variant === 'bar' && (
        <div className="flex items-end gap-3 h-48">
          {[60, 85, 45, 90, 70, 55, 80, 40, 75, 65].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-200 animate-pulse rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      )}
      {variant === 'pie' && (
        <div className="flex items-center justify-center h-48">
          <div className="w-40 h-40 bg-slate-200 animate-pulse rounded-full" />
        </div>
      )}
      {variant === 'line' && (
        <div className="h-48 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-px bg-slate-200 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Composite: Dashboard page skeleton ─── */

export function SkeletonDashboard() {
  return (
    <div className="space-y-6" aria-label="Loading..." role="status">
      {/* Page header */}
      <div>
        <div className="h-7 w-48 bg-slate-200 animate-pulse rounded mb-2" />
        <div className="h-4 w-72 bg-slate-200 animate-pulse rounded" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart variant="pie" />
        <SkeletonChart variant="bar" />
      </div>

      {/* Table */}
      <SkeletonTable />
    </div>
  );
}
