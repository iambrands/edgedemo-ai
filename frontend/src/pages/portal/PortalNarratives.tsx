import { useEffect, useState } from 'react';
import { BarChart3, Clock, BookOpen, FileText, CheckCircle } from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import { getNarratives, markNarrativeRead, Narrative } from '../../services/portalApi';

const TYPE_META: Record<string, { label: string; icon: typeof BarChart3; color: string; bg: string }> = {
  quarterly: { label: 'Quarterly Review', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
  meeting_summary: { label: 'Meeting Summary', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
  market_update: { label: 'Market Update', icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
};

export default function PortalNarratives() {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadNarratives();
  }, []);

  const loadNarratives = async () => {
    try {
      const data = await getNarratives();
      setNarratives(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load narratives', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (narrative: Narrative) => {
    const isExpanding = expandedId !== narrative.id;
    setExpandedId(isExpanding ? narrative.id : null);

    if (isExpanding && !narrative.is_read) {
      try {
        await markNarrativeRead(narrative.id);
        setNarratives((prev) =>
          prev.map((n) => (n.id === narrative.id ? { ...n, is_read: true } : n))
        );
      } catch {}
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    if (s.toDateString() === e.toDateString()) {
      return formatDate(start);
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  const unreadCount = narratives.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PortalNav />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Updates & Reports</h1>
          <p className="text-slate-500 text-sm mt-1">
            Portfolio narratives and meeting summaries from your advisor
            {unreadCount > 0 && ` · ${unreadCount} unread`}
          </p>
        </div>

        {/* Narratives List */}
        {narratives.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900">No updates yet</h3>
            <p className="text-slate-500 text-sm mt-1">
              Your advisor's portfolio updates and meeting summaries will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {narratives.map((narrative) => {
              const meta = TYPE_META[narrative.narrative_type] || TYPE_META['quarterly'];
              const Icon = meta.icon;
              const isExpanded = expandedId === narrative.id;

              return (
                <div
                  key={narrative.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                    !narrative.is_read ? 'border-blue-200' : 'border-slate-200'
                  }`}
                >
                  {/* Header */}
                  <button
                    onClick={() => handleExpand(narrative)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className={`p-3 rounded-lg flex-shrink-0 ${meta.bg}`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium text-slate-900 ${!narrative.is_read ? 'font-semibold' : ''}`}>
                          {narrative.title}
                        </h3>
                        {!narrative.is_read && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatPeriod(narrative.period_start, narrative.period_end)}
                        </span>
                        <span>{meta.label}</span>
                      </div>
                    </div>
                    {narrative.is_read && (
                      <CheckCircle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-4 prose prose-sm max-w-none">
                        {narrative.content.split('\n').map((paragraph, i) => {
                          if (!paragraph.trim()) return null;
                          if (paragraph.startsWith('•') || paragraph.startsWith('\u2022')) {
                            return (
                              <p key={i} className="text-slate-600 ml-4 my-1">
                                {paragraph}
                              </p>
                            );
                          }
                          if (paragraph.endsWith(':')) {
                            return (
                              <p key={i} className="font-medium text-slate-800 mt-4 mb-1">
                                {paragraph}
                              </p>
                            );
                          }
                          return (
                            <p key={i} className="text-slate-600 my-2">
                              {paragraph}
                            </p>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-400 mt-4">
                        Published {formatDate(narrative.created_at)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
