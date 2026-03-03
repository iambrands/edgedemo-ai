import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Upload, FileSignature, Shield, Receipt, ClipboardList,
  Search, Send, Eye, CheckCircle, Loader2, Download,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface Doc {
  id: string;
  name: string;
  type: string;
  category: string;
  client_name: string;
  size_bytes: number;
  status: string;
  signature_status: string | null;
  uploaded_by: string;
  signed_by: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

const API = import.meta.env.VITE_API_URL || '';

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  agreements: FileSignature,
  compliance: Shield,
  statements: FileText,
  tax: Receipt,
  account_forms: ClipboardList,
};

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

export default function DocumentVault() {
  const { token } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [pendingSigs, setPendingSigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'documents' | 'signatures'>('documents');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      const [docRes, sigRes] = await Promise.all([
        fetch(`${API}/api/v1/documents?${params}`, { headers }),
        fetch(`${API}/api/v1/documents/signatures/pending`, { headers }),
      ]);
      const docData = await docRes.json();
      const sigData = await sigRes.json();
      setDocs(docData.documents || []);
      setSummary(docData.summary || {});
      setPendingSigs(sigData.pending || []);
    } catch {} finally { setLoading(false); }
  }, [token, category, search]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const statusBadge = (status: string, sigStatus: string | null) => {
    if (sigStatus === 'completed') return <Badge variant="green" size="sm"><CheckCircle className="w-3 h-3 mr-1" />Signed</Badge>;
    if (sigStatus === 'viewed') return <Badge variant="blue" size="sm"><Eye className="w-3 h-3 mr-1" />Viewed</Badge>;
    if (sigStatus === 'sent') return <Badge variant="amber" size="sm"><Send className="w-3 h-3 mr-1" />Sent</Badge>;
    if (status === 'delivered') return <Badge variant="blue" size="sm">Delivered</Badge>;
    if (status === 'published') return <Badge variant="green" size="sm">Published</Badge>;
    return <Badge variant="gray" size="sm">{status}</Badge>;
  };

  const categories = [
    { id: null, label: 'All Documents', count: summary.total || 0 },
    { id: 'agreements', label: 'Agreements', count: summary.categories?.agreements || 0 },
    { id: 'compliance', label: 'Compliance', count: summary.categories?.compliance || 0 },
    { id: 'statements', label: 'Statements', count: summary.categories?.statements || 0 },
    { id: 'tax', label: 'Tax', count: summary.categories?.tax || 0 },
    { id: 'account_forms', label: 'Forms', count: summary.categories?.account_forms || 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Document Vault" subtitle="Secure document storage, e-signature tracking, and SEC-compliant retention" />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card size="sm">
          <p className="text-xs text-slate-500 uppercase">Total Documents</p>
          <p className="text-2xl font-bold text-slate-900">{summary.total || 0}</p>
        </Card>
        <Card size="sm">
          <p className="text-xs text-slate-500 uppercase">Signed</p>
          <p className="text-2xl font-bold text-emerald-600">{summary.signed || 0}</p>
        </Card>
        <Card size="sm">
          <p className="text-xs text-slate-500 uppercase">Pending Signature</p>
          <p className="text-2xl font-bold text-amber-600">{summary.pending_signature || 0}</p>
        </Card>
        <Card size="sm">
          <p className="text-xs text-slate-500 uppercase">E-Signature Provider</p>
          <p className="text-sm font-semibold text-blue-600 mt-1">DocuSign Connected</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['documents', 'signatures'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {t === 'signatures' ? `Pending Signatures (${pendingSigs.length})` : 'Documents'}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm"><Upload className="w-4 h-4 mr-1" />Upload Document</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tab === 'documents' ? (
        <div className="flex gap-6">
          {/* Sidebar categories */}
          <div className="hidden lg:block w-48 space-y-1 shrink-0">
            {categories.map(c => (
              <button key={String(c.id)} onClick={() => setCategory(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${category === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                {c.label} <span className="text-xs text-slate-400 ml-1">({c.count})</span>
              </button>
            ))}
          </div>

          {/* Document list */}
          <div className="flex-1 space-y-2">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {docs.map(doc => {
              const Icon = CATEGORY_ICONS[doc.category] || FileText;
              return (
                <Card key={doc.id} size="sm">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-blue-50"><Icon className="w-5 h-5 text-blue-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                        <span>{doc.client_name}</span>
                        <span>{fmtBytes(doc.size_bytes)}</span>
                        <span>{fmtDate(doc.updated_at)}</span>
                      </div>
                    </div>
                    {statusBadge(doc.status, doc.signature_status)}
                    <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingSigs.map(sig => (
            <Card key={sig.id} size="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{sig.signer_name || sig.signer_email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Document: {sig.document_id} &middot; Sent: {fmtDate(sig.sent_at)}</p>
                  {sig.viewed_at && <p className="text-xs text-blue-600">Viewed: {fmtDate(sig.viewed_at)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sig.status === 'viewed' ? 'blue' : 'amber'} size="sm">{sig.status}</Badge>
                  <Button variant="ghost" size="sm"><Send className="w-4 h-4 mr-1" />Remind</Button>
                </div>
              </div>
            </Card>
          ))}
          {pendingSigs.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No pending signatures</p>}
        </div>
      )}
    </div>
  );
}
