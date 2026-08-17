import { Search, Clock } from 'lucide-react';
import { ClientPageShell } from './ClientPageShell';

export default function ConnectAdvisor() {
  return (
    <ClientPageShell
      title="Connect your advisor"
      subtitle="Search by advisor email or CRD#. Your advisor must approve before they can view your data."
      badge="Advisor link"
      backTo="/client/dashboard"
      backLabel="Dashboard"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            disabled
            placeholder="Advisor email or CRD number"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
          />
        </div>
        <button
          type="button"
          disabled
          className="w-full py-2.5 rounded-lg bg-blue-600/50 text-white font-medium cursor-not-allowed"
        >
          Send connection request (coming soon)
        </button>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            Pending requests will show here. Until approved, your DIY data stays private.
          </p>
        </div>
      </div>
    </ClientPageShell>
  );
}
