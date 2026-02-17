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
  UserPlus,
  MessageSquareText,
  PieChart,
  Landmark,
  Contact,
  FileBarChart,
  ArrowUpDown,
  Receipt,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
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
    { to: '/dashboard/prospects', icon: UserPlus, label: 'Prospects' },
    { to: '/dashboard/conversations', icon: MessageSquareText, label: 'Conversations' },
    { to: '/dashboard/model-portfolios', icon: PieChart, label: 'Model Portfolios' },
    { to: '/dashboard/alternative-assets', icon: Landmark, label: 'Alt Assets' },
    { to: '/dashboard/crm', icon: Contact, label: 'CRM' },
    { to: '/dashboard/report-builder', icon: FileBarChart, label: 'Reports' },
    { to: '/dashboard/trading', icon: ArrowUpDown, label: 'Trading' },
    { to: '/dashboard/billing', icon: Receipt, label: 'Billing' },
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
        'fixed left-0 top-0 h-full bg-gradient-to-b from-slate-50 via-white to-slate-50 border-r border-slate-200 shadow-sm z-40 transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {!isCollapsed && (
            <span className="text-xl font-bold text-blue-600">Edge</span>
          )}
          {isCollapsed && (
            <span className="text-lg font-bold text-blue-600 mx-auto">E</span>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Platform Label */}
        {!isCollapsed && (
          <div className="px-4 py-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
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
                  'flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-all duration-150',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                )
              }
            >
              <item.icon size={18} />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          ))}

          {/* Help & Support */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <NavLink
              to="/help"
              className="flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-all duration-150 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
            >
              <HelpCircle size={18} />
              {!isCollapsed && <span className="text-sm font-medium">Help & Support</span>}
            </NavLink>
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          {!isCollapsed && user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
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
