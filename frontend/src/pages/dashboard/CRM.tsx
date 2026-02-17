import { useState } from 'react';
import {
  Users,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Filter,
  Search,
  Plus,
  Link2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Briefcase,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: ContactStatus;
  company: string;
  lastActivity: string;
  aum: number;
  advisorNotes: string;
  joinDate: string;
  riskProfile: string;
  accountType: string;
  recentActivities: ActivityEntry[];
}

type ContactStatus = 'Active' | 'Lead' | 'Client' | 'Inactive';

interface ActivityEntry {
  id: string;
  type: ActivityType;
  description: string;
  contactName: string;
  contactId: string;
  timestamp: string;
}

type ActivityType = 'call' | 'email' | 'meeting' | 'note';

interface PipelineDeal {
  id: string;
  contactName: string;
  contactId: string;
  estimatedAum: number;
  daysInStage: number;
  stage: PipelineStage;
  notes: string;
}

type PipelineStage =
  | 'New Lead'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Won'
  | 'Lost';

interface CRMIntegration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  lastSync: string | null;
  syncStatus: 'synced' | 'syncing' | 'error' | 'never';
  contactsSynced: number;
  logo: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Margaret Whitfield',
    email: 'margaret.whitfield@email.com',
    phone: '(212) 555-0142',
    status: 'Client',
    company: 'Whitfield Family Trust',
    lastActivity: '2026-02-15T14:30:00Z',
    aum: 4750000,
    advisorNotes: 'High-net-worth client. Interested in ESG-focused portfolio rebalancing. Annual review scheduled for March.',
    joinDate: '2023-06-15',
    riskProfile: 'Moderate',
    accountType: 'Trust',
    recentActivities: [
      { id: 'a1', type: 'meeting', description: 'Quarterly portfolio review - discussed tax-loss harvesting opportunities', contactName: 'Margaret Whitfield', contactId: 'c1', timestamp: '2026-02-15T14:30:00Z' },
      { id: 'a2', type: 'email', description: 'Sent updated financial plan with ESG overlay analysis', contactName: 'Margaret Whitfield', contactId: 'c1', timestamp: '2026-02-10T09:15:00Z' },
    ],
  },
  {
    id: 'c2',
    name: 'Robert Chen',
    email: 'rchen@techventures.io',
    phone: '(415) 555-0198',
    status: 'Active',
    company: 'TechVentures Capital',
    lastActivity: '2026-02-14T11:00:00Z',
    aum: 2300000,
    advisorNotes: 'Tech executive, concentrated stock position in employer shares. Working on diversification strategy.',
    joinDate: '2024-01-20',
    riskProfile: 'Aggressive',
    accountType: 'Individual',
    recentActivities: [
      { id: 'a3', type: 'call', description: 'Discussed 10b5-1 plan for systematic stock sale', contactName: 'Robert Chen', contactId: 'c2', timestamp: '2026-02-14T11:00:00Z' },
      { id: 'a4', type: 'note', description: 'Client wants to explore alternative investments - private credit fund', contactName: 'Robert Chen', contactId: 'c2', timestamp: '2026-02-12T16:00:00Z' },
    ],
  },
  {
    id: 'c3',
    name: 'Susan & David Park',
    email: 'parks@familyoffice.net',
    phone: '(305) 555-0167',
    status: 'Client',
    company: 'Park Family Office',
    lastActivity: '2026-02-13T09:45:00Z',
    aum: 5100000,
    advisorNotes: 'Dual-income household, both physicians. Focused on retirement planning and 529 plans for three children.',
    joinDate: '2022-09-10',
    riskProfile: 'Moderate',
    accountType: 'Joint',
    recentActivities: [
      { id: 'a5', type: 'meeting', description: 'Annual review - increased 529 contributions, reviewed insurance coverage', contactName: 'Susan & David Park', contactId: 'c3', timestamp: '2026-02-13T09:45:00Z' },
    ],
  },
  {
    id: 'c4',
    name: 'James Thornton',
    email: 'jthornton@thorntonlaw.com',
    phone: '(617) 555-0234',
    status: 'Lead',
    company: 'Thornton & Associates LLP',
    lastActivity: '2026-02-12T16:20:00Z',
    aum: 1200000,
    advisorNotes: 'Referred by Margaret Whitfield. Senior partner at law firm, interested in retirement planning and liability protection.',
    joinDate: '2026-01-28',
    riskProfile: 'Conservative',
    accountType: 'Individual',
    recentActivities: [
      { id: 'a6', type: 'email', description: 'Sent initial wealth assessment questionnaire and firm brochure', contactName: 'James Thornton', contactId: 'c4', timestamp: '2026-02-12T16:20:00Z' },
      { id: 'a7', type: 'call', description: 'Introductory call - discussed current portfolio and goals', contactName: 'James Thornton', contactId: 'c4', timestamp: '2026-02-08T10:00:00Z' },
    ],
  },
  {
    id: 'c5',
    name: 'Linda Martinez',
    email: 'lmartinez@globalhealth.org',
    phone: '(312) 555-0189',
    status: 'Active',
    company: 'Global Health Foundation',
    lastActivity: '2026-02-11T13:15:00Z',
    aum: 890000,
    advisorNotes: 'Non-profit executive. Interested in socially responsible investing. Recently received inheritance.',
    joinDate: '2024-08-05',
    riskProfile: 'Moderate',
    accountType: 'Individual',
    recentActivities: [
      { id: 'a8', type: 'meeting', description: 'Reviewed inheritance integration plan - Roth conversion ladder', contactName: 'Linda Martinez', contactId: 'c5', timestamp: '2026-02-11T13:15:00Z' },
    ],
  },
  {
    id: 'c6',
    name: 'Anthony Rizzo',
    email: 'arizzo@rizzodev.com',
    phone: '(646) 555-0276',
    status: 'Lead',
    company: 'Rizzo Development Corp',
    lastActivity: '2026-02-10T10:30:00Z',
    aum: 3400000,
    advisorNotes: 'Real estate developer. Looking to diversify beyond real estate. High cash flow but illiquid assets.',
    joinDate: '2026-02-01',
    riskProfile: 'Aggressive',
    accountType: 'Corporate',
    recentActivities: [
      { id: 'a9', type: 'call', description: 'Discovery call - mapped current real estate holdings and cash flow', contactName: 'Anthony Rizzo', contactId: 'c6', timestamp: '2026-02-10T10:30:00Z' },
    ],
  },
  {
    id: 'c7',
    name: 'Patricia Okonkwo',
    email: 'pokonkwo@email.com',
    phone: '(202) 555-0321',
    status: 'Inactive',
    company: 'Retired - Former Fed Economist',
    lastActivity: '2025-11-20T15:00:00Z',
    aum: 720000,
    advisorNotes: 'Retired federal economist. Conservative allocation. Has not responded to last two outreach attempts.',
    joinDate: '2021-03-12',
    riskProfile: 'Conservative',
    accountType: 'IRA',
    recentActivities: [
      { id: 'a10', type: 'email', description: 'Sent year-end tax document summary and check-in', contactName: 'Patricia Okonkwo', contactId: 'c7', timestamp: '2025-11-20T15:00:00Z' },
    ],
  },
  {
    id: 'c8',
    name: 'Michael & Karen Walsh',
    email: 'walsh.family@email.com',
    phone: '(860) 555-0145',
    status: 'Client',
    company: 'Walsh Dental Group',
    lastActivity: '2026-02-16T08:45:00Z',
    aum: 1850000,
    advisorNotes: 'Dental practice owners. Working on succession plan and practice valuation. Two kids in college.',
    joinDate: '2023-11-01',
    riskProfile: 'Moderate',
    accountType: 'Joint',
    recentActivities: [
      { id: 'a11', type: 'note', description: 'Updated practice valuation - estimated at $2.1M. Discussed ESOP options.', contactName: 'Michael & Karen Walsh', contactId: 'c8', timestamp: '2026-02-16T08:45:00Z' },
      { id: 'a12', type: 'meeting', description: 'Met with CPA to coordinate tax strategy for practice sale timeline', contactName: 'Michael & Karen Walsh', contactId: 'c8', timestamp: '2026-02-05T14:00:00Z' },
    ],
  },
];

const MOCK_ACTIVITIES: ActivityEntry[] = [
  { id: 'a11', type: 'note', description: 'Updated practice valuation - estimated at $2.1M. Discussed ESOP options.', contactName: 'Michael & Karen Walsh', contactId: 'c8', timestamp: '2026-02-16T08:45:00Z' },
  { id: 'a1', type: 'meeting', description: 'Quarterly portfolio review - discussed tax-loss harvesting opportunities', contactName: 'Margaret Whitfield', contactId: 'c1', timestamp: '2026-02-15T14:30:00Z' },
  { id: 'a3', type: 'call', description: 'Discussed 10b5-1 plan for systematic stock sale', contactName: 'Robert Chen', contactId: 'c2', timestamp: '2026-02-14T11:00:00Z' },
  { id: 'a5', type: 'meeting', description: 'Annual review - increased 529 contributions, reviewed insurance coverage', contactName: 'Susan & David Park', contactId: 'c3', timestamp: '2026-02-13T09:45:00Z' },
  { id: 'a4', type: 'note', description: 'Client wants to explore alternative investments - private credit fund', contactName: 'Robert Chen', contactId: 'c2', timestamp: '2026-02-12T16:00:00Z' },
  { id: 'a6', type: 'email', description: 'Sent initial wealth assessment questionnaire and firm brochure', contactName: 'James Thornton', contactId: 'c4', timestamp: '2026-02-12T16:20:00Z' },
  { id: 'a8', type: 'meeting', description: 'Reviewed inheritance integration plan - Roth conversion ladder', contactName: 'Linda Martinez', contactId: 'c5', timestamp: '2026-02-11T13:15:00Z' },
  { id: 'a2', type: 'email', description: 'Sent updated financial plan with ESG overlay analysis', contactName: 'Margaret Whitfield', contactId: 'c1', timestamp: '2026-02-10T09:15:00Z' },
  { id: 'a9', type: 'call', description: 'Discovery call - mapped current real estate holdings and cash flow', contactName: 'Anthony Rizzo', contactId: 'c6', timestamp: '2026-02-10T10:30:00Z' },
  { id: 'a7', type: 'call', description: 'Introductory call - discussed current portfolio and goals', contactName: 'James Thornton', contactId: 'c4', timestamp: '2026-02-08T10:00:00Z' },
  { id: 'a12', type: 'meeting', description: 'Met with CPA to coordinate tax strategy for practice sale timeline', contactName: 'Michael & Karen Walsh', contactId: 'c8', timestamp: '2026-02-05T14:00:00Z' },
  { id: 'a10', type: 'email', description: 'Sent year-end tax document summary and check-in', contactName: 'Patricia Okonkwo', contactId: 'c7', timestamp: '2025-11-20T15:00:00Z' },
];

const MOCK_DEALS: PipelineDeal[] = [
  { id: 'd1', contactName: 'James Thornton', contactId: 'c4', estimatedAum: 1200000, daysInStage: 5, stage: 'Qualified', notes: 'Sent questionnaire, awaiting response' },
  { id: 'd2', contactName: 'Anthony Rizzo', contactId: 'c6', estimatedAum: 3400000, daysInStage: 3, stage: 'New Lead', notes: 'Discovery call completed' },
  { id: 'd3', contactName: 'Margaret Whitfield', contactId: 'c1', estimatedAum: 750000, daysInStage: 12, stage: 'Proposal', notes: 'Additional AUM - ESG portfolio addon' },
  { id: 'd4', contactName: 'Robert Chen', contactId: 'c2', estimatedAum: 500000, daysInStage: 8, stage: 'Negotiation', notes: 'Concentrated stock diversification plan' },
  { id: 'd5', contactName: 'Linda Martinez', contactId: 'c5', estimatedAum: 450000, daysInStage: 2, stage: 'Qualified', notes: 'Inheritance integration review' },
  { id: 'd6', contactName: 'Susan & David Park', contactId: 'c3', estimatedAum: 600000, daysInStage: 20, stage: 'Won', notes: 'New 529 plans established' },
  { id: 'd7', contactName: 'Michael & Karen Walsh', contactId: 'c8', estimatedAum: 850000, daysInStage: 15, stage: 'Proposal', notes: 'Practice succession planning engagement' },
  { id: 'd8', contactName: 'Patricia Okonkwo', contactId: 'c7', estimatedAum: 200000, daysInStage: 45, stage: 'Lost', notes: 'Unresponsive - moved to another advisor' },
];

const MOCK_INTEGRATIONS: CRMIntegration[] = [
  {
    id: 'int1',
    name: 'Wealthbox',
    description: 'Sync contacts, activities, and opportunities with Wealthbox CRM.',
    connected: true,
    lastSync: '2026-02-17T08:30:00Z',
    syncStatus: 'synced',
    contactsSynced: 156,
    logo: 'W',
  },
  {
    id: 'int2',
    name: 'Redtail',
    description: 'Connect with Redtail CRM for contact and workflow synchronization.',
    connected: false,
    lastSync: null,
    syncStatus: 'never',
    contactsSynced: 0,
    logo: 'R',
  },
];

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_COLORS: Record<ContactStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Lead: 'bg-blue-50 text-blue-700 border border-blue-200',
  Client: 'bg-purple-50 text-purple-700 border border-purple-200',
  Inactive: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const ACTIVITY_ICONS: Record<ActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  call: 'bg-green-50 text-green-600',
  email: 'bg-blue-50 text-blue-600',
  meeting: 'bg-purple-50 text-purple-600',
  note: 'bg-amber-50 text-amber-600',
};

const PIPELINE_STAGES: PipelineStage[] = [
  'New Lead',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
];

const STAGE_COLORS: Record<PipelineStage, string> = {
  'New Lead': 'border-t-blue-400',
  Qualified: 'border-t-indigo-400',
  Proposal: 'border-t-purple-400',
  Negotiation: 'border-t-amber-400',
  Won: 'border-t-emerald-400',
  Lost: 'border-t-red-400',
};

const STAGE_HEADER_COLORS: Record<PipelineStage, string> = {
  'New Lead': 'text-blue-700 bg-blue-50',
  Qualified: 'text-indigo-700 bg-indigo-50',
  Proposal: 'text-purple-700 bg-purple-50',
  Negotiation: 'text-amber-700 bg-amber-50',
  Won: 'text-emerald-700 bg-emerald-50',
  Lost: 'text-red-700 bg-red-50',
};

// ============================================================================
// HELPERS
// ============================================================================

const fmtCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

const fmtCurrencyShort = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return fmtCurrency(value);
};

const fmtTimestamp = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

type TabId = 'contacts' | 'activities' | 'pipeline' | 'integrations';

function SummaryCards({ contacts, deals }: { contacts: Contact[]; deals: PipelineDeal[] }) {
  const totalContacts = contacts.length;
  const activeClients = contacts.filter((c) => c.status === 'Client' || c.status === 'Active').length;
  const openDeals = deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost').length;
  const pipelineValue = deals
    .filter((d) => d.stage !== 'Won' && d.stage !== 'Lost')
    .reduce((sum, d) => sum + d.estimatedAum, 0);

  const cards = [
    { label: 'Total Contacts', value: totalContacts.toString(), icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Active Clients', value: activeClients.toString(), icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Open Deals', value: openDeals.toString(), icon: Briefcase, iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
    { label: 'Pipeline Value', value: fmtCurrencyShort(pipelineValue), icon: DollarSign, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// CONTACTS TAB
// ============================================================================

function ContactsTab({ contacts }: { contacts: Contact[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'All'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContactStatus | 'All')}
            className="pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Lead">Lead</option>
            <option value="Client">Client</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Last Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((contact) => {
                const isExpanded = expandedId === contact.id;
                return (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : contact.id)}
                  />
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No contacts found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  contact,
  isExpanded,
  onToggle,
}: {
  contact: Contact;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="hover:bg-slate-50 cursor-pointer transition-colors"
      >
        <td className="px-6 py-4">
          <p className="font-medium text-slate-900 text-sm">{contact.name}</p>
          <p className="text-xs text-slate-500 md:hidden">{contact.email}</p>
        </td>
        <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">{contact.email}</td>
        <td className="px-6 py-4 text-sm text-slate-600 hidden lg:table-cell">{contact.phone}</td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[contact.status]}`}>
            {contact.status}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">{contact.company}</td>
        <td className="px-6 py-4 text-sm text-slate-500 hidden lg:table-cell">{fmtTimestamp(contact.lastActivity)}</td>
        <td className="px-6 py-4">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-6 py-5 bg-slate-50 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Contact Details</h4>
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-2 text-slate-700">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {contact.email}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {contact.phone}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                    {contact.company}
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    AUM: <span className="font-semibold text-slate-700">{fmtCurrency(contact.aum)}</span>
                  </p>
                  <p className="text-slate-500 text-xs">
                    Risk Profile: <span className="font-medium text-slate-700">{contact.riskProfile}</span>
                    {' · '}Account: <span className="font-medium text-slate-700">{contact.accountType}</span>
                  </p>
                  <p className="text-slate-500 text-xs">
                    Client since: <span className="font-medium text-slate-700">{fmtDate(contact.joinDate)}</span>
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Advisor Notes</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{contact.advisorNotes}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Recent Activities</h4>
                <div className="space-y-2">
                  {contact.recentActivities.map((activity) => {
                    const Icon = ACTIVITY_ICONS[activity.type];
                    return (
                      <div key={activity.id} className="flex items-start gap-2">
                        <div className={`p-1 rounded ${ACTIVITY_COLORS[activity.type]} mt-0.5`}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 line-clamp-2">{activity.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{fmtTimestamp(activity.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================================
// ACTIVITIES TAB
// ============================================================================

function ActivitiesTab({
  activities,
  onAddActivity,
}: {
  activities: ActivityEntry[];
  onAddActivity: (entry: ActivityEntry) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'call' as ActivityType,
    description: '',
    contactName: '',
  });

  const filtered =
    typeFilter === 'all'
      ? activities
      : activities.filter((a) => a.type === typeFilter);

  const handleSubmit = () => {
    if (!formData.description.trim() || !formData.contactName.trim()) return;
    const newEntry: ActivityEntry = {
      id: `a-new-${Date.now()}`,
      type: formData.type,
      description: formData.description.trim(),
      contactName: formData.contactName.trim(),
      contactId: '',
      timestamp: new Date().toISOString(),
    };
    onAddActivity(newEntry);
    setFormData({ type: 'call', description: '', contactName: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ActivityType | 'all')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="call">Calls</option>
            <option value="email">Emails</option>
            <option value="meeting">Meetings</option>
            <option value="note">Notes</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log Activity
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Log New Activity</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ActivityType })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="e.g. Margaret Whitfield"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSubmit}
                disabled={!formData.description.trim() || !formData.contactName.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Activity details..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filtered.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type];
            return (
              <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className={`p-2.5 rounded-lg ${ACTIVITY_COLORS[activity.type]} flex-shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{activity.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-medium text-slate-500">{activity.contactName}</span>
                    <span className="text-xs text-slate-400">{fmtTimestamp(activity.timestamp)}</span>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400 capitalize flex-shrink-0 hidden sm:block">
                  {activity.type}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500 text-sm">
              No activities found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PIPELINE TAB
// ============================================================================

function PipelineTab({ deals }: { deals: PipelineDeal[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const stageValue = stageDeals.reduce((sum, d) => sum + d.estimatedAum, 0);

        return (
          <div key={stage} className="flex-shrink-0 w-64">
            <div className={`rounded-t-lg px-3 py-2 ${STAGE_HEADER_COLORS[stage]}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{stage}</h3>
                <span className="text-xs font-medium opacity-75">{stageDeals.length}</span>
              </div>
              {stageValue > 0 && (
                <p className="text-xs opacity-75 mt-0.5">{fmtCurrencyShort(stageValue)}</p>
              )}
            </div>
            <div className={`bg-slate-50 rounded-b-lg border-t-4 ${STAGE_COLORS[stage]} p-2 space-y-2 min-h-[200px]`}>
              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <p className="font-medium text-sm text-slate-900">{deal.contactName}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{deal.notes}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {fmtCurrencyShort(deal.estimatedAum)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {deal.daysInStage}d
                    </span>
                  </div>
                </div>
              ))}
              {stageDeals.length === 0 && (
                <div className="flex items-center justify-center h-32 text-xs text-slate-400">
                  No deals
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// INTEGRATIONS TAB
// ============================================================================

function IntegrationsTab({
  integrations,
  onToggle,
  onSync,
}: {
  integrations: CRMIntegration[];
  onToggle: (id: string) => void;
  onSync: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {integrations.map((integration) => (
        <div
          key={integration.id}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                integration.connected
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {integration.logo}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{integration.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {integration.connected ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500 mb-4">{integration.description}</p>

          {integration.connected && (
            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-500">Last Sync</p>
                <p className="text-sm font-medium text-slate-700">
                  {integration.lastSync ? fmtTimestamp(integration.lastSync) : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Contacts Synced</p>
                <p className="text-sm font-medium text-slate-700">{integration.contactsSynced}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Sync Status</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {integration.syncStatus === 'synced' && (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600">Up to date</span>
                    </>
                  )}
                  {integration.syncStatus === 'syncing' && (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                      <span className="text-sm font-medium text-blue-600">Syncing...</span>
                    </>
                  )}
                  {integration.syncStatus === 'error' && (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-sm font-medium text-red-600">Sync Error</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggle(integration.id)}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                integration.connected
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {integration.connected ? (
                <>
                  <Link2 className="h-4 w-4" />
                  Disconnect
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Connect
                </>
              )}
            </button>
            {integration.connected && (
              <button
                onClick={() => onSync(integration.id)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Sync
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CRM() {
  const [activeTab, setActiveTab] = useState<TabId>('contacts');
  const [activities, setActivities] = useState<ActivityEntry[]>(MOCK_ACTIVITIES);
  const [integrations, setIntegrations] = useState<CRMIntegration[]>(MOCK_INTEGRATIONS);

  const handleAddActivity = (entry: ActivityEntry) => {
    setActivities((prev) => [entry, ...prev]);
  };

  const handleToggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id
          ? {
              ...int,
              connected: !int.connected,
              lastSync: int.connected ? int.lastSync : null,
              syncStatus: int.connected ? 'never' as const : 'synced' as const,
              contactsSynced: int.connected ? 0 : int.contactsSynced,
            }
          : int,
      ),
    );
  };

  const handleSyncIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id ? { ...int, syncStatus: 'syncing' as const } : int,
      ),
    );
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === id
            ? { ...int, syncStatus: 'synced' as const, lastSync: new Date().toISOString() }
            : int,
        ),
      );
    }, 2000);
  };

  const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'activities', label: 'Activities', icon: Clock },
    { id: 'pipeline', label: 'Pipeline', icon: Briefcase },
    { id: 'integrations', label: 'Integrations', icon: Link2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
        <p className="text-slate-500">Manage contacts, track activities, and monitor your deal pipeline</p>
      </div>

      <SummaryCards contacts={MOCK_CONTACTS} deals={MOCK_DEALS} />

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1" aria-label="CRM Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'contacts' && <ContactsTab contacts={MOCK_CONTACTS} />}
      {activeTab === 'activities' && (
        <ActivitiesTab activities={activities} onAddActivity={handleAddActivity} />
      )}
      {activeTab === 'pipeline' && <PipelineTab deals={MOCK_DEALS} />}
      {activeTab === 'integrations' && (
        <IntegrationsTab
          integrations={integrations}
          onToggle={handleToggleIntegration}
          onSync={handleSyncIntegration}
        />
      )}
    </div>
  );
}
