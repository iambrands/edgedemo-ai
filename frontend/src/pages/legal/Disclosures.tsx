import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Shield, Info } from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const EFFECTIVE_DATE = 'January 1, 2026';

export default function Disclosures() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          <div className="flex gap-4 ml-auto text-sm">
            <Link to="/legal/terms" className="text-slate-500 hover:text-slate-900">Terms</Link>
            <Link to="/legal/privacy" className="text-slate-500 hover:text-slate-900">Privacy</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Disclosures</h1>
        <p className="text-sm text-slate-500 mb-10">Effective: {EFFECTIVE_DATE}</p>

        {/* Important Notice Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-10 flex gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Important Notice</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Edge is a technology platform, not a registered investment advisor, broker-dealer,
              or financial planner. The information, analytics, and AI-generated content provided
              through the Platform do not constitute investment advice, tax advice, or legal advice.
            </p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">About Edge</h2>
            <p className="text-slate-600 leading-relaxed">
              Edge is an AI-powered technology platform developed by IAB Advisors, Inc. that provides
              portfolio analytics, compliance tools, and client communication features for registered
              investment advisors (RIAs). Edge is designed to augment the professional capabilities
              of qualified financial advisors, not replace them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">AI-Generated Content</h2>
            <p className="text-slate-600 leading-relaxed">
              The Platform uses proprietary artificial intelligence models to generate analytics,
              narratives, projections, and recommendations. All AI-generated content:
            </p>
            <ul className="space-y-2 text-slate-600 text-sm list-disc list-inside mt-3">
              <li>Is intended for informational purposes only</li>
              <li>Is designed for review and approval by a qualified financial advisor before delivery to clients</li>
              <li>May contain errors or limitations inherent to AI technology</li>
              <li>Should not be relied upon as the sole basis for investment decisions</li>
              <li>Does not constitute a recommendation to buy, sell, or hold any security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Performance & Projections</h2>
            <p className="text-slate-600 leading-relaxed">
              <strong>Past performance does not guarantee future results.</strong> All performance
              data presented is based on information provided by custodians and may be subject to
              adjustments. Portfolio projections use mathematical models based on historical data and
              assumptions that may not accurately predict future market conditions. Monte Carlo
              simulations represent probability distributions, not predictions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Tax Information</h2>
            <p className="text-slate-600 leading-relaxed">
              Tax-related analytics and projections (including tax-loss harvesting opportunities and
              estimated tax impact) are estimates based on available data and general tax principles.
              They do not account for your complete tax situation and should not replace consultation
              with a qualified tax professional. Tax laws are complex and subject to change.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Regulatory Status</h2>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 space-y-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">
                  IAB Advisors, Inc. is a technology company. It is not registered as an investment advisor,
                  broker-dealer, or in any other securities-related capacity with the SEC, FINRA, or any
                  state securities authority.
                </p>
              </div>
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">
                  RIA firms using the Platform are independently registered and regulated. Their use of Edge
                  does not imply any endorsement, affiliation, or regulatory relationship between IAB Advisors, Inc.
                  and the RIA firm.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Third-Party Data</h2>
            <p className="text-slate-600 leading-relaxed">
              The Platform may incorporate data from third-party sources including custodians, market
              data providers, and public databases. While we strive to use reliable sources, we do not
              guarantee the accuracy, completeness, or timeliness of third-party data. Users should
              verify critical data against original sources.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Intellectual Property</h2>
            <p className="text-slate-600 leading-relaxed">
              Edge's AI models, algorithms, training data, and processing methodologies are proprietary
              trade secrets of IAB Advisors, Inc. The models incorporate substantial human expertise
              from financial advisors, compliance officers, and behavioral finance researchers—providing
              both exceptional quality and robust intellectual property protection. Unauthorized use,
              reproduction, or reverse engineering of our technology is strictly prohibited and may
              result in civil and criminal liability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">FINRA BrokerCheck</h2>
            <p className="text-slate-600 leading-relaxed">
              Investors can research their financial professional or firm using FINRA's BrokerCheck at{' '}
              <a
                href="https://brokercheck.finra.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                brokercheck.finra.org
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions about these disclosures, contact{' '}
              <a href="mailto:legal@edge.com" className="text-blue-600 hover:text-blue-700 underline">legal@edge.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
