import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, UserPlus, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';

interface ConnectionRequest {
  id: string;
  user_id: string;
  user_email: string | null;
  investable_assets_range: string | null;
  primary_goal: string | null;
  preferred_meeting_format: string | null;
  notes: string | null;
  status: string;
  created_at: string | null;
}

const ASSET_LABELS: Record<string, string> = {
  under_50k: 'Under $50K',
  '50k_250k': '$50K – $250K',
  '250k_500k': '$250K – $500K',
  '500k_1m': '$500K – $1M',
  '1m_5m': '$1M – $5M',
  over_5m: 'Over $5M',
};

const GOAL_LABELS: Record<string, string> = {
  retirement: 'Retirement',
  wealth_building: 'Wealth Building',
  college_savings: 'College Savings',
  estate_planning: 'Estate Planning',
  tax_optimization: 'Tax Optimization',
  other: 'Other',
};

const FORMAT_LABELS: Record<string, string> = {
  virtual: 'Virtual',
  in_person: 'In-Person',
  no_preference: 'No Preference',
};

function getAuthHeader(): Record<string, string> {
  const token =
    localStorage.getItem('edgeai_token') ?? sessionStorage.getItem('edgeai_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchRequests(status: string): Promise<ConnectionRequest[]> {
  const res = await fetch(
    `/api/v1/ria/connections?status=${encodeURIComponent(status)}`,
    { headers: { ...getAuthHeader() } },
  );
  if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
  return res.json();
}

async function actionRequest(id: string, action: 'accept' | 'decline', reason?: string) {
  const body = action === 'decline' && reason ? JSON.stringify({ decline_reason: reason }) : '{}';
  const res = await fetch(`/api/v1/ria/connections/${id}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `Failed: ${res.status}`);
  }
  return res.json();
}

const STATUS_TABS = ['pending', 'matched', 'declined'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export function ConnectionRequests() {
  const [tab, setTab] = useState<StatusTab>('pending');
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRequests(tab);
      setRequests(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (id: string) => {
    setActioning(id);
    try {
      await actionRequest(id, 'accept');
      toast.success('Request accepted — client will be notified.');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActioning(null);
    }
  };

  const handleDecline = async () => {
    if (!declineTarget) return;
    setActioning(declineTarget);
    try {
      await actionRequest(declineTarget, 'decline', declineReason.trim() || undefined);
      toast.success('Request declined.');
      setDeclineTarget(null);
      setDeclineReason('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Connection Requests"
        subtitle="B2C users requesting an advisor match"
        actions={
          <button
            onClick={load}
            className="text-sm text-slate-500 hover:text-slate-900 underline"
          >
            Refresh
          </button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg border-b-2 transition-colors ${
              tab === s
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">
          Loading…
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-10 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-slate-500 text-sm">No {tab} connection requests.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <UserPlus className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="font-medium text-slate-900 text-sm truncate">
                      {req.user_email ?? req.user_id}
                    </span>
                    <Badge
                      variant={
                        req.status === 'matched'
                          ? 'green'
                          : req.status === 'declined'
                          ? 'red'
                          : 'blue'
                      }
                      size="sm"
                    >
                      {req.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-2 text-xs text-slate-600">
                    {req.investable_assets_range && (
                      <span>
                        <span className="text-slate-400">Assets: </span>
                        {ASSET_LABELS[req.investable_assets_range] ?? req.investable_assets_range}
                      </span>
                    )}
                    {req.primary_goal && (
                      <span>
                        <span className="text-slate-400">Goal: </span>
                        {GOAL_LABELS[req.primary_goal] ?? req.primary_goal}
                      </span>
                    )}
                    {req.preferred_meeting_format && (
                      <span>
                        <span className="text-slate-400">Format: </span>
                        {FORMAT_LABELS[req.preferred_meeting_format] ?? req.preferred_meeting_format}
                      </span>
                    )}
                    {req.created_at && (
                      <span className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400">Submitted: </span>
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {req.notes && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      &ldquo;{req.notes}&rdquo;
                    </p>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(req.id)}
                      disabled={actioning === req.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                    >
                      <CheckCircle size={14} />
                      {actioning === req.id ? 'Accepting…' : 'Accept'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { setDeclineTarget(req.id); setDeclineReason(''); }}
                      disabled={actioning === req.id}
                      className="!text-red-600 !border-red-200 hover:!bg-red-50 flex items-center gap-1"
                    >
                      <XCircle size={14} />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Decline modal */}
      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Decline Request</h3>
            <p className="text-sm text-slate-500 mb-4">
              Optionally provide a reason for the client.
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Not a good fit at this time (optional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeclineTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDecline}
                disabled={!!actioning}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actioning ? 'Declining…' : 'Confirm Decline'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
