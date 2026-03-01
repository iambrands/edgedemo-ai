import { useState, useMemo } from 'react';
import {
  DollarSign,
  Receipt,
  Calculator,
  TrendingUp,
  Calendar,
  FileText,
  Send,
  Download,
  Filter,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Users,
  Percent,
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
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs';
import { SearchInput } from '../../components/ui/SearchInput';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatPercent, formatDate } from '../../utils/format';
import { CHART_COLORS, getChartColor } from '../../constants/chartTheme';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FeeTier {
  rangeLabel: string;
  rate: number;
}

interface FeeSchedule {
  id: string;
  name: string;
  description: string;
  tiers: FeeTier[];
  minimumAccount: number;
  billingFrequency: 'Monthly' | 'Quarterly';
  active: boolean;
  clientCount: number;
}

interface ClientBilling {
  id: string;
  name: string;
  aum: number;
  scheduleId: string;
  scheduleName: string;
  annualFee: number;
  quarterlyFee: number;
  lastBilled: string;
  nextBillDate: string;
  status: 'Current' | 'Overdue' | 'Pending';
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientId: string;
  period: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  dueDate: string;
  paidDate: string | null;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface FeeCompressionYear {
  year: number;
  avgRate: number;
}

type TabId = 'schedules' | 'clients' | 'invoices' | 'analytics';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_SCHEDULES: FeeSchedule[] = [
  {
    id: 'sch-1',
    name: 'Standard AUM',
    description: 'Default fee schedule for individual accounts',
    tiers: [
      { rangeLabel: 'First $500K', rate: 1.0 },
      { rangeLabel: '$500K – $1.5M', rate: 0.75 },
      { rangeLabel: 'Above $1.5M', rate: 0.5 },
    ],
    minimumAccount: 250_000,
    billingFrequency: 'Quarterly',
    active: true,
    clientCount: 42,
  },
  {
    id: 'sch-2',
    name: 'High Net Worth',
    description: 'Discounted tiers for HNW relationships',
    tiers: [
      { rangeLabel: 'First $2M', rate: 0.75 },
      { rangeLabel: '$2M – $5M', rate: 0.55 },
      { rangeLabel: '$5M – $10M', rate: 0.4 },
      { rangeLabel: 'Above $10M', rate: 0.3 },
    ],
    minimumAccount: 1_000_000,
    billingFrequency: 'Quarterly',
    active: true,
    clientCount: 18,
  },
  {
    id: 'sch-3',
    name: 'Family Office',
    description: 'Custom pricing for family office engagements',
    tiers: [
      { rangeLabel: 'First $10M', rate: 0.5 },
      { rangeLabel: '$10M – $25M', rate: 0.35 },
      { rangeLabel: 'Above $25M', rate: 0.25 },
    ],
    minimumAccount: 5_000_000,
    billingFrequency: 'Monthly',
    active: true,
    clientCount: 6,
  },
  {
    id: 'sch-4',
    name: 'Performance + AUM',
    description: 'Base AUM fee plus performance incentive',
    tiers: [
      { rangeLabel: 'All AUM (base)', rate: 0.5 },
      { rangeLabel: 'Performance above benchmark', rate: 10.0 },
    ],
    minimumAccount: 2_000_000,
    billingFrequency: 'Quarterly',
    active: false,
    clientCount: 3,
  },
];

const MOCK_CLIENTS: ClientBilling[] = [
  { id: 'c-1', name: 'Harrison & Wells Family Trust', aum: 4_850_000, scheduleId: 'sch-2', scheduleName: 'High Net Worth', annualFee: 29_575, quarterlyFee: 7_394, lastBilled: '2025-12-31', nextBillDate: '2026-03-31', status: 'Current' },
  { id: 'c-2', name: 'Margaret Liu', aum: 1_250_000, scheduleId: 'sch-1', scheduleName: 'Standard AUM', annualFee: 8_750, quarterlyFee: 2_188, lastBilled: '2025-12-31', nextBillDate: '2026-03-31', status: 'Current' },
  { id: 'c-3', name: 'Redwood Ventures LLC', aum: 12_500_000, scheduleId: 'sch-3', scheduleName: 'Family Office', annualFee: 50_750, quarterlyFee: 12_688, lastBilled: '2026-01-31', nextBillDate: '2026-02-28', status: 'Current' },
  { id: 'c-4', name: 'David & Sarah Patel', aum: 875_000, scheduleId: 'sch-1', scheduleName: 'Standard AUM', annualFee: 7_813, quarterlyFee: 1_953, lastBilled: '2025-12-31', nextBillDate: '2026-03-31', status: 'Pending' },
  { id: 'c-5', name: 'Oaktree Foundation', aum: 28_000_000, scheduleId: 'sch-3', scheduleName: 'Family Office', annualFee: 95_500, quarterlyFee: 23_875, lastBilled: '2026-01-31', nextBillDate: '2026-02-28', status: 'Current' },
  { id: 'c-6', name: 'James K. Thornton', aum: 620_000, scheduleId: 'sch-1', scheduleName: 'Standard AUM', annualFee: 5_900, quarterlyFee: 1_475, lastBilled: '2025-09-30', nextBillDate: '2025-12-31', status: 'Overdue' },
  { id: 'c-7', name: 'Chen Family Holdings', aum: 7_200_000, scheduleId: 'sch-2', scheduleName: 'High Net Worth', annualFee: 37_600, quarterlyFee: 9_400, lastBilled: '2025-12-31', nextBillDate: '2026-03-31', status: 'Current' },
  { id: 'c-8', name: 'Priya Sharma-Williams', aum: 980_000, scheduleId: 'sch-1', scheduleName: 'Standard AUM', annualFee: 8_600, quarterlyFee: 2_150, lastBilled: '2025-12-31', nextBillDate: '2026-03-31', status: 'Current' },
  { id: 'c-9', name: 'Lakeshore Partners LP', aum: 3_400_000, scheduleId: 'sch-4', scheduleName: 'Performance + AUM', annualFee: 17_000, quarterlyFee: 4_250, lastBilled: '2025-12-31', nextBillDate: '2026-03-31', status: 'Current' },
  { id: 'c-10', name: 'Robert & Karen Fitzgerald', aum: 1_650_000, scheduleId: 'sch-2', scheduleName: 'High Net Worth', annualFee: 12_375, quarterlyFee: 3_094, lastBilled: '2025-12-31', nextBillDate: '2026-03-31', status: 'Pending' },
  { id: 'c-11', name: 'Amara Johnson', aum: 450_000, scheduleId: 'sch-1', scheduleName: 'Standard AUM', annualFee: 4_500, quarterlyFee: 1_125, lastBilled: '2025-12-31', nextBillDate: '2026-03-31', status: 'Current' },
  { id: 'c-12', name: 'Greenfield Endowment', aum: 18_750_000, scheduleId: 'sch-3', scheduleName: 'Family Office', annualFee: 72_625, quarterlyFee: 18_156, lastBilled: '2026-01-31', nextBillDate: '2026-02-28', status: 'Current' },
];

const MOCK_INVOICES: Invoice[] = [
  { id: 'inv-1', invoiceNumber: 'INV-2026-0041', clientName: 'Harrison & Wells Family Trust', clientId: 'c-1', period: 'Q4 2025', amount: 7_394, status: 'Paid', dueDate: '2026-01-15', paidDate: '2026-01-12' },
  { id: 'inv-2', invoiceNumber: 'INV-2026-0042', clientName: 'Margaret Liu', clientId: 'c-2', period: 'Q4 2025', amount: 2_188, status: 'Paid', dueDate: '2026-01-15', paidDate: '2026-01-14' },
  { id: 'inv-3', invoiceNumber: 'INV-2026-0043', clientName: 'Redwood Ventures LLC', clientId: 'c-3', period: 'Jan 2026', amount: 4_229, status: 'Paid', dueDate: '2026-02-15', paidDate: '2026-02-10' },
  { id: 'inv-4', invoiceNumber: 'INV-2026-0044', clientName: 'David & Sarah Patel', clientId: 'c-4', period: 'Q4 2025', amount: 1_953, status: 'Pending', dueDate: '2026-02-28', paidDate: null },
  { id: 'inv-5', invoiceNumber: 'INV-2026-0045', clientName: 'Oaktree Foundation', clientId: 'c-5', period: 'Jan 2026', amount: 7_958, status: 'Paid', dueDate: '2026-02-15', paidDate: '2026-02-08' },
  { id: 'inv-6', invoiceNumber: 'INV-2026-0046', clientName: 'James K. Thornton', clientId: 'c-6', period: 'Q3 2025', amount: 1_475, status: 'Overdue', dueDate: '2025-11-15', paidDate: null },
  { id: 'inv-7', invoiceNumber: 'INV-2026-0047', clientName: 'Chen Family Holdings', clientId: 'c-7', period: 'Q4 2025', amount: 9_400, status: 'Paid', dueDate: '2026-01-15', paidDate: '2026-01-10' },
  { id: 'inv-8', invoiceNumber: 'INV-2026-0048', clientName: 'Priya Sharma-Williams', clientId: 'c-8', period: 'Q4 2025', amount: 2_150, status: 'Paid', dueDate: '2026-01-15', paidDate: '2026-01-15' },
  { id: 'inv-9', invoiceNumber: 'INV-2026-0049', clientName: 'Lakeshore Partners LP', clientId: 'c-9', period: 'Q4 2025', amount: 4_250, status: 'Paid', dueDate: '2026-01-15', paidDate: '2026-01-13' },
  { id: 'inv-10', invoiceNumber: 'INV-2026-0050', clientName: 'Robert & Karen Fitzgerald', clientId: 'c-10', period: 'Q4 2025', amount: 3_094, status: 'Pending', dueDate: '2026-02-28', paidDate: null },
  { id: 'inv-11', invoiceNumber: 'INV-2026-0051', clientName: 'Amara Johnson', clientId: 'c-11', period: 'Q4 2025', amount: 1_125, status: 'Paid', dueDate: '2026-01-15', paidDate: '2026-01-11' },
  { id: 'inv-12', invoiceNumber: 'INV-2026-0052', clientName: 'Greenfield Endowment', clientId: 'c-12', period: 'Jan 2026', amount: 6_052, status: 'Paid', dueDate: '2026-02-15', paidDate: '2026-02-14' },
  { id: 'inv-13', invoiceNumber: 'INV-2026-0053', clientName: 'Harrison & Wells Family Trust', clientId: 'c-1', period: 'Q3 2025', amount: 7_250, status: 'Paid', dueDate: '2025-10-15', paidDate: '2025-10-12' },
  { id: 'inv-14', invoiceNumber: 'INV-2026-0054', clientName: 'Redwood Ventures LLC', clientId: 'c-3', period: 'Dec 2025', amount: 4_229, status: 'Paid', dueDate: '2026-01-15', paidDate: '2026-01-09' },
  { id: 'inv-15', invoiceNumber: 'INV-2026-0055', clientName: 'Oaktree Foundation', clientId: 'c-5', period: 'Dec 2025', amount: 7_958, status: 'Paid', dueDate: '2026-01-15', paidDate: '2026-01-07' },
  { id: 'inv-16', invoiceNumber: 'INV-2026-0056', clientName: 'Chen Family Holdings', clientId: 'c-7', period: 'Q3 2025', amount: 9_200, status: 'Paid', dueDate: '2025-10-15', paidDate: '2025-10-14' },
  { id: 'inv-17', invoiceNumber: 'INV-2026-0057', clientName: 'Greenfield Endowment', clientId: 'c-12', period: 'Dec 2025', amount: 6_052, status: 'Draft', dueDate: '2026-01-15', paidDate: null },
];

const MONTHLY_REVENUE: MonthlyRevenue[] = [
  { month: 'Mar 2025', revenue: 26_800 },
  { month: 'Apr 2025', revenue: 27_350 },
  { month: 'May 2025', revenue: 28_100 },
  { month: 'Jun 2025', revenue: 29_700 },
  { month: 'Jul 2025', revenue: 28_900 },
  { month: 'Aug 2025', revenue: 29_400 },
  { month: 'Sep 2025', revenue: 30_250 },
  { month: 'Oct 2025', revenue: 31_100 },
  { month: 'Nov 2025', revenue: 30_800 },
  { month: 'Dec 2025', revenue: 32_500 },
  { month: 'Jan 2026', revenue: 33_100 },
  { month: 'Feb 2026', revenue: 33_800 },
];

const FEE_COMPRESSION: FeeCompressionYear[] = [
  { year: 2022, avgRate: 0.82 },
  { year: 2023, avgRate: 0.78 },
  { year: 2024, avgRate: 0.73 },
  { year: 2025, avgRate: 0.68 },
  { year: 2026, avgRate: 0.65 },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'green' | 'amber' | 'red' | 'blue' | 'gray'; icon: typeof CheckCircle }> = {
    Current: { variant: 'green', icon: CheckCircle },
    Paid: { variant: 'green', icon: CheckCircle },
    Pending: { variant: 'amber', icon: Clock },
    Overdue: { variant: 'red', icon: AlertTriangle },
    Draft: { variant: 'gray', icon: FileText },
  };
  const cfg = map[status] ?? { variant: 'gray' as const, icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}


/* ------------------------------------------------------------------ */
/*  Tab: Fee Schedules                                                 */
/* ------------------------------------------------------------------ */

function FeeSchedulesTab() {
  const [schedules, setSchedules] = useState<FeeSchedule[]>(MOCK_SCHEDULES);
  const toast = useToast();

  const toggleActive = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = !s.active;
        toast[next ? 'success' : 'info'](`${s.name} schedule ${next ? 'activated' : 'deactivated'}`);
        return { ...s, active: next };
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fee Schedules</h2>
          <p className="text-sm text-slate-500">Manage tiered fee structures for your client segments</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Schedule
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {schedules.map((sch) => (
          <Card key={sch.id} className={`!p-6 ${!sch.active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{sch.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{sch.description}</p>
              </div>
              <button onClick={() => toggleActive(sch.id)} className="text-slate-400 hover:text-blue-600 transition-colors" title={sch.active ? 'Deactivate' : 'Activate'}>
                {sch.active ? <ToggleRight className="w-7 h-7 text-blue-600" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>

            {/* Tiers table */}
            <div className="rounded-lg border border-slate-200 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">AUM Range</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">Annual Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sch.tiers.map((t, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700">{t.rangeLabel}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{formatPercent(t.rate, { showSign: false })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                Min: {formatCurrency(sch.minimumAccount)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {sch.billingFrequency}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {sch.clientCount} clients
              </span>
              <Badge variant={sch.active ? 'green' : 'gray'}>{sch.active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Client Billing                                                */
/* ------------------------------------------------------------------ */

function ClientBillingTab() {
  const [search, setSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');
  const toast = useToast();

  const filteredClients = useMemo(() => {
    let list = MOCK_CLIENTS;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (scheduleFilter !== 'all') {
      list = list.filter((c) => c.scheduleId === scheduleFilter);
    }
    return list;
  }, [search, scheduleFilter]);

  const totalAum = MOCK_CLIENTS.reduce((s, c) => s + c.aum, 0);
  const annualRev = MOCK_CLIENTS.reduce((s, c) => s + c.annualFee, 0);
  const quarterlyRev = MOCK_CLIENTS.reduce((s, c) => s + c.quarterlyFee, 0);
  const billedThisQ = MOCK_CLIENTS.filter((c) => c.status === 'Current').length;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<DollarSign size={18} />} label="Total AUM Under Fee" value={formatCurrency(totalAum)} />
        <MetricCard icon={<TrendingUp size={18} />} label="Annual Revenue" value={formatCurrency(annualRev)} sublabel="+8.3% YoY" color="emerald" />
        <MetricCard icon={<Receipt size={18} />} label="Quarterly Revenue" value={formatCurrency(quarterlyRev)} />
        <MetricCard icon={<Users size={18} />} label="Clients Billed This Quarter" value={`${billedThisQ} / ${MOCK_CLIENTS.length}`} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 w-full sm:max-w-xs"
        />

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Schedules</option>
            {MOCK_SCHEDULES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <Button size="sm" className="ml-auto" onClick={() => toast.success('Invoices generated for all pending clients')}>
          <Receipt className="w-4 h-4 mr-1.5" />
          Generate Invoices
        </Button>
      </div>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">AUM</TableHead>
              <TableHead>Fee Schedule</TableHead>
              <TableHead className="text-right">Annual Fee</TableHead>
              <TableHead className="text-right">Quarterly Fee</TableHead>
              <TableHead>Last Billed</TableHead>
              <TableHead>Next Bill</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-slate-900">{c.name}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(c.aum)}</TableCell>
                <TableCell>
                  <Badge variant="blue">{c.scheduleName}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(c.annualFee, { decimals: 2 })}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(c.quarterlyFee, { decimals: 2 })}</TableCell>
                <TableCell className="text-slate-500">{formatDate(c.lastBilled)}</TableCell>
                <TableCell className="text-slate-500">{formatDate(c.nextBillDate)}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
              </TableRow>
            ))}
            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                  No clients match your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Invoices                                                      */
/* ------------------------------------------------------------------ */

function InvoicesTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const toast = useToast();

  const filtered = useMemo(() => {
    let list = MOCK_INVOICES;
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.clientName.toLowerCase().includes(q) ||
          i.invoiceNumber.toLowerCase().includes(q),
      );
    }
    return list;
  }, [statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 w-full sm:max-w-xs"
        />

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Paid Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs font-medium text-slate-900">{inv.invoiceNumber}</TableCell>
                <TableCell className="font-medium">{inv.clientName}</TableCell>
                <TableCell className="text-slate-500">{inv.period}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatCurrency(inv.amount, { decimals: 2 })}</TableCell>
                <TableCell>
                  <StatusBadge status={inv.status} />
                </TableCell>
                <TableCell className="text-slate-500">{formatDate(inv.dueDate)}</TableCell>
                <TableCell className="text-slate-500">{inv.paidDate ? formatDate(inv.paidDate) : '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Download" onClick={() => toast.info(`Downloading ${inv.invoiceNumber}...`)}>
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Send" onClick={() => toast.success(`Invoice ${inv.invoiceNumber} sent to ${inv.clientName}`)}>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                  No invoices match your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Revenue Analytics                                             */
/* ------------------------------------------------------------------ */

function RevenueAnalyticsTab() {
  const totalRevYtd = MONTHLY_REVENUE.slice(-2).reduce((s, m) => s + m.revenue, 0);
  const prevYtd = MONTHLY_REVENUE.slice(-14, -12).reduce((s, m) => s + m.revenue, 0);
  const revGrowth = prevYtd > 0 ? ((totalRevYtd - prevYtd) / prevYtd) * 100 : 0;
  const avgFeeRate = 0.65;
  const clientRetention = 96.8;

  const maxMonthlyRev = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));

  /* Revenue by schedule */
  const scheduleRevenue = [
    { name: 'Standard AUM', revenue: 35_563, color: getChartColor(0) },
    { name: 'High Net Worth', revenue: 79_550, color: getChartColor(7) },
    { name: 'Family Office', revenue: 218_875, color: getChartColor(3) },
    { name: 'Performance + AUM', revenue: 17_000, color: getChartColor(1) },
  ];
  const maxScheduleRev = Math.max(...scheduleRevenue.map((s) => s.revenue));

  /* Top clients by revenue */
  const topClients = [...MOCK_CLIENTS]
    .sort((a, b) => b.annualFee - a.annualFee)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<DollarSign size={18} />} label="Total Revenue YTD" value={formatCurrency(totalRevYtd)} sublabel={`${formatPercent(revGrowth, { decimals: 1 })} YoY`} />
        <MetricCard icon={<TrendingUp size={18} />} label="Revenue Growth" value={formatPercent(revGrowth, { decimals: 1 })} sublabel="vs. prior year period" color="emerald" />
        <MetricCard icon={<Percent size={18} />} label="Average Fee Rate" value={formatPercent(avgFeeRate, { showSign: false })} sublabel="-3 bps YoY" color="amber" />
        <MetricCard icon={<Users size={18} />} label="Client Retention" value={`${clientRetention}%`} sublabel="+1.2% YoY" color="emerald" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Fee Schedule */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Revenue by Fee Schedule
          </h3>
          <div className="space-y-4">
            {scheduleRevenue.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{s.name}</span>
                  <span className="text-slate-900 font-semibold tabular-nums">{formatCurrency(s.revenue)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${(s.revenue / maxScheduleRev) * 100}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Monthly Revenue Trend
          </h3>
          <div className="space-y-2.5">
            {MONTHLY_REVENUE.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20 shrink-0 text-right">{m.month}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 relative">
                  <div
                    className="h-5 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${(m.revenue / maxMonthlyRev) * 100}%`, backgroundColor: CHART_COLORS[0] }}
                  >
                    <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                      {formatCurrency(m.revenue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top 10 clients */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Top 10 Clients by Revenue
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">AUM</TableHead>
                <TableHead className="text-right">Annual Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topClients.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-slate-400 font-medium">{i + 1}</TableCell>
                  <TableCell className="font-medium text-slate-900">{c.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(c.aum)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(c.annualFee, { decimals: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Fee Compression */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Fee Compression Analysis
          </h3>
          <p className="text-xs text-slate-500 mb-5">Average effective fee rate across all clients by year</p>
          <div className="space-y-4">
            {FEE_COMPRESSION.map((yr) => {
              const maxRate = Math.max(...FEE_COMPRESSION.map((y) => y.avgRate));
              return (
                <div key={yr.year}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{yr.year}</span>
                    <span className="text-slate-900 font-semibold tabular-nums">{formatPercent(yr.avgRate, { showSign: false })}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ width: `${(yr.avgRate / maxRate) * 100}%`, background: `linear-gradient(to right, ${CHART_COLORS[7]}, ${CHART_COLORS[0]})` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Fee compression of ~3 bps/year reflects industry-wide pricing pressure
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Billing() {
  const [activeTab, setActiveTab] = useState<TabId>('schedules');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Automation"
        subtitle="Manage fee schedules, generate invoices, and track revenue"
      />

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v as TabId)}>
        <TabList>
          <Tab value="schedules" icon={<Calculator className="w-4 h-4" />}>Fee Schedules</Tab>
          <Tab value="clients" icon={<Users className="w-4 h-4" />}>Client Billing</Tab>
          <Tab value="invoices" icon={<FileText className="w-4 h-4" />}>Invoices</Tab>
          <Tab value="analytics" icon={<BarChart3 className="w-4 h-4" />}>Revenue Analytics</Tab>
        </TabList>

        <TabPanel value="schedules" className="mt-6">
          <FeeSchedulesTab />
        </TabPanel>
        <TabPanel value="clients" className="mt-6">
          <ClientBillingTab />
        </TabPanel>
        <TabPanel value="invoices" className="mt-6">
          <InvoicesTab />
        </TabPanel>
        <TabPanel value="analytics" className="mt-6">
          <RevenueAnalyticsTab />
        </TabPanel>
      </Tabs>
    </div>
  );
}
