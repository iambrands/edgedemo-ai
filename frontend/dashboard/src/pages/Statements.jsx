import { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Upload, FileText } from 'lucide-react';
import { uploadStatement } from '../lib/api';

export function Statements() {
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState([]);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadStatement(file);
      setUploads((prev) => [{ name: file.name, ...data, date: new Date().toISOString() }, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageContainer title="Statement Management">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
        className={`border-2 border-dashed rounded-xl p-12 text-center mb-8 transition-colors ${
          drag ? 'border-primary bg-primary/5' : 'border-[var(--border)] bg-white'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
        <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
          Drag & drop statement PDF here or click to browse
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Supported: NW Mutual, Robinhood, E*TRADE, Schwab, Fidelity (PDF format)
        </p>
        <input
          type="file"
          accept=".pdf,.csv,.xlsx,.xls"
          className="hidden"
          id="stmt-upload"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={uploading}
        />
        <label
          htmlFor="stmt-upload"
          className="inline-block px-6 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary-dark disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Select File'}
        </label>
      </div>

      <h3 className="text-base font-semibold mb-4">Recent Uploads</h3>
      <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
        {uploads.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            No uploads yet. Upload a statement above.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {uploads.map((u, i) => (
              <li key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[var(--text-muted)]" />
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {u.positions?.length ?? u.holdings?.length ?? 0} positions • {new Date(u.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-status-success text-sm">Parsed ✓</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
