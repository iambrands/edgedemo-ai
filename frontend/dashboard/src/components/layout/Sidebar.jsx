import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  BarChart3,
  DollarSign,
  Percent,
  AlertTriangle,
  Package,
  FileCheck,
  RefreshCw,
  Shield,
  MessageSquare,
  Settings,
  UserPlus,
  ExternalLink,
  FileBarChart,
  CreditCard,
  Target,
} from 'lucide-react';

const navItems = [
  { type: 'section', label: 'Overview' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { type: 'divider' },
  { type: 'section', label: 'Clients' },
  { to: '/households', icon: Users, label: 'Households' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/onboarding', icon: UserPlus, label: 'Onboarding' },
  { to: '/portal/demo', icon: ExternalLink, label: 'Client Portal Preview' },
  { type: 'divider' },
  { type: 'section', label: 'Documents' },
  { to: '/statements', icon: FileText, label: 'Statements' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { type: 'divider' },
  { type: 'section', label: 'Analysis' },
  { to: '/analysis/portfolio', icon: BarChart3, label: 'Portfolio' },
  { to: '/analysis/fees', icon: DollarSign, label: 'Fees' },
  { to: '/analysis/tax', icon: Percent, label: 'Tax' },
  { to: '/analysis/risk', icon: AlertTriangle, label: 'Risk' },
  { type: 'divider' },
  { type: 'section', label: 'Planning' },
  { to: '/planning/etf-builder', icon: Package, label: 'ETF Builder' },
  { to: '/planning/ips', icon: FileCheck, label: 'IPS Generator' },
  { to: '/planning/rebalance', icon: RefreshCw, label: 'Rebalance' },
  { to: '/planning/financial-plan', icon: Target, label: 'Financial Plan' },
  { type: 'divider' },
  { type: 'section', label: 'Operations' },
  { to: '/compliance', icon: Shield, label: 'Compliance' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { type: 'divider' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { type: 'divider' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-[var(--bg-dark)] text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <NavLink to="/dashboard" className="flex items-center gap-2 text-xl font-semibold text-primary">
          <span className="text-2xl">📊</span>
          Edge
        </NavLink>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if (item.type === 'divider') {
            return <div key={i} className="h-px bg-white/10 my-2" />;
          }
          if (item.type === 'section') {
            return (
              <div key={i} className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {item.label}
              </div>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={i}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary/20 text-primary' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10 text-xs text-[var(--text-muted)]">
        © 2026 IAB Advisors
        <br />
        Edge v1.0
      </div>
    </aside>
  );
}
