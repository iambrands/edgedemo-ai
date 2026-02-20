import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Calendar,
  User,
  ArrowRight,
  Sparkles,
  Mail,
  Info,
  Briefcase,
} from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const FEATURED_POST = {
  title: 'The Future of AI in Wealth Management',
  date: 'February 10, 2026',
  author: 'Dr. Priya Patel',
  excerpt:
    "Artificial intelligence is no longer a novelty in financial services -- it is becoming the foundation. In this deep dive, we explore how AI-native platforms are reshaping portfolio analysis, client communication, and regulatory compliance for the next generation of advisors.",
  category: 'Industry Insights',
};

const BLOG_POSTS = [
  {
    title: 'Tax-Loss Harvesting: A Complete Guide for Advisors',
    date: 'January 28, 2026',
    category: 'Tax Strategy',
    excerpt:
      'Learn how systematic tax-loss harvesting can save your clients thousands annually while maintaining their target asset allocation.',
  },
  {
    title: 'How Behavioral Finance AI Improves Client Retention',
    date: 'January 15, 2026',
    category: 'AI & Technology',
    excerpt:
      'Discover how AI-powered behavioral insights help advisors anticipate client concerns and strengthen relationships proactively.',
  },
  {
    title: 'Compliance Automation: Reducing Exam Risk by 80%',
    date: 'December 20, 2025',
    category: 'Compliance',
    excerpt:
      'How automated compliance monitoring transforms regulatory preparedness from a reactive burden to a proactive advantage.',
  },
  {
    title: 'Building Trust with AI Transparency',
    date: 'December 5, 2025',
    category: 'Best Practices',
    excerpt:
      'Why explainable AI isn\'t just a technical feature — it\'s the foundation of client trust in an increasingly automated world.',
  },
  {
    title: 'The Rise of Efficiency-Driven Wealth Platforms',
    date: 'November 18, 2025',
    category: 'Industry Insights',
    excerpt:
      'Traditional wealthtech bolted AI onto legacy systems. Here\'s why platforms built from the ground up with AI deliver fundamentally better outcomes.',
  },
  {
    title: '5 Portfolio Analytics Every RIA Should Monitor',
    date: 'November 3, 2025',
    category: 'Portfolio Management',
    excerpt:
      'From concentration risk to fee drag, these five analytics give advisors an early warning system for portfolio health.',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Industry Insights': 'bg-blue-100 text-blue-700',
  'Tax Strategy': 'bg-green-100 text-green-700',
  'AI & Technology': 'bg-purple-100 text-purple-700',
  Compliance: 'bg-red-100 text-red-700',
  'Best Practices': 'bg-amber-100 text-amber-700',
  'Portfolio Management': 'bg-teal-100 text-teal-700',
};

export default function Blog() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            <Link to="/company/about" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> About
            </Link>
            <Link to="/company/careers" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" /> Careers
            </Link>
            <Link to="/company/contact" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> Contact
            </Link>
          </nav>
          <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 sm:hidden">
            Home <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-20">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Edge Blog
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Edge Insights
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Expert perspectives on AI, wealth management, compliance, and the technology
            shaping the future of financial advisory.
          </p>
        </section>

        {/* Featured Post */}
        <section>
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="grid md:grid-cols-2">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 flex items-center justify-center min-h-[240px]">
                <div className="text-center text-white">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-80" />
                  <p className="text-sm font-medium text-blue-200">Featured Article</p>
                </div>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full w-fit mb-4 ${CATEGORY_COLORS[FEATURED_POST.category]}`}>
                  {FEATURED_POST.category}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">{FEATURED_POST.title}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {FEATURED_POST.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {FEATURED_POST.author}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-6">{FEATURED_POST.excerpt}</p>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors w-fit">
                  Read More <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-900 text-center">Latest Articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post) => (
              <div
                key={post.title}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="bg-gradient-to-br from-slate-100 to-slate-50 h-32 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-slate-300" />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full w-fit mb-3 ${CATEGORY_COLORS[post.category] || 'bg-slate-100 text-slate-700'}`}>
                    {post.category}
                  </span>
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                    <Calendar className="h-3 w-3" /> {post.date}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 flex-1">{post.excerpt}</p>
                  <button className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 mt-4 transition-colors">
                    Read Article <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="bg-slate-50 rounded-2xl p-8 sm:p-12 border border-slate-100 text-center">
          <Mail className="h-10 w-10 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Stay in the Loop</h2>
          <p className="text-slate-600 mb-6 max-w-lg mx-auto">
            Get the latest insights on AI-powered wealth management delivered to your inbox every week.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@company.com"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">No spam, ever. Unsubscribe anytime.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
