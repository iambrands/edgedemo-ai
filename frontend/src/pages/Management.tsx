import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface ManagementStats {
  watchlistCount: number;
  automationsActive: number;
  alertsActive: number;
}

interface Feature {
  icon: string;
  title: string;
  description: string;
  path: string;
  color: string;
  count: number;
  countLabel: string;
}

const Management: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ManagementStats>({
    watchlistCount: 0,
    automationsActive: 0,
    alertsActive: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch watchlist count
      try {
        const watchlistRes = await api.get('/api/watchlist');
        if (watchlistRes.data?.watchlist) {
          setStats(prev => ({ ...prev, watchlistCount: watchlistRes.data.watchlist.length }));
        }
      } catch (e) {
        // Watchlist might not exist or be empty
      }

      // Fetch automations count
      try {
        const automationsRes = await api.get('/api/automations');
        if (automationsRes.data?.automations) {
          const active = automationsRes.data.automations.filter((a: any) => a.status === 'active').length;
          setStats(prev => ({ ...prev, automationsActive: active }));
        }
      } catch (e) {
        // Automations might not exist
      }

      // Fetch alerts count
      try {
        const alertsRes = await api.get('/api/alerts');
        if (alertsRes.data?.alerts) {
          setStats(prev => ({ ...prev, alertsActive: alertsRes.data.alerts.length }));
        }
      } catch (e) {
        // Alerts might not exist
      }
    } catch (error) {
      console.error('Failed to fetch management stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const features: Feature[] = [
    {
      icon: '📋',
      title: 'Watchlist',
      description: 'Track your favorite symbols and monitor their performance',
      path: '/watchlist',
      color: 'bg-blue-500',
      count: stats.watchlistCount,
      countLabel: 'symbols'
    },
    {
      icon: '🤖',
      title: 'Automations',
      description: 'Create and manage automated trading strategies',
      path: '/automations',
      color: 'bg-purple-500',
      count: stats.automationsActive,
      countLabel: 'active'
    },
    {
      icon: '🔔',
      title: 'Alerts',
      description: 'Set price alerts and get notified of opportunities',
      path: '/alerts',
      color: 'bg-green-500',
      count: stats.alertsActive,
      countLabel: 'active'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading management stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Management</h1>
        <p className="text-gray-600">
          Manage your watchlist, automations, and alerts
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-4 mb-8">
        {features.map((feature) => (
          <button
            key={feature.path}
            onClick={() => navigate(feature.path)}
            className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg active:scale-[0.98] transition-all text-left w-full border border-gray-200"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`${feature.color} p-3 rounded-lg flex-shrink-0`}>
                <span className="text-2xl">{feature.icon}</span>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-sm font-semibold">
                      {feature.count} {feature.countLabel}
                    </span>
                    <span className="text-xl">›</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
          <p className="text-2xl font-bold text-blue-600">
            {stats.watchlistCount}
          </p>
          <p className="text-xs text-gray-600 mt-1">Watchlist</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-100">
          <p className="text-2xl font-bold text-purple-600">
            {stats.automationsActive}
          </p>
          <p className="text-xs text-gray-600 mt-1">Automations</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
          <p className="text-2xl font-bold text-green-600">
            {stats.alertsActive}
          </p>
          <p className="text-xs text-gray-600 mt-1">Alerts</p>
        </div>
      </div>
    </div>
  );
};

export default Management;

