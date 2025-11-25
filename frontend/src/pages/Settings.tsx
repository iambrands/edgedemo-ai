import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [defaultStrategy, setDefaultStrategy] = useState<'income' | 'growth' | 'balanced'>('balanced');
  const [loading, setLoading] = useState(false);
  const [riskLimits, setRiskLimits] = useState<any>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [showRiskCustomization, setShowRiskCustomization] = useState(false);
  const [resettingBalance, setResettingBalance] = useState(false);

  useEffect(() => {
    if (user) {
      setRiskTolerance(user.risk_tolerance || 'moderate');
      setDefaultStrategy(user.default_strategy || 'balanced');
      loadRiskLimits();
    }
  }, [user]);

  const loadRiskLimits = async () => {
    setLoadingLimits(true);
    try {
      const response = await api.get('/risk/limits');
      setRiskLimits(response.data);
    } catch (error: any) {
      console.error('Failed to load risk limits:', error);
    } finally {
      setLoadingLimits(false);
    }
  };

  const handleUpdateRiskLimits = async () => {
    if (!riskLimits) return;
    setLoading(true);
    try {
      await api.put('/risk/limits', riskLimits);
      toast.success('Risk limits updated successfully!');
      setShowRiskCustomization(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update risk limits');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPaperBalance = async () => {
    if (!window.confirm('Reset paper trading balance to $100,000? This cannot be undone.')) {
      return;
    }
    setResettingBalance(true);
    try {
      await api.put('/auth/user', { paper_balance: 100000 });
      toast.success('Paper balance reset to $100,000');
      window.location.reload(); // Reload to refresh user data
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset balance');
    } finally {
      setResettingBalance(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUser({
        risk_tolerance: riskTolerance,
        default_strategy: defaultStrategy,
      });
      toast.success('Settings updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const getRiskToleranceDescription = (tolerance: string) => {
    switch (tolerance) {
      case 'low':
        return 'Conservative: 25% daily loss limit, 1% position size, max 5 positions';
      case 'moderate':
        return 'Balanced: 50% daily loss limit, 2% position size, max 10 positions';
      case 'high':
        return 'Aggressive: 75% daily loss limit, 5% position size, max 20 positions';
      default:
        return '';
    }
  };

  if (!user) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-secondary">Settings</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-secondary mb-6">Trading Preferences</h2>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="riskTolerance" className="block text-sm font-medium text-gray-700 mb-2">
              Risk Tolerance
            </label>
            <select
              id="riskTolerance"
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value as 'low' | 'moderate' | 'high')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="low">Low (Conservative)</option>
              <option value="moderate">Moderate (Balanced)</option>
              <option value="high">High (Aggressive)</option>
            </select>
            <p className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              {getRiskToleranceDescription(riskTolerance)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Changing your risk tolerance will automatically update your risk limits. This affects:
              daily loss limits, position sizing, maximum positions, and DTE requirements.
            </p>
          </div>

          <div>
            <label htmlFor="defaultStrategy" className="block text-sm font-medium text-gray-700 mb-2">
              Default Strategy Preference
            </label>
            <select
              id="defaultStrategy"
              value={defaultStrategy}
              onChange={(e) => setDefaultStrategy(e.target.value as 'income' | 'growth' | 'balanced')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="income">Income - Focus on premium collection</option>
              <option value="balanced">Balanced - Mix of income and growth</option>
              <option value="growth">Growth - Focus on capital appreciation</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">
              This affects how options are analyzed and recommended in the Options Analyzer.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-secondary mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Username:</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Trading Mode:</span>
            <span className="font-medium capitalize">{user.trading_mode || 'paper'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Paper Balance:</span>
            <div className="flex items-center gap-3">
              <span className="font-medium">
                ${(user.paper_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {user.trading_mode === 'paper' && (
                <button
                  onClick={handleResetPaperBalance}
                  disabled={resettingBalance}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium disabled:opacity-50"
                >
                  {resettingBalance ? 'Resetting...' : 'Reset to $100,000'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Limits Customization */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary">Risk Management Limits</h2>
          <button
            onClick={() => setShowRiskCustomization(!showRiskCustomization)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-sm"
          >
            {showRiskCustomization ? 'Hide' : 'Customize'}
          </button>
        </div>
        
        {!loadingLimits && riskLimits && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Max Daily Loss:</span>
                <span className="ml-2 font-medium">{riskLimits.max_daily_loss_percent?.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Max Position Size:</span>
                <span className="ml-2 font-medium">{riskLimits.max_position_size_percent?.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Max Open Positions:</span>
                <span className="ml-2 font-medium">{riskLimits.max_open_positions || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Max Capital at Risk:</span>
                <span className="ml-2 font-medium">{riskLimits.max_capital_at_risk_percent?.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {showRiskCustomization && riskLimits && (
          <div className="mt-6 space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Daily Loss (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={riskLimits.max_daily_loss_percent || ''}
                  onChange={(e) => setRiskLimits({...riskLimits, max_daily_loss_percent: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Position Size (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={riskLimits.max_position_size_percent || ''}
                  onChange={(e) => setRiskLimits({...riskLimits, max_position_size_percent: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Open Positions
                </label>
                <input
                  type="number"
                  value={riskLimits.max_open_positions || ''}
                  onChange={(e) => setRiskLimits({...riskLimits, max_open_positions: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Capital at Risk (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={riskLimits.max_capital_at_risk_percent || ''}
                  onChange={(e) => setRiskLimits({...riskLimits, max_capital_at_risk_percent: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <button
              onClick={handleUpdateRiskLimits}
              disabled={loading}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Risk Limits'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;


