import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  FileCheck,
  CheckSquare,
  ClipboardList,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  Calendar,
  User,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  getDashboardMetrics,
  getAlerts,
  updateAlertStatus,
  getTasks,
  createTask,
  completeTask,
  getAuditLogs,
  type ComplianceDashboardMetrics,
  type ComplianceAlert,
  type ComplianceTask,
  type ComplianceAuditLogEntry,
} from '../../services/complianceApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabType = 'overview' | 'alerts' | 'reviews' | 'tasks' | 'audit';

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border border-red-200',
  high: 'bg-orange-100 text-orange-800 border border-orange-200',
  medium: 'bg-amber-100 text-amber-800 border border-amber-200',
  low: 'bg-blue-100 text-blue-800 border border-blue-200',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-50 text-red-700',
  under_review: 'bg-amber-50 text-amber-700',
  escalated: 'bg-orange-50 text-orange-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  false_positive: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-red-700',
};

const severityDot: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-400',
};

function scoreColor(score: number) {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBg(score: number) {
  if (score >= 90) return 'bg-gradient-to-r from-emerald-400 to-emerald-500';
  if (score >= 70) return 'bg-gradient-to-r from-amber-400 to-amber-500';
  return 'bg-gradient-to-r from-red-400 to-red-500';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Compliance() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [metrics, setMetrics] = useState<ComplianceDashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [auditLog, setAuditLog] = useState<ComplianceAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create task modal
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  // ── Data loading ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const metricsData = await getDashboardMetrics();
      // Validate metrics has required nested structure
      if (metricsData && typeof metricsData === 'object' && 'compliance_score' in metricsData) {
        setMetrics(metricsData);
      } else {
        setMetrics(null);
      }

      // Load tab-specific data in parallel when needed
      const [alertsData, tasksData, auditData] = await Promise.all([
        getAlerts().catch(() => [] as ComplianceAlert[]),
        getTasks({ include_completed: true }).catch(() => [] as ComplianceTask[]),
        getAuditLogs().catch(() => [] as ComplianceAuditLogEntry[]),
      ]);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setAuditLog(Array.isArray(auditData) ? auditData : []);
    } catch (err) {
      setError('Failed to load compliance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleUpdateAlertStatus = async (alertId: string, newStatus: string) => {
    try {
      await updateAlertStatus(alertId, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('Failed to update alert status:', err);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      loadData();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask({
        title: newTaskTitle,
        description: newTaskDesc || undefined,
        priority: newTaskPriority,
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setShowCreateTask(false);
      loadData();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // ── Tabs config ─────────────────────────────────────────────────────────

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
    { id: 'alerts' as const, label: 'Alerts', icon: AlertTriangle, count: metrics?.alerts?.open ?? 0 },
    { id: 'reviews' as const, label: 'Reviews', icon: FileCheck, count: metrics?.pending_reviews ?? 0 },
    { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare, count: metrics?.tasks?.pending ?? 0 },
    { id: 'audit' as const, label: 'Audit Log', icon: ClipboardList },
  ];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Compliance</h1>
          <p className="text-slate-500 mt-1">Monitor alerts, reviews, and compliance tasks</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
          <button onClick={loadData} className="ml-auto text-red-600 hover:text-red-800 text-sm font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !metrics && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Empty state when metrics failed to load */}
      {!loading && !metrics && !error && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900">No compliance data available</h3>
          <p className="text-sm text-slate-500 mt-1">Check back later or contact support.</p>
        </div>
      )}

      {/* ────────────── OVERVIEW TAB ────────────── */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Compliance Score */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Compliance Score</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Based on open alerts, overdue tasks, and pending reviews
                </p>
              </div>
              <div className="text-right">
                <div className={`text-5xl font-bold ${scoreColor(metrics?.compliance_score ?? 0)}`}>
                  {metrics?.compliance_score ?? 0}
                </div>
                <div className="text-slate-500 text-sm">out of 100</div>
              </div>
            </div>
            <div className="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${scoreBg(metrics?.compliance_score ?? 0)}`}
                style={{ width: `${metrics?.compliance_score ?? 0}%` }}
              />
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Open Alerts */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Open Alerts</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics?.alerts?.open ?? 0}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              {(metrics?.alerts?.by_severity?.critical ?? 0) > 0 && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  {metrics?.alerts?.by_severity?.critical} critical
                </p>
              )}
            </div>

            {/* Pending Reviews */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Pending Reviews</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics?.pending_reviews ?? 0}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <FileCheck className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>

            {/* Open Tasks */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Open Tasks</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {(metrics?.tasks?.pending ?? 0) + (metrics?.tasks?.in_progress ?? 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <CheckSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              {(metrics?.tasks?.overdue ?? 0) > 0 && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  {metrics?.tasks?.overdue} overdue
                </p>
              )}
            </div>

            {/* Resolved This Month */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Resolved This Month</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics?.alerts?.resolved ?? 0}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Two-column: Recent Alerts + Upcoming Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Alerts */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Recent Alerts</h3>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {alerts.filter((a) => a.status !== 'resolved' && a.status !== 'false_positive').slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setActiveTab('alerts')}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${severityDot[alert.severity] ?? 'bg-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{alert.title}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{alert.client_name || 'General'}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${severityColors[alert.severity] ?? ''}`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
                {alerts.filter((a) => a.status !== 'resolved').length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    No open alerts
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Upcoming Tasks</h3>
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Task
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {tasks.filter((t) => t.status !== 'completed').slice(0, 5).map((task) => (
                  <div key={task.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleCompleteTask(task.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span
                            className={`text-xs ${
                              new Date(task.due_date) < new Date() ? 'text-red-600 font-medium' : 'text-slate-500'
                            }`}
                          >
                            Due {new Date(task.due_date).toLocaleDateString()}
                          </span>
                          {task.priority === 'urgent' && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700">Urgent</span>
                          )}
                          {task.priority === 'high' && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-orange-100 text-orange-700">High</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.filter((t) => t.status !== 'completed').length === 0 && (
                  <div className="p-8 text-center text-slate-500">No pending tasks</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────── ALERTS TAB ────────────── */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              All Alerts{' '}
              <span className="text-slate-500 font-normal text-sm">({alerts.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start gap-4">
                  <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${severityDot[alert.severity] ?? 'bg-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900">{alert.title}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${severityColors[alert.severity] ?? ''}`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[alert.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {alert.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{alert.description}</p>

                    {/* AI Recommendation */}
                    {alert.ai_analysis?.recommendation && (
                      <div className="mt-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs font-medium text-blue-800 mb-0.5">AI Recommendation</p>
                        <p className="text-sm text-blue-700">{alert.ai_analysis.recommendation}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      {alert.client_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {alert.client_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                      {alert.due_date && (
                        <span
                          className={`flex items-center gap-1 ${
                            new Date(alert.due_date) < new Date() && alert.status !== 'resolved'
                              ? 'text-red-600 font-medium'
                              : ''
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          Due {new Date(alert.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {alert.resolution_notes && (
                      <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-100 text-sm text-emerald-700">
                        <span className="font-medium">Resolution:</span> {alert.resolution_notes}
                      </div>
                    )}
                  </div>

                  {/* Status dropdown */}
                  <div className="flex-shrink-0">
                    {alert.status !== 'resolved' && alert.status !== 'false_positive' ? (
                      <select
                        value={alert.status}
                        onChange={(e) => handleUpdateAlertStatus(alert.id, e.target.value)}
                        className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="open">Open</option>
                        <option value="under_review">Under Review</option>
                        <option value="escalated">Escalated</option>
                        <option value="resolved">Resolved</option>
                        <option value="false_positive">False Positive</option>
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 text-xs rounded-full ${statusColors[alert.status] ?? ''}`}>
                        {alert.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="font-medium text-slate-900">No alerts</h3>
                <p className="text-slate-500 mt-1">All compliance checks are passing</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────── REVIEWS TAB ────────────── */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="text-center max-w-md mx-auto">
            <div className="p-4 bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Document Reviews</h3>
            <p className="text-slate-500 mt-2 mb-6">
              Compliance document reviews, ADV Part 2B generation, and Form CRS management are handled
              in the dedicated Compliance Docs module.
            </p>
            <a
              href="/dashboard/compliance-docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Go to Compliance Docs
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* ────────────── TASKS TAB ────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Create Task Modal/Inline */}
          {showCreateTask && (
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-4">New Compliance Task</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex items-center gap-3">
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <div className="flex-1" />
                  <button
                    onClick={() => setShowCreateTask(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Compliance Tasks{' '}
                <span className="text-slate-500 font-normal text-sm">({tasks.length})</span>
              </h3>
              {!showCreateTask && (
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => {
                        if (task.status !== 'completed') handleCompleteTask(task.id);
                      }}
                      disabled={task.status === 'completed'}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`font-medium ${
                            task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </p>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[task.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {task.status.replace(/_/g, ' ')}
                        </span>
                        {task.priority === 'urgent' && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                            Urgent
                          </span>
                        )}
                        {task.priority === 'high' && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">
                            High
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span
                          className={`flex items-center gap-1 ${
                            new Date(task.due_date) < new Date() && task.status !== 'completed'
                              ? 'text-red-600 font-medium'
                              : ''
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </span>
                        {task.assigned_to_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assigned_to_name}
                          </span>
                        )}
                        {task.category && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                            {task.category.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="p-12 text-center">
                  <CheckSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="font-medium text-slate-900">No tasks</h3>
                  <p className="text-slate-500 mt-1">Create a task to track compliance activities</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────── AUDIT LOG TAB ────────────── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">
              Audit Trail{' '}
              <span className="text-slate-500 font-normal text-sm">({auditLog.length} entries)</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {auditLog.map((entry) => {
              const actionLabel = entry.action.replace(/_/g, ' ');
              const isAlert = entry.entity_type.includes('alert');
              const isDoc = entry.entity_type.includes('document');
              const isTask = entry.entity_type.includes('task');
              const isCheck = entry.entity_type.includes('check');

              return (
                <div key={entry.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${
                        isAlert
                          ? 'bg-red-50'
                          : isDoc
                          ? 'bg-blue-50'
                          : isTask
                          ? 'bg-emerald-50'
                          : isCheck
                          ? 'bg-amber-50'
                          : 'bg-slate-100'
                      }`}
                    >
                      {isAlert ? (
                        <AlertTriangle className={`h-4 w-4 text-red-600`} />
                      ) : isDoc ? (
                        <FileCheck className={`h-4 w-4 text-blue-600`} />
                      ) : isTask ? (
                        <CheckSquare className={`h-4 w-4 text-emerald-600`} />
                      ) : isCheck ? (
                        <Shield className={`h-4 w-4 text-amber-600`} />
                      ) : (
                        <ClipboardList className={`h-4 w-4 text-slate-600`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 capitalize">{actionLabel}</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {Object.entries(entry.details)
                          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                          .join(' · ')}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {auditLog.length === 0 && (
              <div className="p-12 text-center">
                <ClipboardList className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="font-medium text-slate-900">No audit entries</h3>
                <p className="text-slate-500 mt-1">Activity will be logged here</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Also provide named export for backward compatibility
export { Compliance };
