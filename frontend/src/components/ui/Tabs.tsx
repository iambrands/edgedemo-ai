import { createContext, useContext, type ReactNode } from 'react';
import { clsx } from 'clsx';

/* ─── Context ─── */

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
  variant: 'underline' | 'pills';
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab components must be used within <Tabs>');
  return ctx;
}

/* ─── Tabs root ─── */

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  variant?: 'underline' | 'pills';
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onChange, variant = 'underline', children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange, variant }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/* ─── TabList ─── */

interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  const { variant } = useTabsContext();

  return (
    <div
      role="tablist"
      className={clsx(
        'flex',
        variant === 'underline' && 'border-b border-slate-200 gap-0',
        variant === 'pills' && 'gap-1 bg-slate-100 p-1 rounded-lg w-fit',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ─── Tab ─── */

interface TabProps {
  value: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function Tab({ value: tabValue, children, className, icon }: TabProps) {
  const { value, onChange, variant } = useTabsContext();
  const isActive = value === tabValue;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${tabValue}`}
      onClick={() => onChange(tabValue)}
      className={clsx(
        'inline-flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap',
        variant === 'underline' && [
          'px-4 py-3 border-b-2 -mb-px',
          isActive
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
        ],
        variant === 'pills' && [
          'px-3 py-1.5 rounded-md',
          isActive
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        ],
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ─── TabPanel ─── */

interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value: panelValue, children, className }: TabPanelProps) {
  const { value } = useTabsContext();
  if (value !== panelValue) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${panelValue}`}
      aria-labelledby={`tab-${panelValue}`}
      className={className}
    >
      {children}
    </div>
  );
}
