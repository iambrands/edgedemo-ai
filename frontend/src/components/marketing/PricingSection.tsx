import { Link } from 'react-router-dom';
import { goToApp } from '../../utils/appUrl';
import { Check, Users } from 'lucide-react';
import { PRICING_TIERS } from '../../constants/marketingSite';
import { SectionHeader } from './MarketingPrimitives';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function PricingSection({ id = 'pricing' }: { id?: string }) {

  return (
    <section id={id} className="py-20 sm:py-28 bg-slate-50 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Pricing"
          title="Simple, Transparent Pricing"
          subtitle="Plans that scale with your practice. Client portal included free on every tier."
        />

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-5 py-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              Client portal FREE — your clients never pay
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 flex flex-col h-full ${
                tier.featured
                  ? 'bg-white border-2 border-primary-500 shadow-xl shadow-primary-500/10 scale-[1.02]'
                  : 'bg-white border border-slate-200 shadow-md'
              }`}
            >
              {tier.featured && (
                <Badge variant="blue" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{tier.audience}</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{tier.name}</h3>
              <p className="text-4xl font-extrabold text-slate-900 mt-3">
                {tier.price}
                {tier.period && <span className="text-base font-normal text-slate-500">{tier.period}</span>}
              </p>
              <p className="text-sm text-slate-500 mt-1">{tier.aum}</p>
              <p className="text-sm text-primary-600 font-medium mb-6">{tier.clients}</p>
              <ul className="space-y-3 mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2 mb-6">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">FREE Client Portal</span>
              </div>
              <Button
                variant={tier.featured ? 'primary' : 'secondary'}
                className="w-full"
                onClick={() => {
                  if (tier.cta === 'Contact Sales') {
                    window.location.assign('/company/contact');
                  } else {
                    goToApp('/onboarding');
                  }
                }}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-slate-400 mt-8">
          30-day free trial · No credit card required ·{' '}
          <Link
            to="/pricing"
            className="text-primary-600 hover:underline font-medium"
          >
            View full pricing details
          </Link>
        </p>
      </div>
    </section>
  );
}
