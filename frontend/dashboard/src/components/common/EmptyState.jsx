import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data',
  description = 'There is nothing to display yet.',
  action,
  actionLabel,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 bg-[var(--bg-light)] rounded-full mb-4">
        <Icon className="w-8 h-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-[var(--text-secondary)] max-w-sm">{description}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
