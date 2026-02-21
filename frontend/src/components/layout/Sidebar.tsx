import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Search,
  Upload,
  MessageCircle,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Navigation structure
// ─────────────────────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'clients',
    label: 'Client Management',
    icon: Users,
    items: [
      { to: '/dashboard/households', icon: Users, label: 'Households' },
      { to: '/dashboard/accounts', icon: Briefcase, label: 'Accounts' },
      { to: '/dashboard/bulk-import', icon: Upload, label: 'Bulk Import' },
      { to: '/dashboard/prospects', icon: UserPlus, label: 'Prospects' },
      { to: '/dashboard/crm', icon: Contact, label: 'CRM' },
    ],
  },
  {
    id: 'investing',
    label: 'Investing',
    icon: BarChart3,
    items: [
      { to: '/dashboard/analysis', icon: BarChart3, label: 'Analysis' },
      { to: '/dashboard/screener', icon: Search, label: 'Stock Screener' },
      { to: '/dashboard/model-portfolios', icon: PieChart, label: 'Model Portfolios' },
      { to: '/dashboard/trading', icon: ArrowUpDown, label: 'Trading' },
      { to: '/dashboard/tax-harvest', icon: Scissors, label: 'Tax Harvest' },
      { to: '/dashboard/alternative-assets', icon: Landmark, label: 'Alt Assets' },
      { to: '/dashboard/best-execution', icon: ShieldCheck, label: 'Best Execution' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: FileBarChart,
    items: [
      { to: '/dashboard/report-builder', icon: FileBarChart, label: 'Reports' },
      { to: '/dashboard/statements', icon: FileUp, label: 'Statements' },
      { to: '/dashboard/billing', icon: Receipt, label: 'Billing' },
      { to: '/dashboard/meetings', icon: Video, label: 'Meetings' },
      { to: '/dashboard/liquidity', icon: DollarSign, label: 'Liquidity' },
      { to: '/dashboard/custodians', icon: Link2, label: 'Custodians' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: Shield,
    items: [
      { to: '/dashboard/compliance', icon: Shield, label: 'Dashboard' },
      { to: '/dashboard/compliance-docs', icon: FileText, label: 'Documents' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageCircle,
    items: [
      { to: '/dashboard/messages', icon: MessageCircle, label: 'Messages' },
      { to: '/dashboard/conversations', icon: MessageSquareText, label: 'Conversations' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 z-40 transition-all duration-200 shadow-xl',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-lg font-bold text-white">E</span>
              </div>
              <span className="text-xl font-bold text-white">Edge</span>
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
              isCollapsed && 'hidden'
            )}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 sidebar-scroll">
          {/* Dashboard (top-level, always visible) */}
          <div className="px-3 mb-1">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <LayoutDashboard size={18} />
              {!isCollapsed && <span className="text-sm font-medium">Dashboard</span>}
            </NavLink>
          </div>

          {/* Grouped Nav */}
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
                      : 'text-blue-200 hover:bg-white/10 hover:text-white'
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
                          isOpen && 'rotate-180'
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
                              : 'text-blue-200/80 hover:bg-white/5 hover:text-white'
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
              to="/dashboard/learn"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <GraduationCap size={18} />
              {!isCollapsed && <span className="text-sm font-medium">Learning Center</span>}
            </NavLink>
            <NavLink
              to="/dashboard/settings"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Settings size={18} />
              {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
            </NavLink>
            <NavLink
              to="/help"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-200 hover:bg-white/10 hover:text-white transition-all duration-150"
            >
              <HelpCircle size={18} />
              {!isCollapsed && <span className="text-sm font-medium">Help & Support</span>}
            </NavLink>
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-white/10 p-4">
          {!isCollapsed && user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-blue-300 truncate">{user.email}</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <button
              onClick={onToggle}
              className="w-full flex justify-center p-2 rounded-lg hover:bg-white/10 text-blue-200 transition-colors mb-2"
            >
              <ChevronRight size={18} />
            </button>
          )}
          <button
            onClick={handleLogout}
            className={clsx(
              'flex items-center gap-3 text-red-300 hover:text-red-200 transition-colors',
              isCollapsed ? 'justify-center w-full' : 'px-3 py-2'
            )}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
