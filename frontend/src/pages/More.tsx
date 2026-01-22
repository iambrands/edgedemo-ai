import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface MenuItem {
  icon: string;
  label: string;
  path?: string;
  onClick?: () => void;
  variant?: 'default' | 'danger';
}

const More: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) return;
    
    logout();
  };

  const managementItems: MenuItem[] = [
    {
      icon: '📊',
      label: 'Management Hub',
      path: '/management',
    },
    {
      icon: '📋',
      label: 'Watchlist',
      path: '/watchlist',
    },
    {
      icon: '🤖',
      label: 'Automations',
      path: '/automations',
    },
    {
      icon: '🔔',
      label: 'Alerts',
      path: '/alerts',
    },
  ];

  const accountItems: MenuItem[] = [
    {
      icon: '⚙️',
      label: 'Settings',
      path: '/settings',
    },
    {
      icon: '❓',
      label: 'Help & FAQ',
      path: '/help',
    },
    {
      icon: '🚪',
      label: 'Logout',
      onClick: handleLogout,
      variant: 'danger',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary">More</h1>
        <p className="text-gray-600 mt-1">Account settings and support</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-secondary">{user?.username || 'User'}</h2>
            <p className="text-sm text-gray-600">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Management Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-secondary">Management</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {managementItems.map((item, index) => {
            const content = (
              <div
                className={`
                  flex items-center gap-4 p-4 md:p-6
                  transition-colors
                  text-gray-700 hover:bg-gray-50
                  ${item.path ? 'cursor-pointer' : ''}
                  min-h-[60px]
                `}
                onClick={item.onClick}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="flex-1 font-medium">{item.label}</span>
                {item.path && (
                  <span className="text-gray-400">›</span>
                )}
              </div>
            );

            if (item.path) {
              return (
                <Link key={index} to={item.path} className="block">
                  {content}
                </Link>
              );
            }

            return (
              <div key={index}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-secondary">Account</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {accountItems.map((item, index) => {
            const content = (
              <div
                className={`
                  flex items-center gap-4 p-4 md:p-6
                  transition-colors
                  ${item.variant === 'danger' 
                    ? 'text-error hover:bg-red-50' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                  ${item.onClick ? 'cursor-pointer' : ''}
                  min-h-[60px]
                `}
                onClick={item.onClick}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="flex-1 font-medium">{item.label}</span>
                {item.path && (
                  <span className="text-gray-400">›</span>
                )}
              </div>
            );

            if (item.path) {
              return (
                <Link key={index} to={item.path} className="block">
                  {content}
                </Link>
              );
            }

            return (
              <div key={index}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 rounded-lg p-4 md:p-6">
        <h3 className="font-semibold text-secondary mb-2">Need Help?</h3>
        <p className="text-sm text-gray-700 mb-4">
          Visit our Help & FAQ section for detailed guides, troubleshooting tips, and answers to common questions.
        </p>
        <Link
          to="/help"
          className="inline-flex items-center gap-2 text-primary hover:text-indigo-700 font-medium text-sm"
        >
          <span>❓</span>
          <span>Go to Help & FAQ</span>
        </Link>
      </div>
    </div>
  );
};

export default More;

