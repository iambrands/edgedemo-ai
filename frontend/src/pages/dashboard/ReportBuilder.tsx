import { useState } from 'react';
import {
  FileText,
  LayoutTemplate,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
  Download,
  Save,
  CheckCircle,
  X,
  Plus,
  Clock,
  Layers,
  Users,
  Calendar,
  Palette,
  FileDown,
  Play,
  Pause,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  lastUsed: string;
  sectionCount: number;
  defaultSections: string[];
}

interface ReportSection {
  id: string;
  name: string;
  description: string;
}

interface SavedReport {
  id: string;
  name: string;
  client: string;
  date: string;
  pages: number;
}

interface Client {
  id: string;
  name: string;
}

type Period = 'last-quarter' | 'last-year' | 'ytd' | 'custom';

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const TEMPLATES: ReportTemplate[] = [
  {
    id: 'quarterly',
    name: 'Quarterly Performance',
    description: 'Standard quarterly portfolio performance review with benchmark comparisons and allocation breakdown.',
    lastUsed: '2026-01-15',
    sectionCount: 6,
    defaultSections: ['portfolio-summary', 'performance-chart', 'asset-allocation', 'holdings-detail', 'market-commentary', 'advisor-notes'],
  },
  {
    id: 'client-review',
    name: 'Client Review',
    description: 'Comprehensive client meeting package covering goals, performance, and recommendations.',
    lastUsed: '2026-02-01',
    sectionCount: 8,
    defaultSections: ['portfolio-summary', 'performance-chart', 'asset-allocation', 'goal-progress', 'risk-assessment', 'fee-analysis', 'recommendations', 'advisor-notes'],
  },
  {
    id: 'compliance',
    name: 'Compliance Summary',
    description: 'Regulatory compliance status report for internal audits and filings.',
    lastUsed: '2025-12-30',
    sectionCount: 4,
    defaultSections: ['compliance-status', 'holdings-detail', 'risk-assessment', 'advisor-notes'],
  },
  {
    id: 'tax',
    name: 'Tax Report',
    description: 'Year-end tax reporting with realized gains/losses, wash sale tracking, and harvest opportunities.',
    lastUsed: '2026-01-20',
    sectionCount: 5,
    defaultSections: ['portfolio-summary', 'tax-summary', 'holdings-detail', 'fee-analysis', 'advisor-notes'],
  },
  {
    id: 'onboarding',
    name: 'Onboarding Summary',
    description: 'New client onboarding package with initial allocation, risk profile, and investment policy.',
    lastUsed: '2026-02-10',
    sectionCount: 7,
    defaultSections: ['portfolio-summary', 'asset-allocation', 'risk-assessment', 'goal-progress', 'fee-analysis', 'compliance-status', 'recommendations'],
  },
  {
    id: 'annual',
    name: 'Annual Review',
    description: 'Full year-in-review report with detailed performance attribution and forward-looking strategy.',
    lastUsed: '2026-01-05',
    sectionCount: 10,
    defaultSections: ['portfolio-summary', 'performance-chart', 'asset-allocation', 'holdings-detail', 'fee-analysis', 'tax-summary', 'compliance-status', 'risk-assessment', 'market-commentary', 'recommendations'],
  },
];

const ALL_SECTIONS: ReportSection[] = [
  { id: 'portfolio-summary', name: 'Portfolio Summary', description: 'Account values, total return, and key metrics' },
  { id: 'performance-chart', name: 'Performance Chart', description: 'Time-weighted returns vs benchmarks' },
  { id: 'asset-allocation', name: 'Asset Allocation', description: 'Current allocation by asset class' },
  { id: 'holdings-detail', name: 'Holdings Detail', description: 'Line-item security positions and values' },
  { id: 'fee-analysis', name: 'Fee Analysis', description: 'Advisory, fund, and trading fee breakdown' },
  { id: 'tax-summary', name: 'Tax Summary', description: 'Realized gains/losses and tax-lot detail' },
  { id: 'compliance-status', name: 'Compliance Status', description: 'Regulatory standing and flagged items' },
  { id: 'risk-assessment', name: 'Risk Assessment', description: 'Volatility, drawdown, and risk scores' },
  { id: 'goal-progress', name: 'Goal Progress', description: 'Client goal tracking and projections' },
  { id: 'advisor-notes', name: 'Advisor Notes', description: 'Custom commentary and action items' },
  { id: 'market-commentary', name: 'Market Commentary', description: 'Macro outlook and market conditions' },
  { id: 'recommendations', name: 'Recommendations', description: 'Proposed trades and strategy changes' },
];

const CLIENTS: Client[] = [
  { id: 'c1', name: 'Margaret & Thomas Chen' },
  { id: 'c2', name: 'David Nakamura' },
  { id: 'c3', name: 'The Sullivan Family Trust' },
  { id: 'c4', name: 'Rachel Hernandez, MD' },
  { id: 'c5', name: 'BluePeak Holdings LLC' },
];

const SAVED_REPORTS: SavedReport[] = [
  { id: 'r1', name: 'Q4 2025 Performance — Chen', client: 'Margaret & Thomas Chen', date: '2026-01-15', pages: 12 },
  { id: 'r2', name: 'Annual Review 2025 — Nakamura', client: 'David Nakamura', date: '2026-01-08', pages: 18 },
  { id: 'r3', name: 'Tax Summary — Sullivan Trust', client: 'The Sullivan Family Trust', date: '2026-01-22', pages: 8 },
  { id: 'r4', name: 'Client Review — Hernandez', client: 'Rachel Hernandez, MD', date: '2026-02-03', pages: 14 },
  { id: 'r5', name: 'Onboarding — BluePeak', client: 'BluePeak Holdings LLC', date: '2026-02-11', pages: 10 },
];

const SECTION_PREVIEWS: Record<string, string> = {
  'portfolio-summary': 'Total Portfolio Value: $2,847,320 | Net Return (QTD): +4.2% | Cash: $142,366',
  'performance-chart': '[ Performance line chart — portfolio vs S&P 500 vs blended benchmark ]',
  'asset-allocation': 'US Equity 42% | Intl Equity 18% | Fixed Income 25% | Alts 10% | Cash 5%',
  'holdings-detail': 'AAPL — 450 sh — $98,325 | VTI — 820 sh — $214,600 | AGG — 1,200 sh — $118,800 ...',
  'fee-analysis': 'Advisory Fee: 0.85% ($24,202) | Fund Expenses: 0.12% avg | Trading: $0 (commission-free)',
  'tax-summary': 'Realized ST Gains: $12,480 | Realized LT Gains: $34,200 | Unrealized: +$87,650 | Harvested Losses: $8,400',
  'compliance-status': 'ADV Filing: Current | Best Execution: Reviewed Q4 | Suitability: All accounts compliant',
  'risk-assessment': 'Portfolio Std Dev: 11.2% | Max Drawdown (1Y): -8.4% | Sharpe Ratio: 1.32 | Beta: 0.88',
  'goal-progress': 'Retirement ($3.5M target): 81% on track | Education Fund: 94% funded | Emergency Reserve: Fully funded',
  'advisor-notes': '[ Advisor commentary section — editable notes and action items ]',
  'market-commentary': 'Markets rallied in Q4 driven by… Outlook remains cautiously optimistic with rate trajectory…',
  'recommendations': 'Rebalance intl equity +2% | Harvest losses in tech sector | Roll maturing bonds to 5-7Y duration',
};

const PERIOD_LABELS: Record<Period, string> = {
  'last-quarter': 'Last Quarter',
  'last-year': 'Last Year',
  'ytd': 'Year to Date',
  'custom': 'Custom Range',
};

interface ScheduleEntry {
  id: string;
  templateName: string;
  frequency: string;
  clientSelection: string;
  clientCount: number;
  deliveryMethod: string;
  enabled: boolean;
  nextRun: string;
  lastRun: string | null;
  lastStatus: string | null;
  delivered: number;
}

interface RunHistory {
  id: string;
  templateName: string;
  runAt: string;
  status: string;
  totalClients: number;
  delivered: number;
  failed: number;
}

const MOCK_SCHEDULES: ScheduleEntry[] = [
  { id: 'sched-1', templateName: 'Quarterly Performance Report', frequency: 'quarterly', clientSelection: 'all', clientCount: 47, deliveryMethod: 'both', enabled: true, nextRun: '2026-04-01', lastRun: '2026-01-02', lastStatus: 'completed', delivered: 47 },
  { id: 'sched-2', templateName: 'Monthly Compliance Summary', frequency: 'monthly', clientSelection: 'all', clientCount: 47, deliveryMethod: 'email', enabled: true, nextRun: '2026-03-01', lastRun: '2026-02-01', lastStatus: 'completed', delivered: 47 },
  { id: 'sched-3', templateName: 'Annual Tax Summary', frequency: 'annual', clientSelection: 'all', clientCount: 47, deliveryMethod: 'portal', enabled: true, nextRun: '2027-01-15', lastRun: '2026-01-15', lastStatus: 'completed', delivered: 45 },
];

const MOCK_RUN_HISTORY: RunHistory[] = [
  { id: 'run-1', templateName: 'Quarterly Performance Report', runAt: '2026-01-02', status: 'completed', totalClients: 47, delivered: 47, failed: 0 },
  { id: 'run-2', templateName: 'Monthly Compliance Summary', runAt: '2026-02-01', status: 'completed', totalClients: 47, delivered: 47, failed: 0 },
  { id: 'run-3', templateName: 'Quarterly Performance Report', runAt: '2025-10-01', status: 'completed', totalClients: 45, delivered: 44, failed: 1 },
  { id: 'run-4', templateName: 'Annual Tax Summary', runAt: '2026-01-15', status: 'completed', totalClients: 47, delivered: 45, failed: 2 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReportBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [activeSections, setActiveSections] = useState<string[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>(CLIENTS[0].id);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('last-quarter');
  const [includeBranding, setIncludeBranding] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [schedules, setSchedules] = useState(MOCK_SCHEDULES);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setActiveSections([...template.defaultSections]);
    setBuilderOpen(true);
  };

  const handleBuildCustom = () => {
    setSelectedTemplate(null);
    setActiveSections(['portfolio-summary', 'performance-chart', 'asset-allocation']);
    setBuilderOpen(true);
  };

  const toggleSection = (sectionId: string) => {
    setActiveSections((prev) =>
      prev.includes(sectionId) ? prev.filter((s) => s !== sectionId) : [...prev, sectionId]
    );
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setActiveSections((prev) => {
      const idx = prev.indexOf(sectionId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const handleGeneratePDF = () => {
    const clientName = CLIENTS.find((c) => c.id === selectedClient)?.name ?? 'Client';
    showToast(`PDF generated for ${clientName} — ${activeSections.length} sections, ready for download.`);
  };

  const handleSaveTemplate = () => {
    showToast('Custom template saved successfully.');
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Report Builder</h1>
          <p className="text-slate-500">Create, customize, and export client-ready reports</p>
        </div>
        <Button onClick={handleBuildCustom} className="flex items-center gap-2">
          <Plus size={18} />
          Build Custom Report
        </Button>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  1. Report Templates                                         */}
      {/* ------------------------------------------------------------ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <LayoutTemplate size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Report Templates</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map((tpl) => (
            <Card
              key={tpl.id}
              className={`flex flex-col justify-between transition-all cursor-pointer ${
                selectedTemplate?.id === tpl.id
                  ? 'ring-2 ring-blue-500 border-blue-300'
                  : 'hover:border-slate-300 hover:shadow-md'
              }`}
              onClick={() => handleSelectTemplate(tpl)}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">{tpl.name}</h3>
                  <Badge variant="blue">{tpl.sectionCount} sections</Badge>
                </div>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">{tpl.description}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock size={13} />
                  Last used {tpl.lastUsed}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTemplate(tpl);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Use Template &rarr;
                </button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/*  2. Report Builder                                           */}
      {/* ------------------------------------------------------------ */}
      {builderOpen && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Layers size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedTemplate ? `Editing: ${selectedTemplate.name}` : 'Custom Report'}
            </h2>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Panel — Section Toggles */}
            <Card className="lg:col-span-2 max-h-[600px] overflow-y-auto">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
                Available Sections
              </h3>
              <div className="space-y-1">
                {ALL_SECTIONS.map((section) => {
                  const isActive = activeSections.includes(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => toggleSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isActive
                          ? 'bg-blue-50 border border-blue-200 text-blue-800'
                          : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {isActive ? '✓' : ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{section.name}</p>
                        <p className="text-xs text-slate-400 truncate">{section.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Right Panel — Live Preview */}
            <Card className="lg:col-span-3 max-h-[600px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Live Preview
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Eye size={14} />
                  {activeSections.length} section{activeSections.length !== 1 ? 's' : ''} selected
                </div>
              </div>

              {activeSections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <FileText size={40} className="mb-3 opacity-50" />
                  <p className="text-sm">Toggle sections on the left to build your report</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSections.map((sectionId, idx) => {
                    const section = ALL_SECTIONS.find((s) => s.id === sectionId);
                    if (!section) return null;
                    return (
                      <div
                        key={sectionId}
                        className="group flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        {/* Drag handle (visual) */}
                        <div className="pt-0.5 text-slate-300 group-hover:text-slate-400 cursor-grab">
                          <GripVertical size={16} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-400 w-5">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-800">{section.name}</h4>
                          </div>
                          <p className="text-xs text-slate-500 ml-7 leading-relaxed">
                            {SECTION_PREVIEWS[sectionId]}
                          </p>
                        </div>

                        {/* Reorder Buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveSection(sectionId, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => moveSection(sectionId, 'down')}
                            disabled={idx === activeSections.length - 1}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* ------------------------------------------------------ */}
          {/*  3. Configuration Bar                                   */}
          {/* ------------------------------------------------------ */}
          <Card className="mt-6">
            <div className="flex flex-wrap items-end gap-6">
              {/* Client Selector */}
              <div className="flex-1 min-w-[200px]">
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Users size={14} />
                  Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CLIENTS.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Selector */}
              <div className="flex-1 min-w-[180px]">
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Calendar size={14} />
                  Period
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as Period)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branding Toggle */}
              <div className="flex-1 min-w-[220px]">
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Palette size={14} />
                  Branding
                </label>
                <label className="flex items-center gap-3 px-3 py-2.5 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={includeBranding}
                      onChange={() => setIncludeBranding(!includeBranding)}
                      className="absolute w-full h-full opacity-0 cursor-pointer peer z-10"
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all pointer-events-none" />
                  </div>
                  <span className="text-sm text-slate-600">Include firm logo and colors</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={handleSaveTemplate}
                  className="flex items-center gap-2"
                >
                  <Save size={16} />
                  Save as Template
                </Button>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={activeSections.length === 0}
                  className="flex items-center gap-2"
                >
                  <FileDown size={16} />
                  Generate PDF
                </Button>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  4. Saved Reports                                            */}
      {/* ------------------------------------------------------------ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Saved Reports</h2>
        </div>
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Report Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {SAVED_REPORTS.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <span className="font-medium text-slate-900">{report.name}</span>
                  </TableCell>
                  <TableCell>{report.client}</TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>
                    <Badge variant="gray">{report.pages} pages</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => showToast(`Downloading "${report.name}"…`)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Download size={15} />
                      Download
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* ------------------------------------------------------------ */}
      {/*  5. Scheduled Reports                                        */}
      {/* ------------------------------------------------------------ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Scheduled Reports</h2>
        </div>

        <div className="space-y-4">
          {/* Active Schedules */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-medium text-slate-900">Active Schedules</h3>
              <Button onClick={() => showToast('Schedule creation form would open here.')} className="flex items-center gap-2 text-sm">
                <Plus size={16} />
                New Schedule
              </Button>
            </div>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Report</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {schedules.map((sched) => (
                  <TableRow key={sched.id}>
                    <TableCell><span className="font-medium text-slate-900">{sched.templateName}</span></TableCell>
                    <TableCell><Badge variant="gray" className="capitalize">{sched.frequency}</Badge></TableCell>
                    <TableCell>{sched.clientCount} clients</TableCell>
                    <TableCell className="capitalize">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={14} className="text-slate-400" />
                        {sched.deliveryMethod}
                      </span>
                    </TableCell>
                    <TableCell>{sched.nextRun}</TableCell>
                    <TableCell>{sched.lastRun ?? '-'}</TableCell>
                    <TableCell className="text-center">
                      {sched.lastStatus === 'completed' ? (
                        <Badge variant="green">
                          <CheckCircle size={12} className="mr-1" />
                          {sched.delivered} delivered
                        </Badge>
                      ) : (
                        <Badge variant="gray">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => showToast(`Running "${sched.templateName}" now...`)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Run Now"
                        >
                          <Play size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSchedules((prev) =>
                              prev.map((s) => s.id === sched.id ? { ...s, enabled: !s.enabled } : s)
                            );
                            showToast(sched.enabled ? 'Schedule paused.' : 'Schedule resumed.');
                          }}
                          className={sched.enabled ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'}
                          title={sched.enabled ? 'Pause' : 'Resume'}
                        >
                          {sched.enabled ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Run History */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-medium text-slate-900">Delivery History</h3>
            </div>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Report</TableHead>
                  <TableHead>Run Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Clients</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Failed</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {MOCK_RUN_HISTORY.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell><span className="font-medium text-slate-900">{run.templateName}</span></TableCell>
                    <TableCell>{run.runAt}</TableCell>
                    <TableCell>
                      <Badge variant={run.status === 'completed' ? 'green' : 'amber'} className="capitalize">
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{run.totalClients}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">{run.delivered}</TableCell>
                    <TableCell className={run.failed > 0 ? 'text-red-600 font-medium' : ''}>{run.failed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </section>
    </div>
  );
}
