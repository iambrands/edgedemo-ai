import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface HealthData {
  status: string;
  timestamp: string;
  components: {
    database: {
      status: string;
      total_positions?: number;
      open_positions?: number;
    };
    tradier_api: {
      status: string;
      config: any;
    };
    cache: {
      status: string;
      stats: any;
    };
  };
  environment: any;
}

interface CacheStats {
  enabled: boolean;
  connected?: boolean;
  keys?: number;
  total_keys?: number;
  memory_used?: string;
  hit_rate?: number;
  status?: 'HEALTHY' | 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
}

const PerformanceDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [positionsHealth, setPositionsHealth] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [healthRes, cacheRes, positionsRes] = await Promise.allSettled([
        fetch('/health'),
        fetch('/health/cache').catch(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })),
        fetch('/health/positions').catch(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }))
      ]);

      // Load health data
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        try {
          const data = await healthRes.value.json();
          // Ensure data has proper structure with defaults
          const validatedData = {
            status: data?.status || 'unknown',
            timestamp: data?.timestamp || new Date().toISOString(),
            components: {
              database: data?.components?.database || { status: 'unknown' },
              tradier_api: data?.components?.tradier_api || { status: 'unknown', config: {} },
              cache: data?.components?.cache || { status: 'unknown', stats: {} }
            },
            environment: data?.environment || {}
          };
          setHealth(validatedData);
        } catch (e) {
          console.error('Failed to parse health data:', e);
          // Set default health data on parse error
          setHealth({
            status: 'error',
            timestamp: new Date().toISOString(),
            components: {
              database: { status: 'unknown' },
              tradier_api: { status: 'unknown', config: {} },
              cache: { status: 'unknown', stats: {} }
            },
            environment: {}
          });
        }
      } else {
        console.warn('Health endpoint failed:', healthRes);
        // Set default health data on endpoint failure
        setHealth({
          status: 'error',
          timestamp: new Date().toISOString(),
          components: {
            database: { status: 'unavailable' },
            tradier_api: { status: 'unavailable', config: {} },
            cache: { status: 'unavailable', stats: {} }
          },
          environment: {}
        });
      }

      // Load cache stats (optional - may not exist)
      if (cacheRes.status === 'fulfilled' && cacheRes.value.ok) {
        try {
          const data = await cacheRes.value.json();
          // Ensure we have the right structure
          setCacheStats({
            enabled: data.enabled !== false,
            connected: data.connected === true,
            keys: data.keys || data.total_keys || 0,
            memory_used: data.memory_used || data.redis_memory_used || 'N/A',
            hit_rate: data.hit_rate || 0,
            status: data.status || (data.enabled ? 'CONNECTED' : 'NOT_CONFIGURED')
          });
        } catch (e) {
          console.warn('Failed to parse cache stats:', e);
          // Fallback
          if (health?.components?.cache) {
            setCacheStats(health?.components?.cache?.stats || { enabled: false });
          }
        }
      } else {
        // Cache endpoint not available - use fallback from health data
        if (health?.components?.cache) {
          setCacheStats(health?.components?.cache?.stats || { enabled: false });
        } else {
          // Try to get from admin cache stats endpoint
          try {
            const adminRes = await api.get('/admin/cache/stats');
            if (adminRes.data?.stats) {
              const stats = adminRes.data.stats;
              setCacheStats({
                enabled: stats.using_redis !== false,
                connected: stats.using_redis === true,
                keys: stats.redis_keys || stats.total_keys || 0,
                memory_used: stats.redis_memory_used || 'N/A',
                hit_rate: stats.hit_rate || 0
              });
            }
          } catch (e) {
            console.warn('Failed to get cache stats from admin endpoint:', e);
          }
        }
      }

      // Load positions health (optional - may not exist)
      if (positionsRes.status === 'fulfilled' && positionsRes.value.ok) {
        try {
          const data = await positionsRes.value.json();
          setPositionsHealth(data);
        } catch (e) {
          console.warn('Failed to parse positions health:', e);
        }
      } else {
        // Positions endpoint not available - use fallback from health data
        if (health?.components?.database) {
          setPositionsHealth({
            status: health?.components?.database?.status,
            positions: {
              open: health?.components?.database?.open_positions || 0,
              closed: 0,
              stale: 0,
              expired_open: 0
            }
          });
        }
      }

      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('Failed to load performance data:', error);
      toast.error('Failed to load performance data');
      
      // Set safe defaults on any unexpected error to prevent crashes
      if (!health) {
        setHealth({
          status: 'error',
          timestamp: new Date().toISOString(),
          components: {
            database: { status: 'error' },
            tradier_api: { status: 'error', config: {} },
            cache: { status: 'error', stats: {} }
          },
          environment: {}
        });
      }
      if (!cacheStats) {
        setCacheStats({ enabled: false, status: 'ERROR' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'text-gray-600 bg-gray-50 border-gray-200';
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'connected':
      case 'configured':
      case 'operational':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) status = 'Unknown';
    const colorClass = getStatusColor(status);
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${colorClass}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading && !health) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading performance metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance Dashboard</h1>
          <p className="text-gray-600">
            Real-time system performance and health metrics
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Overall Status */}
      {health && (
        <div className={`rounded-lg p-6 mb-6 border-2 ${
          health.status === 'healthy' ? 'bg-green-50 border-green-300' :
          health.status === 'degraded' ? 'bg-yellow-50 border-yellow-300' :
          'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">System Status</h2>
              <p className="text-sm text-gray-600">
                Last checked: {new Date(health.timestamp).toLocaleString()}
              </p>
            </div>
            {getStatusBadge(health.status)}
          </div>
        </div>
      )}

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Database */}
        {health?.components?.database && (
          <div className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Database</h3>
              {getStatusBadge(health?.components?.database?.status)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Positions:</span>
                <span className="font-semibold">
                  {health?.components?.database?.total_positions ?? 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Open Positions:</span>
                <span className="font-semibold">
                  {health?.components?.database?.open_positions ?? 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tradier API */}
        {health?.components?.tradier_api && (
          <div className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Tradier API</h3>
              {getStatusBadge(health?.components?.tradier_api?.status)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <span className="font-semibold">
                  {health?.components?.tradier_api?.config?.sandbox ? 'Sandbox' : 'Live'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">API Key:</span>
                <span className="font-semibold">
                  {health?.components?.tradier_api?.config?.api_key_present ? '✅ Present' : '❌ Missing'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cache */}
        {cacheStats && (
          <div className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Redis Cache</h3>
              {getStatusBadge(
                cacheStats.status === 'HEALTHY' || (cacheStats.enabled && cacheStats.connected && (cacheStats.keys || cacheStats.total_keys || 0) > 0)
                  ? 'healthy' 
                  : cacheStats.status === 'CONNECTED' || (cacheStats.enabled && cacheStats.connected)
                    ? 'degraded' 
                    : cacheStats.status === 'NOT_CONFIGURED' || !cacheStats.enabled
                      ? 'not_configured'
                      : 'degraded'
              )}
            </div>
            <div className="space-y-2">
              {cacheStats.enabled ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Keys:</span>
                    <span className="font-semibold">
                      {cacheStats.keys?.toLocaleString() ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Memory:</span>
                    <span className="font-semibold">
                      {cacheStats.memory_used ?? 'N/A'}
                    </span>
                  </div>
                  {cacheStats.hit_rate !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hit Rate:</span>
                      <span className={`font-semibold ${
                        cacheStats.hit_rate >= 80 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {cacheStats.hit_rate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Cache not configured</p>
              )}
            </div>
          </div>
        )}

        {/* Positions Health */}
        {positionsHealth && (
          <div className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Positions</h3>
              {getStatusBadge(positionsHealth.status)}
            </div>
            {positionsHealth.positions && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Open:</span>
                  <span className="font-semibold">
                    {positionsHealth.positions.open ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Closed:</span>
                  <span className="font-semibold">
                    {positionsHealth.positions.closed ?? 0}
                  </span>
                </div>
                {positionsHealth.positions.stale > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>⚠️ Stale:</span>
                    <span className="font-semibold">
                      {positionsHealth.positions.stale}
                    </span>
                  </div>
                )}
                {positionsHealth.positions.expired_open > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>❌ Expired:</span>
                    <span className="font-semibold">
                      {positionsHealth.positions.expired_open}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Environment Info */}
        {health?.environment && (
          <div className="bg-white shadow rounded-lg p-6 border">
            <h3 className="text-lg font-bold mb-4">Environment</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <span className="font-semibold">
                  {health?.environment?.environment || 'production'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Debug:</span>
                <span className="font-semibold">
                  {health?.environment?.debug_mode ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cache:</span>
                <span className="font-semibold">
                  {health?.environment?.cache_enabled ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-blue-800">Additional Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/admin/status" className="block p-3 bg-white rounded hover:bg-blue-100 transition">
            <div className="font-semibold text-blue-600">📊 Admin Status</div>
            <div className="text-sm text-gray-600">Detailed system status</div>
          </a>
          <a href="/admin/optimization" className="block p-3 bg-white rounded hover:bg-blue-100 transition">
            <div className="font-semibold text-blue-600">🔧 Optimization</div>
            <div className="text-sm text-gray-600">Database & Redis analysis</div>
          </a>
          <a href="/health" className="block p-3 bg-white rounded hover:bg-blue-100 transition">
            <div className="font-semibold text-blue-600">❤️ Health Check</div>
            <div className="text-sm text-gray-600">Raw health endpoint</div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;

