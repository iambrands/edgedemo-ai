import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface DatabaseAnalysis {
  tables: Array<{
    name: string;
    columns: number;
    indices: number;
    foreign_keys: number;
    row_count: number;
    size: string;
  }>;
  indices: Record<string, Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>>;
  missing_indices: Array<{
    table: string;
    column: string;
    type: string;
    priority: string;
    sql: string;
  }>;
  recommendations: Array<{
    type: string;
    count?: number;
    high_priority_count?: number;
    message: string;
  }>;
  timestamp: string;
}

interface RedisAnalysis {
  connected: boolean;
  info: {
    version?: string;
    uptime_days?: number;
    connected_clients?: number;
    used_memory?: string;
    max_memory?: string;
    total_keys?: number;
    hit_rate?: number;
    hits?: number;
    misses?: number;
  };
  keys: {
    total?: number;
    patterns?: Record<string, number>;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    message: string;
  }>;
  error?: string;
  timestamp: string;
}

interface ConnectionAnalysis {
  pool: {
    size: number;
    checked_out: number;
    overflow: number;
    max_overflow: number;
  };
  active_connections: {
    total: number;
    active: number;
    idle: number;
    idle_in_transaction: number;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    message: string;
  }>;
  timestamp: string;
}

const OptimizationDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dbAnalysis, setDbAnalysis] = useState<DatabaseAnalysis | null>(null);
  const [redisAnalysis, setRedisAnalysis] = useState<RedisAnalysis | null>(null);
  const [connAnalysis, setConnAnalysis] = useState<ConnectionAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('database');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    console.log('🔍 OptimizationDashboard mounted');
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    console.log('📊 Loading optimization analyses...');
    setLoading(true);
    let hasErrors = false;
    try {
      const [dbRes, redisRes, connRes] = await Promise.allSettled([
        api.get('/admin/analyze/database'),
        api.get('/admin/analyze/redis'),
        api.get('/admin/analyze/connections')
      ]);
      
      // Handle database analysis
      if (dbRes.status === 'fulfilled') {
        console.log('✅ Database analysis loaded:', dbRes.value.data);
        setDbAnalysis(dbRes.value.data);
      } else {
        console.error('Database analysis failed:', dbRes.reason);
        hasErrors = true;
        if (dbRes.reason?.response?.status === 401 || dbRes.reason?.response?.status === 403) {
          toast.error('Authentication required. Please log in again.');
        } else {
          toast.error(`Database analysis failed: ${dbRes.reason?.response?.data?.error || dbRes.reason?.message || 'Unknown error'}`);
        }
      }
      
      // Handle Redis analysis
      if (redisRes.status === 'fulfilled') {
        console.log('✅ Redis analysis loaded:', redisRes.value.data);
        setRedisAnalysis(redisRes.value.data);
      } else {
        console.error('Redis analysis failed:', redisRes.reason);
        // Don't show error for Redis if it's just not configured
        if (redisRes.reason?.response?.status !== 401 && redisRes.reason?.response?.status !== 403) {
          setRedisAnalysis({ connected: false, info: {}, keys: {}, recommendations: [], timestamp: new Date().toISOString(), error: redisRes.reason?.response?.data?.error || 'Redis not available' });
        }
      }
      
      // Handle connection analysis
      if (connRes.status === 'fulfilled') {
        console.log('✅ Connection analysis loaded:', connRes.value.data);
        setConnAnalysis(connRes.value.data);
      } else {
        console.error('Connection analysis failed:', connRes.reason);
        hasErrors = true;
        if (connRes.reason?.response?.status === 401 || connRes.reason?.response?.status === 403) {
          if (!hasErrors) toast.error('Authentication required. Please log in again.');
        } else {
          toast.error(`Connection analysis failed: ${connRes.reason?.response?.data?.error || connRes.reason?.message || 'Unknown error'}`);
        }
      }
      
    } catch (error: any) {
      console.error('Failed to load analyses:', error);
      toast.error('Failed to load optimization analysis');
    } finally {
      setLoading(false);
    }
  };

  const applyOptimizations = async () => {
    if (!window.confirm('Apply database optimizations? This will create indices on existing tables.')) {
      return;
    }

    setApplying(true);
    try {
      const response = await api.post('/admin/optimize/apply', {
        preview: false
      });
      
      const result = response.data;
      const summary = result.summary || {};
      
      // Build detailed message
      let message = `Optimization Results:\n\n`;
      message += `✅ Applied: ${summary.applied || 0} indices\n`;
      
      if ((summary.skipped || 0) > 0) {
        message += `⏭️  Skipped: ${summary.skipped} (tables don't exist yet)\n`;
      }
      
      if ((summary.failed || 0) > 0) {
        message += `❌ Failed: ${summary.failed}\n`;
      }
      
      if (summary.failed === 0 && summary.applied > 0) {
        toast.success(`Successfully applied ${summary.applied} optimizations!`);
      } else if (summary.failed > 0) {
        toast.error(message);
      } else if (summary.skipped > 0) {
        toast.success(message);
      } else {
        toast.success('No optimizations needed - all indices already exist!');
      }
      
      // Reload analyses to show updated state
      await loadAnalyses();
      
    } catch (error: any) {
      console.error('Failed to apply optimizations:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to apply optimizations';
      toast.error(`Failed: ${errorMsg}`);
    } finally {
      setApplying(false);
    }
  };

  console.log('🎨 Rendering OptimizationDashboard', { loading, hasDb: !!dbAnalysis, hasRedis: !!redisAnalysis, hasConn: !!connAnalysis, activeTab });

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading optimization analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Optimization Dashboard</h1>
        <p className="text-gray-600">Database, Redis, and connection pool analysis</p>
        <button
          onClick={loadAnalyses}
          className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
        >
          🔄 Refresh Analysis
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('database')}
            className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${
              activeTab === 'database'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Database
          </button>
          <button
            onClick={() => setActiveTab('redis')}
            className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${
              activeTab === 'redis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Redis Cache
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${
              activeTab === 'connections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Connections
          </button>
        </nav>
      </div>

      {/* Database Tab */}
      {activeTab === 'database' && dbAnalysis && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Database Tables</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Table</th>
                    <th className="text-right py-2">Rows</th>
                    <th className="text-right py-2">Size</th>
                    <th className="text-right py-2">Indices</th>
                    <th className="text-right py-2">FKs</th>
                  </tr>
                </thead>
                <tbody>
                  {dbAnalysis.tables.map((table) => (
                    <tr key={table.name} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-mono text-sm">{table.name}</td>
                      <td className="text-right">{table.row_count.toLocaleString()}</td>
                      <td className="text-right">{table.size}</td>
                      <td className="text-right">{table.indices}</td>
                      <td className="text-right">{table.foreign_keys}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {dbAnalysis.missing_indices && dbAnalysis.missing_indices.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-yellow-800">
                Missing Indices ({dbAnalysis.missing_indices.length})
              </h2>
              <div className="space-y-2 mb-4">
                {dbAnalysis.missing_indices.map((idx, i) => (
                  <div key={i} className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          idx.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {idx.priority}
                        </span>
                        <span className="font-mono text-sm">
                          {idx.table}.{idx.column}
                        </span>
                      </div>
                      <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {idx.sql}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={applyOptimizations}
                disabled={applying}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? 'Applying...' : 'Apply All Optimizations'}
              </button>
            </div>
          )}

          {dbAnalysis.recommendations && dbAnalysis.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-800">Recommendations</h2>
              <ul className="space-y-2">
                {dbAnalysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-blue-700">
                    • {rec.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Redis Tab */}
      {activeTab === 'redis' && redisAnalysis && (
        <div className="space-y-6">
          {redisAnalysis.connected ? (
            <>
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Redis Server Info</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Version</p>
                    <p className="text-lg font-semibold">{redisAnalysis.info.version || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Memory Used</p>
                    <p className="text-lg font-semibold">{redisAnalysis.info.used_memory || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Max Memory</p>
                    <p className="text-lg font-semibold">{redisAnalysis.info.max_memory || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Keys</p>
                    <p className="text-lg font-semibold">{redisAnalysis.info.total_keys || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Connected Clients</p>
                    <p className="text-lg font-semibold">{redisAnalysis.info.connected_clients || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cache Hit Rate</p>
                    <p className={`text-lg font-semibold ${
                      (redisAnalysis.info.hit_rate || 0) >= 80 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {redisAnalysis.info.hit_rate?.toFixed(1) || 'N/A'}%
                    </p>
                  </div>
                </div>
                
                {redisAnalysis.info.hits !== undefined && redisAnalysis.info.misses !== undefined && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">Cache Stats</p>
                    <p className="text-sm">
                      Hits: {redisAnalysis.info.hits.toLocaleString()} | 
                      Misses: {redisAnalysis.info.misses.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {redisAnalysis.keys.patterns && Object.keys(redisAnalysis.keys.patterns).length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Key Patterns (sampled)</h2>
                  <div className="space-y-2">
                    {Object.entries(redisAnalysis.keys.patterns).map(([pattern, count]) => (
                      <div key={pattern} className="flex justify-between items-center py-2 border-b">
                        <span className="font-mono text-sm">{pattern}</span>
                        <span className="text-gray-600 font-semibold">{count as number} keys</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {redisAnalysis.recommendations && redisAnalysis.recommendations.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4 text-yellow-800">Recommendations</h2>
                  <ul className="space-y-2">
                    {redisAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="text-yellow-700">
                        • {rec.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-2 text-red-800">Redis Not Connected</h2>
              <p className="text-red-600">{redisAnalysis.error || 'Unable to connect to Redis cache'}</p>
            </div>
          )}
        </div>
      )}

      {/* Connections Tab */}
      {activeTab === 'connections' && connAnalysis && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Connection Pool</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Pool Size</p>
                <p className="text-lg font-semibold">{connAnalysis.pool.size}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Checked Out</p>
                <p className="text-lg font-semibold">{connAnalysis.pool.checked_out}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Max Overflow</p>
                <p className="text-lg font-semibold">{connAnalysis.pool.max_overflow}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Overflow</p>
                <p className="text-lg font-semibold">{connAnalysis.pool.overflow}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Active Connections</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-lg font-semibold">{connAnalysis.active_connections.total || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-lg font-semibold text-green-600">{connAnalysis.active_connections.active || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Idle</p>
                <p className="text-lg font-semibold">{connAnalysis.active_connections.idle || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Idle in Transaction</p>
                <p className={`text-lg font-semibold ${
                  (connAnalysis.active_connections.idle_in_transaction || 0) > 5 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {connAnalysis.active_connections.idle_in_transaction || 0}
                </p>
              </div>
            </div>
          </div>

          {connAnalysis.recommendations && connAnalysis.recommendations.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-yellow-800">Recommendations</h2>
              <ul className="space-y-2">
                {connAnalysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-yellow-700">
                    • {rec.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* No data available */}
      {!dbAnalysis && !redisAnalysis && !connAnalysis && !loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">Unable to load optimization analysis</p>
          <p className="text-sm text-gray-500 mb-4">
            Please check the browser console for error details or try refreshing the page.
          </p>
          <button
            onClick={loadAnalyses}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Show tabs even if some data is missing */}
      {!dbAnalysis && activeTab === 'database' && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Database analysis failed to load</p>
          <button
            onClick={loadAnalyses}
            className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {!redisAnalysis && activeTab === 'redis' && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Redis analysis failed to load</p>
          <button
            onClick={loadAnalyses}
            className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {!connAnalysis && activeTab === 'connections' && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Connection analysis failed to load</p>
          <button
            onClick={loadAnalyses}
            className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 text-sm"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default OptimizationDashboard;

