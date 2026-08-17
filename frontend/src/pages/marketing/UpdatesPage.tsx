import { Link } from 'react-router-dom';
import { AppLink } from '../../components/brand/AppLink';
import { ArrowRight, Sparkles } from 'lucide-react';
import { MarketingPageShell } from '../../components/layout/MarketingPageShell';
import { PRODUCT_UPDATES, type ProductUpdate } from '../../constants/marketingSite';

const TAG_STYLES: Record<ProductUpdate['tag'], string> = {
  feature: 'bg-blue-100 text-blue-700',
  improvement: 'bg-slate-100 text-slate-700',
  compliance: 'bg-purple-100 text-purple-700',
  security: 'bg-amber-100 text-amber-800',
};

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function UpdatesPage() {
  return (
    <MarketingPageShell>
      <section className="py-12 sm:py-16 bg-gradient-to-br from-slate-900 via-[#1e3a5f] to-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Product Updates
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">What&apos;s New in Firmum</h1>
          <p className="mt-4 text-slate-300 text-lg">
            Release notes, feature launches, and compliance improvements — updated as we ship.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" aria-hidden />
            <div className="space-y-10">
              {PRODUCT_UPDATES.map((update, i) => (
                <article key={update.version} className="relative pl-10">
                  <div
                    className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow ${
                      i === 0 ? 'bg-primary-600' : 'bg-slate-300'
                    }`}
                  />
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${TAG_STYLES[update.tag]}`}>
                        {update.tag}
                      </span>
                      <span className="text-xs font-mono text-slate-400">v{update.version}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <time className="text-xs text-slate-500" dateTime={update.date}>
                        {formatDate(update.date)}
                      </time>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{update.title}</h2>
                    <p className="mt-2 text-slate-600 text-sm leading-relaxed">{update.summary}</p>
                    <ul className="mt-4 space-y-2">
                      {update.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-primary-600 mt-0.5">•</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-16 rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">
            <h3 className="font-bold text-slate-900">Want early access to new modules?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Start a trial or contact us to join the advisor preview program.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <AppLink
                to="/onboarding"
                className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-700"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </AppLink>
              <Link
                to="/company/contact"
                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Contact sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
