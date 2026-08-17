import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { Footer } from '../../components/layout/Footer';
import { COMPLIANCE_FOOTER } from '../../constants/brand';

interface ClientPageShellProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function ClientPageShell({
  title,
  subtitle,
  badge = 'Individual investor',
  children,
  backTo = '/',
  backLabel = 'Home',
}: ClientPageShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex flex-col">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link
            to={backTo}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <Logo size="sm" showWordmark iconOnly={false} to="/" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium mb-4">
            {badge}
          </span>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
          {subtitle && <p className="text-slate-600">{subtitle}</p>}
        </div>
        {children}
      </main>

      <p className="max-w-3xl mx-auto px-4 pb-4 text-xs text-slate-500 text-center">{COMPLIANCE_FOOTER}</p>
      <Footer />
    </div>
  );
}
