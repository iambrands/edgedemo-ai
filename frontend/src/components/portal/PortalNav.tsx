import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  Calculator,
  Receipt,
  Users,
  Home,
  FileText,
  Newspaper,
  Calendar,
  MessageCircle,
  Send,
  GraduationCap,
  Bell,
  Settings,
  LogOut,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { portalLogout, getPortalClientName } from '../../services/portalApi';
import { clsx } from 'clsx';
import { useState } from 'react';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: '',
    items: [
      { to: '/portal/dashboard', icon: LayoutDashboard, label: 'Home', description: 'Your overview' },
    ],
  },
  {
    title: 'My Finances',
    items: [
      { to: '/portal/performance', icon: TrendingUp, label: 'Performance', description: 'How your investments are doing' },
      { to: '/portal/goals', icon: Target, label: 'Goals', description: 'Track your financial goals' },
      { to: '/portal/what-if', icon: Calculator, label: 'What-If', description: 'Explore scenarios' },
    ],
  },
  {
    title: 'Tax & Family',
    items: [
      { to: '/portal/tax', icon: Receipt, label: 'Tax Center', description: 'Tax documents & lots' },
      { to: '/portal/beneficiaries', icon: Users, label: 'Beneficiaries', description: 'Who inherits your accounts' },
      { to: '/portal/family', icon: Home, label: 'Family', description: 'Household overview' },
    ],
  },
  {
    title: 'Documents',
    items: [
      { to: '/portal/documents', icon: FileText, label: 'Documents', description: 'Statements & reports' },
      { to: '/portal/updates', icon: Newspaper, label: 'Updates', description: 'Notes from your advisor' },
    ],
  },
  {
    title: 'Connect',
    items: [
      { to: '/portal/meetings', icon: Calendar, label: 'Meetings', description: 'Schedule time with your advisor' },
      { to: '/portal/messages', icon: MessageCircle, label: 'Messages', description: 'Secure conversations' },
      { to: '/portal/requests', icon: Send, label: 'Requests', description: 'Withdrawals & transfers' },
    ],
  },
  {
    title: 'Learn',
    items: [
      { to: '/portal/learn', icon: GraduationCap, label: 'Learning Center', description: 'Videos & guides' },
    ],
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/portal/notifications', icon: Bell, label: 'Notifications', description: 'Alerts & updates' },
  { to: '/portal/settings', icon: Settings, label: 'Settings', description: 'Your preferences' },
];

interface PortalNavProps {
  isCollapsed: boolean;
  onToggle: () => void;
  nudgeCount?: number;
  firmName?: string;
}

export default function PortalNav({ isCollapsed, onToggle, nudgeCount = 0, firmName }: PortalNavProps) {
  const navigate = useNavigate();
  const clientName = getPortalClientName() || 'Client';
  const firstName = clientName.split(' ')[0];
  const initials = clientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await portalLogout();
    } finally {
      navigate('/portal/login');
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isHovered = hoveredItem === item.to;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/portal/dashboard'}
        onMouseEnter={() => setHoveredItem(item.to)}
        onMouseLeave={() => setHoveredItem(null)}
        className={({ isActive }) =>
          clsx(
            'group flex items-center gap-3 rounded-lg transition-all duration-150 relative',
            isCollapsed ? 'justify-center p-2.5 mx-1' : 'px-3 py-2.5 mx-2',
            isActive
              ? 'bg-white/15 text-white font-medium shadow-sm'
              : 'text-blue-100 hover:bg-white/10 hover:text-white',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-400 rounded-r-full" />
            )}
            <item.icon size={20} className={clsx(isActive ? 'text-emerald-300' : 'text-blue-200 group-hover:text-white')} />
            {!isCollapsed && (
              <span className="text-sm truncate">{item.label}</span>
            )}
            {isCollapsed && isHovered && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
              </div>
            )}
            {item.to === '/portal/notifications' && nudgeCount > 0 && (
              <span className={clsx(
                'bg-emerald-400 text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center',
                isCollapsed ? 'absolute -top-0.5 -right-0.5 w-4 h-4' : 'ml-auto w-5 h-5',
              )}>
                {nudgeCount}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 z-40 transition-all duration-200 shadow-xl flex flex-col',
        isCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo + Collapse */}
      <div className={clsx('flex items-center h-14 border-b border-white/10', isCollapsed ? 'justify-center px-2' : 'justify-between px-4')}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">E</span>
            </div>
            <div className="min-w-0">
              <span className="text-base font-bold text-white block leading-tight">Edge</span>
              {firmName && (
                <span className="text-[10px] text-blue-300 block truncate leading-tight">{firmName}</span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Greeting */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-sm text-blue-100">Welcome back,</p>
          <p className="text-base font-semibold text-white truncate">{firstName}</p>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto py-2 sidebar-scroll">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? 'mt-3' : ''}>
            {section.title && !isCollapsed && (
              <div className="px-5 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">{section.title}</span>
              </div>
            )}
            {section.title && isCollapsed && sIdx > 0 && (
              <div className="mx-3 my-1 border-t border-white/10" />
            )}
            <div className="space-y-0.5">
              {section.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-white/10 py-2">
        {BOTTOM_ITEMS.map(renderNavItem)}
      </div>

      {/* User + Logout */}
      <div className={clsx('border-t border-white/10 py-3', isCollapsed ? 'px-2' : 'px-3')}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-medium">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{clientName}</p>
              <button
                onClick={handleLogout}
                className="text-xs text-blue-300 hover:text-white transition-colors flex items-center gap-1"
              >
                <LogOut size={12} />
                Sign out
              </button>
            </div>
            <button
              onClick={() => navigate('/portal/help')}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              title="Help"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
