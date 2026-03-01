import { useState, useEffect, useCallback } from 'react';
import { Users, DollarSign, TrendingUp, Trophy } from 'lucide-react';
import {
  listProspects,
  getPipelineSummary,
  getActivities,
  getProposals,
  createProspect,
  updateProspect,
  logActivity,
  generateProposal,
  rescoreProspect,
} from '../../services/prospectApi';
import type {
  Prospect,
  Activity,
  Proposal,
  PipelineSummary,
  ProspectStatus,
} from '../../services/prospectApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { formatCurrency, formatDate } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<
  ProspectStatus,
  { label: string; color: string }
> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contacted', color: 'bg-purple-100 text-purple-800' },
  qualified: { label: 'Qualified', color: 'bg-indigo-100 text-indigo-800' },
  meeting_scheduled: { label: 'Meeting Scheduled', color: 'bg-yellow-100 text-yellow-800' },
  meeting_completed: { label: 'Meeting Done', color: 'bg-orange-100 text-orange-800' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-pink-100 text-pink-800' },
  negotiating: { label: 'Negotiating', color: 'bg-cyan-100 text-cyan-800' },
  won: { label: 'Won', color: 'bg-emerald-100 text-emerald-800' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-800' },
  nurturing: { label: 'Nurturing', color: 'bg-slate-100 text-slate-800' },
};

const PIPELINE_ORDER: ProspectStatus[] = [
  'new',
  'contacted',
  'qualified',
  'meeting_scheduled',
  'meeting_completed',
  'proposal_sent',
  'negotiating',
];

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'existing_client', label: 'Existing Client' },
  { value: 'other', label: 'Other' },
];

const ACTIVITY_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'note', label: 'Note' },
  { value: 'task', label: 'Task' },
];

// ============================================================================
// HELPERS
// ============================================================================

const scoreColor = (score: number): string => {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

// ============================================================================
// ADD PROSPECT MODAL
// ============================================================================

function AddProspectModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    industry: '',
    lead_source: 'other',
    source_detail: '',
    estimated_aum: '',
    annual_income: '',
    risk_tolerance: 'moderate',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First name and last name are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        lead_source: form.lead_source,
      };
      if (form.email.trim()) data.email = form.email.trim();
      if (form.phone.trim()) data.phone = form.phone.trim();
      if (form.company.trim()) data.company = form.company.trim();
      if (form.title.trim()) data.title = form.title.trim();
      if (form.industry.trim()) data.industry = form.industry.trim();
      if (form.source_detail.trim()) data.source_detail = form.source_detail.trim();
      if (form.estimated_aum) data.estimated_aum = parseFloat(form.estimated_aum);
      if (form.annual_income) data.annual_income = parseFloat(form.annual_income);
      if (form.risk_tolerance) data.risk_tolerance = form.risk_tolerance;
      if (form.notes.trim()) data.notes = form.notes.trim();

      await createProspect(data);
      toast.success('Prospect created successfully');
      onSave();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create prospect';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div role="dialog" aria-modal="true" className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Prospect</h2>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
              <input value={form.first_name} onChange={set('first_name')} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
              <input value={form.last_name} onChange={set('last_name')} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input value={form.phone} onChange={set('phone')} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <input value={form.company} onChange={set('company')} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input value={form.title} onChange={set('title')} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
              <input value={form.industry} onChange={set('industry')} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead Source</label>
              <select value={form.lead_source} onChange={set('lead_source')} className="w-full px-3 py-2 border rounded-lg">
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Est. AUM ($)</label>
              <input type="number" value={form.estimated_aum} onChange={set('estimated_aum')} className="w-full px-3 py-2 border rounded-lg" placeholder="500000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Annual Income ($)</label>
              <input type="number" value={form.annual_income} onChange={set('annual_income')} className="w-full px-3 py-2 border rounded-lg" placeholder="150000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Risk Tolerance</label>
              <select value={form.risk_tolerance} onChange={set('risk_tolerance')} className="w-full px-3 py-2 border rounded-lg">
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source Detail</label>
              <input value={form.source_detail} onChange={set('source_detail')} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. Referred by John" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} isLoading={saving}>
              Add Prospect
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOG ACTIVITY MODAL
// ============================================================================

function LogActivityModal({
  prospectId,
  onClose,
  onSave,
}: {
  prospectId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    activity_type: 'call',
    subject: '',
    description: '',
    duration_minutes: '',
    call_outcome: '',
    call_direction: 'outbound',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const data: Record<string, unknown> = {
        activity_type: form.activity_type,
      };
      if (form.subject.trim()) data.subject = form.subject.trim();
      if (form.description.trim()) data.description = form.description.trim();
      if (form.duration_minutes) data.duration_minutes = parseInt(form.duration_minutes, 10);
      if (form.activity_type === 'call') {
        if (form.call_outcome) data.call_outcome = form.call_outcome;
        data.call_direction = form.call_direction;
      }

      await logActivity(prospectId, data);
      toast.success('Activity logged successfully');
      onSave();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to log activity';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div role="dialog" aria-modal="true" className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Log Activity</h2>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.activity_type} onChange={set('activity_type')} className="w-full px-3 py-2 border rounded-lg">
                {ACTIVITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <input value={form.subject} onChange={set('subject')} className="w-full px-3 py-2 border rounded-lg" placeholder="Brief summary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={form.description} onChange={set('description')} rows={3} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
              <input type="number" value={form.duration_minutes} onChange={set('duration_minutes')} className="w-full px-3 py-2 border rounded-lg" />
            </div>

            {form.activity_type === 'call' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Direction</label>
                  <select value={form.call_direction} onChange={set('call_direction')} className="w-full px-3 py-2 border rounded-lg">
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
                  <select value={form.call_outcome} onChange={set('call_outcome')} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select...</option>
                    <option value="connected">Connected</option>
                    <option value="voicemail">Voicemail</option>
                    <option value="no_answer">No Answer</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} isLoading={saving}>
              Log Activity
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Prospects() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'list' | 'detail'>('pipeline');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingProposal, setGeneratingProposal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prospectsRes, summaryRes] = await Promise.all([
        listProspects({
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        }),
        getPipelineSummary(),
      ]);
      setProspects(prospectsRes?.prospects ?? []);
      setPipelineSummary(summaryRes);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load prospects';
      setError(msg);
      toast.error(msg);
    }
    setLoading(false);
  }, [statusFilter, searchQuery, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close modals on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        if (showActivityModal) setShowActivityModal(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddModal, showActivityModal]);

  const loadProspectDetail = async (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setActiveTab('detail');
    try {
      const [activitiesRes, proposalsRes] = await Promise.all([
        getActivities(prospect.id),
        getProposals(prospect.id),
      ]);
      setActivities(activitiesRes.activities);
      setProposals(proposalsRes.proposals);
    } catch (e: unknown) {
      console.error('Failed to load prospect details:', e);
    }
  };

  const handleStatusChange = async (prospectId: string, newStatus: string) => {
    try {
      await updateProspect(prospectId, { status: newStatus });
      toast.success('Status updated');
      await loadData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleGenerateProposal = async (prospectId: string) => {
    setGeneratingProposal(true);
    try {
      const proposal = await generateProposal(prospectId);
      setProposals((prev) => [proposal, ...prev]);
      toast.success('Proposal generated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate proposal');
    }
    setGeneratingProposal(false);
  };

  const handleRescore = async (prospectId: string) => {
    try {
      const result = await rescoreProspect(prospectId);
      if (selectedProspect && selectedProspect.id === prospectId) {
        setSelectedProspect({
          ...selectedProspect,
          lead_score: result.lead_score,
          fit_score: result.fit_score,
          intent_score: result.intent_score,
          engagement_score: result.engagement_score,
        });
      }
      toast.success('Prospect rescored');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to rescore');
    }
  };

  // ── Pipeline View ─────────────────────────────────────────────

  const renderPipeline = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Prospects"
          value={String(pipelineSummary?.total_prospects ?? 0)}
          icon={<Users size={18} />}
          color="blue"
        />
        <MetricCard
          label="Pipeline Value"
          value={formatCurrency(pipelineSummary?.total_pipeline_value)}
          icon={<DollarSign size={18} />}
          color="amber"
        />
        <MetricCard
          label="In Progress"
          value={String(
            Object.entries(pipelineSummary?.stages ?? {})
              .filter(([k]) => !['won', 'lost'].includes(k))
              .reduce((sum, [, v]) => sum + v.count, 0)
          )}
          icon={<TrendingUp size={18} />}
          color="purple"
        />
        <MetricCard
          label="Won"
          value={String(pipelineSummary?.stages?.won?.count ?? 0)}
          icon={<Trophy size={18} />}
          color="emerald"
        />
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_ORDER.map((status) => {
          const config = STATUS_CONFIG[status];
          const stageProspects = prospects.filter((p) => p.status === status);
          const stageData = pipelineSummary?.stages?.[status];

          return (
            <div key={status} className="flex-shrink-0 w-72 bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-slate-700">{config.label}</h3>
                <span className="text-xs text-slate-500">
                  {stageData?.count ?? 0} &middot; {formatCurrency(stageData?.value)}
                </span>
              </div>
              <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                {stageProspects.map((prospect) => (
                  <div
                    key={prospect.id}
                    onClick={() => loadProspectDetail(prospect)}
                    className="bg-white p-3 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-slate-100"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">
                        {prospect.first_name} {prospect.last_name}
                      </p>
                      <span className={`text-xs font-bold ${scoreColor(prospect.lead_score)}`}>
                        {prospect.lead_score}
                      </span>
                    </div>
                    {prospect.company && (
                      <p className="text-xs text-slate-500 mt-0.5">{prospect.company}</p>
                    )}
                    {prospect.estimated_aum != null && (
                      <p className="text-xs text-slate-600 mt-1">{formatCurrency(prospect.estimated_aum)}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">{prospect.days_in_stage}d in stage</span>
                      {prospect.next_action_date && (
                        <span className="text-xs text-blue-600">{formatDate(prospect.next_action_date)}</span>
                      )}
                    </div>
                  </div>
                ))}
                {stageProspects.length === 0 && (
                  <p className="text-center text-slate-500 text-xs py-4">No prospects</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── List View ─────────────────────────────────────────────────

  const renderList = () => (
    <Card className="overflow-hidden p-0">
      <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput
          placeholder="Search prospects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 w-full sm:w-auto"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
        <Button variant="secondary" size="sm" onClick={loadData}>
          Refresh
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>AUM</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prospects.map((prospect) => (
            <TableRow key={prospect.id}>
              <TableCell>
                <button
                  onClick={() => loadProspectDetail(prospect)}
                  className="font-medium text-blue-600 hover:underline text-sm"
                >
                  {prospect.first_name} {prospect.last_name}
                </button>
                {prospect.email && <p className="text-xs text-slate-500">{prospect.email}</p>}
              </TableCell>
              <TableCell>{prospect.company || '-'}</TableCell>
              <TableCell>
                <Badge variant={
                  prospect.status === 'won' ? 'green'
                    : prospect.status === 'lost' ? 'red'
                    : prospect.status === 'new' ? 'blue'
                    : prospect.status === 'nurturing' ? 'gray'
                    : 'amber'
                }>
                  {STATUS_CONFIG[prospect.status]?.label ?? prospect.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono">{formatCurrency(prospect.estimated_aum)}</TableCell>
              <TableCell>
                <span className={`font-bold text-sm ${scoreColor(prospect.lead_score)}`}>
                  {prospect.lead_score}
                </span>
              </TableCell>
              <TableCell className="capitalize">{(prospect.lead_source || '').replace(/_/g, ' ')}</TableCell>
              <TableCell>
                <select
                  value={prospect.status}
                  onChange={(e) => handleStatusChange(prospect.id, e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </TableCell>
            </TableRow>
          ))}
          {prospects.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                No prospects found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );

  // ── Detail View ───────────────────────────────────────────────

  const renderDetail = () => {
    if (!selectedProspect) return null;
    const config = STATUS_CONFIG[selectedProspect.status] ?? {
      label: selectedProspect.status,
      color: 'bg-slate-100 text-slate-800',
    };

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setSelectedProspect(null); setActiveTab('pipeline'); }}
        >
          &larr; Back to Pipeline
        </Button>

        {/* Header Card */}
        <Card size="md">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                {selectedProspect.first_name} {selectedProspect.last_name}
              </h2>
              {(selectedProspect.title || selectedProspect.company) && (
                <p className="text-slate-500">
                  {[selectedProspect.title, selectedProspect.company].filter(Boolean).join(' at ')}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
                <span className={`text-lg font-bold ${scoreColor(selectedProspect.lead_score)}`}>
                  Score: {selectedProspect.lead_score}
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="secondary" size="sm" onClick={() => handleRescore(selectedProspect.id)}>
                Rescore
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowActivityModal(true)}>
                Log Activity
              </Button>
              <Button size="sm" onClick={() => handleGenerateProposal(selectedProspect.id)} isLoading={generatingProposal}>
                Generate Proposal
              </Button>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Overall</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedProspect.lead_score)}`}>
                {selectedProspect.lead_score}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Fit</p>
              <p className="text-xl font-semibold">{selectedProspect.fit_score}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Intent</p>
              <p className="text-xl font-semibold">{selectedProspect.intent_score}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Engagement</p>
              <p className="text-xl font-semibold">{selectedProspect.engagement_score}</p>
            </div>
          </div>

          {/* Contact + Financial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="font-semibold text-sm mb-2">Contact Info</h3>
              <div className="space-y-1 text-sm text-slate-600">
                <p>Email: {selectedProspect.email || '-'}</p>
                <p>Phone: {selectedProspect.phone || '-'}</p>
                {selectedProspect.linkedin_url && (
                  <p>
                    LinkedIn:{' '}
                    <a href={selectedProspect.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      Profile
                    </a>
                  </p>
                )}
                {(selectedProspect.city || selectedProspect.state) && (
                  <p>Location: {[selectedProspect.city, selectedProspect.state].filter(Boolean).join(', ')}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Financial Profile</h3>
              <div className="space-y-1 text-sm text-slate-600">
                <p>Est. AUM: {formatCurrency(selectedProspect.estimated_aum)}</p>
                <p>Annual Income: {formatCurrency(selectedProspect.annual_income)}</p>
                <p>Risk Tolerance: {selectedProspect.risk_tolerance || '-'}</p>
                <p>Time Horizon: {selectedProspect.time_horizon || '-'}</p>
                {selectedProspect.investment_goals && selectedProspect.investment_goals.length > 0 && (
                  <p>Goals: {selectedProspect.investment_goals.join(', ')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tags, Notes, Next Action */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            <div>
              <h3 className="font-semibold text-sm mb-2">Next Action</h3>
              <div className="text-sm text-slate-600">
                <p>Date: {formatDate(selectedProspect.next_action_date)}</p>
                <p>Type: {selectedProspect.next_action_type || '-'}</p>
                {selectedProspect.next_action_notes && <p className="mt-1">{selectedProspect.next_action_notes}</p>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {(selectedProspect.tags ?? []).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{tag}</span>
                ))}
                {(!selectedProspect.tags || selectedProspect.tags.length === 0) && (
                  <span className="text-sm text-slate-500">None</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Pipeline</h3>
              <div className="text-sm text-slate-600">
                <p>Days in Stage: {selectedProspect.days_in_stage}</p>
                <p>Total in Pipeline: {selectedProspect.total_days_in_pipeline}d</p>
                <p>Source: {(selectedProspect.lead_source || '').replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>

          {selectedProspect.notes && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-sm mb-1">Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedProspect.notes}</p>
            </div>
          )}
        </Card>

        {/* Activities & Proposals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <Card size="md">
            <h3 className="font-semibold mb-4">Recent Activities</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {activities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-blue-400 pl-3 py-1">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm capitalize">
                      {(activity.activity_type || '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(activity.activity_date)}</span>
                  </div>
                  {activity.subject && <p className="text-sm text-slate-700">{activity.subject}</p>}
                  {activity.description && <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>}
                  {activity.call_outcome && (
                    <span className="text-xs text-slate-500 capitalize">Outcome: {activity.call_outcome}</span>
                  )}
                  {activity.is_automated && (
                    <span className="ml-2 text-xs text-slate-500 italic">auto</span>
                  )}
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No activities yet</p>
              )}
            </div>
          </Card>

          {/* Proposals */}
          <Card size="md">
            <h3 className="font-semibold mb-4">Proposals</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{proposal.proposal_number || proposal.title}</span>
                    <span className="text-xs capitalize px-2 py-0.5 bg-slate-200 rounded-full">{proposal.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{proposal.title}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    {proposal.estimated_annual_fee != null && (
                      <span>Fee: {formatCurrency(proposal.estimated_annual_fee)}/yr</span>
                    )}
                    {proposal.is_ai_generated && (
                      <span className="text-purple-600">AI Generated</span>
                    )}
                    {proposal.view_count > 0 && (
                      <span>Viewed {proposal.view_count}x</span>
                    )}
                  </div>
                  {proposal.executive_summary && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{proposal.executive_summary}</p>
                  )}
                </div>
              ))}
              {proposals.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No proposals yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // ── Main Render ───────────────────────────────────────────────

  if (loading && prospects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading prospects...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Prospect Pipeline"
        subtitle="Manage leads and track conversions"
        actions={
          <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
            + Add Prospect
          </Button>
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {activeTab === 'detail' ? (
        renderDetail()
      ) : (
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v as 'pipeline' | 'list')} variant="pills">
          <TabList className="mb-6">
            <Tab value="pipeline">Pipeline</Tab>
            <Tab value="list">List</Tab>
          </TabList>
          <TabPanel value="pipeline">{renderPipeline()}</TabPanel>
          <TabPanel value="list">{renderList()}</TabPanel>
        </Tabs>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddProspectModal onClose={() => setShowAddModal(false)} onSave={loadData} />
      )}
      {showActivityModal && selectedProspect && (
        <LogActivityModal
          prospectId={selectedProspect.id}
          onClose={() => setShowActivityModal(false)}
          onSave={async () => {
            const res = await getActivities(selectedProspect.id);
            setActivities(res.activities);
          }}
        />
      )}
    </div>
  );
}
