import React, { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDevice } from '../../hooks/useDevice';
import FloatingFeedbackButton from '../FloatingFeedbackButton';
import BottomNav from '../navigation/BottomNav';
import RiskAcknowledgmentModal from '../RiskAcknowledgmentModal';
import api from '../../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavSection {
  title: string;
  items: Array<{ name: string; href: string; icon: string }>;
  defaultOpen?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isMobile, isTablet, isDesktop } = useDevice();
  const [showRiskModal, setShowRiskModal] = useState(false);

  // Show risk acknowledgment modal if user hasn't acknowledged
  React.useEffect(() => {
    if (user && !user.risk_acknowledged) {
      setShowRiskModal(true);
    }
  }, [user]);

  const handleRiskAccept = useCallback(async () => {
    try {
      await api.post('/api/user/acknowledge-risk');
      setShowRiskModal(false);
      // Reload to update user state with acknowledgment
      window.location.reload();
    } catch (error) {
      console.error('Failed to acknowledge risk:', error);
      // Still close modal on error to avoid blocking the user
      setShowRiskModal(false);
    }
  }, []);

  const handleRiskDecline = useCallback(() => {
    // Just close modal; user can continue but will see it again next session
    setShowRiskModal(false);
  }, []);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    trading: true,
    discovery: false,
    management: false,
    account: true,  // Open account section by default to show admin links
  });

  // Check if current user is admin
  const isAdmin = user?.email === 'leslie@iabadvisors.com';
  
  // Show sidebar only on desktop
  const showSidebar = isDesktop;

  const navigationSections: NavSection[] = [
    {
      title: 'Trading',
      items: [
        { name: 'Dashboard', href: '/', icon: '📊' },
        { name: 'Trade', href: '/trade', icon: '💰' },
        { name: 'Options Analyzer', href: '/analyzer', icon: '📈' },
      ],
      defaultOpen: true,
    },
    {
      title: 'Discovery',
      items: [
        { name: 'Opportunities', href: '/opportunities', icon: '🎯' },
      ],
    },
    {
      title: 'Management',
      items: [
        { name: 'Watchlist', href: '/watchlist', icon: '⭐' },
        { name: 'Automations', href: '/automations', icon: '⚙️' },
        { name: 'Alerts', href: '/alerts', icon: '🔔' },
      ],
    },
    {
      title: 'Account',
      items: [
        { name: 'History', href: '/history', icon: '📜' },
        { name: 'Settings', href: '/settings', icon: '⚙️' },
        { name: 'Help', href: '/help', icon: '❓' },
        // Admin-only items
        ...(isAdmin ? [
          { name: 'Performance', href: '/admin/performance', icon: '⚡' },
          { name: 'Admin Status', href: '/admin/status', icon: '📊' },
          { name: 'Optimization', href: '/admin/optimization', icon: '🔧' },
        ] : []),
      ],
    },
  ];

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title.toLowerCase()]: !prev[title.toLowerCase()],
    }));
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'}`}>
      {/* Sidebar - Desktop Only (completely hidden on mobile/tablet) */}
      {showSidebar && (
        <div className="fixed inset-y-0 left-0 w-64 bg-secondary text-white shadow-lg hidden lg:flex flex-col">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-700">
            <h1 className="text-2xl font-bold text-white">OptionsEdge</h1>
            <p className="text-sm text-gray-400 mt-1">AI-Powered Trading</p>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigationSections.map((section) => {
              const sectionKey = section.title.toLowerCase();
              const isOpen = openSections[sectionKey] ?? section.defaultOpen ?? false;
              
              return (
                <div key={section.title} className="mb-2">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
                  >
                    <span>{section.title}</span>
                    <span className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                  </button>
                  
                  {/* Section Items */}
                  {isOpen && (
                    <div className="mt-1 space-y-1">
                      {section.items.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
                            isActive(item.href)
                              ? 'bg-primary text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          <span className="mr-2 text-lg">{item.icon}</span>
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Section - Always Visible */}
          <div className="p-4 border-t border-gray-700 bg-secondary flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
            >
              <span className="mr-2">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Main Content */}
      <div className={showSidebar ? 'lg:ml-64' : ''}>
        <main 
          className={`p-4 md:p-6 lg:p-8 ${
            (isMobile || isTablet) ? 'pb-20' : ''
          }`}
          style={{
            paddingBottom: (isMobile || isTablet) 
              ? 'calc(4rem + env(safe-area-inset-bottom, 0))' 
              : undefined
          }}
        >
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t py-6 bg-gray-50 px-4 md:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex gap-4 md:gap-6 text-sm text-gray-500 flex-wrap justify-center">
                <Link to="/terms" className="hover:text-gray-700">Terms of Service</Link>
                <Link to="/privacy" className="hover:text-gray-700">Privacy Policy</Link>
                <Link to="/audit-log" className="hover:text-gray-700">Audit Log</Link>
              </div>
              <p className="text-sm text-gray-500">&copy; 2026 IAB Advisors, Inc. All rights reserved.</p>
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              Options trading involves substantial risk. Past performance does not guarantee future results. Not investment advice.
            </p>
          </div>
        </footer>
      </div>

      {/* Bottom Navigation - Mobile/Tablet Only */}
      {(isMobile || isTablet) && <BottomNav />}

      {/* Floating Feedback Button - Desktop Only */}
      {isDesktop && <FloatingFeedbackButton />}

      {/* Risk Acknowledgment Modal */}
      <RiskAcknowledgmentModal
        isOpen={showRiskModal}
        onAccept={handleRiskAccept}
        onDecline={handleRiskDecline}
      />
    </div>
  );
};

export default Layout;

