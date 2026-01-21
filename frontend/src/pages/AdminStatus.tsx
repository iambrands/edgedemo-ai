import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminStatus: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      // Try simple status endpoint first (no auth required)
      const response = await fetch('/api/admin/status');
      const data = await response.json();
      setStatus(data);
    } catch (error: any) {
      console.error('Failed to load status:', error);
      toast.error('Failed to load admin status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Status</h1>
        <p className="text-gray-600">System health and service status</p>
        <button
          onClick={loadStatus}
          className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {status && (
        <div className="space-y-6">
          {/* Overall Status */}
          <div className={`rounded-lg p-6 ${
            status.status === 'operational' ? 'bg-green-50 border border-green-200' :
            status.status === 'degraded' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <h2 className="text-xl font-bold mb-2">
              System Status: <span className={
                status.status === 'operational' ? 'text-green-600' :
                status.status === 'degraded' ? 'text-yellow-600' :
                'text-red-600'
              }>
                {status.status.toUpperCase()}
              </span>
            </h2>
            <p className="text-sm text-gray-600">
              Last updated: {new Date(status.timestamp).toLocaleString()}
            </p>
          </div>

          {/* Services Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Services Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {status.services && Object.entries(status.services).map(([name, info]: [string, any]) => (
                <div key={name} className={`p-4 rounded border ${
                  info.status === 'connected' || info.status === 'configured' ? 'bg-green-50 border-green-200' :
                  info.status === 'not_configured' ? 'bg-gray-50 border-gray-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold capitalize">{name}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${
                      info.status === 'connected' || info.status === 'configured' ? 'bg-green-100 text-green-800' :
                      info.status === 'not_configured' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {info.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{info.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Routes */}
          {status.admin_routes_registered !== undefined && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Admin Routes</h2>
              <p className="text-gray-600 mb-4">
                Routes registered: <span className="font-semibold">{status.admin_routes_registered}</span>
              </p>
              {status.admin_routes && status.admin_routes.length > 0 ? (
                <div className="space-y-2">
                  {status.admin_routes.map((route: string, i: number) => (
                    <div key={i} className="font-mono text-sm bg-gray-50 p-2 rounded">
                      {route}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-yellow-800">⚠️ No admin routes registered yet. Waiting for deployment...</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-blue-800">Quick Access</h2>
            <div className="space-y-2">
              <a href="/admin/optimization" className="block text-blue-600 hover:text-blue-800 underline">
                🔧 Optimization Dashboard
              </a>
              <a href="/health" className="block text-blue-600 hover:text-blue-800 underline">
                ❤️ Health Check
              </a>
              <a href="/debug/routes" className="block text-blue-600 hover:text-blue-800 underline">
                🗺️ All Routes (Debug)
              </a>
            </div>
          </div>
        </div>
      )}

      {!status && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">Unable to load admin status</p>
          <button
            onClick={loadStatus}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminStatus;

