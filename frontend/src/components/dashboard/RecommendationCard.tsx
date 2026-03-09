import { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge, type BadgeProps } from '../ui/Badge';
import { useToast } from '../../contexts/ToastContext';

interface TaxImpact {
  estimated_gain_loss: number;
  tax_consequence: string;
  estimated_tax_dollars: number;
}

export interface Recommendation {
  rec_id: string;
  rec_type: string;
  symbol: string;
  quantity: number;
  target_weight: number;
  rationale: string;
  confidence: number;
  tax_impact: TaxImpact;
  compliance_status: string;
  compliance_flags: string[];
  expires_at: string;
  order_preview: Record<string, unknown>;
}

interface Props {
  recommendation: Recommendation;
  onAction?: () => void;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('edgeai_token') || sessionStorage.getItem('edgeai_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const typeBadgeVariant: Record<string, BadgeProps['variant']> = {
  BUY: 'green',
  SELL: 'red',
  TLH: 'amber',
  REBALANCE: 'blue',
  HOLD_OVERRIDE: 'gray',
};

export function RecommendationCard({ recommendation: rec, onAction }: Props) {
  const toast = useToast();
  const [showOrder, setShowOrder] = useState(false);
  const [orderQty, setOrderQty] = useState(rec.quantity);
  const [orderType, setOrderType] = useState((rec.order_preview?.type as string) || 'market');
  const [submitting, setSubmitting] = useState(false);

  const isBlocked = rec.compliance_status === 'BLOCKED';
  const isWarning = rec.compliance_status === 'WARNING';

  const complianceIcon = isBlocked
    ? <XCircle className="w-4 h-4 text-red-500" />
    : isWarning
    ? <AlertTriangle className="w-4 h-4 text-amber-500" />
    : <CheckCircle className="w-4 h-4 text-emerald-500" />;

  const expiresIn = () => {
    const diff = new Date(rec.expires_at).getTime() - Date.now();
    if (diff < 0) return 'Expired';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  const apiBase = import.meta.env.VITE_API_URL || '';

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/recommendations/${rec.rec_id}/submit-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ quantity: orderQty, order_type: orderType }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Order submitted: ${data.order_id || 'confirmed'}`);
        setShowOrder(false);
        onAction?.();
      } else {
        toast.error('Order submission failed');
      }
    } catch {
      toast.error('Order submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnooze = async () => {
    try {
      await fetch(`${apiBase}/api/v1/recommendations/${rec.rec_id}/snooze`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      toast.success('Snoozed for 24 hours');
      onAction?.();
    } catch {
      toast.error('Snooze failed');
    }
  };

  const handleDismiss = async () => {
    try {
      await fetch(`${apiBase}/api/v1/recommendations/${rec.rec_id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ reason: 'Dismissed by advisor' }),
      });
      toast.success('Recommendation dismissed');
      onAction?.();
    } catch {
      toast.error('Dismiss failed');
    }
  };

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{rec.symbol}</span>
            <Badge variant={typeBadgeVariant[rec.rec_type] || 'gray'}>{rec.rec_type}</Badge>
            <span className="text-sm text-slate-500">{Math.round(rec.confidence * 100)}% confidence</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {expiresIn()}
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-3 line-clamp-2">{rec.rationale}</p>

        {rec.tax_impact.tax_consequence !== 'neutral' && (
          <div className={`text-sm mb-2 ${rec.tax_impact.estimated_gain_loss < 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {rec.tax_impact.estimated_gain_loss < 0
              ? `Est. $${Math.abs(rec.tax_impact.estimated_tax_dollars).toLocaleString()} tax savings`
              : `Est. $${rec.tax_impact.estimated_tax_dollars.toLocaleString()} tax consequence`}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          {complianceIcon}
          {isBlocked && <span className="text-xs text-red-600">Blocked — {rec.compliance_flags[0]}</span>}
          {isWarning && (
            <details className="text-xs text-amber-600">
              <summary className="cursor-pointer">Warning — {rec.compliance_flags.length} flag(s)</summary>
              <ul className="mt-1 ml-2 space-y-0.5">
                {rec.compliance_flags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </details>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => setShowOrder(true)}
            disabled={isBlocked}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg font-medium ${
              isBlocked
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
            aria-label={`Accept recommendation for ${rec.symbol}`}
          >
            Accept & Preview <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={handleSnooze}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
            aria-label={`Snooze recommendation for ${rec.symbol}`}
          >
            Snooze
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
            aria-label={`Dismiss recommendation for ${rec.symbol}`}
          >
            Dismiss
          </button>
        </div>
      </Card>

      {showOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Preview</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Symbol</span>
                <span className="font-medium">{rec.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Side</span>
                <span className="font-medium">{(rec.order_preview?.side as string)?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-500">Quantity</span>
                <input
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-right"
                />
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-500">Order Type</span>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-sm"
                >
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                </select>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium">Day</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Commission</span>
                <span className="font-medium text-emerald-600">$0.00</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowOrder(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
