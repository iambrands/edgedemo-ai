import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileUp,
  BarChart3,
  Shield,
  FileText,
  Video,
  DollarSign,
  Link2,
  Scissors,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/households', icon: Users, label: 'Households' },
    { to: '/dashboard/accounts', icon: Briefcase, label: 'Accounts' },
    { to: '/dashboard/statements', icon: FileUp, label: 'Statements' },
    { to: '/dashboard/analysis', icon: BarChart3, label: 'Analysis' },
    { to: '/dashboard/compliance', icon: Shield, label: 'Compliance' },
    { to: '/dashboard/compliance-docs', icon: FileText, label: 'Compliance Docs' },
    { to: '/dashboard/meetings', icon: Video, label: 'Meetings' },
    { to: '/dashboard/liquidity', icon: DollarSign, label: 'Liquidity' },
    { to: '/dashboard/custodians', icon: Link2, label: 'Custodians' },
    { to: '/dashboard/tax-harvest', icon: Scissors, label: 'Tax Harvest' },
    { to: '/dashboard/chat', icon: MessageSquare, label: 'AI Chat' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!isCollapsed && (
            <span className="text-xl font-bold">
              <span className="text-gray-900">Edge</span>
              <span className="text-primary-500">AI</span>
            </span>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Platform Label */}
        {!isCollapsed && (
          <div className="px-4 py-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              RIA Platform
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <item.icon size={20} />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 p-4">
          {!isCollapsed && user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={clsx(
              'flex items-center gap-3 text-red-500 hover:text-red-600 transition-colors',
              isCollapsed ? 'justify-center w-full' : 'px-3 py-2'
            )}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
