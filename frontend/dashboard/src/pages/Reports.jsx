import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReportTypes, generateReport, getReportHistory, getScheduledReports, getHouseholds } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { FileText, Calendar, Download, Mail, Printer } from 'lucide-react';
import { format } from 'date-fns';

const REPORT_TYPE_MAP = {
  quarterly_performance: 'Quarterly Performance',
  annual_summary: 'Annual Summary',
  portfolio_snapshot: 'Portfolio Snapshot',
  tax_report: 'Tax Report',
  compliance_report: 'Compliance Report',
  billing_report: 'Billing Report',
  proposal_report: 'Proposal Report',
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState('generate');
  const [reportType, setReportType] = useState('quarterly_performance');
  const [householdId, setHouseholdId] = useState('');
  const [periodStart, setPeriodStart] = useState('2025-10-01');
  const [periodEnd, setPeriodEnd] = useState('2025-12-31');

  const queryClient = useQueryClient();
  const { data: households = [] } = useQuery({ queryKey: ['households'], queryFn: getHouseholds });
  const { data: reportTypes = [], isLoading: typesLoading } = useQuery({ queryKey: ['report-types'], queryFn: getReportTypes });
  const { data: history = [], isLoading: historyLoading } = useQuery({ queryKey: ['report-history'], queryFn: getReportHistory });
  const { data: scheduled = [], isLoading: scheduledLoading } = useQuery({ queryKey: ['scheduled-reports'], queryFn: getScheduledReports });

  const genMutation = useMutation({
    mutationFn: (payload) => generateReport(payload),
    onSuccess: () => queryClient.invalidateQueries(['report-history']),
  });

  const handleGenerate = () => {
    const hhId = householdId || (households[0]?.id ?? 'hh_001');
    const payload = {
      household_id: hhId,
      report_type: reportType,
      include_benchmark: true,
      include_commentary: true,
      format: 'json',
    };
    const needsPeriod = reportTypes.find((t) => t.type === reportType)?.requires_period;
    if (needsPeriod) {
      payload.period_start = periodStart;
      payload.period_end = periodEnd;
    }
    genMutation.mutate(payload);
  };

  const report = genMutation.data;
  const hist = Array.isArray(history) ? history : history?.reports ?? [];
  const sched = Array.isArray(scheduled) ? scheduled : scheduled?.scheduled ?? [];

  return (
    <PageContainer title="Reports Center">
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        {['generate', 'history', 'scheduled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-[var(--text-muted)]'
            }`}
          >
            {tab === 'generate' ? 'Generate Report' : tab === 'history' ? 'Report History' : 'Scheduled Reports'}
          </button>
        ))}
      </div>

      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">Report Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportTypes.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setReportType(t.type)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    reportType === t.type ? 'border-primary bg-primary/5' : 'border-[var(--border)] hover:bg-[var(--bg-light)]'
                  }`}
                >
                  <FileText className="w-6 h-6 mb-2 text-[var(--text-muted)]" />
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Household</label>
                <select
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2"
                >
                  <option value="">Select household</option>
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              {reportTypes.find((t) => t.type === reportType)?.requires_period && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Period Start</label>
                    <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full border border-[var(--border)] rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Period End</label>
                    <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full border border-[var(--border)] rounded-lg px-3 py-2" />
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleGenerate} disabled={genMutation.isPending} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
                {genMutation.isPending ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {genMutation.isError && <ErrorDisplay error={genMutation.error} onRetry={() => genMutation.mutate()} />}

          {report && (
            <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">
                  {REPORT_TYPE_MAP[report.report_type] || report.report_type} — {report.household_name || report.household_id}
                </h3>
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--bg-light)]">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--bg-light)]">
                    <Mail className="w-4 h-4" /> Email to Client
                  </button>
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--bg-light)]">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto text-sm space-y-4">
                {report.performance && (
                  <div>
                    <h4 className="font-medium mb-2">Performance</h4>
                    <p>Total Return: {report.performance.total_return}% | Benchmark: {report.performance.benchmark_return}% | Alpha: {report.performance.alpha}%</p>
                  </div>
                )}
                {report.ai_commentary && <p className="text-[var(--text-secondary)]">{report.ai_commentary}</p>}
                {report.holdings?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Holdings</h4>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="text-left py-1">Symbol</th><th className="text-right">Value</th><th className="text-right">G/L</th></tr></thead>
                      <tbody>
                        {report.holdings.map((h, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-1">{h.symbol}</td>
                            <td className="text-right">${Number(h.value).toLocaleString()}</td>
                            <td className={`text-right ${(h.gain_loss ?? 0) >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>{h.gain_loss_pct != null ? `${h.gain_loss_pct}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {report.fiduciary_disclosure && <p className="text-xs text-[var(--text-muted)] mt-4">{report.fiduciary_disclosure}</p>}
                {!report.performance && !report.holdings && report.summary && (
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(report.summary, null, 2)}</pre>
                  </div>
                )}
                {!report.performance && !report.holdings && !report.summary && (
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(report, null, 2)}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-light)]">
                <th className="text-left py-3 px-4">Household</th>
                <th className="text-left py-3 px-4">Report Type</th>
                <th className="text-left py-3 px-4">Period</th>
                <th className="text-left py-3 px-4">Generated</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(hist) ? hist : []).map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)]">
                  <td className="py-3 px-4">{r.household_name}</td>
                  <td className="py-3 px-4">{REPORT_TYPE_MAP[r.report_type] || r.report_type}</td>
                  <td className="py-3 px-4">{r.period}</td>
                  <td className="py-3 px-4">{r.generated_at ? format(new Date(r.generated_at), 'MMM d, yyyy') : '—'}</td>
                  <td className="py-3 px-4"><span className="text-[var(--status-success)]">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {hist.length === 0 && !historyLoading && <p className="p-6 text-[var(--text-muted)]">No report history.</p>}
        </div>
      )}

      {activeTab === 'scheduled' && (
        <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-light)]">
                <th className="text-left py-3 px-4">Household</th>
                <th className="text-left py-3 px-4">Report Type</th>
                <th className="text-left py-3 px-4">Frequency</th>
                <th className="text-left py-3 px-4">Next Run</th>
                <th className="text-left py-3 px-4">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(sched) ? sched : []).map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)]">
                  <td className="py-3 px-4">{r.household_name}</td>
                  <td className="py-3 px-4">{REPORT_TYPE_MAP[r.report_type] || r.report_type}</td>
                  <td className="py-3 px-4">{r.frequency}</td>
                  <td className="py-3 px-4">{r.next_run}</td>
                  <td className="py-3 px-4">{r.delivery}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sched.length === 0 && !scheduledLoading && <p className="p-6 text-[var(--text-muted)]">No scheduled reports.</p>}
        </div>
      )}
    </PageContainer>
  );
}
