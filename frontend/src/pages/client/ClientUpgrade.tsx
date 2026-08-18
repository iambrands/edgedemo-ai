import { useState } from 'react';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { ClientPageShell } from './ClientPageShell';
import { b2cApi, getB2CToken } from '../../services/b2cApi';

interface Tier {
  id: 'starter' | 'pro' | 'premium';
  name: string;
  price: string;
  period: string;
  icon: typeof Sparkles;
  highlight: boolean;
  trial: string;
  features: string[];
}

const TIERS: Tier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$9',
    period: '/mo',
    icon: Sparkles,
    highlight: false,
    trial: '14-day free trial',
    features: [
      '3 statement uploads / month',
      'Basic fee analysis',
      '10 AI chat messages / month',
      'Portfolio allocation view',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/mo',
    icon: Zap,
    highlight: true,
    trial: '14-day free trial',
    features: [
      'Unlimited statement uploads',
      'Advanced fee impact projections',
      '100 AI chat messages / month',
      'Tax-loss harvesting alerts',
      'Advisor match request',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$79',
    period: '/mo',
    icon: Crown,
    highlight: false,
    trial: '14-day free trial',
    features: [
      'Everything in Pro',
      'Unlimited AI chat',
      'Priority advisor matching',
      'Family household (up to 5 members)',
      'Estate & beneficiary tracking',
      'Dedicated onboarding call',
    ],
  },
];

export default function ClientUpgrade() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isLoggedIn = Boolean(getB2CToken());

  const handleUpgrade = async (tier: 'starter' | 'pro' | 'premium') => {
    if (!isLoggedIn) {
      window.location.href = '/client/signup?redirect=/client/upgrade';
      return;
    }
    setError('');
    setLoading(tier);
    try {
      const res = await b2cApi.startCheckout(tier);
      window.location.href = res.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout');
      setLoading(null);
    }
  };

  return (
    <ClientPageShell
      title="Upgrade your plan"
      subtitle="Unlock deeper insights, unlimited uploads, and advisor matching."
      badge="Plans"
      backTo="/client/dashboard"
      backLabel="Dashboard"
    >
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 text-center">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-5">
        {TIERS.map(tier => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.id}
              className={`relative flex flex-col bg-white rounded-2xl border shadow-sm p-6 ${
                tier.highlight
                  ? 'border-blue-500 shadow-blue-100 ring-1 ring-blue-500'
                  : 'border-slate-200'
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                  Most popular
                </span>
              )}

              <div className="mb-4 flex items-center gap-2">
                <Icon className={`h-5 w-5 ${tier.highlight ? 'text-blue-600' : 'text-slate-500'}`} />
                <h2 className="font-bold text-slate-900">{tier.name}</h2>
              </div>

              <div className="mb-1">
                <span className="text-3xl font-extrabold text-slate-900">{tier.price}</span>
                <span className="text-slate-500 text-sm">{tier.period}</span>
              </div>
              <p className="text-xs text-slate-400 mb-5">{tier.trial}</p>

              <ul className="space-y-2 flex-1 mb-6">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={loading === tier.id}
                onClick={() => handleUpgrade(tier.id)}
                className={`w-full py-2.5 rounded-lg font-medium transition-colors text-sm ${
                  tier.highlight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                    : 'border border-slate-300 hover:bg-slate-50 text-slate-800 disabled:opacity-50'
                } disabled:cursor-not-allowed`}
              >
                {loading === tier.id ? 'Redirecting…' : `Start ${tier.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        Cancel anytime. No hidden fees. Powered by Stripe.
      </p>
    </ClientPageShell>
  );
}
