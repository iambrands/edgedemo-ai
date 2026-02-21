import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  FileText,
  DollarSign,
  Shield,
  MessageCircle,
  Phone,
  Clock,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const CLIENT_FAQS = [
  {
    category: 'Account Access',
    questions: [
      {
        q: 'How do I log into my client portal?',
        a: "Visit the portal URL provided by your advisor and enter your email and password. If you haven't set up your account yet, click \"First time? Set up account\" and follow the instructions.",
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: "Click \"Forgot Password\" on the login page, enter your email, and we'll send you a reset link. The link expires in 24 hours for security.",
      },
      {
        q: 'How do I enable two-factor authentication?',
        a: 'Go to Settings > Security > Two-Factor Authentication and click "Enable". You can use an authenticator app or SMS verification.',
      },
    ],
  },
  {
    category: 'Viewing Your Accounts',
    questions: [
      {
        q: "Why don't I see all my accounts?",
        a: 'Your advisor links accounts to your portal. If an account is missing, contact your advisor to have it added. Some account types may take 24-48 hours to sync.',
      },
      {
        q: 'How often is my account data updated?',
        a: 'Account balances and positions are updated daily. Some custodians provide intraday updates. The last sync time is shown at the top of each account.',
      },
      {
        q: 'What does "Pending" status mean on a transaction?',
        a: 'Pending transactions have been initiated but not yet settled. Most transactions settle within 1-3 business days depending on the type.',
      },
    ],
  },
  {
    category: 'Documents & Reports',
    questions: [
      {
        q: 'Where can I find my statements?',
        a: 'Go to Documents > Statements to view and download your account statements. You can filter by account and date range.',
      },
      {
        q: 'How do I download tax documents?',
        a: "Tax documents (1099s, etc.) are available in Documents > Tax Documents after they're issued by your custodian, typically by mid-February.",
      },
      {
        q: 'Can I get documents emailed to me?',
        a: 'Yes! Go to Settings > Notifications and enable "Email document notifications" to receive alerts when new documents are available.',
      },
    ],
  },
  {
    category: 'Working with Your Advisor',
    questions: [
      {
        q: 'How do I schedule a meeting with my advisor?',
        a: "Click \"Schedule Meeting\" in the portal header or go to Messages > Schedule Meeting to view your advisor's availability and book a time.",
      },
      {
        q: 'How do I send a secure message to my advisor?',
        a: 'Use the Messages section in the portal. All messages are encrypted and your advisor typically responds within 1 business day.',
      },
      {
        q: 'Can I request a withdrawal or transfer?',
        a: 'Yes. Go to Requests > New Request and select "Withdrawal" or "Transfer". Your advisor will review and process your request, typically within 2-3 business days.',
      },
    ],
  },
  {
    category: 'Security & Privacy',
    questions: [
      {
        q: 'Is my information secure?',
        a: 'Yes. We use bank-level 256-bit encryption, and your data is stored in SOC 2 certified data centers. We never share your information with third parties.',
      },
      {
        q: 'Who can see my account information?',
        a: 'Only you and your authorized advisor(s) can access your account information. You can see who has access in Settings > Privacy.',
      },
      {
        q: 'How do I report suspicious activity?',
        a: 'If you notice any unauthorized activity, contact your advisor immediately and email security@edge.com. We take all reports seriously.',
      },
    ],
  },
];

const QUICK_GUIDES = [
  { title: 'Getting Started with Your Portal', icon: HelpCircle, time: '3 min read' },
  { title: 'Understanding Your Portfolio Summary', icon: DollarSign, time: '5 min read' },
  { title: 'How to Read Your Performance Report', icon: FileText, time: '4 min read' },
  { title: 'Keeping Your Account Secure', icon: Shield, time: '3 min read' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ClientHelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Account Access');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const filteredFaqs = searchQuery
    ? CLIENT_FAQS.map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (item) =>
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.a.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      })).filter((cat) => cat.questions.length > 0)
    : CLIENT_FAQS;

  const isAuthenticated = !!localStorage.getItem('portal_token');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Simple header for authenticated users */}
      {isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-800 to-blue-700 px-6 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center">
            <span className="text-sm font-bold text-white">E</span>
          </div>
          <span className="text-lg font-bold text-white">Edge</span>
        </div>
      )}

      {/* Header */}
      <div className={isAuthenticated ? '' : 'bg-white border-b border-slate-200'}>
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-12">
          <Link
            to="/portal/dashboard"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portal
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Help Center</h1>
            <p className="text-slate-600 mb-6">
              Find answers to common questions about your client portal
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help..."
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Quick Guides */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUICK_GUIDES.map((guide) => {
              const Icon = guide.icon;
              return (
                <div
                  key={guide.title}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
                >
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{guide.title}</p>
                    <p className="text-sm text-slate-500">{guide.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQs by Category */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {filteredFaqs.map((category) => (
              <div
                key={category.category}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedCategory(
                      expandedCategory === category.category ? null : category.category,
                    )
                  }
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50"
                >
                  <span className="font-semibold text-slate-900">{category.category}</span>
                  <ChevronRight
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      expandedCategory === category.category ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {expandedCategory === category.category && (
                  <div className="border-t border-slate-100">
                    {category.questions.map((item, qIndex) => (
                      <div key={qIndex} className="border-b border-slate-100 last:border-b-0">
                        <button
                          onClick={() =>
                            setExpandedQuestion(expandedQuestion === item.q ? null : item.q)
                          }
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50"
                        >
                          <span className="text-slate-700 pr-4">{item.q}</span>
                          <ChevronRight
                            className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${
                              expandedQuestion === item.q ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                        {expandedQuestion === item.q && (
                          <div className="px-4 pb-4">
                            <p className="text-slate-600 bg-blue-50 rounded-lg p-4 text-sm">
                              {item.a}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Your Advisor */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Contact Your Advisor
          </h2>
          <p className="text-slate-600 mb-6">
            Can&apos;t find what you&apos;re looking for? Your advisor is here to help.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/portal/dashboard"
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-slate-900">Send Message</span>
              <span className="text-xs text-slate-500">Typically responds in 1 day</span>
            </Link>
            <a
              href="tel:+15551234567"
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Phone className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-slate-900">Call</span>
              <span className="text-xs text-slate-500">(555) 123-4567</span>
            </a>
            <Link
              to="/portal/dashboard"
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Clock className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-slate-900">Schedule Meeting</span>
              <span className="text-xs text-slate-500">View availability</span>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
