import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Target,
  PiggyBank,
  Repeat2,
  TrendingUp,
  Users,
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  HelpCircle,
  Activity,
  MessageCircle,
  FolderOpen,
  GraduationCap,
  Search,
  TrendingDown,
  ArrowUpDown,
  FileSpreadsheet,
  Leaf,
  Banknote,
  BarChart2,
  DollarSign,
  LineChart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Logo } from '../brand/Logo';
import { clearB2CTokens } from '../../services/b2cApi';
import { useClientProfile } from '../../contexts/ClientProfileContext';
import NotificationCenter from './NotificationCenter';

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
    id: 'money',
    label: 'Money',
    icon: DollarSign,
    items: [
      { to: '/client/statements', icon: FileText,     label: 'Accounts' },
      { to: '/client/cash-flow', icon: ArrowUpDown,   label: 'Income' },
      { to: '/client/spending',  icon: Receipt,       label: 'Spending' },
      { to: '/client/budgets',   icon: PiggyBank,     label: 'Budgets' },
      { to: '/client/bills',     icon: Repeat2,       label: 'Bills' },
      { to: '/client/debts',     icon: TrendingDown,  label: 'Debts' },
    ],
  },
  {
    id: 'investments',
    label: 'Investments',
    icon: LineChart,
    items: [
      { to: '/client/investments',  icon: LineChart,  label: 'Overview' },
      { to: '/client/cash',         icon: Banknote,   label: 'Optimize Cash' },
      { to: '/client/rebalancing',  icon: BarChart2,  label: 'Rebalance' },
      { to: '/client/auto-harvest', icon: Leaf,       label: 'Tax Savings' },
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: Target,
    items: [
      { to: '/client/goals',      icon: Target,      label: 'Goals' },
      { to: '/client/retirement', icon: TrendingUp,  label: 'Retirement' },
      { to: '/client/household',  icon: Users,       label: 'Household' },
    ],
  },
];

const TAX_NAV_ITEM: NavItem = {
  to: '/client/tax-documents',
  icon: FileSpreadsheet,
  label: 'Tax Documents',
};

const ADVISOR_NAV_ITEMS: NavItem[] = [
  { to: '/client/advisor-activity', icon: Activity,      label: 'Activity' },
  { to: '/client/messages',         icon: MessageCircle, label: 'Messages' },
  { to: '/client/documents',        icon: FolderOpen,    label: 'Documents' },
];

const FOOTER_NAV_ITEMS: NavItem[] = [
  { to: '/client/learning',       icon: GraduationCap, label: 'Learning' },
  { to: '/client/upgrade',        icon: Sparkles,      label: 'Upgrade' },
  { to: '/client/accountability', icon: Settings,      label: 'Settings' },
];

function isNavItemActive(pathname: string, to: string): boolean {
  if (to === '/client/dashboard') return pathname === to;
  if (to === '/client/retirement') {
    return pathname === to || pathname === '/client/planning';
  }
  return pathname === to;
}

function groupHasActiveItem(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isNavItemActive(pathname, item.to));
}

function initialOpenGroups(pathname: string): Set<string> {
  const initial = new Set<string>();
  for (const group of NAV_GROUPS) {
    if (groupHasActiveItem(pathname, group)) initial.add(group.id);
  }
  if (ADVISOR_NAV_ITEMS.some((item) => isNavItemActive(pathname, item.to))) {
    initial.add('advisor');
  }
  return initial;
}

interface ClientNavProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function ClientNav({ isCollapsed, onToggle }: ClientNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdvisorLinked, profile } = useClientProfile();

  const email = profile?.email || localStorage.getItem('firmum_b2c_email') || 'My Account';
  const initial = email.charAt(0).toUpperCase();

  const [openGroups, setOpenGroups] = useState<Set<string>>(() =>
    initialOpenGroups(location.pathname),
  );

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      for (const group of NAV_GROUPS) {
        if (groupHasActiveItem(location.pathname, group)) next.add(group.id);
      }
      if (ADVISOR_NAV_ITEMS.some((item) => isNavItemActive(location.pathname, item.to))) {
        next.add('advisor');
      }
      return next;
    });
  }, [location.pathname]);

  useEffect(() => {
    if (!isCollapsed && window.innerWidth < 768) {
      onToggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLogout = () => {
    clearB2CTokens();
    navigate('/client/signup');
  };

  const navLinkClass = (isActive: boolean, variant: 'primary' | 'sub' | 'footer' = 'primary') =>
    clsx(
      'flex items-center gap-3 rounded-lg transition-all duration-150',
      variant === 'sub' ? 'px-3 py-2 text-sm' : 'px-3 py-2.5',
      isActive
        ? variant === 'sub'
          ? 'bg-white/20 text-white font-medium'
          : 'bg-white/15 text-white shadow-sm'
        : variant === 'footer'
          ? 'text-blue-200 hover:bg-white/10 hover:text-white'
          : variant === 'sub'
            ? 'text-blue-100/80 hover:bg-white/5 hover:text-white'
            : 'text-blue-100 hover:bg-white/10 hover:text-white',
    );

  const renderNavItem = (item: NavItem, variant: 'primary' | 'sub' | 'footer' = 'primary') => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/client/dashboard'}
        className={({ isActive }) => navLinkClass(isActive, variant)}
      >
        <Icon size={variant === 'sub' ? 15 : 18} className="flex-shrink-0" />
        {!isCollapsed && (
          <span className={variant === 'sub' ? undefined : 'text-sm font-medium'}>{item.label}</span>
        )}
      </NavLink>
    );
  };

  const renderCollapsibleGroup = (group: NavGroup) => {
    const isOpen = openGroups.has(group.id);
    const hasActiveSub = groupHasActiveItem(location.pathname, group);
    const GroupIcon = group.icon;

    return (
      <div key={group.id} className="mb-0.5">
        <button
          type="button"
          onClick={() => {
            if (isCollapsed) {
              onToggle();
              setOpenGroups((prev) => new Set([...prev, group.id]));
            } else {
              toggleGroup(group.id);
            }
          }}
          aria-expanded={isOpen}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
            hasActiveSub && !isOpen
              ? 'bg-white/15 text-white'
              : 'text-blue-100 hover:bg-white/10 hover:text-white',
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

        {!isCollapsed && isOpen && (
          <div className="mt-0.5 ml-3 border-l border-white/10 pl-3 space-y-0.5">
            {group.items.map((item) => renderNavItem(item, 'sub'))}
          </div>
        )}
      </div>
    );
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
        {/* Logo + collapse button + notification bell */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-white/10">
          {!isCollapsed ? (
            <Logo variant="dark" size="sm" to="/client/dashboard" />
          ) : (
            <Logo variant="dark" iconOnly size="sm" to="/client/dashboard" className="mx-auto" />
          )}
          <div className="flex items-center gap-1">
            {!isCollapsed && <NotificationCenter />}
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
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto py-3 sidebar-scroll">
          {/* Home — always visible */}
          <div className="px-3 mb-1">
            {renderNavItem({ to: '/client/dashboard', icon: LayoutDashboard, label: 'Home' })}
          </div>

          {/* Grouped sections */}
          <div className="px-3 space-y-0.5">
            {NAV_GROUPS.map(renderCollapsibleGroup)}
          </div>

          {/* Tax — standalone (single item, no collapse needed) */}
          <div className="px-3 mt-1">
            {renderNavItem(TAX_NAV_ITEM)}
          </div>

          {/* Find an advisor — only when not linked */}
          {!isAdvisorLinked && (
            <div className="px-3 mt-1">
              {renderNavItem({ to: '/client/advisors', icon: Search, label: 'Find an Advisor' })}
            </div>
          )}

          {/* Your advisor — collapsible when linked */}
          {isAdvisorLinked && (
            <div className="px-3 mt-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (isCollapsed) {
                    onToggle();
                    setOpenGroups((prev) => new Set([...prev, 'advisor']));
                  } else {
                    toggleGroup('advisor');
                  }
                }}
                aria-expanded={openGroups.has('advisor')}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                  ADVISOR_NAV_ITEMS.some((item) => isNavItemActive(location.pathname, item.to))
                    && !openGroups.has('advisor')
                    ? 'bg-white/15 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white',
                )}
              >
                <Users size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1 text-left">Your Advisor</span>
                    <ChevronDown
                      size={14}
                      className={clsx(
                        'transition-transform duration-200 text-blue-300',
                        openGroups.has('advisor') && 'rotate-180',
                      )}
                    />
                  </>
                )}
              </button>

              {!isCollapsed && openGroups.has('advisor') && (
                <div className="mt-0.5 ml-3 border-l border-white/10 pl-3 space-y-0.5">
                  {ADVISOR_NAV_ITEMS.map((item) => renderNavItem(item, 'sub'))}
                </div>
              )}
            </div>
          )}

          {/* Footer links */}
          <div className="px-3 mt-4 pt-4 border-t border-white/10 space-y-0.5">
            {FOOTER_NAV_ITEMS.map((item) => renderNavItem(item, 'footer'))}
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
