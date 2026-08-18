import { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Target,
  PiggyBank,
  TrendingUp,
  UserPlus,
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Logo } from '../brand/Logo';
import { clearB2CTokens } from '../../services/b2cApi';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/client/dashboard',      icon: LayoutDashboard, label: 'Home' },
  { to: '/client/statements',     icon: FileText,        label: 'Accounts' },
  { to: '/client/spending',       icon: Receipt,         label: 'Spending' },
  { to: '/client/budgets',        icon: PiggyBank,       label: 'Budgets' },
  { to: '/client/goals',          icon: Target,          label: 'Goals' },
  { to: '/client/retirement',     icon: TrendingUp,      label: 'Planning' },
  { to: '/client/connect-advisor',icon: UserPlus,        label: 'Connect Advisor' },
  { to: '/client/upgrade',        icon: Sparkles,        label: 'Upgrade' },
];

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { to: '/client/accountability', icon: Settings, label: 'Settings' },
];

interface ClientNavProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function ClientNav({ isCollapsed, onToggle }: ClientNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const email = localStorage.getItem('firmum_b2c_email') || 'My Account';
  const initial = email.charAt(0).toUpperCase();

  useEffect(() => {
    if (!isCollapsed && window.innerWidth < 768) {
      onToggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    clearB2CTokens();
    navigate('/client/signup');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 h-full bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 z-40 transition-all duration-200 shadow-xl flex flex-col w-64',
          isCollapsed ? '-translate-x-full md:translate-x-0 md:w-16' : 'translate-x-0',
        )}
      >
        {/* Logo + collapse button */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-white/10">
          {!isCollapsed ? (
            <Logo variant="dark" size="sm" to="/client/dashboard" />
          ) : (
            <Logo variant="dark" iconOnly size="sm" to="/client/dashboard" className="mx-auto" />
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className={clsx(
              'p-1.5 rounded-lg hover:bg-white/10 text-blue-200 transition-colors',
              isCollapsed && 'hidden',
            )}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto py-3 sidebar-scroll">
          <div className="px-3 space-y-0.5">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/client/dashboard'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
              </NavLink>
            ))}
          </div>

          {/* Bottom links */}
          <div className="px-3 mt-4 pt-4 border-t border-white/10 space-y-0.5">
            {BOTTOM_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-blue-200 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
              </NavLink>
            ))}
            <a
              href="/client/help"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-200 hover:bg-white/10 hover:text-white transition-all duration-150"
            >
              <HelpCircle size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Help</span>}
            </a>
          </div>
        </nav>

        {/* User section + logout */}
        <div className={clsx('border-t border-white/10 py-3', isCollapsed ? 'px-2' : 'px-4')}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-medium">
                {initial}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{email}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-blue-300 hover:text-white transition-colors flex items-center gap-1"
                >
                  <LogOut size={12} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
