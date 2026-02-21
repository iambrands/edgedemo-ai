import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  ChevronDown,
  DollarSign,
  FolderOpen,
  Phone,
  Shield,
  Bot,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { portalLogout, getPortalClientName } from '../../services/portalApi';
import { clsx } from 'clsx';
import { useState } from 'react';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'finances',
    label: 'My Finances',
    icon: DollarSign,
    items: [
      { to: '/portal/performance', icon: TrendingUp, label: 'Performance' },
      { to: '/portal/goals', icon: Target, label: 'Goals' },
      { to: '/portal/what-if', icon: Calculator, label: 'What-If Scenarios' },
      { to: '/portal/risk-profile', icon: Shield, label: 'Risk Profile' },
    ],
  },
  {
    id: 'tax-family',
    label: 'Tax & Family',
    icon: Home,
    items: [
      { to: '/portal/tax', icon: Receipt, label: 'Tax Center' },
      { to: '/portal/beneficiaries', icon: Users, label: 'Beneficiaries' },
      { to: '/portal/family', icon: Home, label: 'Family' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FolderOpen,
    items: [
      { to: '/portal/documents', icon: FileText, label: 'Statements & Reports' },
      { to: '/portal/updates', icon: Newspaper, label: 'Advisor Updates' },
    ],
  },
  {
    id: 'connect',
    label: 'Connect',
    icon: Phone,
    items: [
      { to: '/portal/meetings', icon: Calendar, label: 'Meetings' },
      { to: '/portal/messages', icon: MessageCircle, label: 'Messages' },
      { to: '/portal/requests', icon: Send, label: 'Requests' },
    ],
  },
  {
    id: 'ai',
    label: 'AI Tools',
    icon: Bot,
    items: [
      { to: '/portal/assistant', icon: Bot, label: 'AI Assistant' },
    ],
  },
];

interface PortalNavProps {
  isCollapsed: boolean;
  onToggle: () => void;
  nudgeCount?: number;
  firmName?: string;
}

export default function PortalNav({ isCollapsed, onToggle, nudgeCount = 0, firmName }: PortalNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const clientName = getPortalClientName() || 'Client';
  const firstName = clientName.split(' ')[0];
  const initials = clientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const group of NAV_GROUPS) {
      if (group.items.some((item) => location.pathname === item.to)) {
        initial.add(group.id);
      }
    }
    return initial;
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await portalLogout();
    } finally {
      navigate('/portal/login');
    }
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 z-40 transition-all duration-200 shadow-xl flex flex-col',
        isCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo + Collapse */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-white">E</span>
            </div>
            <div className="min-w-0">
              <span className="text-xl font-bold text-white block leading-tight">Edge</span>
              {firmName && (
                <span className="text-[10px] text-blue-300 block truncate leading-tight">{firmName}</span>
              )}
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mx-auto">
            <span className="text-lg font-bold text-white">E</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={clsx(
            'p-1.5 rounded-lg hover:bg-white/10 text-blue-200 transition-colors',
            isCollapsed && 'hidden',
          )}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Greeting */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-sm text-blue-200">Welcome back,</p>
          <p className="text-base font-semibold text-white truncate">{firstName}</p>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto py-3 sidebar-scroll">
        {/* Home (top-level, always visible) */}
        <div className="px-3 mb-1">
          <NavLink
            to="/portal/dashboard"
            end
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <LayoutDashboard size={18} />
            {!isCollapsed && <span className="text-sm font-medium">Home</span>}
          </NavLink>
        </div>

        {/* Collapsible Groups */}
        {NAV_GROUPS.map((group) => {
          const isOpen = openGroups.has(group.id);
          const hasActiveSub = group.items.some((item) => location.pathname === item.to);
          const GroupIcon = group.icon;

          return (
            <div key={group.id} className="px-3 mb-0.5">
              {/* Group Header */}
              <button
                onClick={() => {
                  if (isCollapsed) {
                    onToggle();
                    setOpenGroups((prev) => new Set([...prev, group.id]));
                  } else {
                    toggleGroup(group.id);
                  }
                }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                  hasActiveSub && !isOpen
                    ? 'bg-white/15 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white',
                )}
              >
                <GroupIcon size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1 text-left">{group.label}</span>
                    <ChevronDown
                      size={14}
                      className={clsx(
                        'transition-transform duration-200 text-blue-300',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </>
                )}
              </button>

              {/* Sub-items */}
              {!isCollapsed && isOpen && (
                <div className="mt-0.5 ml-3 border-l border-white/10 pl-3 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                            : 'text-blue-200/80 hover:bg-white/5 hover:text-white',
                        )
                      }
                    >
                      <item.icon size={15} className="flex-shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom standalone items */}
        <div className="px-3 mt-2 pt-2 border-t border-white/10 space-y-0.5">
          <NavLink
            to="/portal/learn"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <GraduationCap size={18} />
            {!isCollapsed && <span className="text-sm font-medium">Learning Center</span>}
          </NavLink>
          <NavLink
            to="/portal/notifications"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Bell size={18} />
            {!isCollapsed && (
              <>
                <span className="text-sm font-medium flex-1 text-left">Notifications</span>
                {nudgeCount > 0 && (
                  <span className="bg-emerald-400 text-slate-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {nudgeCount}
                  </span>
                )}
              </>
            )}
            {isCollapsed && nudgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-emerald-400 text-slate-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {nudgeCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/portal/settings"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Settings size={18} />
            {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
          </NavLink>
          <NavLink
            to="/portal/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-200 hover:bg-white/10 hover:text-white transition-all duration-150"
          >
            <HelpCircle size={18} />
            {!isCollapsed && <span className="text-sm font-medium">Help & Support</span>}
          </NavLink>
        </div>
      </nav>

      {/* User Section */}
      <div className={clsx('border-t border-white/10 py-3', isCollapsed ? 'px-2' : 'px-4')}>
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
          </div>
        )}
      </div>
    </aside>
  );
}
