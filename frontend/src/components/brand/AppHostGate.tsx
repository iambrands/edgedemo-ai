import type { ReactNode } from 'react';
import { appUrl, isMarketingHost } from '../../utils/appUrl';

/** Redirects app-only routes from firmum.ai / www → app.firmum.ai */
export function AppHostGate({ children }: { children: ReactNode }) {
  if (typeof window !== 'undefined' && isMarketingHost()) {
    const dest = appUrl(
      window.location.pathname + window.location.search + window.location.hash,
    );
    window.location.replace(dest);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Redirecting to app…
      </div>
    );
  }
  return <>{children}</>;
}
