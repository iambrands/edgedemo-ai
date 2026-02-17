import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  Shield,
  Lightbulb,
  Heart,
  Users,
  DollarSign,
  ThumbsUp,
  Clock,
  Sparkles,
  Briefcase,
  Newspaper,
  Mail,
} from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const TEAM = [
  {
    name: 'Sarah Chen',
    role: 'CEO & Co-Founder',
    bio: 'Former managing director at Goldman Sachs Wealth Management. 15 years leading high-net-worth advisory teams before co-founding Edge to bring institutional intelligence to every advisor.',
  },
  {
    name: 'Michael Torres',
    role: 'CTO',
    bio: 'Ex-Google engineering lead with a decade of experience building scalable AI systems. Passionate about applying machine learning to solve real problems in financial services.',
  },
  {
    name: 'Dr. Priya Patel',
    role: 'Head of AI Research',
    bio: 'PhD in Machine Learning from Stanford. Published researcher in financial NLP and time-series forecasting. Previously led the quantitative research team at Two Sigma.',
  },
  {
    name: 'James Wilson',
    role: 'Head of Compliance',
    bio: 'Former FINRA examiner with 20 years of regulatory experience. Ensures every Edge feature meets or exceeds regulatory requirements across all jurisdictions.',
  },
];

const VALUES = [
  {
    icon: Eye,
    title: 'Transparency',
    description: 'Every recommendation comes with a clear reasoning chain. Advisors and clients see the "why" behind every insight.',
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'SOC 2 Type II certified with bank-grade encryption. Client data is protected at rest and in transit with zero-knowledge architecture.',
  },
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'We invest heavily in R&D, continuously advancing our AI models to stay at the frontier of wealth management technology.',
  },
  {
    icon: Heart,
    title: 'Client-First',
    description: 'Everything we build starts with the question: does this help advisors better serve their clients? If not, we don\'t ship it.',
  },
];

const STATS = [
  { icon: Users, value: '500+', label: 'Advisors Served' },
  { icon: DollarSign, value: '$12B+', label: 'AUM on Platform' },
  { icon: ThumbsUp, value: '98%', label: 'Client Satisfaction' },
  { icon: Clock, value: '99.99%', label: 'Platform Uptime' },
];

export default function About() {
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
            <Link to="/company/careers" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" /> Careers
            </Link>
            <Link to="/company/blog" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Newspaper className="h-3.5 w-3.5" /> Blog
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
            About Edge
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            AI-Native Wealth Management
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Edge is redefining how financial advisors serve their clients by combining
            institutional-grade analytics with cutting-edge artificial intelligence.
          </p>
        </section>

        {/* Mission */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto">
            Democratize institutional-grade investment intelligence so every advisor
            — regardless of firm size — can deliver world-class outcomes for their clients.
          </p>
        </section>

        {/* Story */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Story</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                Edge was founded by financial advisors who saw firsthand how AI could
                transform the way advisors serve their clients. After years of watching
                promising technology fail to bridge the gap between institutional and
                independent advisory, they decided to build the platform they always wished existed.
              </p>
              <p>
                Today, Edge is built by a team combining decades of wealth management
                experience with cutting-edge AI research. We understand the nuances of
                fiduciary responsibility, regulatory compliance, and client communication
                — because we've lived it.
              </p>
              <p>
                Our platform doesn't replace advisors. It amplifies their expertise,
                automates the tedious, and surfaces the insights that drive better outcomes.
              </p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
            <div className="grid grid-cols-2 gap-6">
              {STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center">
                    <div className="inline-flex p-3 bg-blue-50 rounded-xl mb-3">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Leadership Team</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Bringing together expertise from finance, technology, and regulatory compliance.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((member) => (
              <div key={member.name} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl font-bold text-blue-600">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-center">{member.name}</h3>
                <p className="text-sm text-blue-600 text-center mb-3">{member.role}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Our Values</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              The principles that guide every decision we make.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                  <div className="inline-flex p-3 bg-blue-50 rounded-xl mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{value.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-slate-50 rounded-2xl p-10 border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Join the Future of Wealth Management
          </h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto">
            Whether you're an advisor looking to scale or an investor seeking smarter insights,
            Edge is built for you.
          </p>
          <Link
            to="/company/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Get in Touch <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
