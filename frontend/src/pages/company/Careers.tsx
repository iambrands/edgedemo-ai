import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  TrendingUp,
  PiggyBank,
  Palmtree,
  Laptop,
  BookOpen,
  MapPin,
  ExternalLink,
  Sparkles,
  Building2,
  Newspaper,
  Mail,
  Info,
} from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const BENEFITS = [
  {
    icon: Heart,
    title: 'Health Insurance',
    description: 'Comprehensive medical, dental, and vision coverage for you and your family. 100% of premiums covered.',
  },
  {
    icon: TrendingUp,
    title: 'Equity Package',
    description: 'Meaningful equity stake with a four-year vesting schedule. We want everyone to share in our success.',
  },
  {
    icon: PiggyBank,
    title: '401(k) Match',
    description: 'We match 100% of your contributions up to 6% of your salary. Start investing from day one.',
  },
  {
    icon: Palmtree,
    title: 'Unlimited PTO',
    description: 'Take the time you need to recharge. We trust our team to manage their own schedules responsibly.',
  },
  {
    icon: Laptop,
    title: 'Remote Work',
    description: 'Work from anywhere. We are a remote-first company with optional co-working stipends in major cities.',
  },
  {
    icon: BookOpen,
    title: 'Learning Budget',
    description: '$3,000 annual learning budget for courses, conferences, books, and certifications of your choice.',
  },
];

const POSITIONS = [
  {
    department: 'Engineering',
    title: 'Senior Full-Stack Engineer',
    location: 'Remote (US)',
    type: 'Full-Time',
  },
  {
    department: 'AI/ML',
    title: 'Machine Learning Engineer',
    location: 'Remote (US)',
    type: 'Full-Time',
  },
  {
    department: 'Product',
    title: 'Senior Product Manager',
    location: 'Remote (US)',
    type: 'Full-Time',
  },
  {
    department: 'Sales',
    title: 'Enterprise Account Executive',
    location: 'New York, NY / Remote',
    type: 'Full-Time',
  },
  {
    department: 'Compliance',
    title: 'Regulatory Compliance Analyst',
    location: 'Wilmington, DE / Remote',
    type: 'Full-Time',
  },
  {
    department: 'Design',
    title: 'Senior Product Designer',
    location: 'Remote (US)',
    type: 'Full-Time',
  },
];

const DEPT_COLORS: Record<string, string> = {
  Engineering: 'bg-blue-100 text-blue-700',
  'AI/ML': 'bg-purple-100 text-purple-700',
  Product: 'bg-green-100 text-green-700',
  Sales: 'bg-amber-100 text-amber-700',
  Compliance: 'bg-red-100 text-red-700',
  Design: 'bg-pink-100 text-pink-700',
};

export default function Careers() {
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
            We're Hiring
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Join Our Team
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Help us build the future of wealth management. We're looking for passionate people
            who want to transform how financial advisors serve their clients.
          </p>
        </section>

        {/* Culture */}
        <section className="bg-slate-50 rounded-2xl p-8 sm:p-12 border border-slate-100">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Life at Edge</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  We're a remote-first, mission-driven team that believes the best work happens
                  when talented people are given autonomy and trust. Our culture values clarity over
                  hierarchy and impact over activity.
                </p>
                <p>
                  Every team member has a direct line to how their work improves outcomes for
                  advisors and their clients. We ship fast, learn continuously, and celebrate wins
                  together — no matter where we are.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['Remote-First', 'Mission-Driven', 'Ship Fast', 'Learn Always'].map((value) => (
                <div key={value} className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
                  <p className="font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Benefits & Perks</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We take care of our team so they can focus on doing their best work.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="inline-flex p-3 bg-blue-50 rounded-xl mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Open Positions */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Open Positions</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Find a role where you can make a real impact.
            </p>
          </div>
          <div className="space-y-4">
            {POSITIONS.map((pos) => (
              <div
                key={pos.title}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${DEPT_COLORS[pos.department] || 'bg-slate-100 text-slate-700'}`}>
                      {pos.department}
                    </span>
                    <span className="text-xs text-slate-400">{pos.type}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{pos.title}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {pos.location}
                  </p>
                </div>
                <a
                  href={`mailto:careers@edge.com?subject=Application: ${pos.title}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Apply <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-slate-50 rounded-2xl p-10 border border-slate-100">
          <Building2 className="h-10 w-10 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Don't See the Right Role?
          </h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto">
            We're always looking for exceptional talent. Send us your resume and tell us
            how you'd like to contribute.
          </p>
          <a
            href="mailto:careers@edge.com?subject=General Application"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Send General Application <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
}
