import { useState, useEffect } from 'react';
import {
  Users, AlertTriangle, CheckCircle, Info, ChevronDown,
  ChevronUp, Loader2, Send, X, Clock, User,
} from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import { getBeneficiaries, submitBeneficiaryUpdateRequest } from '../../services/portalApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Beneficiary {
  name: string;
  relationship: string;
  percentage: number;
  dob?: string;
}

interface Account {
  account_id: string;
  account_name: string;
  account_type: string;
  primary_beneficiaries: Beneficiary[];
  contingent_beneficiaries: Beneficiary[];
  last_updated: string;
  needs_review?: boolean;
  review_reason?: string | null;
}

interface PendingRequest {
  id: string;
  account_id: string;
  change_type: string;
  description: string;
  status: string;
  submitted_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const CHANGE_TYPES = [
  { value: 'add', label: 'Add Beneficiary' },
  { value: 'remove', label: 'Remove Beneficiary' },
  { value: 'modify', label: 'Modify Existing' },
  { value: 'review', label: 'Full Review' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PortalBeneficiaries() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedInfo, setExpandedInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal form state
  const [formAccountId, setFormAccountId] = useState('');
  const [formChangeType, setFormChangeType] = useState('review');
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    getBeneficiaries()
      .then((d) => {
        setAccounts(d.accounts || []);
        setPendingRequests(d.pending_requests || []);
      })
      .catch((e) => console.error('Failed to load beneficiaries', e))
      .finally(() => setLoading(false));
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) setShowModal(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  const handleSubmit = async () => {
    if (!formAccountId || !formDescription.trim()) return;
    setSubmitting(true);
    try {
      const res = await submitBeneficiaryUpdateRequest({
        account_id: formAccountId,
        change_type: formChangeType,
        description: formDescription,
      });
      setSuccessMsg(res.message || 'Request submitted successfully.');
      setPendingRequests((prev) => [
        { id: res.request_id, account_id: formAccountId, change_type: formChangeType, description: formDescription, status: 'submitted', submitted_at: new Date().toISOString() },
        ...prev,
      ]);
      setShowModal(false);
      setFormAccountId('');
      setFormChangeType('review');
      setFormDescription('');
    } catch {
      setSuccessMsg(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PortalNav />
        <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      </div>
    );
  }

  const needsReview = accounts.filter((a) => a.needs_review);
  const upToDate = accounts.filter((a) => !a.needs_review);

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Beneficiaries</h1>
            <p className="text-slate-500 text-sm">Manage designated beneficiaries for your accounts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Send className="h-4 w-4" /> Request Update
          </button>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
              <ul className="mt-2 space-y-1 text-xs text-emerald-700 list-disc list-inside">
                <li>Advisor review within 2 business days</li>
                <li>You may need to sign updated forms</li>
                <li>Changes effective after processing</li>
              </ul>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Keep your beneficiary designations up to date</p>
              <p className="text-sm text-blue-700 mt-1">
                Beneficiary designations on retirement accounts and life insurance often override your will.
                Review them after major life events like marriage, divorce, birth, or death.
              </p>
              <button
                onClick={() => setExpandedInfo(!expandedInfo)}
                className="flex items-center gap-1 text-xs text-blue-600 font-medium mt-2 hover:text-blue-800"
              >
                {expandedInfo ? 'Less' : 'Why beneficiaries matter'}
                {expandedInfo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {expandedInfo && (
                <div className="mt-3 space-y-2 text-xs text-blue-700 bg-blue-100/50 rounded-lg p-3">
                  <p><strong>Primary beneficiaries</strong> receive assets first. If all primary beneficiaries predecease you, contingent beneficiaries receive the assets.</p>
                  <p><strong>Retirement accounts</strong> (IRA, 401k) pass by beneficiary designation, not through your will or trust.</p>
                  <p><strong>Review annually</strong> and after any life event — marriage, divorce, new child, or death of a beneficiary.</p>
                  <p><strong>Changes require advisor coordination</strong> to ensure proper documentation and custodian processing.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accounts Needing Review */}
        {needsReview.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Needs Review ({needsReview.length})
            </h2>
            <div className="space-y-4">
              {needsReview.map((acct) => (
                <AccountCard key={acct.account_id} account={acct} onRequestUpdate={() => { setFormAccountId(acct.account_id); setShowModal(true); }} />
              ))}
            </div>
          </div>
        )}

        {/* Up-to-Date Accounts */}
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" /> Up to Date ({upToDate.length})
          </h2>
          <div className="space-y-4">
            {upToDate.map((acct) => (
              <AccountCard key={acct.account_id} account={acct} onRequestUpdate={() => { setFormAccountId(acct.account_id); setShowModal(true); }} />
            ))}
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pending Requests ({pendingRequests.length})
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {pendingRequests.map((r) => (
                <div key={r.id} className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-amber-50 rounded-lg"><Clock className="h-4 w-4 text-amber-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {CHANGE_TYPES.find((t) => t.value === r.change_type)?.label || r.change_type}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{r.description}</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full capitalize">{r.status}</span>
                  <span className="text-xs text-slate-400">{fmtDate(r.submitted_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Request Update Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Request Beneficiary Update</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
                <select
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select account...</option>
                  {accounts.map((a) => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type of Change</label>
                <select
                  value={formChangeType}
                  onChange={(e) => setFormChangeType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CHANGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the changes you'd like to make..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!formAccountId || !formDescription.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Account Card ─────────────────────────────────────────────────── */

function AccountCard({ account, onRequestUpdate }: { account: Account; onRequestUpdate: () => void }) {
  const primaryTotal = account.primary_beneficiaries.reduce((s, b) => s + b.percentage, 0);
  const contingentTotal = account.contingent_beneficiaries.reduce((s, b) => s + b.percentage, 0);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
      account.needs_review ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${account.needs_review ? 'bg-amber-50' : 'bg-blue-50'}`}>
            <Users className={`h-4 w-4 ${account.needs_review ? 'text-amber-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">{account.account_name}</p>
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">{account.account_type}</span>
            </div>
            <p className="text-xs text-slate-500">Last updated: {fmtDate(account.last_updated)}</p>
          </div>
        </div>
        <button
          onClick={onRequestUpdate}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Request Change
        </button>
      </div>

      {/* Review Warning */}
      {account.needs_review && account.review_reason && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs font-medium text-amber-800">{account.review_reason}</p>
        </div>
      )}

      {/* Beneficiaries */}
      <div className="p-4 space-y-4">
        {/* Primary */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Beneficiaries</h4>
            {primaryTotal !== 100 && primaryTotal > 0 && (
              <span className="text-xs text-red-600 font-medium">Total: {primaryTotal}% (should be 100%)</span>
            )}
          </div>
          {account.primary_beneficiaries.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No primary beneficiaries designated</p>
          ) : (
            <div className="space-y-2">
              {account.primary_beneficiaries.map((b, i) => (
                <BeneficiaryRow key={i} beneficiary={b} />
              ))}
            </div>
          )}
        </div>

        {/* Contingent */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contingent Beneficiaries</h4>
            {contingentTotal !== 100 && account.contingent_beneficiaries.length > 0 && (
              <span className="text-xs text-red-600 font-medium">Total: {contingentTotal}% (should be 100%)</span>
            )}
          </div>
          {account.contingent_beneficiaries.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No contingent beneficiaries designated</p>
          ) : (
            <div className="space-y-2">
              {account.contingent_beneficiaries.map((b, i) => (
                <BeneficiaryRow key={i} beneficiary={b} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Beneficiary Row ──────────────────────────────────────────────── */

function BeneficiaryRow({ beneficiary }: { beneficiary: Beneficiary }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <User className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{beneficiary.name}</p>
        <p className="text-xs text-slate-500">{beneficiary.relationship}{beneficiary.dob ? ` \u00b7 DOB: ${fmtDate(beneficiary.dob)}` : ''}</p>
      </div>
      <span className="text-sm font-semibold text-slate-900">{beneficiary.percentage}%</span>
    </div>
  );
}
