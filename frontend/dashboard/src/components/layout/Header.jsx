import { Search, Bell } from 'lucide-react';
import { format } from 'date-fns';

export function Header({ title, greeting = 'Good morning' }) {
  const name = 'Leslie';
  return (
    <header className="h-14 bg-white border-b border-[var(--border)] flex items-center justify-between px-6">
      <div>
        {title && <h1 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h1>}
        {!title && (
          <p className="text-sm text-[var(--text-secondary)]">
            {greeting}, {name} — {format(new Date(), 'MMM d, yyyy h:mm a')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Search..."
            className="absolute inset-0 opacity-0 w-32 cursor-pointer"
          />
        </div>
        <button type="button" className="p-1 rounded hover:bg-[var(--bg-light)]">
          <Bell className="w-5 h-5 text-[var(--text-muted)]" />
        </button>
      </div>
    </header>
  );
}
