import { Link } from 'react-router-dom';
import { AppLink } from '../../components/brand/AppLink';
import {
  Brain,
  Users,
  Shield,
  BarChart3,
  MessageSquare,
  Building2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { MarketingPageShell } from '../../components/layout/MarketingPageShell';
import { CategoryLabel } from '../../components/marketing/MarketingPrimitives';
import { FEATURE_CATEGORIES, HERO_STATS } from '../../constants/marketingSite';
import { AIEnginesSection } from '../../components/marketing/FeaturesShowcase';
import { AdvisorDashboardMockup } from '../../components/marketing/FirmumMockups';

const CATEGORY_ICONS = [Users, BarChart3, Shield, MessageSquare];

export function FeaturesPage() {
  return (
    <MarketingPageShell>
      <section className="relative py-16 sm:py-24 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <CategoryLabel>Product</CategoryLabel>
              <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                Every Tool Your Practice Needs
              </h1>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                38 advisor modules, 19 client portal pages, and three AI engines — designed to enhance
                efficiency across portfolio management, compliance, planning, and client engagement.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {HERO_STATS.map((s) => (
                  <div key={s.label} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                    <p className="text-2xl font-extrabold text-primary-600">{s.value}</p>
                    <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
              <AppLink
                to="/onboarding"
                className="mt-8 inline-flex items-center gap-2 bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors"
              >
                Start 30-Day Free Trial
                <ArrowRight className="h-5 w-5" />
              </AppLink>
            </div>
            <AdvisorDashboardMockup />
          </div>
        </div>
      </section>

      {FEATURE_CATEGORIES.map((cat, idx) => {
        const Icon = CATEGORY_ICONS[idx] ?? Brain;
        return (
          <section
            key={cat.id}
            className={`py-16 sm:py-20 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <CategoryLabel>{cat.label}</CategoryLabel>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{cat.headline}</h2>
              <p className="mt-2 text-slate-500 max-w-2xl">{cat.description}</p>
              <div className="mt-10 grid sm:grid-cols-2 gap-6">
                {cat.features.map((f) => (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-slate-900">{f.title}</h3>
                        <p className="mt-1 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <AIEnginesSection />

      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Building2 className="w-10 h-10 text-primary-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Operations, billing, and firm management</h2>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto">
            Report builder, AUM billing via Stripe, firm RBAC, engagement analytics, CRM integrations,
            learning center, and 293 automated E2E tests.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/pricing" className="text-primary-400 font-semibold hover:text-primary-300">
              View pricing →
            </Link>
            <Link to="/updates" className="text-slate-400 hover:text-white">
              Latest updates →
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
