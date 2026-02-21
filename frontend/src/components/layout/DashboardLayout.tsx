import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { ALERTS } from '../../data/mockData';
import { clsx } from 'clsx';
import AIChatWidget from '../chat/AIChatWidget';

export function DashboardLayout() {
  const { user, isLoading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const alertCount = ALERTS.filter((a) => a.severity === 'high' || a.severity === 'medium').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      <div
        className={clsx(
          'transition-all duration-200',
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-medium text-slate-500 hidden sm:block">
              {currentDate}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <Bell size={20} />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-700">
                {user.firstName} {user.lastName}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Chat Widget */}
      <AIChatWidget variant="ria" />
    </div>
  );
}
