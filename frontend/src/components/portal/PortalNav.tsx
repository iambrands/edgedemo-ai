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
  Calculator,
  Receipt,
  Users,
  Home,
  MessageCircle,
  GraduationCap,
} from 'lucide-react';
import { portalLogout, getPortalClientName } from '../../services/portalApi';

const NAV_ITEMS = [
  { to: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portal/performance', label: 'Performance', icon: TrendingUp },
  { to: '/portal/goals', label: 'Goals', icon: Target },
  { to: '/portal/documents', label: 'Documents', icon: FileText },
  { to: '/portal/meetings', label: 'Meetings', icon: Calendar },
  { to: '/portal/requests', label: 'Requests', icon: Send },
  { to: '/portal/what-if', label: 'What-If', icon: Calculator },
  { to: '/portal/tax', label: 'Tax Center', icon: Receipt },
  { to: '/portal/beneficiaries', label: 'Beneficiaries', icon: Users },
  { to: '/portal/family', label: 'Family', icon: Home },
  { to: '/portal/messages', label: 'Messages', icon: MessageCircle },
  { to: '/portal/learn', label: 'Learn', icon: GraduationCap },
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
    <header className="sticky top-0 z-20">
      {/* Top Row — Blue */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link to="/portal/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center">
                <span className="text-sm font-bold text-white">E</span>
              </div>
              <span className="text-lg font-bold text-white">Edge</span>
              {firmName && (
                <span className="hidden sm:inline text-sm text-blue-200 ml-2 border-l border-white/20 pl-2">
                  {firmName}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-2">
              <Link
                to="/portal/help"
                className="p-2 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Help Center"
              >
                <HelpCircle className="w-5 h-5" />
              </Link>
              <Link
                to="/portal/notifications"
                className="relative p-2 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {nudgeCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full" />
                )}
              </Link>
              <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-medium">
                  {initials}
                </div>
                <span className="text-sm font-medium text-white">{clientName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Row — White */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-blue-600 hover:border-blue-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
