import {
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  MessageSquare,
  Target,
} from 'lucide-react';
import { PRODUCT_APP_URL } from '../../constants/brand';
import { BRAND_ASSETS } from '../../constants/brandAssets';

/** Hero dashboard mockup — advisor command center */
export function AdvisorDashboardMockup() {
  return (
    <div className="relative w-full max-w-xl mx-auto lg:mx-0">
      <div className="absolute -inset-4 bg-gradient-to-br from-blue-400/20 to-emerald-400/15 rounded-3xl blur-2xl" />
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-400 mx-2 truncate">
            {PRODUCT_APP_URL.replace('https://', '')}
          </div>
        </div>
        <div className="flex h-64 sm:h-72">
          <div className="w-14 bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] flex flex-col items-center py-3 gap-3 flex-shrink-0">
            <img src={BRAND_ASSETS.iconApp} alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
            {[LayoutDashboard, Users, BarChart3, Shield, FileText, MessageSquare].map((Icon, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-primary-600/30' : ''}`}
              >
                <Icon className={`h-4 w-4 ${i === 0 ? 'text-blue-300' : 'text-slate-500'}`} />
              </div>
            ))}
          </div>
          <div className="flex-1 bg-slate-50 p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="h-3 w-28 bg-slate-800 rounded-full" />
                <div className="h-2 w-20 bg-slate-300 rounded-full mt-1.5" />
              </div>
              <div className="h-6 w-16 bg-primary-600 rounded-lg" />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'AUM', val: '$24.8M', color: 'text-primary-600', bg: 'bg-blue-50' },
                { label: 'Households', val: '47', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Alerts', val: '3', color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'YTD', val: '+8.2%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-white rounded-xl p-2 border border-slate-200 shadow-sm">
                  <div className={`text-xs font-bold ${color}`}>{val}</div>
                  <div className="text-[10px] text-slate-400">{label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {[
                { name: 'Chen Family', val: '$4.2M', trend: true },
                { name: 'Park Household', val: '$2.8M', trend: false },
                { name: 'Williams Trust', val: '$1.9M', trend: true },
              ].map(({ name, val, trend }) => (
                <div key={name} className="flex items-center gap-3 px-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-primary-700 text-[10px] font-bold flex items-center justify-center">
                    {name[0]}
                  </div>
                  <div className="text-[11px] font-medium text-slate-800 truncate flex-1">{name}</div>
                  <div className="text-[10px] font-semibold text-slate-600">{val}</div>
                  {trend ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-3 -right-3 bg-white rounded-2xl border border-slate-200 shadow-lg px-4 py-3 flex items-center gap-3 max-w-[210px]">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-900">Portfolio Score: 87</p>
          <p className="text-[10px] text-slate-500">2 tax opportunities found</p>
        </div>
      </div>
      <div className="absolute -top-3 -left-3 bg-white rounded-2xl border border-amber-200 shadow-lg px-4 py-3 flex items-center gap-3 max-w-[220px]">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-900">Compliance Alert</p>
          <p className="text-[10px] text-slate-500">Concentration review due</p>
        </div>
      </div>
    </div>
  );
}

/** Client portal mockup for features sections */
export function ClientPortalMockup() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden max-w-md mx-auto">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4 text-white">
        <p className="text-xs opacity-80">Welcome back</p>
        <p className="text-lg font-bold">Sarah</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {[
          { label: 'Portfolio', val: '$1.24M', icon: BarChart3 },
          { label: 'YTD Return', val: '+9.4%', icon: TrendingUp },
          { label: 'Goals', val: '3 active', icon: Target },
          { label: 'Documents', val: '12 new', icon: FileText },
        ].map(({ label, val, icon: Icon }) => (
          <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <Icon className="h-4 w-4 text-primary-600 mb-2" />
            <p className="text-sm font-bold text-slate-900">{val}</p>
            <p className="text-[10px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800 font-medium">
          Goal milestone: Retirement fund 78% funded
        </div>
      </div>
    </div>
  );
}

/** Decorative gradient orb for section backgrounds */
export function GradientOrbs() {
  return (
    <>
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
    </>
  );
}
