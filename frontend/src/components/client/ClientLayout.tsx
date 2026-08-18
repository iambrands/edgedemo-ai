import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { clsx } from 'clsx';
import ClientNav from './ClientNav';
import AIChatWidget from '../chat/AIChatWidget';
import { getB2CToken } from '../../services/b2cApi';

export default function ClientLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.innerWidth < 768,
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <ClientNav
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((c) => !c)}
      />

      <div
        className={clsx(
          'transition-all duration-200',
          isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64',
        )}
      >
        {/* Mobile top bar — hamburger only */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center px-4 sticky top-0 z-30 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setIsSidebarCollapsed((c) => !c)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <Menu size={20} />
          </button>
        </header>

        <main className="p-6 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>

      <AIChatWidget
        variant="client"
        apiEndpoint="/api/v1/b2c/chat"
        authToken={getB2CToken() ?? undefined}
      />
    </div>
  );
}
