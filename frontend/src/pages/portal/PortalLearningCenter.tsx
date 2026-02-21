import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  GraduationCap,
  Play,
  CheckCircle,
  ChevronRight,
  BookOpen,
  TrendingUp,
  Target,
  MessageCircle,
  Receipt,
  Home,
  Bot,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string;
  title: string;
  duration: string;
  description: string;
  videoId: string;
  completed: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: 'getting-started' | 'managing-money' | 'communication' | 'planning';
  lessons: Lesson[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Course Data — Client-Facing
// ─────────────────────────────────────────────────────────────────────────────

const CLIENT_COURSES: Course[] = [
  {
    id: 'welcome-portal',
    title: 'Welcome to Your Portal',
    description: 'A friendly introduction to your client portal — how to navigate, what you can do, and where to find everything.',
    icon: GraduationCap,
    category: 'getting-started',
    lessons: [
      { id: 'wp-1', title: 'Your Portal at a Glance', duration: '2:30', description: 'A quick tour of your personal dashboard — account balances, recent activity, and quick actions.', videoId: 'SYNTH_CLIENT_WELCOME_01', completed: false },
      { id: 'wp-2', title: 'Navigating the Portal', duration: '2:00', description: 'Learn how to use the navigation bar, access all features, and find what you need.', videoId: 'SYNTH_CLIENT_NAV_01', completed: false },
      { id: 'wp-3', title: 'Setting Up Your Profile', duration: '1:30', description: 'Update your contact information, notification preferences, and security settings.', videoId: 'SYNTH_CLIENT_PROFILE_01', completed: false },
    ],
  },
  {
    id: 'understanding-performance',
    title: 'Understanding Your Performance',
    description: 'Learn how to read your performance reports, understand returns, and track your portfolio over time.',
    icon: TrendingUp,
    category: 'managing-money',
    lessons: [
      { id: 'up-1', title: 'Reading Your Dashboard', duration: '3:00', description: 'Understand your total value, YTD returns, and how your accounts are performing.', videoId: 'SYNTH_CLIENT_DASHBOARD_01', completed: false },
      { id: 'up-2', title: 'Performance Charts Explained', duration: '3:30', description: 'Learn how to read performance charts, compare against benchmarks, and understand time periods.', videoId: 'SYNTH_CLIENT_PERF_01', completed: false },
      { id: 'up-3', title: 'Asset Allocation', duration: '2:30', description: 'See how your money is divided across stocks, bonds, and other assets — and why it matters.', videoId: 'SYNTH_CLIENT_ALLOC_01', completed: false },
    ],
  },
  {
    id: 'goals-planning',
    title: 'Goals & Financial Planning',
    description: 'Set financial goals, run what-if scenarios, and plan for your future with confidence.',
    icon: Target,
    category: 'planning',
    lessons: [
      { id: 'gp-1', title: 'Setting Your Goals', duration: '2:30', description: 'Create retirement, education, or savings goals and track your progress over time.', videoId: 'SYNTH_CLIENT_GOALS_01', completed: false },
      { id: 'gp-2', title: 'What-If Scenarios', duration: '3:00', description: 'Explore "what if" questions — What if I retire at 62? What if I save more? See projections instantly.', videoId: 'SYNTH_CLIENT_WHATIF_01', completed: false },
      { id: 'gp-3', title: 'Risk Profile', duration: '2:00', description: 'Understand your risk tolerance assessment and how it shapes your investment strategy.', videoId: 'SYNTH_CLIENT_RISK_01', completed: false },
    ],
  },
  {
    id: 'tax-center',
    title: 'Tax Center & Documents',
    description: 'View your tax lots, download tax documents, and understand potential tax-efficiency opportunities.',
    icon: Receipt,
    category: 'managing-money',
    lessons: [
      { id: 'tc-1', title: 'Tax Summary Overview', duration: '3:00', description: 'Understand your realized and unrealized gains, estimated tax impact, and harvesting opportunities.', videoId: 'SYNTH_CLIENT_TAX_01', completed: false },
      { id: 'tc-2', title: 'Downloading Tax Documents', duration: '1:30', description: 'Find and download your 1099-B, 1099-DIV, and other tax forms for filing.', videoId: 'SYNTH_CLIENT_TAXDOCS_01', completed: false },
      { id: 'tc-3', title: 'Documents & Statements', duration: '2:00', description: 'Access all your account statements, reports, and shared documents from your advisor.', videoId: 'SYNTH_CLIENT_DOCS_01', completed: false },
    ],
  },
  {
    id: 'communicating',
    title: 'Communicating with Your Advisor',
    description: 'Message your advisor, schedule meetings, submit requests, and stay connected.',
    icon: MessageCircle,
    category: 'communication',
    lessons: [
      { id: 'cm-1', title: 'Secure Messaging', duration: '2:00', description: 'Send and receive secure messages with your advisor directly through the portal.', videoId: 'SYNTH_CLIENT_MSG_01', completed: false },
      { id: 'cm-2', title: 'Scheduling Meetings', duration: '2:30', description: 'Book a meeting with your advisor — choose a time, select a meeting type, and confirm.', videoId: 'SYNTH_CLIENT_MEETINGS_01', completed: false },
      { id: 'cm-3', title: 'Submitting Requests', duration: '2:00', description: 'Request withdrawals, transfers, address changes, or documents — all tracked with status updates.', videoId: 'SYNTH_CLIENT_REQUESTS_01', completed: false },
      { id: 'cm-4', title: 'Notifications', duration: '1:30', description: 'Stay informed with real-time notifications about your accounts, documents, and meetings.', videoId: 'SYNTH_CLIENT_NOTIF_01', completed: false },
    ],
  },
  {
    id: 'ai-assistant',
    title: 'Using the AI Assistant',
    description: 'Ask questions about your accounts, performance, taxes, and more — get instant, plain-language answers.',
    icon: Bot,
    category: 'planning',
    lessons: [
      { id: 'ai-1', title: 'Asking Your AI Assistant', duration: '2:30', description: 'Learn what kinds of questions you can ask — account balances, performance, tax questions, and more.', videoId: 'SYNTH_CLIENT_AI_01', completed: false },
      { id: 'ai-2', title: 'Understanding AI Answers', duration: '2:00', description: 'How to interpret AI responses, follow suggested actions, and when to contact your advisor instead.', videoId: 'SYNTH_CLIENT_AI_02', completed: false },
    ],
  },
  {
    id: 'family-beneficiaries',
    title: 'Family & Beneficiaries',
    description: 'View your household, manage beneficiaries, and keep your estate plan up to date.',
    icon: Home,
    category: 'planning',
    lessons: [
      { id: 'fb-1', title: 'Family Dashboard', duration: '2:30', description: 'See your household at a glance — all family members, their accounts, joint accounts, and dependents.', videoId: 'SYNTH_CLIENT_FAMILY_01', completed: false },
      { id: 'fb-2', title: 'Managing Beneficiaries', duration: '3:00', description: 'Review and request updates to beneficiary designations on each of your accounts.', videoId: 'SYNTH_CLIENT_BENE_01', completed: false },
    ],
  },
];

const CLIENT_CATEGORIES = [
  { id: 'all', label: 'All Topics' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'managing-money', label: 'Your Money' },
  { id: 'communication', label: 'Communication' },
  { id: 'planning', label: 'Planning & AI' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PortalLearningCenter() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  const filteredCourses =
    selectedCategory === 'all'
      ? CLIENT_COURSES
      : CLIENT_COURSES.filter((c) => c.category === selectedCategory);

  const totalLessons = CLIENT_COURSES.reduce((sum, c) => sum + c.lessons.length, 0);
  const completedCount = completedLessons.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const markComplete = (lessonId: string) => {
    setCompletedLessons((prev) => new Set([...prev, lessonId]));
  };

  // ── Lesson Player View ──────────────────────────────────────────────────
  const renderLessonPlayer = () => {
    if (!activeCourse || !activeLesson) return null;
    const lessonIdx = activeCourse.lessons.findIndex((l) => l.id === activeLesson.id);
    const nextLesson = activeCourse.lessons[lessonIdx + 1] || null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => { setActiveCourse(null); setActiveLesson(null); }} className="hover:text-blue-600">
            Learn
          </button>
          <ChevronRight size={14} />
          <button onClick={() => setActiveLesson(null)} className="hover:text-blue-600">
            {activeCourse.title}
          </button>
          <ChevronRight size={14} />
          <span className="text-slate-900 font-medium">{activeLesson.title}</span>
        </div>

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
              Embed your HeyGen or Synthesia video here.
            </p>
          </div>
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
            {activeLesson.duration}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{activeLesson.title}</h2>
              <p className="text-slate-600 mt-1">{activeLesson.description}</p>
            </div>
            {completedLessons.has(activeLesson.id) ? (
              <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium">
                <CheckCircle size={16} /> Done
              </span>
            ) : (
              <button
                onClick={() => markComplete(activeLesson.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
              >
                Mark as Done
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {activeCourse.lessons.map((lesson, idx) => (
            <button
              key={lesson.id}
              onClick={() => setActiveLesson(lesson)}
              className={`w-full flex items-center gap-4 px-6 py-3 text-left hover:bg-slate-50 transition ${
                lesson.id === activeLesson.id ? 'bg-blue-50' : ''
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                completedLessons.has(lesson.id) ? 'bg-emerald-100 text-emerald-700'
                  : lesson.id === activeLesson.id ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {completedLessons.has(lesson.id) ? <CheckCircle size={14} /> : idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{lesson.title}</p>
                <p className="text-xs text-slate-500">{lesson.duration}</p>
              </div>
            </button>
          ))}
        </div>

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
  };

  // ── Course Detail View ──────────────────────────────────────────────────
  const renderCourseDetail = () => {
    if (!activeCourse) return null;
    const courseCompleted = activeCourse.lessons.filter((l) => completedLessons.has(l.id)).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => setActiveCourse(null)} className="hover:text-blue-600">
            Learn
          </button>
          <ChevronRight size={14} />
          <span className="text-slate-900 font-medium">{activeCourse.title}</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <activeCourse.icon size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">{activeCourse.title}</h2>
              <p className="text-slate-600 mt-1">{activeCourse.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <BookOpen size={14} /> {activeCourse.lessons.length} videos
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle size={14} /> {courseCompleted} done
                </span>
              </div>
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
                completedLessons.has(lesson.id) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
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
  };

  // ── Main Catalog View ───────────────────────────────────────────────────
  const renderCatalog = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <GraduationCap size={28} className="text-blue-600" />
          Learn How to Use Your Portal
        </h1>
        <p className="text-slate-600 mt-1">
          Short video tutorials to help you get the most out of your client experience.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">Your Progress</p>
            <p className="text-2xl font-bold mt-1">{progressPct}% Complete</p>
            <p className="text-white/70 text-sm mt-0.5">
              {completedCount} of {totalLessons} videos watched
            </p>
          </div>
          <div className="hidden sm:flex gap-6">
            <div className="text-right">
              <p className="text-white/60 text-xs">Topics</p>
              <p className="text-xl font-bold">{CLIENT_COURSES.length}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Videos</p>
              <p className="text-xl font-bold">{totalLessons}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 w-full bg-white/20 rounded-full h-2">
          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {CLIENT_CATEGORIES.map((cat) => (
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <h3 className="font-semibold text-slate-900 text-sm">{course.title}</h3>
                  <p className="text-xs text-slate-400">{course.lessons.length} videos</p>
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
    </div>
  );

  return (
    <div className="space-y-6">
      {activeCourse && activeLesson
        ? renderLessonPlayer()
        : activeCourse
        ? renderCourseDetail()
        : renderCatalog()}
    </div>
  );
}
