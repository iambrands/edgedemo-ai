import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import PortalNav from './PortalNav';
import AIChatWidget from '../chat/AIChatWidget';
import { clsx } from 'clsx';

export default function PortalLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div
        className={clsx(
          'transition-all duration-200',
          isSidebarCollapsed ? 'ml-16' : 'ml-60',
        )}
      >
        {/* Minimal top bar for mobile toggle */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-30 lg:hidden">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <Menu size={20} />
          </button>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      <AIChatWidget variant="client" />
    </div>
  );
}
