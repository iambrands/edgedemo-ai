import React, { useState, useEffect } from 'react';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: {
    environment: string;
    debug_mode: boolean;
    cache_enabled: boolean;
    redis_url_present: boolean;
  };
  components: {
    cache: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      stats: {
        redis_keys?: number;
        redis_memory_used?: string;
        using_redis?: boolean;
        in_memory_entries?: number;
        [key: string]: any;
      };
    };
    database: {
      status: 'healthy' | 'unhealthy';
      open_positions: number | null;
      total_positions: number | null;
    };
    tradier_api: {
      status: 'configured' | 'not_configured';
      config: {
        sandbox: boolean;
        use_mock: boolean;
        base_url: string;
        api_key_present: boolean;
      };
    };
  };
  error?: string;
}

const HealthCheck: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/health');
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to fetch health data:', err);
      setError(err.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return 'text-green-600 bg-green-100 border-green-300';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'unhealthy':
      case 'not_configured':
        return 'text-red-600 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unhealthy':
      case 'not_configured':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health status...</p>
        </div>
      </div>
    );
  }

  if (error && !healthData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-white rounded-lg shadow-md p-8 max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Health Check Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchHealthData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health Check</h1>
          <p className="text-gray-600 mt-2">Real-time system status and diagnostics</p>
        </div>
        <div className="text-left md:text-right">
          <button
            onClick={fetchHealthData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Refreshing...
              </>
            ) : (
              <>
                <span>🔄</span>
                Refresh
              </>
            )}
          </button>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Overall System Status</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-4 py-2 rounded-full font-semibold uppercase text-sm flex items-center gap-2 border ${getStatusColor(healthData.status)}`}>
                <span className="text-lg">{getStatusIcon(healthData.status)}</span>
                {healthData.status}
              </span>
              <span className="text-gray-600">
                Version {healthData.version}
              </span>
              <span className="text-gray-600">
                • {healthData.environment.environment.charAt(0).toUpperCase() + healthData.environment.environment.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Component Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Redis Cache Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Redis Cache</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1 border ${getStatusColor(healthData.components.cache.status)}`}>
              <span>{getStatusIcon(healthData.components.cache.status)}</span>
              {healthData.components.cache.status}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Keys:</span>
              <span className="font-semibold">
                {healthData.components.cache.stats.redis_keys ?? healthData.components.cache.stats.keys ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Memory Used:</span>
              <span className="font-semibold">
                {healthData.components.cache.stats.redis_memory_used ?? healthData.components.cache.stats.memory_used ?? 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Redis Enabled:</span>
              <span className={`font-semibold ${healthData.components.cache.stats.using_redis ? 'text-green-600' : 'text-red-600'}`}>
                {healthData.components.cache.stats.using_redis ? 'Yes' : 'No'}
              </span>
            </div>
            {healthData.components.cache.stats.hit_rate !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Hit Rate:</span>
                <span className={`font-semibold ${healthData.components.cache.stats.hit_rate >= 80 ? 'text-green-600' : healthData.components.cache.stats.hit_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {healthData.components.cache.stats.hit_rate.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Database Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Database</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1 border ${getStatusColor(healthData.components.database.status)}`}>
              <span>{getStatusIcon(healthData.components.database.status)}</span>
              {healthData.components.database.status}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Open Positions:</span>
              <span className="font-semibold">
                {healthData.components.database.open_positions ?? 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Positions:</span>
              <span className="font-semibold">
                {healthData.components.database.total_positions ?? 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Connection:</span>
              <span className={`font-semibold ${healthData.components.database.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                {healthData.components.database.status === 'healthy' ? 'Connected' : 'Error'}
              </span>
            </div>
          </div>
        </div>

        {/* Tradier API Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tradier API</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1 border ${getStatusColor(healthData.components.tradier_api.status)}`}>
              <span>{getStatusIcon(healthData.components.tradier_api.status)}</span>
              {healthData.components.tradier_api.status}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Environment:</span>
              <span className="font-semibold">
                {healthData.components.tradier_api.config.sandbox ? 'Sandbox' : 'Live'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API Key:</span>
              <span className={`font-semibold ${healthData.components.tradier_api.config.api_key_present ? 'text-green-600' : 'text-red-600'}`}>
                {healthData.components.tradier_api.config.api_key_present ? 'Present' : 'Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mock Mode:</span>
              <span className="font-semibold">
                {healthData.components.tradier_api.config.use_mock ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Base URL:</span>
              <span className="font-semibold text-xs truncate max-w-[150px]" title={healthData.components.tradier_api.config.base_url}>
                {healthData.components.tradier_api.config.base_url}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Environment Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Environment Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-600 text-sm mb-1">Environment</p>
            <p className="font-semibold capitalize">{healthData.environment.environment}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Debug Mode</p>
            <p className={`font-semibold ${healthData.environment.debug_mode ? 'text-yellow-600' : 'text-green-600'}`}>
              {healthData.environment.debug_mode ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Cache Enabled</p>
            <p className={`font-semibold ${healthData.environment.cache_enabled ? 'text-green-600' : 'text-red-600'}`}>
              {healthData.environment.cache_enabled ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Redis URL</p>
            <p className={`font-semibold ${healthData.environment.redis_url_present ? 'text-green-600' : 'text-red-600'}`}>
              {healthData.environment.redis_url_present ? 'Present' : 'Missing'}
            </p>
          </div>
        </div>
      </div>

      {/* Status Explanations */}
      <div className="bg-blue-50 rounded-lg p-6 mt-6 border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">Status Definitions</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-600 text-lg">✅</span>
            <div>
              <span className="font-semibold text-green-900">Healthy:</span>
              <span className="text-gray-700"> All systems operating normally</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 text-lg">⚠️</span>
            <div>
              <span className="font-semibold text-yellow-900">Degraded:</span>
              <span className="text-gray-700"> Some components experiencing issues but system functional</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-600 text-lg">❌</span>
            <div>
              <span className="font-semibold text-red-900">Unhealthy:</span>
              <span className="text-gray-700"> Critical components offline or system unavailable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {healthData.error && (
        <div className="bg-red-50 rounded-lg p-6 mt-6 border border-red-200">
          <h3 className="text-lg font-semibold mb-2 text-red-900">Error Information</h3>
          <p className="text-sm text-red-800">{healthData.error}</p>
        </div>
      )}
    </div>
  );
};

export default HealthCheck;

