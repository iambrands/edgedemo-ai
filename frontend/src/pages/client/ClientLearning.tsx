import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock, Play, ChevronDown } from 'lucide-react';
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

const LEARNING_FAQS = [
  {
    q: 'Are these videos free to watch?',
    a: 'Yes — all learning content is included with your Firmum account at no extra charge. Premium tiers unlock additional advanced courses as they are released.',
  },
  {
    q: 'When will video tutorials be available?',
    a: 'Video placeholders are ready for our HeyGen avatar pipeline. Full video tutorials roll out progressively — check back weekly for new content.',
  },
  {
    q: 'Can I suggest a topic?',
    a: 'Absolutely. Use the Help section or message your advisor (if linked) to request topics. We prioritize content based on user demand.',
  },
  {
    q: 'Does Firmum provide investment advice in these lessons?',
    a: 'No. Learning content is educational only and does not constitute personalized investment advice. Consult a qualified advisor for recommendations specific to your situation.',
  },
];

function LearningCard({ item }: { item: B2CLearningItem }) {
  const isVideo = item.content_type === 'video';

  return (
    <article className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="aspect-video flex items-center justify-center relative"
        style={{ backgroundColor: item.thumbnail_color || '#E2E8F0' }}
      >
        {isVideo ? (
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-blue-600 ml-1" fill="currentColor" />
          </div>
        ) : (
          <BookOpen className="w-10 h-10 text-slate-500/60" />
        )}
        <span className="absolute bottom-2 right-2 text-xs font-medium bg-black/60 text-white px-2 py-0.5 rounded">
          {item.duration}
        </span>
      </div>
      <div className="p-4">
        <span
          className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 ${
            CATEGORY_COLORS[item.category]
          }`}
        >
          {CATEGORY_LABELS[item.category]}
        </span>
        <h3 className="text-sm font-semibold text-slate-900 leading-snug">{item.title}</h3>
        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
        <p className="mt-3 text-xs font-medium text-blue-600">
          {isVideo ? 'Video coming soon' : 'Read article →'}
        </p>
      </div>
    </article>
  );
}

export default function ClientLearning() {
  const [items, setItems] = useState<B2CLearningItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await b2cApi.getLearningContent();
        if (!cancelled) setItems(res.items);
      } catch {
        if (!cancelled) setError('Unable to load learning content. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return ['all', ...Array.from(cats)] as const;
  }, [items]);

  const filtered =
    activeCategory === 'all'
      ? items
      : items.filter((i) => i.category === activeCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Learning Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Short lessons on managing money, investing basics, and working with an advisor.
        </p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'All topics' : CATEGORY_LABELS[cat as B2CLearningItem['category']]}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <LearningCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}

      <section className="mt-14">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          Frequently asked questions
        </h2>
        <div className="space-y-2">
          {LEARNING_FAQS.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-slate-200 bg-white open:shadow-sm open:border-blue-200"
            >
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
