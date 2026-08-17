import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Zap,
  Star,
  X,
} from 'lucide-react';
import { MarketingNav } from '../components/layout/MarketingNav';
import { Footer } from '../components/layout/Footer';
import { scrollToLandingSection } from '../utils/landingScroll';
import { FeaturesShowcase, AIEnginesSection } from '../components/marketing/FeaturesShowcase';
import { PricingSection } from '../components/marketing/PricingSection';
import { StepCard, SectionHeader } from '../components/marketing/MarketingPrimitives';
import { AdvisorDashboardMockup, GradientOrbs } from '../components/marketing/FirmumMockups';
import {
  HERO_STATS,
  TRUST_CUSTODIANS,
  HOW_IT_WORKS_STEPS,
  COMPARISON_ROWS,
  FAQS,
  TESTIMONIALS,
} from '../constants/marketingSite';
import { MARKETING_COPY } from '../constants/marketingCopy';
import { PRODUCT_NAME } from '../constants/brand';
import { AppLink } from '../components/brand/AppLink';
import { goToApp } from '../utils/appUrl';

export function Landing() {
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { scrollTo?: string } | null;
    const target = state?.scrollTo;
    if (target) {
      requestAnimationFrame(() => scrollToLandingSection(target));
      window.history.replaceState({}, '', `#${target}`);
    } else if (location.hash) {
      const id = location.hash.replace('#', '');
      requestAnimationFrame(() => scrollToLandingSection(id));
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
        <GradientOrbs />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-primary-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-blue-100">
                <Zap className="h-4 w-4" />
                {PRODUCT_NAME} · Built for Registered Investment Advisors
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-slate-900 tracking-tight leading-tight">
                The Steady Layer for{' '}
                <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                  Modern Advisory Firms
                </span>
              </h1>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                {MARKETING_COPY.elevatorPitch.medium} Replace disconnected tools with one intelligent
                platform — portfolios, compliance, client portal, and AI in one place.
              </p>
              <div className="mt-5 space-y-2">
                {[
                  '38 advisor modules + free white-label client portal',
                  'Three AI engines with advisor review on every output',
                  '17+ brokerage statement formats parsed automatically',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-primary-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                <AppLink
                  to="/onboarding"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 text-white text-base font-semibold px-7 py-3.5 rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/25"
                >
                  Start 30-Day Free Trial
                  <ArrowRight className="h-5 w-5" />
                </AppLink>
                <Link
                  to="/features"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-700 text-base font-semibold px-7 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  See All Features
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Cancel anytime
                </span>
                <AppLink to="/login" className="text-primary-600 hover:text-primary-800 font-medium">
                  Advisor Login →
                </AppLink>
              </div>
            </div>
            <div className="flex-1 w-full lg:max-w-[520px]">
              <AdvisorDashboardMockup />
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto border-t border-slate-200 pt-10">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">{s.value}</div>
                <div className="mt-1 text-sm text-slate-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">
              Multi-custodian aggregation
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {TRUST_CUSTODIANS.map((name) => (
                <span
                  key={name}
                  className="text-sm font-semibold text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="How it works"
            title="From Onboarding to Compliance in Four Steps"
            subtitle="Get your book connected, analyzed, and client-ready in days — not months."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((s, i) => (
              <StepCard key={s.step} num={i + 1} title={s.title} desc={s.desc} />
            ))}
          </div>
        </div>
      </section>

      <FeaturesShowcase />
      <AIEnginesSection />

      {/* Compare */}
      <section id="compare" className="py-20 sm:py-28 bg-slate-900 scroll-mt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Compare"
            title="Firmum vs. Legacy Tool Stacks"
            subtitle="Stop paying for six tools that don't talk to each other."
            dark
          />
          <div className="rounded-2xl border border-slate-700 overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 py-3 px-4 bg-slate-800/80 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Capability</span>
              <span className="text-center">Legacy stack</span>
              <span className="text-center text-primary-400">Firmum</span>
            </div>
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 py-3.5 px-4 border-t border-slate-800 text-sm"
              >
                <span className="text-slate-300 font-medium">{row.feature}</span>
                <span className="text-center text-slate-500">
                  {row.legacy ? <CheckCircle2 className="w-5 h-5 text-slate-500 mx-auto" /> : <X className="w-5 h-5 text-red-400/80 mx-auto" />}
                </span>
                <span className="text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader badge="Advisors" title="Trusted by Growing RIAs" />
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} text-white text-sm font-bold flex items-center justify-center`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.author}</p>
                    <p className="text-xs text-slate-500">
                      {t.role}, {t.firm}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-28 bg-white scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader badge="FAQ" title="Frequently Asked Questions" />
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-slate-200 open:shadow-sm open:border-primary-200"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-900 hover:text-primary-600 transition-colors">
                  {faq.q}
                </summary>
                <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Updates teaser */}
      <section className="py-16 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Latest product updates</h2>
            <p className="mt-1 text-slate-500 text-sm">
              Tax module improvements, compliance rules, IMM sprint features, and more.
            </p>
          </div>
          <Link
            to="/updates"
            className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700"
          >
            View release notes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Modernize Your Practice?</h2>
          <p className="text-lg text-primary-100 mb-8">
            Join advisory firms using Firmum to deliver better outcomes — with less operational overhead.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => goToApp('/onboarding')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary-600 font-semibold px-7 py-3.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Start 30-Day Free Trial
            </button>
            <Link
              to="/company/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl border border-white/40 hover:bg-white/10 transition-colors"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
