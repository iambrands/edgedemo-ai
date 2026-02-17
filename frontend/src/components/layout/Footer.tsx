import { Link } from 'react-router-dom';

export function Footer() {
  const footerLinks = {
    product: [
      { label: 'For Investors', href: '/investors', isRoute: true },
      { label: 'For Professionals', href: '/professionals', isRoute: true },
      { label: 'Our Technology', href: '/about/technology', isRoute: true },
      { label: 'Methodology', href: '/about/methodology', isRoute: true },
    ],
    company: [
      { label: 'About', href: '/company/about', isRoute: true },
      { label: 'Careers', href: '/company/careers', isRoute: true },
      { label: 'Blog', href: '/company/blog', isRoute: true },
      { label: 'Contact', href: '/company/contact', isRoute: true },
    ],
    legal: [
      { label: 'Terms of Use', href: '/legal/terms', isRoute: true },
      { label: 'Privacy Policy', href: '/legal/privacy', isRoute: true },
      { label: 'Disclosures', href: '/legal/disclosures', isRoute: true },
    ],
  };

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <span className="text-xl font-bold text-white">Edge
              </span>
            </Link>
            <p className="text-slate-400 text-sm">
              AI-powered investment intelligence for individual investors and financial
              professionals.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link to={link.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link to={link.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-xs leading-relaxed">
            Edge provides market alerts based on sophisticated algorithmic analysis, not
            investment advice. Securities offered through IAB Advisors, Inc. Member FINRA/SIPC.
          </p>
          <p className="text-slate-500 text-xs mt-4">
            © 2026 Edge by IAB Advisors, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
