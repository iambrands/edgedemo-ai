import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  GraduationCap,
  Play,
  CheckCircle,
  Clock,
  ChevronRight,
  BookOpen,
  Users,
  Shield,
  BarChart3,
  MessageCircle,
  FileBarChart,
  Bot,
  Receipt,
  UserPlus,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string;
  title: string;
  duration: string;
  description: string;
  videoId: string; // placeholder for HeyGen/Synthesia embed
  completed: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: 'getting-started' | 'client-management' | 'investing' | 'compliance' | 'advanced';
  lessons: Lesson[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Course Data
// ─────────────────────────────────────────────────────────────────────────────

const COURSES: Course[] = [
  {
    id: 'platform-overview',
    title: 'Platform Overview',
    description: 'A complete tour of the Edge platform — what it does, how it works, and how to navigate the dashboard.',
    icon: GraduationCap,
    category: 'getting-started',
    lessons: [
      { id: 'po-1', title: 'Welcome to Edge', duration: '3:00', description: 'Meet your AI tutor and learn what Edge can do for your practice.', videoId: 'HEYGEN_WELCOME_01', completed: false },
      { id: 'po-2', title: 'Navigating the Dashboard', duration: '4:30', description: 'Learn the sidebar, top navigation, and how to find every feature.', videoId: 'HEYGEN_NAV_01', completed: false },
      { id: 'po-3', title: 'Key Metrics & KPIs', duration: '3:30', description: 'Understanding your AUM, household count, alerts, and activity feed.', videoId: 'HEYGEN_KPI_01', completed: false },
    ],
  },
  {
    id: 'firm-onboarding',
    title: 'Onboarding Your Firm',
    description: 'Step-by-step walkthrough of the advisor onboarding wizard — profile, firm details, compliance, and custodian connections.',
    icon: UserPlus,
    category: 'getting-started',
    lessons: [
      { id: 'fo-1', title: 'Creating Your Advisor Profile', duration: '2:30', description: 'Set up your personal details, CRD number, and licenses.', videoId: 'HEYGEN_PROFILE_01', completed: false },
      { id: 'fo-2', title: 'Firm Details & Client Types', duration: '4:00', description: 'Configure your firm info and select the plan types you handle (401k, 403b, 457b, TSP, pensions, IRAs).', videoId: 'HEYGEN_FIRM_01', completed: false },
      { id: 'fo-3', title: 'Connecting Custodians', duration: '3:00', description: 'Link Schwab, Fidelity, Vanguard, Pershing, and other custodial accounts.', videoId: 'HEYGEN_CUSTODIAN_01', completed: false },
      { id: 'fo-4', title: 'Branding Your Client Portal', duration: '2:00', description: 'Upload your logo, set colors, and customize the client experience.', videoId: 'HEYGEN_BRAND_01', completed: false },
    ],
  },
  {
    id: 'client-management',
    title: 'Adding & Managing Clients',
    description: 'How to import clients via CSV, create households, manage accounts, and handle rollovers for teachers, government employees, and more.',
    icon: Users,
    category: 'client-management',
    lessons: [
      { id: 'cm-1', title: 'Bulk Client Import (CSV)', duration: '4:00', description: 'Upload dozens of clients at once — teachers with 403(b)s, government employees with 457(b)s, 401(k) rollovers, and more.', videoId: 'HEYGEN_BULKIMPORT_01', completed: false },
      { id: 'cm-2', title: 'Creating Households', duration: '3:00', description: 'Group clients into households, add family members, and see consolidated views.', videoId: 'HEYGEN_HOUSEHOLD_01', completed: false },
      { id: 'cm-3', title: 'Managing Accounts', duration: '3:30', description: 'View account details, fee analysis, custodian connections, and tax type breakdowns.', videoId: 'HEYGEN_ACCOUNTS_01', completed: false },
      { id: 'cm-4', title: 'Rollover Processing', duration: '5:00', description: 'Step-by-step rollover workflow for 401(k), 403(b), 457(b), TSP, and pension plans.', videoId: 'HEYGEN_ROLLOVER_01', completed: false },
      { id: 'cm-5', title: 'Prospect Pipeline', duration: '3:00', description: 'Track leads, manage your prospect pipeline, and convert prospects to clients.', videoId: 'HEYGEN_PROSPECTS_01', completed: false },
    ],
  },
  {
    id: 'communication',
    title: 'Client Communication',
    description: 'Messaging, meetings, CRM integration, and building strong client relationships.',
    icon: MessageCircle,
    category: 'client-management',
    lessons: [
      { id: 'co-1', title: 'Secure Messaging', duration: '3:00', description: 'Send and receive encrypted messages with clients directly through the platform.', videoId: 'HEYGEN_MESSAGING_01', completed: false },
      { id: 'co-2', title: 'Scheduling Meetings', duration: '2:30', description: 'Set up availability, let clients book meetings, and manage your calendar.', videoId: 'HEYGEN_MEETINGS_01', completed: false },
      { id: 'co-3', title: 'CRM Integration', duration: '3:30', description: 'Connect your CRM (Salesforce, Redtail, Wealthbox) and keep everything in sync.', videoId: 'HEYGEN_CRM_01', completed: false },
      { id: 'co-4', title: 'Conversation Intelligence', duration: '3:00', description: 'Review AI-analyzed conversation insights, sentiment tracking, and compliance flags.', videoId: 'HEYGEN_CONVO_01', completed: false },
    ],
  },
  {
    id: 'reporting',
    title: 'Reporting & Analytics',
    description: 'Build custom reports, schedule automated delivery, and analyze portfolio performance.',
    icon: FileBarChart,
    category: 'investing',
    lessons: [
      { id: 'rp-1', title: 'Portfolio Analysis', duration: '4:00', description: 'Run deep portfolio analysis including allocation, risk scoring, and fee comparison.', videoId: 'HEYGEN_ANALYSIS_01', completed: false },
      { id: 'rp-2', title: 'Custom Report Builder', duration: '4:30', description: 'Build branded reports with drag-and-drop sections, save templates, and export as PDF.', videoId: 'HEYGEN_REPORTS_01', completed: false },
      { id: 'rp-3', title: 'Automated Report Scheduling', duration: '3:00', description: 'Schedule quarterly reports to be generated and emailed to clients automatically.', videoId: 'HEYGEN_SCHEDULE_01', completed: false },
      { id: 'rp-4', title: 'Statements & Documents', duration: '2:30', description: 'Upload, organize, and share account statements and custodial documents.', videoId: 'HEYGEN_STATEMENTS_01', completed: false },
    ],
  },
  {
    id: 'investing-tools',
    title: 'Investment Management',
    description: 'Stock screener, model portfolios, trading, tax harvesting, and alternative assets.',
    icon: BarChart3,
    category: 'investing',
    lessons: [
      { id: 'it-1', title: 'Stock Screener', duration: '4:00', description: 'Screen stocks using fundamental criteria — presets for Value, Growth, Dividend, Quality, and GARP strategies.', videoId: 'HEYGEN_SCREENER_01', completed: false },
      { id: 'it-2', title: 'Model Portfolios', duration: '3:30', description: 'Create and manage model portfolios, assign to households, and track drift.', videoId: 'HEYGEN_MODELS_01', completed: false },
      { id: 'it-3', title: 'Trading & Rebalancing', duration: '5:00', description: 'Execute trades, rebalance portfolios, and manage the trading workflow.', videoId: 'HEYGEN_TRADING_01', completed: false },
      { id: 'it-4', title: 'Tax-Loss Harvesting', duration: '4:00', description: 'Identify tax-loss harvesting opportunities and execute swaps for enhanced tax efficiency.', videoId: 'HEYGEN_TAXHARVEST_01', completed: false },
      { id: 'it-5', title: 'Alternative Assets', duration: '3:30', description: 'Track private equity, hedge funds, real estate — J-curve analysis, waterfall distributions, and K-1 tracking.', videoId: 'HEYGEN_ALTS_01', completed: false },
    ],
  },
  {
    id: 'compliance-center',
    title: 'Compliance & Workflows',
    description: 'Stay on top of regulatory requirements with automated monitoring, workflow templates, and audit trails.',
    icon: Shield,
    category: 'compliance',
    lessons: [
      { id: 'cc-1', title: 'Compliance Dashboard', duration: '3:30', description: 'Monitor your compliance score, review alerts, and track pending tasks.', videoId: 'HEYGEN_COMPLIANCE_01', completed: false },
      { id: 'cc-2', title: 'Workflow Templates', duration: '4:00', description: 'Use pre-built workflows for new clients, annual reviews, rollovers, and life events.', videoId: 'HEYGEN_WORKFLOWS_01', completed: false },
      { id: 'cc-3', title: 'Audit Trail & Documentation', duration: '3:00', description: 'Generate timestamped audit trails for every action and maintain exam-ready records.', videoId: 'HEYGEN_AUDIT_01', completed: false },
      { id: 'cc-4', title: 'Best Execution Monitoring', duration: '3:30', description: 'Track trade execution quality, price improvement, and NBBO compliance across brokers.', videoId: 'HEYGEN_BESTEXEC_01', completed: false },
    ],
  },
  {
    id: 'advanced-features',
    title: 'Advanced AI Features',
    description: 'Leverage AI for deeper insights — chat assistant, meeting prep, client narratives, and behavioral intelligence.',
    icon: Bot,
    category: 'advanced',
    lessons: [
      { id: 'af-1', title: 'AI Chat Assistant', duration: '3:00', description: 'Ask questions about portfolios, get instant analysis, and generate insights using natural language.', videoId: 'HEYGEN_AICHAT_01', completed: false },
      { id: 'af-2', title: 'Meeting Prep Generator', duration: '3:00', description: 'Auto-generate talking points, alerts, and personalized agendas before client meetings.', videoId: 'HEYGEN_MEETINGPREP_01', completed: false },
      { id: 'af-3', title: 'Client Narrative Generation', duration: '2:30', description: 'Create personalized quarterly review narratives and market update letters.', videoId: 'HEYGEN_NARRATIVES_01', completed: false },
      { id: 'af-4', title: 'Liquidity & Cash Flow', duration: '3:00', description: 'Analyze liquidity needs, project cash flows, and plan for distributions.', videoId: 'HEYGEN_LIQUIDITY_01', completed: false },
    ],
  },
  {
    id: 'billing-fees',
    title: 'Billing & Client Portal',
    description: 'Set up fee schedules, manage billing, and understand how your clients experience the portal.',
    icon: Receipt,
    category: 'advanced',
    lessons: [
      { id: 'bf-1', title: 'Billing Automation', duration: '3:00', description: 'Configure fee schedules, generate invoices, and track payments automatically.', videoId: 'HEYGEN_BILLING_01', completed: false },
      { id: 'bf-2', title: 'Client Portal Tour', duration: '4:00', description: 'See exactly what your clients see — dashboard, performance, meetings, messaging, and more.', videoId: 'HEYGEN_CLIENTPORTAL_01', completed: false },
      { id: 'bf-3', title: 'Portal Customization', duration: '2:30', description: 'Customize branding, enable/disable features, and tailor the portal for your practice.', videoId: 'HEYGEN_CUSTOMIZE_01', completed: false },
    ],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Courses' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'client-management', label: 'Client Management' },
  { id: 'investing', label: 'Investing & Reports' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'advanced', label: 'Advanced' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function LearningCenter() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  const filteredCourses =
    selectedCategory === 'all'
      ? COURSES
      : COURSES.filter((c) => c.category === selectedCategory);

  const totalLessons = COURSES.reduce((sum, c) => sum + c.lessons.length, 0);
  const completedCount = completedLessons.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const markComplete = (lessonId: string) => {
    setCompletedLessons((prev) => new Set([...prev, lessonId]));
  };

  // ── Lesson Player View ──────────────────────────────────────────────────
  if (activeCourse && activeLesson) {
    const lessonIdx = activeCourse.lessons.findIndex((l) => l.id === activeLesson.id);
    const nextLesson = activeCourse.lessons[lessonIdx + 1] || null;

    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => { setActiveCourse(null); setActiveLesson(null); }} className="hover:text-blue-600">
            Learning Center
          </button>
          <ChevronRight size={14} />
          <button onClick={() => setActiveLesson(null)} className="hover:text-blue-600">
            {activeCourse.title}
          </button>
          <ChevronRight size={14} />
          <span className="text-slate-900 font-medium">{activeLesson.title}</span>
        </div>

        {/* Video Player Area */}
        <div className="bg-slate-900 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto">
              <Play size={36} className="text-white ml-1" />
            </div>
            <p className="text-white/80 text-lg font-medium">{activeLesson.title}</p>
            <p className="text-white/50 text-sm">
              Video ID: <code className="bg-white/10 px-2 py-0.5 rounded">{activeLesson.videoId}</code>
            </p>
            <p className="text-white/40 text-xs max-w-md mx-auto">
              Embed your HeyGen or Synthesia video here. Replace the video ID above with your
              generated video embed URL.
            </p>
          </div>
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
            {activeLesson.duration}
          </div>
        </div>

        {/* Lesson Info + Actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{activeLesson.title}</h2>
              <p className="text-slate-600 mt-1">{activeLesson.description}</p>
            </div>
            <div className="flex gap-3">
              {completedLessons.has(activeLesson.id) ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium">
                  <CheckCircle size={16} /> Completed
                </span>
              ) : (
                <button
                  onClick={() => markComplete(activeLesson.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  Mark as Complete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Course Lessons Sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">{activeCourse.title} — All Lessons</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {activeCourse.lessons.map((lesson, idx) => (
              <button
                key={lesson.id}
                onClick={() => setActiveLesson(lesson)}
                className={`w-full flex items-center gap-4 px-6 py-3 text-left hover:bg-slate-50 transition ${
                  lesson.id === activeLesson.id ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  completedLessons.has(lesson.id)
                    ? 'bg-emerald-100 text-emerald-700'
                    : lesson.id === activeLesson.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {completedLessons.has(lesson.id) ? <CheckCircle size={14} /> : idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{lesson.title}</p>
                  <p className="text-xs text-slate-500">{lesson.duration}</p>
                </div>
                {lesson.id === activeLesson.id && (
                  <span className="text-xs text-blue-600 font-medium">Playing</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Next Lesson */}
        {nextLesson && (
          <button
            onClick={() => setActiveLesson(nextLesson)}
            className="w-full flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 hover:bg-blue-100 transition"
          >
            <div className="text-left">
              <p className="text-sm text-blue-600 font-medium">Up Next</p>
              <p className="text-slate-900 font-semibold">{nextLesson.title}</p>
            </div>
            <ChevronRight size={20} className="text-blue-600" />
          </button>
        )}
      </div>
    );
  }

  // ── Course Detail View ──────────────────────────────────────────────────
  if (activeCourse) {
    const courseCompleted = activeCourse.lessons.filter((l) => completedLessons.has(l.id)).length;
    const coursePct = Math.round((courseCompleted / activeCourse.lessons.length) * 100);

    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => setActiveCourse(null)} className="hover:text-blue-600">
            Learning Center
          </button>
          <ChevronRight size={14} />
          <span className="text-slate-900 font-medium">{activeCourse.title}</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
              <activeCourse.icon size={28} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{activeCourse.title}</h1>
              <p className="text-slate-600 mt-1">{activeCourse.description}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <BookOpen size={14} /> {activeCourse.lessons.length} lessons
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <Clock size={14} /> {activeCourse.lessons.reduce((sum, l) => {
                    const [m, s] = l.duration.split(':').map(Number);
                    return sum + m + (s || 0) / 60;
                  }, 0).toFixed(0)} min total
                </span>
                <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                  <CheckCircle size={14} /> {courseCompleted}/{activeCourse.lessons.length} completed
                </span>
              </div>
              {coursePct > 0 && (
                <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${coursePct}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {activeCourse.lessons.map((lesson, idx) => (
            <button
              key={lesson.id}
              onClick={() => setActiveLesson(lesson)}
              className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50 transition"
            >
              <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                completedLessons.has(lesson.id)
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {completedLessons.has(lesson.id) ? <CheckCircle size={16} /> : idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{lesson.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">{lesson.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{lesson.duration}</span>
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <Play size={14} className="text-blue-600 ml-0.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Main Catalog View ───────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <GraduationCap size={28} className="text-blue-600" />
            Learning Center
          </h1>
          <p className="text-slate-600 mt-1">
            Master every feature of the Edge platform with guided video tutorials from your AI tutor.
          </p>
        </div>
      </div>

      {/* Progress Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Your Progress</p>
            <p className="text-3xl font-bold mt-1">{progressPct}% Complete</p>
            <p className="text-blue-200 text-sm mt-1">
              {completedCount} of {totalLessons} lessons completed
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-blue-200 text-xs">Courses</p>
              <p className="text-2xl font-bold">{COURSES.length}</p>
            </div>
            <div className="w-px h-10 bg-blue-500" />
            <div className="text-right">
              <p className="text-blue-200 text-xs">Lessons</p>
              <p className="text-2xl font-bold">{totalLessons}</p>
            </div>
            <div className="w-px h-10 bg-blue-500" />
            <div className="text-right">
              <p className="text-blue-200 text-xs">Total Time</p>
              <p className="text-2xl font-bold">~90m</p>
            </div>
          </div>
        </div>
        <div className="mt-4 w-full bg-blue-500/40 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((course) => {
          const courseCompleted = course.lessons.filter((l) => completedLessons.has(l.id)).length;
          const CourseIcon = course.icon;
          return (
            <button
              key={course.id}
              onClick={() => setActiveCourse(course)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-left hover:shadow-md hover:border-blue-200 transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
                  <CourseIcon size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">{course.title}</h3>
                  <p className="text-xs text-slate-400">
                    {course.lessons.length} lessons
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2 mb-3">{course.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${course.lessons.length > 0 ? (courseCompleted / course.lessons.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 ml-3">
                  {courseCompleted}/{course.lessons.length}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* AI Tutor CTA */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
          <Bot size={28} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Need help with something specific?</h3>
          <p className="text-sm text-slate-600">
            Ask your AI assistant any question about the platform. Head to{' '}
            <span className="text-blue-600 font-medium">AI Chat</span> for instant answers.
          </p>
        </div>
        <a
          href="/dashboard/chat"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
        >
          Ask AI Tutor
        </a>
      </div>
    </div>
  );
}
