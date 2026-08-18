import { Repeat2 } from 'lucide-react';
import { RecurringBills } from '../../components/client/RecurringBills';

export default function ClientBills() {
  return (
    <div className="space-y-5">
      {/* ── header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Repeat2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Recurring Bills</h1>
          <p className="text-xs text-slate-500">Subscriptions & recurring charges detected from your accounts</p>
        </div>
      </div>

      {/* ── bills list ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Monthly subscriptions</h2>
        <p className="text-xs text-slate-400 mb-4">Detected from linked account transactions</p>
        <RecurringBills />
      </div>

      {/* ── tip card ────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Repeat2 className="h-4 w-4 text-blue-600" />
        </div>
        <div className="text-sm text-blue-900">
          <p className="font-semibold">Tip: Review unused subscriptions</p>
          <p className="text-blue-700 text-xs mt-0.5">
            On average, people forget about 2–3 subscriptions they no longer use.
            Cancelling just one $15/month service saves $180/year.
          </p>
        </div>
      </div>
    </div>
  );
}
