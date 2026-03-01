import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Optional size variant */
  inputSize?: 'sm' | 'md';
}

/**
 * Standardized search input with icon, used across Messages, Trading,
 * CRM, StockScreener, and other pages with search functionality.
 *
 * @example
 * <SearchInput
 *   placeholder="Search clients..."
 *   value={query}
 *   onChange={e => setQuery(e.target.value)}
 * />
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, inputSize = 'md', ...props }, ref) => {
    return (
      <div className={clsx('relative', className)}>
        <Search
          size={inputSize === 'sm' ? 14 : 16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={ref}
          type="text"
          className={clsx(
            'w-full border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-50 outline-none transition',
            inputSize === 'sm' ? 'pl-8 pr-3 py-1.5 text-xs' : 'pl-9 pr-4 py-2.5 text-sm'
          )}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
