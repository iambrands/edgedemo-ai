import { useState, useEffect } from 'react';
import { MessageSquareText, TrendingUp, ShieldAlert, CheckSquare, BarChart3 } from 'lucide-react';
import {
  listAnalyses,
  getAnalysis,
  getMetrics,
  listFlags,
  listActionItems,
  reviewFlag,
  updateActionItem,
} from '../../services/conversationApi';
import type {
  ConversationAnalysis,
  ComplianceFlag,
  ActionItem,
  ConversationMetrics,
  ComplianceRiskLevel,
  SentimentType,
} from '../../services/conversationApi';

// ============================================================================
// CONSTANTS
// ============================================================================

const RISK_COLORS: Record<ComplianceRiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const SENTIMENT_CONFIG: Record<
  SentimentType,
  { label: string; color: string; icon: string }
> = {
  very_positive: { label: 'Very Positive', color: 'text-emerald-600', icon: '++' },
  positive: { label: 'Positive', color: 'text-emerald-500', icon: '+' },
  neutral: { label: 'Neutral', color: 'text-slate-500', icon: '~' },
  negative: { label: 'Negative', color: 'text-orange-500', icon: '-' },
  very_negative: { label: 'Very Negative', color: 'text-red-600', icon: '--' },
};

type TabKey = 'overview' | 'compliance' | 'actions' | 'detail';

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(seconds: number | undefined | null): string {
  if (seconds == null || isNaN(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sentimentFor(s?: SentimentType | string | null) {
  return SENTIMENT_CONFIG[(s as SentimentType) ?? 'neutral'] ?? SENTIMENT_CONFIG.neutral;
}

function riskColorFor(r?: ComplianceRiskLevel | string | null) {
  return RISK_COLORS[(r as ComplianceRiskLevel) ?? 'low'] ?? RISK_COLORS.low;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function Conversations() {
  // ── State ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [analyses, setAnalyses] = useState<ConversationAnalysis[]>([]);
  const [metrics, setMetrics] = useState<ConversationMetrics | null>(null);
  const [flags, setFlags] = useState<ComplianceFlag[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ConversationAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingFlags, setPendingFlags] = useState(0);
  const [overdueItems, setOverdueItems] = useState(0);

  // ── Data Loading ───────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analysesRes, metricsRes, flagsRes, itemsRes] = await Promise.all([
        listAnalyses(30),
        getMetrics(30),
        listFlags({ days: 30 }),
        listActionItems({ days: 30 }),
      ]);
      setAnalyses(analysesRes.analyses ?? []);
      setMetrics(metricsRes);
      setFlags(flagsRes.flags ?? []);
      setPendingFlags(flagsRes.pending ?? 0);
      setActionItems(itemsRes.items ?? []);
      setOverdueItems(itemsRes.overdue ?? 0);
    } catch (err) {
      console.error('Failed to load conversation data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
    setLoading(false);
  };

  const loadAnalysisDetail = async (analysis: ConversationAnalysis) => {
    try {
      const detail = await getAnalysis(analysis.id);
      setSelectedAnalysis(detail);
      setActiveTab('detail');
    } catch (err) {
      console.error('Failed to load analysis detail:', err);
    }
  };

  const handleReviewFlag = async (flagId: string, status: string) => {
    try {
      await reviewFlag(flagId, status);
      loadData();
    } catch (err) {
      console.error('Failed to review flag:', err);
    }
  };

  const handleUpdateActionItem = async (itemId: string, status: string) => {
    try {
      await updateActionItem(itemId, status);
      loadData();
    } catch (err) {
      console.error('Failed to update action item:', err);
    }
  };

  // ── Tab: Overview ──────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500">Conversations</p>
            <div className="p-2 bg-blue-50 rounded-lg">
              <MessageSquareText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.total_conversations ?? 0}</p>
          <p className="text-xs text-slate-500">Last 30 days</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500">Avg Sentiment</p>
            <div className="p-2 bg-teal-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {metrics?.avg_sentiment_score != null
              ? (metrics.avg_sentiment_score > 0 ? '+' : '') +
                metrics.avg_sentiment_score.toFixed(2)
              : '--'}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500">Avg Engagement</p>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.avg_engagement_score ?? 0}%</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500">Compliance Flags</p>
            <div className="p-2 bg-red-50 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {metrics?.total_compliance_flags ?? 0}
          </p>
          {pendingFlags > 0 && (
            <p className="text-xs text-red-500">{pendingFlags} pending</p>
          )}
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500">Action Items</p>
            <div className="p-2 bg-purple-50 rounded-lg">
              <CheckSquare className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.action_items_created ?? 0}</p>
          <p className="text-xs text-emerald-500">
            {metrics?.action_items_completed ?? 0} completed
          </p>
        </div>
      </div>

      {/* Top Topics */}
      {metrics?.top_topics && Object.keys(metrics.top_topics).length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">Top Discussion Topics</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.top_topics).map(([topic, count]) => (
              <span
                key={topic}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {topic.replace(/_/g, ' ')} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Analyses */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Recent Conversations</h3>
        </div>
        <div className="divide-y">
          {analyses.length === 0 && (
            <p className="p-8 text-center text-slate-500">
              No conversation analyses yet
            </p>
          )}
          {analyses.slice(0, 10).map((analysis) => {
            const sentiment = sentimentFor(analysis.overall_sentiment);
            return (
              <div
                key={analysis.id}
                onClick={() => loadAnalysisDetail(analysis)}
                className="p-4 hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${sentiment.color} bg-slate-50`}
                      >
                        {sentiment.icon}
                      </span>
                      <span className="font-medium truncate">
                        {analysis.primary_topic?.replace(/_/g, ' ') || 'General Discussion'}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${riskColorFor(analysis.compliance_risk_level)}`}
                      >
                        {analysis.compliance_risk_level ?? 'low'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                      {analysis.executive_summary || 'No summary available'}
                    </p>
                  </div>
                  <div className="text-right text-sm ml-4 flex-shrink-0">
                    <p className="text-slate-500">
                      {formatDuration(analysis.total_duration_seconds)}
                    </p>
                    <p className="text-slate-500">{formatDate(analysis.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className={sentiment.color}>
                    Sentiment: {sentiment.label}
                  </span>
                  <span>Engagement: {analysis.engagement_score}%</span>
                  {analysis.compliance_flags_count > 0 && (
                    <span className="text-orange-600">
                      {analysis.compliance_flags_count} flag
                      {analysis.compliance_flags_count > 1 ? 's' : ''}
                    </span>
                  )}
                  {analysis.action_items_count > 0 && (
                    <span className="text-blue-600">
                      {analysis.action_items_count} action item
                      {analysis.action_items_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Tab: Compliance ────────────────────────────────────────────
  const renderCompliance = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Compliance Flags</h3>
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
            {pendingFlags} pending review
          </span>
        </div>
        <div className="divide-y">
          {flags.length === 0 && (
            <p className="p-8 text-center text-slate-500">No compliance flags found</p>
          )}
          {flags.map((flag) => (
            <div key={flag.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${riskColorFor(flag.risk_level)}`}
                    >
                      {(flag.risk_level ?? 'low').toUpperCase()}
                    </span>
                    <span className="font-medium capitalize">
                      {flag.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-500">
                      @ {formatTimestamp(flag.timestamp_start)}
                    </span>
                  </div>
                  <p className="mt-2 p-2 bg-slate-100 rounded text-sm italic break-words">
                    &ldquo;{flag.flagged_text}&rdquo;
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{flag.ai_explanation}</p>
                  {flag.suggested_correction && (
                    <p className="mt-1 text-sm text-emerald-600">
                      <strong>Suggested:</strong> {flag.suggested_correction}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {flag.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewFlag(flag.id, 'false_positive')}
                        className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                      >
                        False Positive
                      </button>
                      <button
                        onClick={() => handleReviewFlag(flag.id, 'confirmed')}
                        className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-slate-100 rounded text-sm capitalize">
                      {flag.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Tab: Actions ───────────────────────────────────────────────
  const renderActions = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Action Items</h3>
          {overdueItems > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
              {overdueItems} overdue
            </span>
          )}
        </div>
        <div className="divide-y">
          {actionItems.length === 0 && (
            <p className="p-8 text-center text-slate-500">No action items found</p>
          )}
          {actionItems.map((item) => {
            const isOverdue =
              item.due_date &&
              new Date(item.due_date) < new Date() &&
              item.status === 'pending';
            return (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="checkbox"
                        checked={item.status === 'completed'}
                        onChange={() =>
                          handleUpdateActionItem(
                            item.id,
                            item.status === 'completed' ? 'pending' : 'completed',
                          )
                        }
                        className="w-4 h-4 rounded"
                      />
                      <span
                        className={
                          item.status === 'completed'
                            ? 'line-through text-slate-500'
                            : 'font-medium'
                        }
                      >
                        {item.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded capitalize ${
                          item.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : item.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-slate-600 ml-6">{item.description}</p>
                    )}
                    <div className="mt-1 text-xs text-slate-500 ml-6">
                      <span className="capitalize">{item.owner_type}</span>
                      {item.category && <span> &middot; {item.category}</span>}
                    </div>
                  </div>
                  <div className="text-right text-sm flex-shrink-0">
                    {item.due_date && (
                      <p className={isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}>
                        Due: {formatDate(item.due_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Tab: Detail View ───────────────────────────────────────────
  const renderDetail = () => {
    if (!selectedAnalysis) return null;
    const sentiment = sentimentFor(selectedAnalysis.overall_sentiment);

    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setSelectedAnalysis(null);
            setActiveTab('overview');
          }}
          className="text-blue-600 hover:underline text-sm"
        >
          &larr; Back to Overview
        </button>

        {/* Summary Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-bold">
                {selectedAnalysis.primary_topic?.replace(/_/g, ' ') ||
                  'Conversation Analysis'}
              </h2>
              <p className="text-slate-500">
                {formatDate(selectedAnalysis.created_at)} &middot;{' '}
                {formatDuration(selectedAnalysis.total_duration_seconds)}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${riskColorFor(selectedAnalysis.compliance_risk_level)}`}
            >
              {selectedAnalysis.compliance_risk_level ?? 'low'} risk
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 bg-slate-50 rounded">
              <p className="text-sm text-slate-500">Sentiment</p>
              <p className={`text-lg font-semibold ${sentiment.color}`}>
                {sentiment.icon} {sentiment.label}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded">
              <p className="text-sm text-slate-500">Engagement</p>
              <p className="text-lg font-semibold">
                {selectedAnalysis.engagement_score}%
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded">
              <p className="text-sm text-slate-500">Talk Ratio</p>
              <p className="text-lg font-semibold">
                {selectedAnalysis.talk_ratio?.toFixed(2) ?? '--'}
              </p>
              <p className="text-xs text-slate-500">Advisor / Client</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded">
              <p className="text-sm text-slate-500">Compliance Flags</p>
              <p className="text-lg font-semibold text-orange-600">
                {selectedAnalysis.compliance_flags_count}
              </p>
            </div>
          </div>

          {/* Executive Summary */}
          {selectedAnalysis.executive_summary && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-slate-700">{selectedAnalysis.executive_summary}</p>
            </div>
          )}

          {/* Key Points */}
          {selectedAnalysis.key_points && selectedAnalysis.key_points.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Key Points</h3>
              <ul className="list-disc list-inside space-y-1">
                {selectedAnalysis.key_points.map((point, i) => (
                  <li key={i} className="text-slate-700">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisions */}
          {selectedAnalysis.decisions_made && selectedAnalysis.decisions_made.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Decisions Made</h3>
              <ul className="list-disc list-inside space-y-1">
                {selectedAnalysis.decisions_made.map((d, i) => (
                  <li key={i} className="text-slate-700">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {selectedAnalysis.concerns_raised && selectedAnalysis.concerns_raised.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Concerns Raised</h3>
              <ul className="list-disc list-inside space-y-1">
                {selectedAnalysis.concerns_raised.map((c, i) => (
                  <li key={i} className="text-orange-700">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up Recommendations */}
          {selectedAnalysis.follow_up_recommendations &&
            selectedAnalysis.follow_up_recommendations.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Follow-up Recommendations</h3>
                <ul className="list-disc list-inside space-y-1">
                  {selectedAnalysis.follow_up_recommendations.map((r, i) => (
                    <li key={i} className="text-blue-700">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Topics */}
          {selectedAnalysis.topics_discussed &&
            selectedAnalysis.topics_discussed.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Topics Discussed</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAnalysis.topics_discussed.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {topic.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Compliance Flags */}
        {selectedAnalysis.compliance_flags &&
          selectedAnalysis.compliance_flags.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold mb-4">
                Compliance Flags ({selectedAnalysis.compliance_flags.length})
              </h3>
              <div className="space-y-4">
                {selectedAnalysis.compliance_flags.map((flag) => (
                  <div key={flag.id} className="p-3 bg-slate-50 rounded">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${riskColorFor(flag.risk_level)}`}
                      >
                        {flag.risk_level}
                      </span>
                      <span className="capitalize">
                        {flag.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500">
                        @ {formatTimestamp(flag.timestamp_start)}
                      </span>
                    </div>
                    <p className="italic text-sm break-words">
                      &ldquo;{flag.flagged_text}&rdquo;
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{flag.ai_explanation}</p>
                    {flag.suggested_correction && (
                      <p className="text-sm text-emerald-600 mt-1">
                        <strong>Suggested:</strong> {flag.suggested_correction}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Action Items */}
        {selectedAnalysis.action_items && selectedAnalysis.action_items.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold mb-4">
              Action Items ({selectedAnalysis.action_items.length})
            </h3>
            <div className="space-y-3">
              {selectedAnalysis.action_items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded">
                  <input
                    type="checkbox"
                    checked={item.status === 'completed'}
                    onChange={() =>
                      handleUpdateActionItem(
                        item.id,
                        item.status === 'completed' ? 'pending' : 'completed',
                      )
                    }
                    className="mt-1 w-4 h-4 rounded"
                  />
                  <div className="min-w-0">
                    <p
                      className={
                        item.status === 'completed'
                          ? 'line-through text-slate-500'
                          : ''
                      }
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>
                    )}
                    {item.due_date && (
                      <p className="text-sm text-slate-500">
                        Due: {formatDate(item.due_date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading conversation intelligence...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conversation Intelligence</h1>
          <p className="text-slate-500">AI-powered meeting analysis and compliance monitoring</p>
        </div>
        {activeTab !== 'detail' && (
          <div className="flex gap-2">
            {(['overview', 'compliance', 'actions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg capitalize text-sm font-medium ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab}
                {tab === 'compliance' && pendingFlags > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {pendingFlags}
                  </span>
                )}
                {tab === 'actions' && overdueItems > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {overdueItems}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'compliance' && renderCompliance()}
      {activeTab === 'actions' && renderActions()}
      {activeTab === 'detail' && renderDetail()}
    </div>
  );
}
