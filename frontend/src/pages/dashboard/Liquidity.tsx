import { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Check,
  X,
  Zap,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import {
  listWithdrawalRequests,
  createWithdrawalRequest,
  approveWithdrawal,
  cancelWithdrawal,
  type WithdrawalRequest,
  type WithdrawalPlan,
  type WithdrawalRequestCreate,
} from '../../services/liquidityApi';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  executing: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export default function Liquidity() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<WithdrawalPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    client_id: string;
    amount: string;
    purpose: string;
    priority: string;
    lot_selection: string;
  }>({
    client_id: '',
    amount: '',
    purpose: '',
    priority: 'normal',
    lot_selection: 'tax_opt',
  });

  useEffect(() => {
    loadRequests();
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCreateModal) setShowCreateModal(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showCreateModal]);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWithdrawalRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load requests', err);
      setError('Failed to load withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const payload: WithdrawalRequestCreate = {
        client_id: formData.client_id,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose || undefined,
        priority: formData.priority,
        lot_selection: formData.lot_selection,
      };

      const newReq = await createWithdrawalRequest(payload);
      setRequests([newReq, ...requests]);
      setSelectedRequest(newReq);
      setSelectedPlan(
        (newReq.plans ?? []).find((p) => p.is_recommended) || (newReq.plans ?? [])[0] || null
      );
      setShowCreateModal(false);
      setFormData({
        client_id: '',
        amount: '',
        purpose: '',
        priority: 'normal',
        lot_selection: 'tax_opt',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create request';
      alert(message);
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (requestId: string, planId?: string) => {
    try {
      await approveWithdrawal(requestId, planId);
      await loadRequests();
      setSelectedRequest(null);
      setSelectedPlan(null);
    } catch (err) {
      console.error('Failed to approve', err);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm('Cancel this withdrawal request?')) return;
    try {
      await cancelWithdrawal(requestId);
      await loadRequests();
      setSelectedRequest(null);
      setSelectedPlan(null);
    } catch (err) {
      console.error('Failed to cancel', err);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Liquidity Optimization
          </h1>
          <p className="text-slate-500">
            Tax-efficient withdrawal planning and execution
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadRequests}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <DollarSign size={20} />
            New Withdrawal
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============================================= */}
        {/* REQUEST LIST (Left Panel)                     */}
        {/* ============================================= */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-medium text-slate-900">Withdrawal Requests</h2>

          {requests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-slate-500" />
              <p className="mt-2 text-slate-500">No withdrawal requests yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Create your first request
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {requests.map((req) => (
                <button
                  key={req.id}
                  onClick={() => {
                    setSelectedRequest(req);
                    setSelectedPlan(
                      (req.plans ?? []).find((p) => p.is_recommended) ||
                        (req.plans ?? [])[0] ||
                        null
                    );
                  }}
                  className={`w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all ${
                    selectedRequest?.id === req.id
                      ? 'ring-2 ring-blue-500 border-blue-200'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(req.requested_amount)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {req.purpose || 'Withdrawal'}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded capitalize ${
                        STATUS_COLORS[req.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span>{PRIORITY_LABELS[req.priority] || req.priority}</span>
                    <span>·</span>
                    <span>{(req.plans ?? []).length} plan{(req.plans ?? []).length !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{formatDate(req.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ============================================= */}
        {/* PLAN SELECTION (Middle Panel)                 */}
        {/* ============================================= */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-medium text-slate-900">
            {selectedRequest ? 'Withdrawal Plans' : 'Select a request'}
          </h2>

          {selectedRequest ? (
            <div className="space-y-3">
              {(selectedRequest.plans ?? []).length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-slate-500">
                  No plans generated yet
                </div>
              ) : (
                (selectedRequest.plans ?? []).map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'ring-2 ring-blue-500 border-blue-200'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{plan.plan_name}</p>
                        {plan.is_recommended && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                        {plan.ai_generated && (
                          <Zap size={14} className="text-purple-500" />
                        )}
                      </div>
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500">Tax Cost</p>
                        <p className="font-medium text-red-600">
                          {formatCurrency(plan.estimated_tax_cost || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Net Gains</p>
                        {(() => {
                          const net =
                            plan.estimated_long_term_gains +
                            plan.estimated_short_term_gains -
                            plan.estimated_long_term_losses -
                            plan.estimated_short_term_losses;
                          return (
                            <p
                              className={`font-medium ${
                                net >= 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {net >= 0 ? '+' : ''}
                              {formatCurrency(net)}
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      {plan.line_items.length} position{plan.line_items.length !== 1 ? 's' : ''} to liquidate
                    </div>
                  </button>
                ))
              )}

              {/* Actions */}
              {selectedRequest.status === 'draft' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() =>
                      handleApprove(selectedRequest.id, selectedPlan?.id)
                    }
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button
                    onClick={() => handleCancel(selectedRequest.id)}
                    className="flex items-center justify-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300"
                  >
                    <X size={16} /> Cancel
                  </button>
                </div>
              )}

              {selectedRequest.status === 'approved' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  <Check size={14} className="inline mr-1" />
                  Approved — ready for execution via broker integration.
                </div>
              )}

              {selectedRequest.status === 'completed' && (
                <div className="bg-emerald-50 border border-green-200 rounded-lg p-3 text-sm text-emerald-700">
                  <Check size={14} className="inline mr-1" />
                  Completed on{' '}
                  {selectedRequest.completed_at
                    ? formatDate(selectedRequest.completed_at)
                    : 'N/A'}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-slate-500">
              <DollarSign className="mx-auto h-10 w-10 text-slate-400 mb-2" />
              Select a request to view plans
            </div>
          )}
        </div>

        {/* ============================================= */}
        {/* PLAN DETAILS (Right Panel)                   */}
        {/* ============================================= */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-medium text-slate-900">Plan Details</h2>

          {selectedPlan ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              {/* AI Reasoning */}
              {selectedPlan.ai_reasoning && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-purple-800 flex items-center gap-1">
                    <Zap size={14} /> AI Analysis
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    {selectedPlan.ai_reasoning}
                  </p>
                </div>
              )}

              {/* Tax Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <TrendingUp size={12} className="text-emerald-500" />
                    ST Gains
                  </p>
                  <p className="font-medium text-emerald-600">
                    {formatCurrency(selectedPlan.estimated_short_term_gains)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <TrendingUp size={12} className="text-emerald-500" />
                    LT Gains
                  </p>
                  <p className="font-medium text-emerald-600">
                    {formatCurrency(selectedPlan.estimated_long_term_gains)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <TrendingDown size={12} className="text-red-500" />
                    ST Losses
                  </p>
                  <p className="font-medium text-red-600">
                    {formatCurrency(selectedPlan.estimated_short_term_losses)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <TrendingDown size={12} className="text-red-500" />
                    LT Losses
                  </p>
                  <p className="font-medium text-red-600">
                    {formatCurrency(selectedPlan.estimated_long_term_losses)}
                  </p>
                </div>
              </div>

              {/* Estimated Tax Cost */}
              {selectedPlan.estimated_tax_cost != null && (
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-orange-600 uppercase tracking-wide">
                    Estimated Tax Impact
                  </p>
                  <p className="text-lg font-bold text-orange-700">
                    {formatCurrency(selectedPlan.estimated_tax_cost)}
                  </p>
                </div>
              )}

              {/* Line Items */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Positions to Liquidate
                </p>
                {selectedPlan.line_items.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No line items — AI optimization pending
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedPlan.line_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded"
                      >
                        <div>
                          <p className="font-medium">{item.symbol}</p>
                          <p className="text-xs text-slate-500">
                            {item.shares_to_sell.toFixed(2)} shares
                            {item.is_short_term && (
                              <span className="ml-1 text-orange-600 font-medium">
                                (ST)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(item.estimated_proceeds)}
                          </p>
                          {item.estimated_gain_loss != null && (
                            <p
                              className={`text-xs ${
                                item.estimated_gain_loss >= 0
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {item.estimated_gain_loss >= 0 ? '+' : ''}
                              {formatCurrency(item.estimated_gain_loss)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-slate-500">
              Select a plan to view details
            </div>
          )}
        </div>
      </div>

      {/* ============================================= */}
      {/* CREATE MODAL                                  */}
      {/* ============================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreate}
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <h2 className="text-xl font-semibold">New Withdrawal Request</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client ID
              </label>
              <input
                type="text"
                required
                value={formData.client_id}
                onChange={(e) =>
                  setFormData({ ...formData, client_id: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Client UUID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10,000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Purpose (optional)
              </label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Home purchase, RMD, Education"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lot Selection
                </label>
                <select
                  value={formData.lot_selection}
                  onChange={(e) =>
                    setFormData({ ...formData, lot_selection: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="tax_opt">AI Tax Optimized</option>
                  <option value="hifo">HIFO (Highest Cost)</option>
                  <option value="fifo">FIFO</option>
                  <option value="lifo">LIFO</option>
                  <option value="lofo">LOFO (Lowest Cost)</option>
                  <option value="spec_id">Specific ID</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <Zap size={14} className="inline mr-1" />
                AI will generate multiple withdrawal plans optimized for tax
                efficiency, allocation preservation, and loss harvesting.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Generating Plans...' : 'Create Request'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
