import { useEffect, useState, useCallback } from 'react';
import { FileText, Download, ExternalLink, ChevronDown, ChevronUp, Building } from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';

type TaxDoc = {
  id: string;
  type: string;
  tax_year: number;
  custodian: string;
  description: string;
  fields: Record<string, string>;
  available_date: string;
  status: string;
};

const TYPE_COLORS: Record<string, string> = {
  '1099-DIV': 'bg-emerald-100 text-emerald-700',
  '1099-B':   'bg-blue-100 text-blue-700',
  '1099-INT': 'bg-cyan-100 text-cyan-700',
  '5498':     'bg-violet-100 text-violet-700',
  'W-2':      'bg-amber-100 text-amber-700',
};

function downloadCSV(docs: TaxDoc[]) {
  const header = 'Document Type,Tax Year,Custodian,Description,Available Date\n';
  const rows = docs
    .map((d) => `"${d.type}",${d.tax_year},"${d.custodian}","${d.description}","${d.available_date}"`)
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tax-documents.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function TaxDocCard({ doc }: { doc: TaxDoc }) {
  const [expanded, setExpanded] = useState(false);
  const badgeCls = TYPE_COLORS[doc.type] ?? 'bg-slate-100 text-slate-600';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <FileText size={16} className="text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{doc.type}</span>
            <span className="text-xs font-medium text-slate-800">{doc.custodian}</span>
            <span className="text-xs text-slate-400">· Tax Year {doc.tax_year}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] text-slate-400 hidden sm:block">
            Available {new Date(doc.available_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="text-[10px] bg-emerald-50 text-emerald-600 font-medium px-1.5 py-0.5 rounded-full">Ready</span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
            {Object.entries(doc.fields).map(([key, val]) => (
              <div key={key} className="flex justify-between items-baseline rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">{key}</span>
                <span className="text-xs font-semibold text-slate-900 tabular-nums">{val}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Download size={12} />
              Download PDF
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={12} />
              Open at {doc.custodian}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientTaxDocuments() {
  const [docs, setDocs] = useState<TaxDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('All');

  const load = useCallback(() => {
    setLoading(true);
    b2cApi.getTaxDocuments()
      .then((data) => setDocs(data.documents))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const types = ['All', ...Array.from(new Set(docs.map((d) => d.type)))];
  const visible = filterType === 'All' ? docs : docs.filter((d) => d.type === filterType);
  const custodians = Array.from(new Set(docs.map((d) => d.custodian)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Tax Documents</h1>
            <p className="text-xs text-slate-500">1099s, W-2s, and IRA forms aggregated across custodians</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => downloadCSV(docs)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download size={13} />
          Export list
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Custodians at a glance */}
          <div className="flex flex-wrap gap-2">
            {custodians.map((c) => (
              <div key={c} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                <Building size={12} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-700">{c}</span>
                <span className="text-[10px] text-slate-400">({docs.filter((d) => d.custodian === c).length} docs)</span>
              </div>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex gap-2 flex-wrap">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterType === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Document list */}
          <div className="space-y-2">
            {visible.map((doc) => <TaxDocCard key={doc.id} doc={doc} />)}
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-700">
              <strong>Important:</strong> Tax documents are displayed for informational purposes only.
              Always verify figures directly with your custodian and consult a tax professional before filing.
              PDF download requires connecting to your custodian account.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
