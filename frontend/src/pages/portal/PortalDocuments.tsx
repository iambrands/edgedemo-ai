import { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Filter,
  Search,
  File,
  Receipt,
  ClipboardList,
  ScrollText,
} from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import { getDocuments, markDocumentRead, PortalDocument } from '../../services/portalApi';

const TYPE_META: Record<string, { label: string; icon: typeof FileText; color: string; bg: string }> = {
  report: { label: 'Report', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
  statement: { label: 'Statement', icon: Receipt, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  tax: { label: 'Tax Document', icon: ScrollText, color: 'text-amber-600', bg: 'bg-amber-50' },
  agreement: { label: 'Agreement', icon: File, color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const FILTER_OPTIONS = [
  { value: '', label: 'All Documents' },
  { value: 'report', label: 'Reports' },
  { value: 'statement', label: 'Statements' },
  { value: 'tax', label: 'Tax Documents' },
  { value: 'agreement', label: 'Agreements' },
];

export default function PortalDocuments() {
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [filter]);

  const loadDocuments = async () => {
    try {
      const data = await getDocuments(filter || undefined);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (doc: PortalDocument) => {
    if (!doc.is_read) {
      try {
        await markDocumentRead(doc.id);
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, is_read: true } : d))
        );
      } catch {}
    }
    // In production, this would open or download the document
    alert(`Opening "${doc.title}"...\n\n(Demo: document viewer would open here)`);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = documents.filter((d) => !d.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PortalNav />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
            <p className="text-slate-500 text-sm mt-1">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
              {unreadCount > 0 && ` · ${unreadCount} unread`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900">No documents found</h3>
            <p className="text-slate-500 text-sm mt-1">
              {search ? 'Try a different search term' : 'Documents will appear here when available'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {filtered.map((doc, idx) => {
              const meta = TYPE_META[doc.document_type] || TYPE_META['report'];
              const Icon = meta.icon;
              return (
                <div
                  key={doc.id}
                  className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    idx < filtered.length - 1 ? 'border-b border-slate-100' : ''
                  } ${!doc.is_read ? 'bg-blue-50/30' : ''}`}
                  onClick={() => handleView(doc)}
                >
                  <div className={`p-3 rounded-lg ${meta.bg}`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-slate-900 truncate ${!doc.is_read ? 'font-semibold' : ''}`}>
                        {doc.title}
                      </p>
                      {!doc.is_read && (
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {meta.label}
                      {doc.period ? ` · ${doc.period}` : ''}
                      {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:block">
                      {formatDate(doc.created_at)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(doc);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Downloading "${doc.title}"...`);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
