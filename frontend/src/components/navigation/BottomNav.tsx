import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDevice } from '../../hooks/useDevice';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { isMobile, isTablet } = useDevice();

  // Only show on mobile/tablet
  if (!isMobile && !isTablet) {
    return null;
  }

  // Primary navigation items (5 core items)
  // More menu provides access to Settings, Help, and Logout
  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Trade', href: '/trade', icon: '💹' },
    { name: 'Options', href: '/analyzer', icon: '📈' },
    { name: 'Portfolio', href: '/portfolio', icon: '💼' },
    { name: 'More', href: '/more', icon: '⋯' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    if (path === '/more') {
      // More is active if on /more, /settings, or /help
      return location.pathname === '/more' || 
             location.pathname === '/settings' || 
             location.pathname === '/help';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        height: 'calc(64px + env(safe-area-inset-bottom, 0))',
      }}
    >
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`
                flex flex-col items-center justify-center gap-1
                min-h-[44px] min-w-[44px]
                transition-colors duration-200
                ${active 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
              style={{
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

