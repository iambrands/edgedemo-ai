import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface AlertFiltersData {
  min_confidence: number;
  enabled: boolean;
  rsi_enabled: boolean;
  rsi_oversold_threshold: number;
  rsi_overbought_threshold: number;
  ma_enabled: boolean;
  require_golden_cross: boolean;
  require_death_cross: boolean;
  macd_enabled: boolean;
  require_macd_bullish: boolean;
  require_macd_bearish: boolean;
  volume_enabled: boolean;
  min_volume_ratio: number;
  require_volume_confirmation: boolean;
  min_signal_count: number;
  require_all_signals_bullish: boolean;
  require_all_signals_bearish: boolean;
}

interface AlertFiltersProps {
  onClose: () => void;
}

const AlertFilters: React.FC<AlertFiltersProps> = ({ onClose }) => {
  const [filters, setFilters] = useState<AlertFiltersData>({
    min_confidence: 0.6,
    enabled: false,
    rsi_enabled: true,
    rsi_oversold_threshold: 30.0,
    rsi_overbought_threshold: 70.0,
    ma_enabled: true,
    require_golden_cross: true,
    require_death_cross: false,
    macd_enabled: true,
    require_macd_bullish: true,
    require_macd_bearish: false,
    volume_enabled: true,
    min_volume_ratio: 1.0,
    require_volume_confirmation: false,
    min_signal_count: 1,
    require_all_signals_bullish: false,
    require_all_signals_bearish: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const response = await api.get('/alerts/filters');
      if (response.data && response.data.filters) {
        setFilters(response.data.filters);
      }
    } catch (error: any) {
      console.error('Failed to load filters:', error);
      toast.error('Failed to load filter settings. Using defaults.');
      // Keep default state, just stop loading
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/alerts/filters', filters);
      toast.success('Alert filters saved successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save filters');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await api.post('/alerts/filters/reset');
      await loadFilters();
      toast.success('Filters reset to defaults');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset filters');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading filter settings...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-secondary">Custom Alert Filters</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold mb-4">General Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Use Custom Filters
                </label>
                <p className="text-xs text-gray-500">Enable to use your custom filters instead of platform defaults</p>
              </div>
              <input
                type="checkbox"
                checked={filters.enabled}
                onChange={(e) => setFilters({ ...filters, enabled: e.target.checked })}
                className="w-5 h-5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Confidence: {(filters.min_confidence * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={filters.min_confidence}
                onChange={(e) => setFilters({ ...filters, min_confidence: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Signal Count: {filters.min_signal_count}
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={filters.min_signal_count}
                onChange={(e) => setFilters({ ...filters, min_signal_count: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum number of signals that must agree</p>
            </div>
          </div>
        </div>

        {/* RSI Settings */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">RSI (Relative Strength Index)</h3>
            <input
              type="checkbox"
              checked={filters.rsi_enabled}
              onChange={(e) => setFilters({ ...filters, rsi_enabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
          {filters.rsi_enabled && (
            <div className="space-y-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Oversold Threshold: {filters.rsi_oversold_threshold.toFixed(0)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={filters.rsi_oversold_threshold}
                  onChange={(e) => setFilters({ ...filters, rsi_oversold_threshold: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">RSI below this = oversold (bullish signal)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overbought Threshold: {filters.rsi_overbought_threshold.toFixed(0)}
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={filters.rsi_overbought_threshold}
                  onChange={(e) => setFilters({ ...filters, rsi_overbought_threshold: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">RSI above this = overbought (bearish signal)</p>
              </div>
            </div>
          )}
        </div>

        {/* Moving Averages */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Moving Averages</h3>
            <input
              type="checkbox"
              checked={filters.ma_enabled}
              onChange={(e) => setFilters({ ...filters, ma_enabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
          {filters.ma_enabled && (
            <div className="space-y-3 ml-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.require_golden_cross}
                  onChange={(e) => setFilters({ ...filters, require_golden_cross: e.target.checked })}
                  className="w-4 h-4 mr-2"
                />
                <label className="text-sm text-gray-700">Require Golden Cross (Price above all MAs)</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.require_death_cross}
                  onChange={(e) => setFilters({ ...filters, require_death_cross: e.target.checked })}
                  className="w-4 h-4 mr-2"
                />
                <label className="text-sm text-gray-700">Require Death Cross (Price below all MAs)</label>
              </div>
            </div>
          )}
        </div>

        {/* MACD */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">MACD</h3>
            <input
              type="checkbox"
              checked={filters.macd_enabled}
              onChange={(e) => setFilters({ ...filters, macd_enabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
          {filters.macd_enabled && (
            <div className="space-y-3 ml-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.require_macd_bullish}
                  onChange={(e) => setFilters({ ...filters, require_macd_bullish: e.target.checked })}
                  className="w-4 h-4 mr-2"
                />
                <label className="text-sm text-gray-700">Require MACD Bullish (Line above signal)</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.require_macd_bearish}
                  onChange={(e) => setFilters({ ...filters, require_macd_bearish: e.target.checked })}
                  className="w-4 h-4 mr-2"
                />
                <label className="text-sm text-gray-700">Require MACD Bearish (Line below signal)</label>
              </div>
            </div>
          )}
        </div>

        {/* Volume */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Volume</h3>
            <input
              type="checkbox"
              checked={filters.volume_enabled}
              onChange={(e) => setFilters({ ...filters, volume_enabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
          {filters.volume_enabled && (
            <div className="space-y-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Volume Ratio: {filters.min_volume_ratio.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={filters.min_volume_ratio}
                  onChange={(e) => setFilters({ ...filters, min_volume_ratio: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">1.0x = average volume, 1.5x = 50% above average</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.require_volume_confirmation}
                  onChange={(e) => setFilters({ ...filters, require_volume_confirmation: e.target.checked })}
                  className="w-4 h-4 mr-2"
                />
                <label className="text-sm text-gray-700">Require high volume confirmation for all signals</label>
              </div>
            </div>
          )}
        </div>

        {/* Signal Requirements */}
        <div className="pb-4">
          <h3 className="text-lg font-semibold mb-4">Signal Requirements</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={filters.require_all_signals_bullish}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  require_all_signals_bullish: e.target.checked,
                  require_all_signals_bearish: e.target.checked ? false : filters.require_all_signals_bearish
                })}
                className="w-4 h-4 mr-2"
              />
              <label className="text-sm text-gray-700">Require all signals to be bullish</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={filters.require_all_signals_bearish}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  require_all_signals_bearish: e.target.checked,
                  require_all_signals_bullish: e.target.checked ? false : filters.require_all_signals_bullish
                })}
                className="w-4 h-4 mr-2"
              />
              <label className="text-sm text-gray-700">Require all signals to be bearish</label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Filters'}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Reset to Defaults
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AlertFilters;

