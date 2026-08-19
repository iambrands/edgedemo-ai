import { Link } from 'react-router-dom';
import { Lock, Shield, Clock } from 'lucide-react';
import { LandingSectionLink } from '../LandingSectionLink';
import { Logo } from '../brand/Logo';
import { AppLink } from '../brand/AppLink';
import { COMPLIANCE_FOOTER, LEGAL_DBA, PRODUCT_DESCRIPTION } from '../../constants/brand';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Logo variant="dark" className="mb-4" />
            <p className="text-sm leading-relaxed text-slate-400">{PRODUCT_DESCRIPTION}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-white mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/features" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/about/technology" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Our Technology
                </Link>
              </li>
              <li>
                <Link to="/about/methodology" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Methodology
                </Link>
              </li>
              <li>
                <Link to="/trust" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Trust & Security
                </Link>
              </li>
              <li>
                <Link to="/updates" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Product Updates
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-white mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/company/about" className="text-sm text-slate-400 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/company/careers" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/company/blog" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/company/contact" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/legal/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/legal/disclosures" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Disclosures
                </Link>
              </li>
              <li>
                <Link to="/legal/data-retention" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Data Retention
                </Link>
              </li>
            </ul>
            <div className="mt-6 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <Lock className="h-3.5 w-3.5 text-primary-400" />
                SOC 2 aligned
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Shield className="h-3.5 w-3.5 text-primary-400" />
                AES-256 encryption
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="h-3.5 w-3.5 text-primary-400" />
                99.9% uptime SLA
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-xs leading-relaxed max-w-3xl">
            {COMPLIANCE_FOOTER} Securities offered through IAB Advisors, Inc. Member FINRA/SIPC.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-slate-500 text-xs">
              © {new Date().getFullYear()} {LEGAL_DBA}. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              <LandingSectionLink sectionId="features" className="hover:text-slate-300 transition-colors">
                Features overview
              </LandingSectionLink>
              <Link to="/help" className="hover:text-slate-300 transition-colors">
                Help Center
              </Link>
              <AppLink to="/login" className="hover:text-slate-300 transition-colors">
                Advisor Login
              </AppLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
