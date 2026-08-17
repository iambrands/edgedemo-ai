import type { ReactNode } from 'react';
import { MarketingNav } from './MarketingNav';
import { Footer } from './Footer';

/** Standard wrapper for public marketing, company, and legal pages */
export function MarketingPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
