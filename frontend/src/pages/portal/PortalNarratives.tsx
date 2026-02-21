import { useEffect, useState, useRef } from 'react';
import { BarChart3, Clock, BookOpen, FileText, CheckCircle, Edit3, X, Save, Bot, User } from 'lucide-react';
import { getNarratives, markNarrativeRead, updateNarrative, Narrative } from '../../services/portalApi';

const TYPE_META: Record<string, { label: string; icon: typeof BarChart3; color: string; bg: string }> = {
  quarterly: { label: 'Quarterly Review', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
  meeting_summary: { label: 'Meeting Summary', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
  market_update: { label: 'Market Update', icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
};

export default function PortalNarratives() {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadNarratives();
  }, []);

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editingId, editContent]);

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
    if (!isExpanding) {
      setEditingId(null);
    }

    if (isExpanding && !narrative.is_read) {
      try {
        await markNarrativeRead(narrative.id);
        setNarratives((prev) =>
          prev.map((n) => (n.id === narrative.id ? { ...n, is_read: true } : n))
        );
      } catch {}
    }
  };

  const startEditing = (narrative: Narrative) => {
    setEditingId(narrative.id);
    setEditContent(narrative.content);
    setEditTitle(narrative.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
    setEditTitle('');
  };

  const saveEdit = async (narrativeId: string) => {
    setSaving(true);
    try {
      const updated = await updateNarrative(narrativeId, {
        title: editTitle,
        content: editContent,
        edited_by: 'advisor',
      });
      setNarratives((prev) =>
        prev.map((n) =>
          n.id === narrativeId
            ? { ...n, title: editTitle, content: editContent, edited_by: updated.edited_by || 'advisor', edited_at: updated.edited_at || new Date().toISOString() }
            : n
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save narrative', err);
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              const isEditing = editingId === narrative.id;
              const isAiGenerated = !narrative.edited_by;

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-medium text-slate-900 ${!narrative.is_read ? 'font-semibold' : ''}`}>
                          {narrative.title}
                        </h3>
                        {!narrative.is_read && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            New
                          </span>
                        )}
                        {/* AI / Edited Badge */}
                        {isAiGenerated ? (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 text-xs font-medium rounded-full">
                            <Bot className="w-3 h-3" />
                            AI Generated
                          </span>
                        ) : (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                            <User className="w-3 h-3" />
                            Advisor Edited
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
                      {isEditing ? (
                        /* Editing Mode */
                        <div className="pt-4 space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Content
                            </label>
                            <textarea
                              ref={textareaRef}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[200px]"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => saveEdit(narrative.id)}
                              disabled={saving}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              <Save className="w-4 h-4" />
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div className="pt-4">
                          <div className="prose prose-sm max-w-none">
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
                          <div className="flex items-center justify-between mt-4">
                            <div className="text-xs text-slate-400">
                              Published {formatDate(narrative.created_at)}
                              {narrative.edited_at && (
                                <span className="ml-2">
                                  · Edited by {narrative.edited_by} on {formatDate(narrative.edited_at)}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(narrative);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit this narrative"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
