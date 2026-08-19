import { Link } from 'react-router-dom';
import {
  LineChart,
  ExternalLink,
  Banknote,
  BarChart2,
  Leaf,
  Activity,
  BarChart3,
  Zap,
  Shield,
  Layers,
} from 'lucide-react';
import { THETARA_URL, BULLARA_URL } from '../../constants/siblingPlatforms';

const PLATFORMS = [
  {
    name: 'THETARA',
    tagline: 'Options & Wheel Strategies',
    url: THETARA_URL,
    color: 'from-violet-600 to-indigo-600',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    icon: Activity,
    features: [
      'Automated wheel strategies with risk guardrails',
      'Real-time Greeks, IV rank, and probability of profit',
      'AI-powered trade scoring and position management',
    ],
    cta: 'Open THETARA',
  },
  {
    name: 'Bullara',
    tagline: 'Stocks, ETFs & Automation',
    url: BULLARA_URL,
    color: 'from-emerald-600 to-teal-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    icon: BarChart3,
    features: [
      'Stock & ETF screener with 11 strategy templates',
      'Paper trading with $100K virtual balance',
      'ML insights, automation engine, and trade journal',
    ],
    cta: 'Open Bullara',
  },
] as const;

const WEALTH_TOOLS = [
  { to: '/client/cash', icon: Banknote, label: 'Optimize Cash', desc: 'Compare HYSA rates and sweep idle cash' },
  { to: '/client/rebalancing', icon: BarChart2, label: 'Rebalance', desc: 'Align allocations to your target mix' },
  { to: '/client/auto-harvest', icon: Leaf, label: 'Tax Savings', desc: 'Harvest losses to reduce your tax bill' },
];

export default function ClientInvestments() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <LineChart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Investments Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Your hub for wealth optimization and active trading. Use Firmum tools below to optimize
            cash, rebalance, and harvest tax losses — or open THETARA and Bullara when you're ready to trade.
          </p>
        </div>
      </div>

      {/* Trading platforms */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Trading Platforms</h2>
        <p className="text-xs text-slate-500 mb-3">
          Separate IAB Advisors apps for options and stocks. Each opens in a new tab — sign in with your own account.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              {/* Gradient header */}
              <div className={`bg-gradient-to-r ${p.color} px-5 py-4`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{p.name}</h2>
                    <p className="text-xs text-white/80">{p.tagline}</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="px-5 py-4 flex-1">
                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Zap size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="px-5 pb-4">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r ${p.color} text-white text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity`}
                >
                  {p.cta}
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Wealth tools row */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Shield size={14} className="text-blue-600" />
          Wealth Optimization Tools
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {WEALTH_TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <Icon size={14} className="text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{t.label}</span>
                </div>
                <p className="text-xs text-slate-500 pl-[38px]">{t.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Ecosystem banner */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
          <Layers size={14} className="text-slate-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">One ecosystem, three platforms</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Firmum handles planning, budgeting, and portfolio optimization. THETARA and Bullara are
            separate IAB Advisors trading platforms — log in independently to trade. In a future update,
            you'll be able to link accounts for a unified portfolio view.
          </p>
        </div>
      </div>

      {/* Compliance footer */}
      <p className="text-[10px] text-slate-400 leading-relaxed">
        Firmum is a technology platform, not a registered investment adviser, broker-dealer, or
        custodian. THETARA and Bullara are independent trading platforms operated by IAB Advisors, Inc.
        This page does not constitute investment advice. Past performance is not indicative of future results.
      </p>
    </div>
  );
}
