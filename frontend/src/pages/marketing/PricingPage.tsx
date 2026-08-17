import { AppLink } from '../../components/brand/AppLink';
import { ArrowRight, HelpCircle } from 'lucide-react';
import { MarketingPageShell } from '../../components/layout/MarketingPageShell';
import { PricingSection } from '../../components/marketing/PricingSection';
import { SectionHeader } from '../../components/marketing/MarketingPrimitives';
import { FAQS } from '../../constants/marketingSite';

export function PricingPage() {
  return (
    <MarketingPageShell>
      <section className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">Pricing</h1>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            Transparent plans that scale with your AUM. Every tier includes the full client portal at no
            extra cost.
          </p>
        </div>
      </section>

      <PricingSection id="plans" />

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="FAQ"
            title="Pricing Questions"
            subtitle="Common questions about plans, trials, and what's included."
          />
          <div className="space-y-4">
            {FAQS.slice(0, 4).map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-slate-200 bg-slate-50/50 open:bg-white open:shadow-sm"
              >
                <summary className="flex items-center gap-3 cursor-pointer list-none px-5 py-4 font-semibold text-slate-900">
                  <HelpCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  {faq.q}
                </summary>
                <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-600 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-2 text-primary-100">30-day free trial. No credit card required.</p>
          <AppLink
            to="/onboarding"
            className="mt-6 inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-7 py-3 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5" />
          </AppLink>
        </div>
      </section>
    </MarketingPageShell>
  );
}
