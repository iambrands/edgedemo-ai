/**
 * Compliance Documents Dashboard
 * Generate and manage ADV Part 2B, Form CRS, and other regulatory documents.
 */

import { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Eye,
  Check,
  Send,
  Clock,
  AlertCircle,
  X,
  Archive,
  RefreshCw,
} from 'lucide-react';
import {
  listDocuments,
  listVersions,
  generateADV2B,
  generateFormCRS,
  approveVersion,
  publishVersion,
  getVersionHtml,
  archiveDocument,
  ComplianceDocument,
  DocumentVersion,
  ComplianceApiError,
} from '../../services/complianceApi';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<string, JSX.Element> = {
  draft: <FileText className="w-3 h-3" />,
  pending_review: <Clock className="w-3 h-3" />,
  approved: <Check className="w-3 h-3" />,
  published: <Send className="w-3 h-3" />,
  archived: <Archive className="w-3 h-3" />,
};

const DOC_TYPE_LABELS: Record<string, string> = {
  adv_part_2a: 'ADV Part 2A',
  adv_part_2b: 'ADV Part 2B',
  form_crs: 'Form CRS',
  privacy_policy: 'Privacy Policy',
  advisory_agreement: 'Advisory Agreement',
};

export default function ComplianceDocs() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ComplianceDocument | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setError(null);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (doc: ComplianceDocument) => {
    setSelectedDoc(doc);
    setPreviewHtml('');
    setError(null);

    try {
      const vers = await listVersions(doc.id);
      setVersions(vers);

      // Load preview of current version
      if (doc.current_version_id) {
        try {
          const html = await getVersionHtml(doc.current_version_id);
          setPreviewHtml(html);
        } catch {
          console.warn('Failed to load preview HTML');
        }
      }
    } catch (err) {
      console.error('Failed to load versions', err);
      setError('Failed to load document versions');
    }
  };

  const handleGenerate = async (type: 'adv_2b' | 'form_crs', advisorId?: string) => {
    setGenerating(true);
    setError(null);

    try {
      if (type === 'adv_2b' && advisorId) {
        await generateADV2B(advisorId);
      } else {
        await generateFormCRS();
      }
      await loadDocuments();
      setShowGenerateModal(false);
    } catch (err) {
      if (err instanceof ComplianceApiError) {
        setError(err.message);
      } else {
        setError('Document generation failed');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (versionId: string) => {
    setError(null);
    try {
      await approveVersion(versionId);
      if (selectedDoc) {
        await loadVersions(selectedDoc);
      }
    } catch (err) {
      console.error('Failed to approve', err);
      setError('Failed to approve version');
    }
  };

  const handlePublish = async (versionId: string) => {
    setError(null);
    try {
      await publishVersion(versionId);
      if (selectedDoc) {
        await loadVersions(selectedDoc);
      }
      await loadDocuments();
    } catch (err) {
      if (err instanceof ComplianceApiError) {
        setError(err.message);
      } else {
        setError('Failed to publish version');
      }
    }
  };

  const handleArchive = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to archive this document?')) {
      return;
    }

    setError(null);
    try {
      await archiveDocument(documentId);
      setSelectedDoc(null);
      setVersions([]);
      setPreviewHtml('');
      await loadDocuments();
    } catch (err) {
      console.error('Failed to archive', err);
      setError('Failed to archive document');
    }
  };

  const handleRegenerate = async () => {
    if (!selectedDoc) return;

    const type = selectedDoc.document_type === 'form_crs' ? 'form_crs' : 'adv_2b';
    setGenerating(true);
    setError(null);

    try {
      if (type === 'form_crs') {
        await generateFormCRS(true);
      } else {
        // For ADV 2B, we would need the advisor ID from the document
        // For now, show an error
        setError('Please use the Generate button for ADV Part 2B documents');
        setGenerating(false);
        return;
      }
      await loadDocuments();
      if (selectedDoc) {
        await loadVersions(selectedDoc);
      }
    } catch (err) {
      if (err instanceof ComplianceApiError) {
        setError(err.message);
      } else {
        setError('Regeneration failed');
      }
    } finally {
      setGenerating(false);
    }
  };

  const openFullPreview = () => {
    if (!previewHtml) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(previewHtml);
      win.document.close();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Compliance Documents</h1>
          <p className="text-slate-500">
            Generate and manage ADV Part 2B, Form CRS, and other regulatory documents
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Generate Document
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-medium text-slate-900">Documents</h2>

          {documents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-500" />
              <p className="mt-2 text-slate-500">No documents yet</p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="mt-4 text-blue-600 hover:underline"
              >
                Generate your first document
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => loadVersions(doc)}
                  className={`w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all ${
                    selectedDoc?.id === doc.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                      <p className="text-sm text-slate-500">
                        {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded whitespace-nowrap ${
                        STATUS_COLORS[doc.status] || STATUS_COLORS.draft
                      }`}
                    >
                      {STATUS_ICONS[doc.status]}
                      {doc.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Updated {formatDate(doc.updated_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Version History & Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-900">
              {selectedDoc ? 'Versions' : 'Select a document'}
            </h2>
            {selectedDoc && (
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Regenerate with AI"
                >
                  <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => handleArchive(selectedDoc.id)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Archive document"
                >
                  <Archive size={16} />
                </button>
              </div>
            )}
          </div>

          {selectedDoc && versions.length > 0 ? (
            <div className="space-y-2">
              {versions.map((version) => (
                <div key={version.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Version {version.version_number}</p>
                      <p className="text-xs text-slate-500">
                        {version.ai_generated && (
                          <span className="inline-flex items-center gap-1">
                            <span>🤖</span> AI Generated •{' '}
                          </span>
                        )}
                        {formatDateTime(version.created_at)}
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                        STATUS_COLORS[version.status] || STATUS_COLORS.draft
                      }`}
                    >
                      {STATUS_ICONS[version.status]}
                      {version.status.replace('_', ' ')}
                    </span>
                  </div>

                  {version.change_summary && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded p-2">
                      {version.change_summary}
                    </p>
                  )}

                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={async () => {
                        const html = await getVersionHtml(version.id);
                        setPreviewHtml(html);
                      }}
                      className="flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600"
                    >
                      <Eye size={14} /> View
                    </button>

                    {version.status === 'draft' && (
                      <button
                        onClick={() => handleApprove(version.id)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <Check size={14} /> Approve
                      </button>
                    )}

                    {version.status === 'approved' && (
                      <button
                        onClick={() => handlePublish(version.id)}
                        className="flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                      >
                        <Send size={14} /> Publish
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : selectedDoc ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-slate-500">
              No versions yet
            </div>
          ) : null}
        </div>

        {/* Document Preview */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-medium text-slate-900">Preview</h2>

          {previewHtml ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-2 bg-slate-100 border-b flex justify-between items-center">
                <span className="text-sm text-slate-600">Document Preview</span>
                <button
                  onClick={openFullPreview}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Eye size={14} /> Full Screen
                </button>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[500px] border-0"
                title="Document Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-slate-500 h-64 flex items-center justify-center">
              <div>
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p>Select a document to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Generate Document</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-2 text-slate-500 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600 mb-4">
                Select the type of compliance document to generate using AI.
              </p>

              <button
                onClick={() => handleGenerate('form_crs')}
                disabled={generating}
                className="w-full text-left p-4 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Form CRS</p>
                    <p className="text-sm text-slate-500">
                      Client Relationship Summary (firm-wide, max 2 pages)
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleGenerate('adv_2b', 'current-user')}
                disabled={generating}
                className="w-full text-left p-4 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">ADV Part 2B</p>
                    <p className="text-sm text-slate-500">
                      Brochure Supplement (per advisor, Items 1-7)
                    </p>
                  </div>
                </div>
              </button>

              {generating && (
                <div className="mt-4 flex items-center gap-2 text-blue-600 justify-center">
                  <Clock className="animate-spin" size={16} />
                  <span>Generating with AI... This may take a moment.</span>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 rounded-b-xl">
              <p className="text-xs text-slate-500">
                Documents are generated using AI and should be reviewed by a compliance
                professional before publishing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
