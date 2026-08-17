import {
  Brain,
  Users,
  Shield,
  Receipt,
  BarChart3,
  Target,
  LayoutDashboard,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PLATFORM_HIGHLIGHTS } from '../../constants/marketingSite';
import { FeatureCard, SectionHeader } from './MarketingPrimitives';
import { AdvisorDashboardMockup, ClientPortalMockup } from './FirmumMockups';
import { ArrowRight } from 'lucide-react';

const ICONS = [Brain, Users, Shield, Receipt, BarChart3, Target];

export function FeaturesShowcase({ showCta = true }: { showCta?: boolean }) {
  return (
    <section id="features" className="py-20 sm:py-28 bg-slate-50 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Platform"
          title="Built for Every Part of Your Practice"
          subtitle="38 advisor modules and a free client portal — one platform for portfolios, compliance, planning, and growth."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {PLATFORM_HIGHLIGHTS.map((f, i) => {
            const Icon = ICONS[i] ?? LayoutDashboard;
            return (
              <FeatureCard
                key={f.title}
                icon={<Icon className="w-5 h-5 text-primary-600" />}
                headline={f.headline}
                title={f.title}
                description={f.description}
              />
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-lg">
          <div>
            <SectionHeader
              badge="Advisor Portal"
              title="Your Command Center"
              subtitle="AUM, households, compliance alerts, and AI recommendations on one screen — with deep modules for every workflow."
              center={false}
            />
            <ul className="space-y-3 text-sm text-slate-600">
              {[
                'Six-dimension portfolio analysis with letter grades',
                'Model portfolios, rebalancing, and best execution',
                'Meetings with AI prep and transcript intelligence',
                'Billing, reporting, and 17+ statement parsers',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <AdvisorDashboardMockup />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mt-16 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0f2744] p-8 sm:p-12 text-white">
          <ClientPortalMockup />
          <div>
            <SectionHeader
              badge="Client Portal"
              title="Free for Every Client"
              subtitle="White-label portal with performance, goals, tax center, documents, messaging, and an AI assistant — included on every plan."
              dark
              center={false}
            />
            <ul className="space-y-3 text-sm text-slate-300">
              {[
                '19 dedicated client pages',
                'What-if scenarios and risk profiling',
                'Meeting booking and secure messaging',
                '7-step self-service onboarding',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {showCta && (
          <div className="text-center mt-12">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700 transition-colors"
            >
              Explore all 57+ features
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function AIEnginesSection() {
  const engines = [
    {
      icon: Brain,
      name: 'Investment Intelligence (IIM)',
      desc: 'Portfolio construction, fee drag, concentration risk, tax efficiency, and rebalancing across households.',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Shield,
      name: 'Compliance Investment (CIM)',
      desc: 'Suitability checks, regulatory monitoring, audit trails, and proactive issue flagging.',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: FileText,
      name: 'Behavioral Intelligence (BIM)',
      desc: 'Personalized narratives, meeting prep, and coaching grounded in behavioral finance.',
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="AI"
          title="Three Engines Built for Wealth Management"
          subtitle="Purpose-built intelligence — not generic chatbots. Every output is advisor-reviewed before it reaches clients."
        />
        <div className="grid md:grid-cols-3 gap-8">
          {engines.map(({ icon: Icon, name, desc, color }) => (
            <div
              key={name}
              className="rounded-2xl border border-slate-200 p-8 hover:shadow-lg transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{name}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              <span className="inline-block mt-4 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                In Production
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
