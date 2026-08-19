import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, Clock, UserCheck, XCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { b2cApi, type AdvisorConnectionStatus } from '../../services/b2cApi';

interface MarketplaceState {
  advisorId?: string;
  advisorName?: string;
  advisorFirm?: string;
}

const ASSET_RANGES = [
  { value: 'under_50k', label: 'Under $50K' },
  { value: '50k_250k', label: '$50K – $250K' },
  { value: '250k_500k', label: '$250K – $500K' },
  { value: '500k_1m', label: '$500K – $1M' },
  { value: '1m_5m', label: '$1M – $5M' },
  { value: 'over_5m', label: 'Over $5M' },
];

const GOALS = [
  { value: 'retirement', label: 'Retirement planning' },
  { value: 'wealth_building', label: 'Wealth building' },
  { value: 'college_savings', label: 'College savings' },
  { value: 'estate_planning', label: 'Estate planning' },
  { value: 'tax_optimization', label: 'Tax optimization' },
  { value: 'other', label: 'Other' },
];

const MEETING_FORMATS = [
  { value: 'virtual', label: 'Virtual (video call)' },
  { value: 'in_person', label: 'In person' },
  { value: 'no_preference', label: 'No preference' },
];

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', label: 'Request pending — an advisor will reach out within 1-2 business days.' },
  matched: { icon: UserCheck, color: 'text-blue-600', label: 'Matched! Your advisor will contact you shortly.' },
  accepted: { icon: CheckCircle, color: 'text-green-600', label: 'Connected with an advisor.' },
  declined: { icon: XCircle, color: 'text-red-600', label: 'Request declined. You can submit a new one.' },
  cancelled: { icon: XCircle, color: 'text-slate-500', label: 'Request cancelled.' },
};

export default function ConnectAdvisor() {
  const location = useLocation();
  const fromMarketplace = location.state as MarketplaceState | null;
  const [status, setStatus] = useState<AdvisorConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [assetsRange, setAssetsRange] = useState('');
  const [goal, setGoal] = useState('');
  const [meetingFormat, setMeetingFormat] = useState('no_preference');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    b2cApi.getAdvisorStatus()
      .then(setStatus)
      .catch(() => setStatus({ status: 'none', request_id: null, matched_advisor_id: null, matched_at: null }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await b2cApi.connectAdvisor({
        investable_assets_range: assetsRange || undefined,
        primary_goal: goal || undefined,
        preferred_meeting_format: meetingFormat || undefined,
        notes: notes || undefined,
      });
      const updated = await b2cApi.getAdvisorStatus();
      setStatus(updated);
      setSuccess('Your request has been submitted. An advisor will reach out within 1-2 business days.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    setError('');
    try {
      await b2cApi.cancelAdvisorConnection();
      setStatus({ status: 'cancelled', request_id: status?.request_id ?? null, matched_advisor_id: null, matched_at: null });
      setSuccess('Request cancelled.');
    } catch {
      setError('Could not cancel request.');
    } finally {
      setCancelling(false);
    }
  };

  const activeStatus = status?.status;
  const hasActive = activeStatus && ['pending', 'matched', 'accepted'].includes(activeStatus);
  const cfg = activeStatus ? STATUS_CONFIG[activeStatus] : null;

  return (
    <div>
      <div className="mb-6">
        {fromMarketplace?.advisorName ? (
          <>
            <Link
              to="/client/advisors"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to advisor directory
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Connect with an advisor</h1>
            <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2">
              <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Requesting to connect with{' '}
                <span className="font-semibold">{fromMarketplace.advisorName}</span>
                {fromMarketplace.advisorFirm && (
                  <span className="text-blue-500"> · {fromMarketplace.advisorFirm}</span>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Connect with an advisor</h1>
            <p className="text-sm text-slate-600 mt-1">
              Request a match with a Firmum-vetted advisor. Your data stays private until you approve
              the connection.
            </p>
          </>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current status banner */}
          {cfg && activeStatus !== 'none' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-start gap-4">
              <cfg.icon className={`h-6 w-6 flex-shrink-0 mt-0.5 ${cfg.color}`} />
              <div className="flex-1">
                <p className="font-medium text-slate-800 capitalize">{activeStatus}</p>
                <p className="text-sm text-slate-500 mt-1">{cfg.label}</p>
              </div>
              {activeStatus === 'pending' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling…' : 'Cancel request'}
                </button>
              )}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              {success}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Request form — only show if no active request */}
          {!hasActive && (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
              <h2 className="text-lg font-semibold text-slate-800">Tell us about yourself</h2>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Investable assets</label>
                <select
                  value={assetsRange}
                  onChange={e => setAssetsRange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a range</option>
                  {ASSET_RANGES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Primary goal</label>
                <select
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a goal</option>
                  {GOALS.map(g => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Preferred meeting format</label>
                <div className="flex gap-3 flex-wrap">
                  {MEETING_FORMATS.map(f => (
                    <label key={f.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="meetingFormat"
                        value={f.value}
                        checked={meetingFormat === f.value}
                        onChange={() => setMeetingFormat(f.value)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-slate-700">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Additional notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Anything else the advisor should know?"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Request advisor match'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
