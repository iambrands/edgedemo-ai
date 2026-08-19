/**
 * Drag-and-drop statement uploader for B2C users.
 * Uploads to POST /api/v1/b2c/statements/upload, polls for parse status,
 * then allows the user to confirm the parsed statement.
 * Supports PDF statements and CSV/Excel position exports (Schwab, Fidelity, etc.).
 */
import { useCallback, useRef, useState } from 'react';
import { CheckCircle, FileText, Loader2, Upload, XCircle } from 'lucide-react';
import { b2cApi, getB2CToken } from '../../services/b2cApi';

type UploadStage = 'idle' | 'uploading' | 'parsing' | 'review' | 'confirming' | 'done' | 'error';

interface ParsedResult {
  id: string;
  filename: string;
  status: string;
  custodian: string;
  parsed: string;
  confidence: string;
  position_count: number;
  total_value: number | null;
}

interface StatementUploadZoneProps {
  onConfirmed?: (statementId: string, positionsCreated: number) => void;
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.csv', '.xlsx', '.xls'];
const ACCEPTED_MIME =
  '.pdf,application/pdf,.csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel';

const B2C_API = '/api/v1/b2c/statements';

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function authHeaders(): HeadersInit {
  const tok = getB2CToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

async function pollStatus(
  statementId: string,
  maxAttempts = 20,
  intervalMs = 1500,
): Promise<ParsedResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${B2C_API}/${statementId}/status`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
    const data: ParsedResult = await res.json();
    if (data.status === 'parsed' || data.status === 'confirmed') return data;
    if (data.status === 'failed') throw new Error(data.custodian ?? 'Parse failed');
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Timed out waiting for parse result');
}

export function StatementUploadZone({ onConfirmed }: StatementUploadZoneProps) {
  const [stage, setStage] = useState<UploadStage>('idle');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('idle');
    setError('');
    setResult(null);
    setConfirmMessage('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = useCallback(async (file: File) => {
    if (!isAcceptedFile(file)) {
      setError('Supported formats: PDF, CSV, or Excel (.xlsx/.xls).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File is too large (20 MB max).');
      return;
    }

    setError('');
      setStage('uploading');

    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch(`${B2C_API}/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `Upload failed: ${uploadRes.status}`);
      }
      const upload = await uploadRes.json();

      if (upload.status === 'parsed') {
        const parsedRes = await fetch(`${B2C_API}/${upload.id}/status`, {
          headers: authHeaders(),
        });
        if (!parsedRes.ok) throw new Error(`Status check failed: ${parsedRes.status}`);
        const parsed: ParsedResult = await parsedRes.json();
        setResult(parsed);
        setStage('review');
        return;
      }

      setStage('parsing');
      const parsed = await pollStatus(upload.id);
      setResult(parsed);
      setStage('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStage('error');
    }
  }, []);

  const handleConfirm = async () => {
    if (!result || isConfirming) return;
    setIsConfirming(true);
    try {
      const res = await b2cApi.confirmStatement(result.id);
      setConfirmMessage(
        `${res.positionsCreated} positions confirmed from ${result.custodian}.`,
      );
      setStage('done');
      onConfirmed?.(result.id, res.positionsCreated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
      setStage('error');
    } finally {
      setIsConfirming(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (stage === 'done') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-emerald-900 text-sm">Statement confirmed</p>
          <p className="text-xs text-emerald-700 mt-0.5">{confirmMessage}</p>
          <button
            onClick={reset}
            className="mt-3 text-xs font-medium text-emerald-700 hover:underline"
          >
            Upload another statement
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'review' && result) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-blue-900 text-sm truncate">{result.filename}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-800">
              <span>
                <span className="text-blue-500">Custodian: </span>
                {result.custodian}
              </span>
              <span>
                <span className="text-blue-500">Confidence: </span>
                {result.confidence}
              </span>
              <span>
                <span className="text-blue-500">Positions: </span>
                {result.position_count}
              </span>
              {result.total_value != null && (
                <span>
                  <span className="text-blue-500">Value: </span>$
                  {result.total_value.toLocaleString()}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-blue-700 italic">{result.parsed}</p>
          </div>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isConfirming ? 'Confirming…' : 'Confirm & import holdings'}
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-red-900 text-sm">Upload failed</p>
          <p className="text-xs text-red-700 mt-0.5">{error}</p>
          <button
            onClick={reset}
            className="mt-3 text-xs font-medium text-red-700 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'uploading' || stage === 'parsing') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-700">
          {stage === 'uploading' ? 'Uploading statement…' : 'Parsing holdings…'}
        </p>
        <p className="text-xs text-slate-500">This usually takes under 10 seconds.</p>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_MIME}
        onChange={onFileChange}
        className="hidden"
      />
      <Upload className={`mx-auto h-8 w-8 mb-2 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
      <p className="text-sm font-medium text-slate-700">
        {isDragging ? 'Drop your file here' : 'Drag & drop a statement PDF or positions CSV'}
      </p>
      <p className="text-xs text-slate-400 mt-1">or click to browse · PDF, CSV, Excel · 20 MB max</p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
