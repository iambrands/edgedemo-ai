import { Activity, DollarSign, FileText } from 'lucide-react';
import { ClientPageShell } from './ClientPageShell';

const SECTIONS = [
  {
    icon: Activity,
    title: 'Activity timeline',
    desc: 'Advisor actions with plain-English summaries — rebalances, documents shared, meetings.',
  },
  {
    icon: DollarSign,
    title: 'Fee transparency',
    desc: 'Advisory and fund expenses across advisor-managed accounts.',
  },
  {
    icon: FileText,
    title: 'Shared documents',
    desc: 'Reports and disclosures your advisor has shared with you.',
  },
];

export default function ClientAccountability() {
  return (
    <ClientPageShell
      title="Advisor transparency"
      subtitle="See what your advisor has done on your behalf — available after a connection is approved."
      badge="Accountability"
      backTo="/client/dashboard"
      backLabel="Dashboard"
    >
      <div className="space-y-4">
        {SECTIONS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl border border-slate-200 p-5 flex gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">{title}</h2>
              <p className="text-xs text-slate-500 mt-1">{desc}</p>
              <p className="text-xs text-slate-400 mt-2 italic">No linked advisor — preview only</p>
            </div>
          </div>
        ))}
      </div>
    </ClientPageShell>
  );
}
