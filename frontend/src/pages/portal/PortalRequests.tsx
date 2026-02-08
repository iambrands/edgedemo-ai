import { useState, useEffect } from 'react';
import {
  Banknote, ArrowRightLeft, MapPin, FileText, PlusCircle, Users,
  HelpCircle, Loader2, ChevronRight, Check,
} from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import { getRequestTypes, getRequests, submitRequest } from '../../services/portalApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReqType { id: string; name: string; description: string; icon: string }
interface ReqUpdate { date: string; message: string; status: string }
interface Req {
  id: string; type: string; type_name: string; status: string;
  submitted_at: string; details: Record<string, any>;
  notes: string; updates: ReqUpdate[];
}

const ICONS: Record<string, React.ElementType> = {
  banknote: Banknote, 'arrow-right-left': ArrowRightLeft, 'map-pin': MapPin,
  'file-text': FileText, 'plus-circle': PlusCircle, users: Users, 'help-circle': HelpCircle,
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  in_review: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PortalRequests() {
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<ReqType[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selType, setSelType] = useState<ReqType | null>(null);
  const [selReq, setSelReq] = useState<Req | null>(null);

  // Form fields
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ACH Transfer');
  const [address, setAddress] = useState('');
  const [docType, setDocType] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getRequestTypes(), getRequests()])
      .then(([t, r]) => { setTypes(t.types || []); setRequests(r.requests || []); })
      .catch((e) => console.error('requests load failed', e))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => { setAccount(''); setAmount(''); setMethod('ACH Transfer'); setAddress(''); setDocType(''); setNotes(''); setSelType(null); };

  const handleSubmit = async () => {
    if (!selType) return;
    setSubmitting(true);
    try {
      const details: Record<string, any> = {};
      if (selType.id === 'withdrawal' || selType.id === 'contribution') {
        details.account = account;
        details.amount = parseFloat(amount) || 0;
        details.method = method;
      } else if (selType.id === 'transfer') {
        details.from_account = account;
        details.amount = parseFloat(amount) || 0;
      } else if (selType.id === 'address_change') {
        details.new_address = address;
      } else if (selType.id === 'document_request') {
        details.document_type = docType;
      } else if (selType.id === 'beneficiary_change') {
        details.account = account;
      }
      const res = await submitRequest({ type: selType.id, details, notes });
      if (res.request) setRequests((prev) => [res.request, ...prev]);
      setView('list');
      resetForm();
    } catch (e) {
      console.error('submit failed', e);
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalNav />
        <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNav />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
            <p className="text-gray-500 text-sm">Submit and track service requests</p>
          </div>
          {view === 'list' && (
            <button onClick={() => setView('new')} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              <PlusCircle className="h-4 w-4" /> New Request
            </button>
          )}
          {view !== 'list' && (
            <button onClick={() => { setView('list'); resetForm(); setSelReq(null); }} className="text-sm text-gray-500 hover:text-gray-700">← Back to requests</button>
          )}
        </div>

        {/* ── LIST ────────────────────────────────────── */}
        {view === 'list' && (
          <>
            {requests.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No requests yet</p>
                <button onClick={() => setView('new')} className="mt-3 text-sm text-blue-600 hover:underline">Submit your first request →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => {
                  const Icon = ICONS[types.find((t) => t.id === r.type)?.icon || 'help-circle'] || HelpCircle;
                  return (
                    <button
                      key={r.id}
                      onClick={() => { setSelReq(r); setView('detail'); }}
                      className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:border-blue-200 transition-all text-left"
                    >
                      <div className="p-3 bg-blue-50 rounded-xl"><Icon className="h-5 w-5 text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{r.type_name}</p>
                        <p className="text-sm text-gray-500">{fmtDate(r.submitted_at)}{r.details.amount ? ` · $${r.details.amount.toLocaleString()}` : ''}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── NEW REQUEST — Type Selection ────────────── */}
        {view === 'new' && !selType && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">What do you need?</h2>
            <p className="text-sm text-gray-500 mb-5">Select a request type</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {types.map((t) => {
                const Icon = ICONS[t.icon] || HelpCircle;
                return (
                  <button key={t.id} onClick={() => setSelType(t)} className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left">
                    <div className="p-2 bg-blue-50 rounded-lg"><Icon className="h-5 w-5 text-blue-600" /></div>
                    <div>
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-sm text-gray-500">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── NEW REQUEST — Form ──────────────────────── */}
        {view === 'new' && selType && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selType.name}</h2>
              <p className="text-sm text-gray-500">{selType.description}</p>
            </div>

            {/* Conditional fields */}
            {(selType.id === 'withdrawal' || selType.id === 'contribution' || selType.id === 'transfer' || selType.id === 'beneficiary_change') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="">Select account...</option>
                  <option value="NW Mutual VA IRA (***4532)">NW Mutual VA IRA (***4532)</option>
                  <option value="Robinhood Individual (***8821)">Robinhood Individual (***8821)</option>
                  <option value="E*TRADE 401(k) (***3390)">E*TRADE 401(k) (***3390)</option>
                </select>
              </div>
            )}

            {(selType.id === 'withdrawal' || selType.id === 'contribution' || selType.id === 'transfer') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                    <option>ACH Transfer</option>
                    <option>Wire Transfer</option>
                    <option>Check</option>
                  </select>
                </div>
              </>
            )}

            {selType.id === 'address_change' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="Street, City, State, ZIP" />
              </div>
            )}

            {selType.id === 'document_request' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="">Select document...</option>
                  <option>Account Statement</option>
                  <option>Tax Document</option>
                  <option>Performance Report</option>
                  <option>Advisory Agreement</option>
                  <option>Other</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="Any additional details..." />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { resetForm(); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}

        {/* ── DETAIL VIEW ────────────────────────────── */}
        {view === 'detail' && selReq && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{selReq.type_name}</h2>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${STATUS_STYLES[selReq.status] || STATUS_STYLES.pending}`}>
                  {selReq.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 mb-4">
                <div><p className="text-xs text-gray-500">Submitted</p><p className="text-sm font-medium text-gray-900">{fmtDateTime(selReq.submitted_at)}</p></div>
                <div><p className="text-xs text-gray-500">Request ID</p><p className="text-sm font-medium text-gray-900">{selReq.id}</p></div>
                {selReq.details.account && <div><p className="text-xs text-gray-500">Account</p><p className="text-sm font-medium text-gray-900">{selReq.details.account}</p></div>}
                {selReq.details.amount != null && <div><p className="text-xs text-gray-500">Amount</p><p className="text-sm font-medium text-gray-900">${selReq.details.amount.toLocaleString()}</p></div>}
                {selReq.details.method && <div><p className="text-xs text-gray-500">Method</p><p className="text-sm font-medium text-gray-900">{selReq.details.method}</p></div>}
                {selReq.details.new_address && <div className="col-span-2"><p className="text-xs text-gray-500">New Address</p><p className="text-sm font-medium text-gray-900">{selReq.details.new_address}</p></div>}
              </div>
              {selReq.notes && <p className="text-sm text-gray-600 italic">"{selReq.notes}"</p>}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Status Updates</h3>
              <div className="space-y-4">
                {selReq.updates.map((u, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                      {i < selReq.updates.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-gray-900">{u.message}</p>
                      <p className="text-xs text-gray-500">{fmtDateTime(u.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
