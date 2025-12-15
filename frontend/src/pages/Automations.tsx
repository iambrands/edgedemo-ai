import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

interface Automation {
  id: number;
  name: string;
  description?: string;
  symbol: string;
  strategy_type: string;
  min_confidence?: number;
  profit_target_percent: number;
  stop_loss_percent?: number;
  max_days_to_hold?: number;
  is_active: boolean;
  is_paused: boolean;
  execution_count: number;
  created_at: string;
}

interface EngineStatus {
  is_running: boolean;
  cycle_count: number;
  last_cycle_time: string | null;
  market_status: {
    is_market_open: boolean;
    is_pre_market: boolean;
    is_after_hours: boolean;
    is_trading_hours: boolean;
  };
}

interface AutomationActivity {
  recent_trades: any[];
  recent_activity: any[];
  automation_stats: Record<number, { name: string; execution_count: number; last_executed: string | null }>;
  total_trades_24h: number;
}

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [activity, setActivity] = useState<AutomationActivity | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [testingTrade, setTestingTrade] = useState<number | null>(null);
  const [startingEngine, setStartingEngine] = useState(false);
  const [stoppingEngine, setStoppingEngine] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    symbol: '',
    strategy_type: 'covered_call',
    min_confidence: 0.30,
    profit_target_percent: 50,
    stop_loss_percent: 25,
    max_days_to_hold: 30,
    // Expiration controls
    preferred_dte: 30,
    min_dte: 21,
    max_dte: 60,
    // Strike controls (via delta)
    target_delta: null as number | null,
    min_delta: null as number | null,
    max_delta: null as number | null,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadAutomations();
    loadEngineStatus();
    loadActivity();
    // Refresh status every 30 seconds
    const statusInterval = setInterval(() => {
      loadEngineStatus();
      loadActivity();
    }, 30000);
    return () => clearInterval(statusInterval);
  }, []);

  const loadAutomations = async () => {
    try {
      const response = await api.get('/automations');
      setAutomations(response.data.automations);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  const loadEngineStatus = async () => {
    try {
      const response = await api.get('/automation_engine/status');
      setEngineStatus(response.data);
    } catch (error: any) {
      console.error('Failed to load engine status:', error);
    }
  };

  const loadActivity = async () => {
    try {
      const response = await api.get('/automation_engine/activity');
      setActivity(response.data);
    } catch (error: any) {
      console.error('Failed to load activity:', error);
    }
  };

  const handleStartEngine = async () => {
    setStartingEngine(true);
    try {
      const response = await api.post('/automation_engine/start');
      toast.success(response.data?.message || 'Automation engine started!');
      // Wait a moment for the engine to initialize, then check status
      setTimeout(() => {
        loadEngineStatus();
      }, 1000);
    } catch (error: any) {
      // Suppress browser extension errors
      if (error.message && error.message.includes('message channel')) {
        // This is a browser extension error, ignore it
        console.warn('Browser extension error (ignored):', error.message);
      } else {
        toast.error(error.response?.data?.error || 'Failed to start engine');
      }
    } finally {
      setStartingEngine(false);
    }
  };

  const handleStopEngine = async () => {
    setStoppingEngine(true);
    try {
      const response = await api.post('/automation_engine/stop');
      toast.success(response.data?.message || 'Automation engine stopped');
      loadEngineStatus();
    } catch (error: any) {
      // Suppress browser extension errors
      if (error.message && error.message.includes('message channel')) {
        // This is a browser extension error, ignore it
        console.warn('Browser extension error (ignored):', error.message);
      } else {
        toast.error(error.response?.data?.error || 'Failed to stop engine');
      }
    } finally {
      setStoppingEngine(false);
    }
  };

  const handleRunCycle = async () => {
    try {
      const response = await api.post('/automation_engine/run-cycle');
      const diagnostics = response.data.diagnostics;
      
      if (diagnostics) {
        let message = `Cycle completed. Found ${diagnostics.opportunities_found} opportunities from ${diagnostics.automations_scanned} automations.`;
        
        // Show details for each automation
        if (diagnostics.automation_details && diagnostics.automation_details.length > 0) {
          const details = diagnostics.automation_details.map((d: any) => {
            let detail = `${d.automation_name} (${d.symbol}): `;
            
            if (d.has_error) {
              detail += `❌ Error - ${d.error_message}`;
            } else if (d.blocking_reasons && d.blocking_reasons.length > 0) {
              detail += `⚠️ ${d.blocking_reasons.join(', ')}`;
              if (d.signal_confidence !== null) {
                detail += ` (Signal: ${(d.signal_confidence * 100).toFixed(1)}%)`;
              }
            } else if (d.signal_recommended && d.options_found) {
              detail += `✅ Ready to trade! (Signal: ${(d.signal_confidence * 100).toFixed(1)}%, Options found)`;
            } else if (d.signal_recommended) {
              detail += `⚠️ Signal OK (${(d.signal_confidence * 100).toFixed(1)}%) but no suitable options found`;
            } else if (d.signal_confidence !== null) {
              detail += `⚠️ Signal confidence ${(d.signal_confidence * 100).toFixed(1)}% < min ${(d.min_confidence * 100).toFixed(1)}%`;
            } else {
              detail += `⚠️ No signal generated`;
            }
            
            return detail;
          }).join('\n');
          
          // Show toast with summary
          if (diagnostics.opportunities_found > 0) {
            toast.success(message, { duration: 5000 });
          } else {
            toast(`Cycle completed. No trades executed.\n\n${details}`, { 
              duration: 8000,
              icon: 'ℹ️'
            });
          }
          
          console.log('Automation Diagnostics:', diagnostics.automation_details);
        } else {
          toast.success(message);
        }
      } else {
        toast.success('Automation cycle completed! Check activity below.');
      }
      
      loadActivity();
      loadAutomations();
      loadEngineStatus();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to run cycle';
      toast.error(errorMsg);
      if (error.response?.data?.traceback) {
        console.error('Cycle Error:', error.response.data.traceback);
      }
    }
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description || '',
      symbol: automation.symbol,
      strategy_type: automation.strategy_type,
      min_confidence: automation.min_confidence || 0.70,
      profit_target_percent: automation.profit_target_percent,
      stop_loss_percent: automation.stop_loss_percent || 25,
      max_days_to_hold: automation.max_days_to_hold || 30,
      preferred_dte: (automation as any).preferred_dte || 30,
      min_dte: (automation as any).min_dte || 21,
      max_dte: (automation as any).max_dte || 60,
      target_delta: (automation as any).target_delta || null,
      min_delta: (automation as any).min_delta || null,
      max_delta: (automation as any).max_delta || null,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/automations/create', formData);
      toast.success('Automation created');
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        symbol: '',
        strategy_type: 'covered_call',
        min_confidence: 0.30,
        profit_target_percent: 50,
        stop_loss_percent: 25,
        max_days_to_hold: 30,
        preferred_dte: 30,
        min_dte: 21,
        max_dte: 60,
        target_delta: null,
        min_delta: null,
        max_delta: null,
      });
      loadAutomations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create automation');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAutomation) return;
    
    try {
      await api.put(`/automations/${editingAutomation.id}`, formData);
      toast.success('Automation updated');
      setEditingAutomation(null);
      setFormData({
        name: '',
        description: '',
        symbol: '',
        strategy_type: 'covered_call',
        min_confidence: 0.30,
        profit_target_percent: 50,
        stop_loss_percent: 25,
        max_days_to_hold: 30,
        preferred_dte: 30,
        min_dte: 21,
        max_dte: 60,
        target_delta: null,
        min_delta: null,
        max_delta: null,
      });
      loadAutomations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update automation');
    }
  };

  const handleToggle = async (id: number, action: string) => {
    try {
      await api.put(`/automations/${id}/toggle`, { action });
      toast.success('Automation updated');
      loadAutomations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update automation');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this automation?')) return;

    try {
      await api.delete(`/automations/${id}`);
      toast.success('Automation deleted');
      loadAutomations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete automation');
    }
  };

  const handleTestTrade = async (automationId: number) => {
    if (!window.confirm('This will force execute a test trade for this automation. Continue?')) return;
    
    setTestingTrade(automationId);
    const loadingToast = toast.loading('Executing test trade... This may take a few seconds.');
    
    try {
      const response = await api.post(`/automation_engine/test-trade/${automationId}`);
      toast.dismiss(loadingToast);
      toast.success(
        `✅ Test trade executed! ${response.data.option?.contract_type?.toUpperCase()} ${response.data.symbol} @ $${response.data.option?.strike} exp ${response.data.option?.expiration}`,
        { duration: 6000 }
      );
      loadActivity();
      loadAutomations();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const errorMsg = error.response?.data?.error || 'Failed to execute test trade';
      const details = error.response?.data?.details;
      const symbol = error.response?.data?.symbol;
      const debug = error.response?.data?.debug;
      
      // Build user-friendly error message
      let userFriendlyMsg = errorMsg;
      if (details && !details.includes('JSON.stringify')) {
        // Only include details if they're not debug info
        userFriendlyMsg += `\n\n${details}`;
      }
      
      // Show a closable toast with better formatting
      const toastId = toast.error(
        <div className="space-y-2">
          <div className="font-semibold">{errorMsg}</div>
          {details && !details.includes('JSON.stringify') && (
            <div className="text-sm">{details}</div>
          )}
          {symbol && (
            <div className="text-sm text-gray-600">Symbol: {symbol}</div>
          )}
          <button
            onClick={() => toast.dismiss(toastId)}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Close
          </button>
        </div>,
        { 
          duration: 15000, // 15 seconds max, but user can close
          style: { maxWidth: '500px' }
        }
      );
      
      // Log full debug info to console
      if (debug) {
        console.error('Test Trade Debug Info:', debug);
      }
      if (error.response?.data?.traceback) {
        console.error('Test Trade Error Traceback:', error.response.data.traceback);
      }
      console.error('Test Trade Error Details:', error.response?.data);
    } finally {
      setTestingTrade(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading automations...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Account Balance Banner */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Paper Trading Balance</p>
            <h2 className="text-3xl font-bold">
              ${user?.paper_balance ? user.paper_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '100,000.00'}
            </h2>
            <p className="text-sm opacity-75 mt-2">Virtual funds • {user?.trading_mode === 'paper' ? 'Paper Trading Mode' : 'Live Trading Mode'}</p>
          </div>
          <div className="text-5xl opacity-20">💰</div>
        </div>
      </div>

      {/* Automation Engine Status */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary">🤖 Automation Engine</h2>
          <div className="flex gap-2">
            {engineStatus?.is_running ? (
              <>
                <button
                  onClick={handleRunCycle}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium transition-colors"
                >
                  Run Cycle Now
                </button>
                <button
                  onClick={handleStopEngine}
                  disabled={stoppingEngine}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  {stoppingEngine ? 'Stopping...' : 'Stop Engine'}
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEngine}
                disabled={startingEngine}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {startingEngine ? 'Starting...' : 'Start Engine'}
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className={`text-sm font-bold ${engineStatus?.is_running ? 'text-green-600' : 'text-gray-600'}`}>
              {engineStatus?.is_running ? '🟢 Running' : '⚪ Stopped'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Cycles Completed</div>
            <div className="text-sm font-bold text-blue-600">
              {engineStatus?.cycle_count || 0}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Market Status</div>
            <div className={`text-sm font-bold ${
              engineStatus?.market_status?.is_market_open 
                ? 'text-green-600' 
                : engineStatus?.market_status?.is_trading_hours 
                ? 'text-yellow-600' 
                : 'text-gray-600'
            }`}>
              {engineStatus?.market_status?.is_market_open 
                ? '🟢 Open' 
                : engineStatus?.market_status?.is_pre_market 
                ? '🟡 Pre-Market' 
                : engineStatus?.market_status?.is_after_hours 
                ? '🟡 After-Hours' 
                : '⚪ Closed'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Last Cycle</div>
            <div className="text-sm font-bold text-gray-700">
              {engineStatus?.last_cycle_time 
                ? new Date(engineStatus.last_cycle_time).toLocaleTimeString()
                : 'Never'}
            </div>
          </div>
        </div>

        {activity && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900">📊 Recent Activity (24h)</h3>
              <span className="text-sm text-blue-700 font-medium">
                {activity.total_trades_24h} trades executed
              </span>
            </div>
            {activity.recent_trades.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activity.recent_trades.slice(0, 5).map((trade: any) => (
                  <div key={trade.id} className="text-sm bg-white rounded p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            trade.action.toLowerCase() === 'buy' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.action.toUpperCase()}
                          </span>
                          <span className="font-medium text-gray-900">
                            {trade.quantity} {trade.symbol}
                            {trade.contract_type && ` ${trade.contract_type.toUpperCase()}`}
                            {trade.strike_price && ` $${trade.strike_price.toFixed(2)}`}
                          </span>
                          <span className="text-gray-600">
                            @ ${trade.price?.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {new Date(trade.trade_date).toLocaleString()}
                        </div>
                        {/* Trade Result Status */}
                        {trade.action.toLowerCase() === 'buy' && (
                          <div className="flex items-center gap-2 text-xs">
                            {trade.created_position ? (
                              <>
                                <span className="text-green-700 font-medium">✓ Position Created</span>
                                {trade.position_unrealized_pnl !== undefined && (
                                  <span className={`font-medium ${
                                    trade.position_unrealized_pnl >= 0 ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    P/L: ${trade.position_unrealized_pnl.toFixed(2)} 
                                    ({trade.position_unrealized_pnl_percent?.toFixed(2)}%)
                                  </span>
                                )}
                                {trade.position_id && (
                                  <button
                                    onClick={() => window.location.href = '/dashboard'}
                                    className="text-primary hover:text-indigo-600 font-medium underline"
                                  >
                                    View Position →
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-500">Position closed or not found</span>
                            )}
                          </div>
                        )}
                        {trade.action.toLowerCase() === 'sell' && trade.closed_position && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-blue-700 font-medium">✓ Position Closed</span>
                            {trade.realized_pnl !== undefined && trade.realized_pnl !== null && (
                              <span className={`font-medium ${
                                trade.realized_pnl >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                Realized P/L: ${trade.realized_pnl.toFixed(2)}
                                {trade.realized_pnl_percent && ` (${trade.realized_pnl_percent.toFixed(2)}%)`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-blue-700">No automation trades in the last 24 hours</p>
            )}
            <div className="mt-3 pt-2 border-t border-blue-200 flex items-center justify-between">
              <p className="text-xs text-blue-600">
                💡 <strong>Note:</strong> These are historical trades. Active positions are shown on the <strong>Dashboard</strong> page.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-indigo-600 transition-colors"
              >
                View All Positions →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How Automations Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Start the Engine</strong> - Click "Start Engine" above to begin automated trading</li>
          <li>• <strong>Engine runs automatically</strong> - Scans every 15 minutes during market hours for opportunities</li>
          <li>• <strong>When a Trade Executes:</strong> A BUY trade creates an open position. A SELL trade closes a position. Check "Recent Activity" above to see what happened.</li>
          <li>• <strong>Check Activity</strong> - See recent trades above. Green "Position Created" means the trade opened a position you can view on Dashboard.</li>
          <li>• <strong>Execution Count</strong> - Shows how many trades each automation has made</li>
          <li>• <strong>View Positions</strong> - All open positions created by automations appear on the <strong>Dashboard</strong> page with current P/L</li>
          <li>• <strong>Test Mode</strong> - Use "Run Cycle Now" to manually trigger a scan without waiting</li>
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-secondary">Automations</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium"
        >
          Create Automation
        </button>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAutomation) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-secondary mb-4">
              {editingAutomation ? 'Edit Automation' : 'Create Automation'}
            </h2>
            <form onSubmit={editingAutomation ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    disabled={!!editingAutomation}
                    required
                  />
                  {editingAutomation && (
                    <p className="text-xs text-gray-500 mt-1">Symbol cannot be changed</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Type</label>
                  <select
                    value={formData.strategy_type}
                    onChange={(e) => setFormData({ ...formData, strategy_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="covered_call">Covered Call</option>
                    <option value="cash_secured_put">Cash Secured Put</option>
                    <option value="long_call">Long Call</option>
                    <option value="long_put">Long Put</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Confidence (0.0 - 1.0)
                    <span className="text-xs text-gray-500 ml-1">Lower = easier to trigger</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={formData.min_confidence}
                    onChange={(e) => setFormData({ ...formData, min_confidence: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default: 0.70 (selective). For testing: 0.30 (easy trigger)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profit Target %</label>
                  <input
                    type="number"
                    value={formData.profit_target_percent}
                    onChange={(e) => setFormData({ ...formData, profit_target_percent: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stop Loss %</label>
                  <input
                    type="number"
                    value={formData.stop_loss_percent}
                    onChange={(e) => setFormData({ ...formData, stop_loss_percent: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Days to Hold</label>
                  <input
                    type="number"
                    value={formData.max_days_to_hold}
                    onChange={(e) => setFormData({ ...formData, max_days_to_hold: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Advanced Options - Expiration & Strike Controls */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-primary mb-2"
                >
                  <span>⚙️ Advanced Options (Expiration & Strike Controls)</span>
                  <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {showAdvanced && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Expiration Date Controls (DTE)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Preferred DTE
                            <span className="text-gray-400 ml-1">(days)</span>
                          </label>
                          <input
                            type="number"
                            value={formData.preferred_dte}
                            onChange={(e) => setFormData({ ...formData, preferred_dte: parseInt(e.target.value) || 30 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                            placeholder="30"
                          />
                          <p className="text-xs text-gray-500 mt-1">Target expiration</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Min DTE
                            <span className="text-gray-400 ml-1">(days)</span>
                          </label>
                          <input
                            type="number"
                            value={formData.min_dte}
                            onChange={(e) => setFormData({ ...formData, min_dte: parseInt(e.target.value) || 21 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                            placeholder="21"
                          />
                          <p className="text-xs text-gray-500 mt-1">Minimum days</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Max DTE
                            <span className="text-gray-400 ml-1">(days)</span>
                          </label>
                          <input
                            type="number"
                            value={formData.max_dte}
                            onChange={(e) => setFormData({ ...formData, max_dte: parseInt(e.target.value) || 60 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                            placeholder="60"
                          />
                          <p className="text-xs text-gray-500 mt-1">Maximum days</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 The automation will find options with expiration dates within this range. For covered calls, 30-45 DTE is common.
                      </p>
                    </div>

                    <div className="border-t border-gray-300 pt-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Strike Price Controls (via Delta)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Target Delta
                            <span className="text-gray-400 ml-1">(optional)</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={formData.target_delta || ''}
                            onChange={(e) => setFormData({ ...formData, target_delta: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                            placeholder="0.30"
                          />
                          <p className="text-xs text-gray-500 mt-1">Ideal delta</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Min Delta
                            <span className="text-gray-400 ml-1">(optional)</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={formData.min_delta || ''}
                            onChange={(e) => setFormData({ ...formData, min_delta: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                            placeholder="0.20"
                          />
                          <p className="text-xs text-gray-500 mt-1">Minimum delta</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Max Delta
                            <span className="text-gray-400 ml-1">(optional)</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={formData.max_delta || ''}
                            onChange={(e) => setFormData({ ...formData, max_delta: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                            placeholder="0.40"
                          />
                          <p className="text-xs text-gray-500 mt-1">Maximum delta</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Delta controls strike selection. For covered calls, 0.30 delta (30-40% OTM) is common. Leave blank to let the system choose.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium"
                >
                  {editingAutomation ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAutomation(null);
                    setShowAdvanced(false);
                    setFormData({
                      name: '',
                      description: '',
                      symbol: '',
                      strategy_type: 'covered_call',
                      min_confidence: 0.30,
                      profit_target_percent: 50,
                      stop_loss_percent: 25,
                      max_days_to_hold: 30,
                      preferred_dte: 30,
                      min_dte: 21,
                      max_dte: 60,
                      target_delta: null,
                      min_delta: null,
                      max_delta: null,
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Automations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {automations.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No automations created yet. Create one to get started!
          </div>
        ) : (
          automations.map((automation) => (
            <div key={automation.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-secondary">{automation.name}</h3>
                  <p className="text-sm text-gray-600">{automation.symbol}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  automation.is_active && !automation.is_paused
                    ? 'bg-success text-white'
                    : automation.is_paused
                    ? 'bg-warning text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {automation.is_paused ? 'Paused' : automation.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              {automation.description && (
                <p className="text-sm text-gray-700 mb-4">{automation.description}</p>
              )}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Strategy:</span>
                  <span className="font-medium">{automation.strategy_type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min Confidence:</span>
                  <span className="font-medium">{(automation.min_confidence || 0.70).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit Target:</span>
                  <span className="font-medium">{automation.profit_target_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Executions:</span>
                  <span className="font-medium">{automation.execution_count}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleEdit(automation)}
                  className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggle(automation.id, automation.is_paused ? 'resume' : 'pause')}
                  className="flex-1 bg-primary text-white px-3 py-2 rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium"
                >
                  {automation.is_paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() => handleTestTrade(automation.id)}
                  disabled={testingTrade === automation.id}
                  className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    testingTrade === automation.id
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                  title="Force execute a test trade (bypasses some checks for testing)"
                >
                  {testingTrade === automation.id ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Testing...
                    </span>
                  ) : (
                    '🧪 Test Trade'
                  )}
                </button>
                <button
                  onClick={() => handleDelete(automation.id)}
                  className="bg-error text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Automations;

