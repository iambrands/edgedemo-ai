import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Book,
  Video,
  MessageCircle,
  ChevronRight,
  Play,
  FileText,
  Settings,
  Users,
  Shield,
  BarChart3,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface HelpArticle {
  id: string;
  title: string;
  excerpt: string;
  readTime: string;
  type: 'article' | 'video' | 'guide';
}

interface HelpCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  articles: HelpArticle[];
}

const CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    articles: [
      { id: '1', title: 'Complete Setup Guide', excerpt: 'Step-by-step guide to setting up your EdgeAI account', readTime: '10 min', type: 'guide' },
      { id: '2', title: 'Connecting Your First Custodian', excerpt: 'How to link Schwab, Fidelity, or other custodians', readTime: '5 min', type: 'article' },
      { id: '3', title: 'Platform Overview Video', excerpt: 'Quick tour of all EdgeAI features', readTime: '8 min', type: 'video' },
    ],
  },
  {
    id: 'client-management',
    title: 'Client Management',
    icon: Users,
    articles: [
      { id: '4', title: 'Adding New Clients', excerpt: 'How to onboard clients through the portal', readTime: '5 min', type: 'article' },
      { id: '5', title: 'Household Setup', excerpt: 'Organizing accounts into households', readTime: '4 min', type: 'article' },
      { id: '6', title: 'Client Portal Customization', excerpt: 'Branding and configuring the client experience', readTime: '6 min', type: 'guide' },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    icon: Shield,
    articles: [
      { id: '7', title: 'Understanding Compliance Alerts', excerpt: 'How the AI compliance system works', readTime: '7 min', type: 'article' },
      { id: '8', title: 'ADV Part 2B Generator', excerpt: 'Creating and updating your ADV documents', readTime: '10 min', type: 'guide' },
      { id: '9', title: 'Audit Trail & Reporting', excerpt: 'Accessing compliance reports for examinations', readTime: '5 min', type: 'article' },
    ],
  },
  {
    id: 'analysis',
    title: 'Analysis Tools',
    icon: BarChart3,
    articles: [
      { id: '10', title: 'Running Portfolio Analysis', excerpt: 'How to analyze client portfolios', readTime: '6 min', type: 'article' },
      { id: '11', title: 'Tax-Loss Harvesting', excerpt: 'Identifying and executing tax-saving opportunities', readTime: '8 min', type: 'guide' },
      { id: '12', title: 'Risk Assessment Tools', excerpt: 'Understanding concentration and risk metrics', readTime: '5 min', type: 'article' },
    ],
  },
  {
    id: 'settings',
    title: 'Account Settings',
    icon: Settings,
    articles: [
      { id: '13', title: 'Managing Your Profile', excerpt: 'Updating personal and firm information', readTime: '3 min', type: 'article' },
      { id: '14', title: 'API Keys & Integrations', excerpt: 'Setting up API access for custom integrations', readTime: '5 min', type: 'article' },
      { id: '15', title: 'Billing & Subscription', excerpt: 'Managing your plan and payment methods', readTime: '4 min', type: 'article' },
    ],
  },
];

const FAQS = [
  {
    question: 'How do I connect my custodian accounts?',
    answer: 'Go to Custodians in the sidebar, click "Connect" on your custodian, and follow the OAuth authorization flow. Most custodians connect in under 2 minutes.',
  },
  {
    question: 'Is my client data secure?',
    answer: 'Yes. EdgeAI uses bank-level 256-bit AES encryption, SOC 2 Type II compliance, and all data is stored in secure AWS data centers. We never share your data with third parties.',
  },
  {
    question: 'How does the AI compliance monitoring work?',
    answer: "Our AI continuously monitors your client portfolios for concentration risk, suitability issues, and regulatory concerns. You'll receive alerts when potential issues are detected, with recommended actions.",
  },
  {
    question: 'Can I customize the client portal with my branding?',
    answer: 'Yes! Go to Settings > Branding to upload your logo, set your primary colors, and customize the welcome message your clients see.',
  },
  {
    question: 'How do I generate compliance documents like Form CRS?',
    answer: 'Navigate to Compliance Docs, click "Generate Document", select the document type, and our AI will pre-fill based on your firm information. You can edit before publishing.',
  },
  {
    question: 'What custodians do you support?',
    answer: 'We support Charles Schwab, Fidelity, TD Ameritrade, Pershing, Interactive Brokers, and more. Check the Custodians page for the full list.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer: "Go to Settings > Billing and click \"Cancel Subscription\". You'll retain access until the end of your billing period. Your data will be available for export for 30 days.",
  },
  {
    question: 'Can I import data from my existing systems?',
    answer: 'Yes. We support CSV imports for client data, positions, and transactions. Contact support for help with large migrations or custom integrations.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RIAHelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const filteredCategories = searchQuery
    ? CATEGORIES.map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.excerpt.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      })).filter((cat) => cat.articles.length > 0)
    : CATEGORIES;

  const filteredFaqs = searchQuery
    ? FAQS.filter(
        (f) =>
          f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.answer.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : FAQS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-6 pt-6 pb-16">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-blue-200 hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
            <p className="text-blue-100 mb-8">
              Search our knowledge base or browse categories below
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for articles, guides, and tutorials..."
                className="w-full pl-12 pr-4 py-4 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-blue-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Book, label: 'Documentation', href: '#categories' },
            { icon: Video, label: 'Video Tutorials', href: '#categories' },
            { icon: MessageCircle, label: 'Contact Support', href: '#support' },
            { icon: HelpCircle, label: 'FAQs', href: '#faqs' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="p-3 bg-blue-50 rounded-lg">
                <link.icon className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-900">{link.label}</span>
            </a>
          ))}
        </div>

        {/* Categories */}
        <div id="categories">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {filteredCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{category.title}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {category.articles.map((article) => (
                      <a
                        key={article.id}
                        href={`#article-${article.id}`}
                        className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                      >
                        {article.type === 'video' ? (
                          <Play className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        ) : article.type === 'guide' ? (
                          <Book className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{article.title}</p>
                          <p className="text-sm text-slate-500 truncate">{article.excerpt}</p>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0">{article.readTime}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div id="faqs">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredFaqs.map((faq, index) => (
              <div key={index} className="border-b border-slate-100 last:border-b-0">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-900 pr-4">{faq.question}</span>
                  <ChevronRight
                    className={`h-5 w-5 text-slate-400 transition-transform flex-shrink-0 ${
                      expandedFaq === index ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4">
                    <p className="text-slate-600 bg-slate-50 rounded-lg p-4">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support CTA */}
        <div
          id="support"
          className="mt-12 p-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white text-center"
        >
          <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
          <p className="text-blue-100 mb-6">
            Our support team is available Monday-Friday, 9am-6pm EST
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="mailto:support@edgeai.com"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Email Support
            </a>
            <Link
              to="/dashboard/chat"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 transition-colors"
            >
              Chat with AI Assistant
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
