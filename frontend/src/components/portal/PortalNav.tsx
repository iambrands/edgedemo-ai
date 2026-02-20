import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  FileText,
  TrendingUp,
  Calendar,
  Send,
  Settings,
  LogOut,
  Bell,
  HelpCircle,
  Bot,
  Calculator,
  Receipt,
  Users,
  Home,
  MessageCircle,
} from 'lucide-react';
import { portalLogout, getPortalClientName } from '../../services/portalApi';

const NAV_ITEMS = [
  { to: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portal/performance', label: 'Performance', icon: TrendingUp },
  { to: '/portal/goals', label: 'Goals', icon: Target },
  { to: '/portal/documents', label: 'Documents', icon: FileText },
  { to: '/portal/meetings', label: 'Meetings', icon: Calendar },
  { to: '/portal/requests', label: 'Requests', icon: Send },
  { to: '/portal/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/portal/what-if', label: 'What-If', icon: Calculator },
  { to: '/portal/tax', label: 'Tax Center', icon: Receipt },
  { to: '/portal/beneficiaries', label: 'Beneficiaries', icon: Users },
  { to: '/portal/family', label: 'Family', icon: Home },
  { to: '/portal/messages', label: 'Messages', icon: MessageCircle },
  { to: '/portal/settings', label: 'Settings', icon: Settings },
];

interface PortalNavProps {
  nudgeCount?: number;
  firmName?: string;
}

export default function PortalNav({ nudgeCount = 0, firmName }: PortalNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const clientName = getPortalClientName() || 'Client';
  const initials = clientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await portalLogout();
    } finally {
      navigate('/portal/login');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Row */}
        <div className="flex items-center justify-between h-16">
          <Link to="/portal/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold text-blue-600">Edge</span>
            {firmName && (
              <span className="hidden sm:inline text-sm text-slate-400 ml-2 border-l border-slate-200 pl-2">
                {firmName}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/portal/help"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Help Center"
            >
              <HelpCircle className="w-5 h-5" />
            </Link>
            <Link
              to="/portal/notifications"
              className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {nudgeCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                {initials}
              </div>
              <span className="text-sm font-medium text-slate-700">{clientName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Row */}
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
