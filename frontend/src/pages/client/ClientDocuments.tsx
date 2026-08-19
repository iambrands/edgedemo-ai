import { useEffect, useRef, useState } from 'react';
import {
  ClipboardList,
  Download,
  File,
  FileText,
  ScrollText,
  Shield,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi, type B2CAdvisorDocument } from '../../services/b2cApi';

const TYPE_META: Record<string, { label: string; icon: LucideIcon; bg: string; color: string }> = {
  report:        { label: 'Report',         icon: ClipboardList, bg: 'bg-blue-50',   color: 'text-blue-600' },
  tax:           { label: 'Tax Document',   icon: ScrollText,    bg: 'bg-amber-50',  color: 'text-amber-600' },
  plan:          { label: 'Financial Plan',   icon: FileText,      bg: 'bg-indigo-50', color: 'text-indigo-600' },
  agreement:     { label: 'Agreement',      icon: File,          bg: 'bg-emerald-50',color: 'text-emerald-600' },
  client_upload: { label: 'Your Upload',    icon: Upload,        bg: 'bg-slate-100', color: 'text-slate-600' },
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ClientDocuments() {
  const [documents, setDocuments] = useState<B2CAdvisorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    b2cApi
      .getAdvisorDocuments()
      .then((res) => setDocuments(res.documents))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDownload = (doc: B2CAdvisorDocument) => {
    // Demo — no real file; mark as read
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, is_read: true } : d)),
    );
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await b2cApi.uploadAdvisorDocument(file.name, file.size);
      setDocuments((prev) => [uploaded, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const unread = documents.filter((d) => !d.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
            {unread > 0 ? ` · ${unread} unread` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload zone */}
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">Share a document with your advisor</p>
        <p className="text-xs text-slate-500 mt-1">PDF, Word, or image · Max 10 MB in production</p>
      </div>

      {/* Document list */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {documents.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No documents yet.</p>
        ) : (
          documents.map((doc) => {
            const meta = TYPE_META[doc.type] ?? TYPE_META.report;
            const Icon = meta.icon;
            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${meta.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{doc.title}</p>
                    {!doc.is_read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {meta.label} · Shared {fmtDate(doc.shared_date)} by {doc.shared_by}
                    {doc.size_bytes > 0 ? ` · ${fmtSize(doc.size_bytes)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            );
          })
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        Documents are stored securely. Demo mode — downloads are simulated.
      </p>
    </div>
  );
}
