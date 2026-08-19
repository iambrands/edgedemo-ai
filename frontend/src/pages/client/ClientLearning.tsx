import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle, ChevronDown, Clock, ExternalLink, Lock, Play, Trophy } from 'lucide-react';
import { b2cApi, type B2CLearningItem } from '../../services/b2cApi';

const CATEGORY_LABELS: Record<B2CLearningItem['category'], string> = {
  getting_started: 'Getting Started',
  investing_basics: 'Investing Basics',
  tax_planning: 'Tax Planning',
  working_with_advisor: 'Working with an Advisor',
};

const CATEGORY_COLORS: Record<B2CLearningItem['category'], string> = {
  getting_started: 'bg-blue-100 text-blue-700',
  investing_basics: 'bg-emerald-100 text-emerald-700',
  tax_planning: 'bg-amber-100 text-amber-700',
  working_with_advisor: 'bg-violet-100 text-violet-700',
};

/* Mock progress — simulate 3 completed items (stored in memory for demo) */
const COMPLETED_IDS = new Set(['learn-1', 'learn-2', 'learn-5']);

/* Rich mock article previews keyed by id */
const ARTICLE_PREVIEWS: Record<string, string> = {
  'learn-1': 'Firmum connects your accounts via Plaid so you always see your real-time net worth. From the dashboard you can track investments, cash, and liabilities in one view — no more spreadsheets.',
  'learn-2': 'Asset allocation is how your portfolio is divided among stocks, bonds, and cash. Your Firmum allocation chart shows your current mix and compares it to your target risk profile.',
  'learn-3': 'Tax-loss harvesting means selling investments at a loss to offset taxable gains elsewhere. Firmum identifies these opportunities automatically — last year this saved the average Pro user $12,400.',
  'learn-4': 'Fee-only advisors charge a flat rate or percentage of assets instead of commissions. The Firmum fee analyzer shows exactly what you pay and how it compares to industry benchmarks.',
  'learn-5': 'Monte Carlo simulations run thousands of market scenarios to estimate retirement success probability. A result above 80% means your plan survives most market conditions.',
  'learn-6': 'A fiduciary is legally required to act in your best interest. Firmum\'s advisor marketplace only lists fiduciary advisors — you can filter by specialty, fee type, and minimum account size.',
  'learn-7': 'An emergency fund covering 3–6 months of expenses is your financial safety net. Use the Goals feature to set a target and track progress with monthly contribution reminders.',
  'learn-8': 'Dollar-cost averaging means investing a fixed amount on a regular schedule regardless of market conditions. This reduces the risk of buying at a peak and smooths out your average cost over time.',
};

const LEARNING_FAQS = [
  { q: 'Are these lessons free to watch?', a: 'Yes — all learning content is included with your Firmum account at no extra charge. Advanced courses unlock with Pro and Premium plans.' },
  { q: 'When will video tutorials be available?', a: 'Video placeholders are ready for our HeyGen avatar pipeline. Full video tutorials roll out progressively — check back weekly for new content.' },
  { q: 'Can I suggest a topic?', a: 'Absolutely. Use the Help section or message your advisor (if linked) to request topics. We prioritize content based on user demand.' },
  { q: 'Does Firmum provide investment advice in these lessons?', a: 'No. Learning content is educational only and does not constitute personalized investment advice. Consult a qualified advisor for recommendations specific to your situation.' },
];

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 tabular-nums">{completed}/{total}</span>
    </div>
  );
}

function LearningCard({ item, isCompleted, onMarkComplete }: { item: B2CLearningItem; isCompleted: boolean; onMarkComplete: (id: string) => void }) {
  const isVideo = item.content_type === 'video';
  const [expanded, setExpanded] = useState(false);
  const preview = ARTICLE_PREVIEWS[item.id];

  return (
    <article className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${isCompleted ? 'border-emerald-200' : 'border-slate-200'}`}>
      {/* Thumbnail */}
      <div className="aspect-video flex items-center justify-center relative" style={{ backgroundColor: item.thumbnail_color || '#E2E8F0' }}>
        {isVideo ? (
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-blue-600 ml-1" fill="currentColor" />
          </div>
        ) : (
          <BookOpen className="w-10 h-10 text-slate-500/60" />
        )}
        <span className="absolute bottom-2 right-2 text-xs font-medium bg-black/60 text-white px-2 py-0.5 rounded">{item.duration}</span>
        {isCompleted && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 ${CATEGORY_COLORS[item.category]}`}>
          {CATEGORY_LABELS[item.category]}
        </span>
        <h3 className="text-sm font-semibold text-slate-900 leading-snug">{item.title}</h3>
        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>

        {/* Article preview (expandable) */}
        {preview && !isVideo && (
          <div className="mt-3">
            <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700">
              <ExternalLink className="w-3 h-3" />
              {expanded ? 'Collapse preview' : 'Preview article'}
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3">{preview}</p>
            )}
          </div>
        )}

        {isVideo && (
          <p className="mt-3 text-xs flex items-center gap-1 text-slate-400">
            <Lock className="w-3 h-3" />Video coming soon
          </p>
        )}

        {/* Mark complete */}
        {!isVideo && !isCompleted && (
          <button type="button" onClick={() => onMarkComplete(item.id)}
            className="mt-3 w-full py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
            Mark as read
          </button>
        )}
        {isCompleted && (
          <p className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />Completed
          </p>
        )}
      </div>
    </article>
  );
}

export default function ClientLearning() {
  const [items, setItems] = useState<B2CLearningItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState<Set<string>>(new Set(COMPLETED_IDS));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await b2cApi.getLearningContent();
        if (!cancelled) setItems(res.items);
      } catch {
        if (!cancelled) setError('Unable to load learning content. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return ['all', ...Array.from(cats)] as const;
  }, [items]);

  const filtered = activeCategory === 'all' ? items : items.filter((i) => i.category === activeCategory);
  const completedCount = items.filter((i) => completed.has(i.id)).length;

  const handleMarkComplete = (id: string) => {
    setCompleted((prev) => new Set([...prev, id]));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* ── header ────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Learning Center</h1>
        <p className="mt-1 text-sm text-slate-500">Short lessons on managing money, investing basics, and working with an advisor.</p>
      </div>

      {/* ── progress strip ────────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-slate-800">Your progress</span>
            </div>
            {completedCount === items.length && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                All complete!
              </span>
            )}
          </div>
          <ProgressBar completed={completedCount} total={items.length} />
          <p className="text-xs text-slate-400 mt-1.5">{items.length - completedCount} lesson{items.length - completedCount !== 1 ? 's' : ''} remaining</p>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <>
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {cat === 'all' ? `All topics (${items.length})` : CATEGORY_LABELS[cat as B2CLearningItem['category']]}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <LearningCard key={item.id} item={item} isCompleted={completed.has(item.id)} onMarkComplete={handleMarkComplete} />
            ))}
          </div>
        </>
      )}

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          Frequently asked questions
        </h2>
        <div className="space-y-2">
          {LEARNING_FAQS.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-slate-200 bg-white open:shadow-sm open:border-blue-200">
              <summary className="cursor-pointer list-none px-5 py-4 font-medium text-slate-900 hover:text-blue-600 transition-colors flex items-center justify-between gap-2">
                {q}
                <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
              </summary>
              <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
