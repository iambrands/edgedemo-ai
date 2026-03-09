import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useToast } from '../../contexts/ToastContext';

interface ComplianceException {
  id: string;
  rule_code: string;
  category: string;
  severity: string;
  message: string;
  client_name: string | null;
  triggered_at: string;
  resolved: boolean;
}

type SeverityKey = 'BLOCKING' | 'WARNING' | 'INFO';

const severityConfig: Record<SeverityKey, { bg: string; border: string; iconClass: string; Icon: typeof AlertTriangle; label: string }> = {
  BLOCKING: { bg: 'bg-red-50', border: 'border-l-red-500', iconClass: 'w-5 h-5 text-red-500', Icon: AlertTriangle, label: 'Blocking' },
  WARNING: { bg: 'bg-amber-50', border: 'border-l-amber-500', iconClass: 'w-5 h-5 text-amber-500', Icon: AlertTriangle, label: 'Warning' },
  INFO: { bg: 'bg-blue-50', border: 'border-l-blue-500', iconClass: 'w-5 h-5 text-blue-500', Icon: Info, label: 'Info' },
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('edgeai_token') || sessionStorage.getItem('edgeai_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function ComplianceExceptionPanel() {
  const toast = useToast();
  const [exceptions, setExceptions] = useState<ComplianceException[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const fetchExceptions = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/compliance/exceptions`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setExceptions(await res.json());
    } catch { /* graceful degradation */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExceptions(); }, [fetchExceptions]);

  const handleResolve = async () => {
    if (!resolveId || !resolveNote.trim()) {
      toast.error('Resolution note is required');
      return;
    }
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/compliance/exceptions/${resolveId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ note: resolveNote }),
      });
      if (res.ok) {
        setExceptions(prev => prev.filter(e => e.id !== resolveId));
        setResolveId(null);
        setResolveNote('');
        toast.success('Exception resolved');
      }
    } catch {
      toast.error('Failed to resolve exception');
    }
  };

  const grouped: Record<SeverityKey, ComplianceException[]> = { BLOCKING: [], WARNING: [], INFO: [] };
  exceptions.forEach(e => {
    const key = e.severity as SeverityKey;
    if (grouped[key]) grouped[key].push(e);
    else grouped.INFO.push(e);
  });

  if (loading) return null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-slate-900">Compliance Exceptions</h2>
        {exceptions.length > 0 && (
          <Badge variant="red">{exceptions.length}</Badge>
        )}
      </div>

      {exceptions.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-600 py-4">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">No open compliance exceptions</span>
        </div>
      ) : (
        <div className="space-y-4">
          {(['BLOCKING', 'WARNING', 'INFO'] as const).map(severity => {
            const items = grouped[severity];
            if (!items.length) return null;
            const config = severityConfig[severity];
            return (
              <div key={severity}>
                <h3 className="text-sm font-medium text-slate-500 mb-2">{config.label} ({items.length})</h3>
                <div className="space-y-2">
                  {items.map(exc => (
                    <div key={exc.id} className={`p-3 rounded-lg border-l-4 ${config.border} ${config.bg}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <config.Icon className={config.iconClass} />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{exc.rule_code}</p>
                            <p className="text-sm text-slate-600 mt-0.5">{exc.message}</p>
                            {exc.client_name && (
                              <p className="text-xs text-slate-500 mt-1">Client: {exc.client_name}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setResolveId(exc.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
                          aria-label={`Resolve ${exc.rule_code}`}
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolveId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Resolve Exception</h3>
              <button onClick={() => { setResolveId(null); setResolveNote(''); }} aria-label="Close resolve dialog">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Resolution note (required)..."
              className="w-full p-3 border border-slate-300 rounded-lg text-sm resize-none h-24 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setResolveId(null); setResolveNote(''); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
