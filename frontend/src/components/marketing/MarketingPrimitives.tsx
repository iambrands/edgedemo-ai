import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export function CategoryLabel({
  children,
  tone = 'blue',
  dark = false,
}: {
  children: ReactNode;
  tone?: 'blue' | 'indigo' | 'emerald';
  dark?: boolean;
}) {
  const tones = dark
    ? {
        blue: 'bg-blue-500/15 text-blue-300 border border-blue-500/25',
        indigo: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25',
        emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
      }
    : {
        blue: 'bg-blue-100 text-blue-700',
        indigo: 'bg-indigo-100 text-indigo-700',
        emerald: 'bg-emerald-100 text-emerald-700',
      };
  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

export function FeatureCard({
  icon,
  headline,
  title,
  description,
}: {
  icon: ReactNode;
  headline: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[18px] bg-white border border-slate-200/90 shadow-[0_12px_30px_rgba(15,23,42,.06)] p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,.10)] flex flex-col h-full">
      <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 flex-shrink-0">
        {icon}
      </div>
      <p className="text-[11px] font-black uppercase tracking-widest text-primary-600 mb-1">{headline}</p>
      <h3 className="font-bold text-[15px] tracking-tight text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-[13.5px] leading-relaxed m-0 flex-1">{description}</p>
    </div>
  );
}

export function StepCard({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="rounded-[18px] bg-white border border-slate-200/90 shadow-[0_12px_30px_rgba(15,23,42,.06)] p-6 text-center flex flex-col items-center h-full">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 text-white font-black text-lg shadow-[0_8px_20px_rgba(37,99,235,.3)]">
        {num}
      </div>
      <b className="block font-black text-slate-900 text-[15px]">{title}</b>
      <p className="mt-2 text-slate-500 text-[13px] font-medium leading-snug m-0">{desc}</p>
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-0">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
          <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <Check size={11} className="text-primary-600" strokeWidth={3} />
          </div>
          <span className="text-slate-700 text-sm font-medium">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function MockPanel({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-700/50 shadow-[0_24px_60px_rgba(15,23,42,.20)] overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700/40 flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-slate-400">{title}</span>
        {badge && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-300/80">{badge}</span>
          </div>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function SectionHeader({
  badge,
  title,
  subtitle,
  dark = false,
  center = true,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
  center?: boolean;
}) {
  return (
    <div className={center ? 'text-center max-w-3xl mx-auto mb-12' : 'max-w-3xl mb-12'}>
      {badge && (
        <CategoryLabel tone="blue" dark={dark}>
          {badge}
        </CategoryLabel>
      )}
      <h2
        className={`mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-lg leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
      )}
    </div>
  );
}
