import { Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Target, BarChart3, Scale,
  Heart, FileSearch, TrendingUp, AlertTriangle, BookOpen,
} from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const ANALYSIS_MODULES = [
  {
    icon: BarChart3,
    title: 'Portfolio Health Assessment',
    approach: 'Rule-based scoring across 8 dimensions: diversification, concentration, fee efficiency, tax positioning, liquidity, income adequacy, risk alignment, and benchmark comparison.',
    dataInputs: 'Account positions, holdings, cost basis, target allocation, risk profile.',
    outputType: 'Score (0-100), letter grade, prioritized recommendations.',
  },
  {
    icon: TrendingUp,
    title: 'Tax Optimization',
    approach: 'Deterministic identification of tax-loss harvesting candidates, wash-sale rule compliance, and asset location optimization across taxable/tax-deferred/tax-free accounts.',
    dataInputs: 'Holdings with cost basis, purchase dates, realized gains/losses YTD, account tax types.',
    outputType: 'Estimated annual tax savings, specific lot-level recommendations, projected impact.',
  },
  {
    icon: Scale,
    title: 'Compliance & Suitability',
    approach: 'Rule-engine validation against FINRA 2111 (suitability), FINRA 2330 (VA suitability), and SEC Reg BI (best interest). Each rule is individually testable and auditable.',
    dataInputs: 'Client risk profile, investment objectives, time horizon, net worth, portfolio composition.',
    outputType: 'Compliance status, suitability score, identified issues with regulatory references.',
  },
  {
    icon: Heart,
    title: 'Behavioral Intelligence',
    approach: 'AI-generated narratives use client profile data, portfolio context, and market conditions to produce personalized communications. All outputs use natural language generation with financial domain constraints.',
    dataInputs: 'Client communication preferences, portfolio events, market context, advisor notes.',
    outputType: 'Draft narratives (advisor-editable), coaching messages, meeting preparation briefs.',
  },
  {
    icon: Target,
    title: 'Retirement Projections',
    approach: 'Monte Carlo simulation (1,000 runs) with variable return distributions, inflation modeling, Social Security integration, and withdrawal sequencing. Deterministic baseline projection provided alongside probabilistic outcomes.',
    dataInputs: 'Current savings, contribution rate, expected return, inflation, retirement age, spending needs.',
    outputType: 'Success probability, projected balance, monthly income, comparison across scenarios.',
  },
  {
    icon: FileSearch,
    title: 'Statement Parsing',
    approach: 'Multi-layer parsing: custodian-specific parsers for known formats, pattern-matching fallback for variations, and LLM-powered universal parser for unrecognized formats. Each layer validates against expected schemas.',
    dataInputs: 'CSV/XLSX statement files from 17+ brokerage platforms.',
    outputType: 'Normalized positions, account metadata, fee schedules, gain/loss data.',
  },
];

const PRINCIPLES = [
  {
    icon: AlertTriangle,
    title: 'Conservative by Default',
    text: 'When uncertainty exists, Edge errs on the side of caution. Ambiguous compliance situations are flagged for human review rather than auto-resolved.',
  },
  {
    icon: BookOpen,
    title: 'Explainable Outputs',
    text: 'Every recommendation includes the reasoning chain. Advisors see not just "what" but "why" — enabling informed decisions and client-ready explanations.',
  },
  {
    icon: Target,
    title: 'Domain-Constrained AI',
    text: 'Our AI models are constrained to financial advisory domains. They cannot make claims outside their training scope and will explicitly indicate uncertainty.',
  },
];

export default function Methodology() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/about/technology" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Technology</span>
          </Link>
          <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Home <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-16">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Methodology</h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            A detailed look at how Edge analyzes portfolios, generates recommendations,
            and ensures the accuracy of every output. Our methodology combines deterministic
            financial logic with AI-powered insight generation.
          </p>
        </section>

        {/* Principles */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center">Core Principles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {PRINCIPLES.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="inline-flex p-3 bg-blue-50 rounded-xl mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{p.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Analysis Modules */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Modules</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Each module uses a defined approach, accepts specific data inputs,
              and produces structured outputs that advisors can verify and act upon.
            </p>
          </div>

          <div className="space-y-6">
            {ANALYSIS_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <div key={mod.title} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-2.5 bg-blue-50 rounded-lg flex-shrink-0">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mt-0.5">{mod.title}</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 ml-0 md:ml-14">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Approach</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{mod.approach}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Data Inputs</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{mod.dataInputs}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Output</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{mod.outputType}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Limitations */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Known Limitations</h2>
          <ul className="space-y-3">
            {[
              'AI-generated narratives should always be reviewed by a qualified advisor before delivery to clients.',
              'Tax projections are estimates and should not replace consultation with a qualified tax professional.',
              'Retirement projections use historical return distributions and cannot predict future market performance.',
              'Statement parsing accuracy depends on the quality and format of source documents. Advisors should verify parsed data against original statements.',
              'Compliance validation covers common regulatory requirements but does not replace a comprehensive compliance program.',
            ].map((limitation, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Footer CTA */}
        <section className="text-center pb-8">
          <p className="text-slate-500 mb-4">
            Questions about our methodology?
          </p>
          <Link
            to="/company/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Contact Our Team
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
