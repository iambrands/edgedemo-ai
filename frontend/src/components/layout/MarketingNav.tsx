import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { LandingSectionLink } from '../LandingSectionLink';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../brand/Logo';
import { AppLink } from '../brand/AppLink';
import { goToApp } from '../../utils/appUrl';

const NAV_LINKS = [
  { label: 'Features', sectionId: 'features' },
  { label: 'How It Works', sectionId: 'how-it-works' },
  { label: 'Pricing', sectionId: 'pricing' },
  { label: 'Compare', sectionId: 'compare' },
  { label: 'FAQ', sectionId: 'faq' },
];

const PAGE_LINKS = [
  { label: 'All Features', to: '/features' },
  { label: 'Updates', to: '/updates' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const closeMenu = () => setOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Logo size="md" />

        <div className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <LandingSectionLink
              key={l.sectionId}
              sectionId={l.sectionId}
              className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors"
            >
              {l.label}
            </LandingSectionLink>
          ))}
          {PAGE_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <AppLink
            to="/portal/login"
            className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
          >
            Client Login
          </AppLink>
          <span className="text-slate-300">|</span>
          {user ? (
            <button
              type="button"
              onClick={() => goToApp('/dashboard')}
              className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Dashboard
            </button>
          ) : (
            <>
              <AppLink
                to="/login"
                className="text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors"
              >
                Advisor Login
              </AppLink>
              <AppLink
                to="/onboarding"
                className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary-700 transition-colors shadow-sm shadow-primary-600/20"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </AppLink>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-slate-600"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 pb-4">
          {NAV_LINKS.map((l) => (
            <LandingSectionLink
              key={l.sectionId}
              sectionId={l.sectionId}
              onNavigate={closeMenu}
              className="block w-full text-left py-3 text-sm font-medium text-slate-600 border-b border-slate-50"
            >
              {l.label}
            </LandingSectionLink>
          ))}
          {PAGE_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={closeMenu}
              className="block py-3 text-sm font-medium text-slate-600 border-b border-slate-50"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <AppLink
              to="/portal/login"
              onClick={closeMenu}
              className="text-center text-sm font-medium py-2.5 rounded-lg border border-slate-200"
            >
              Client Login
            </AppLink>
            <AppLink
              to="/login"
              onClick={closeMenu}
              className="text-center text-sm font-medium py-2.5 rounded-lg border border-slate-200"
            >
              Advisor Login
            </AppLink>
            <AppLink
              to="/onboarding"
              onClick={closeMenu}
              className="text-center text-sm font-medium bg-primary-600 text-white py-2.5 rounded-lg"
            >
              Start Free Trial
            </AppLink>
          </div>
        </div>
      )}
    </nav>
  );
}
