import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const EFFECTIVE_DATE = 'January 1, 2026';

export default function Privacy() {
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
            <Link to="/legal/disclosures" className="text-slate-500 hover:text-slate-900">Disclosures</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Effective: {EFFECTIVE_DATE}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Overview</h2>
            <p className="text-slate-600 leading-relaxed">
              IAB Advisors, Inc. ("Company", "we", "our") operates the Edge platform. This Privacy
              Policy describes how we collect, use, store, and protect information when you use our
              services. We are committed to protecting your privacy in compliance with SEC Regulation
              S-P, the California Consumer Privacy Act (CCPA), and other applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-800">Account Information</h3>
                <p className="text-slate-600 text-sm">Name, email address, firm name, CRD number, phone number.</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Financial Data</h3>
                <p className="text-slate-600 text-sm">
                  Portfolio holdings, account statements, transaction history, and other data
                  you upload or connect via custodian integrations. This data belongs to you.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Usage Data</h3>
                <p className="text-slate-600 text-sm">
                  Feature usage patterns, session data, and analytics to improve the Platform.
                  We do not track individual user behavior for advertising purposes.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. How We Use Your Information</h2>
            <ul className="space-y-2 text-slate-600 text-sm list-disc list-inside">
              <li>Provide and improve Platform services</li>
              <li>Generate personalized analytics and AI-powered insights</li>
              <li>Process compliance checks and regulatory reporting</li>
              <li>Communicate service updates and security alerts</li>
              <li>Comply with legal obligations and regulatory requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. How We Protect Your Data</h2>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 space-y-3">
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm">01</span>
                <p className="text-sm text-slate-700"><strong>Encryption:</strong> All data encrypted at rest (AES-256) and in transit (TLS 1.3).</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm">02</span>
                <p className="text-sm text-slate-700"><strong>Isolation:</strong> Each firm's data is logically isolated with no cross-firm access.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm">03</span>
                <p className="text-sm text-slate-700"><strong>Access Control:</strong> Role-based access with multi-factor authentication for administrative functions.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm">04</span>
                <p className="text-sm text-slate-700"><strong>Retention:</strong> Data is retained as required by FINRA 17a-4 and deleted upon termination per your instructions.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm">05</span>
                <p className="text-sm text-slate-700"><strong>Auditing:</strong> SOC 2 Type II compliant audit trails for all data access and modifications.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Data Sharing</h2>
            <p className="text-slate-600 leading-relaxed">
              <strong>We do not sell your data.</strong> We do not share your financial data with
              third parties except as necessary to provide the service (e.g., custodian integrations
              you authorize) or as required by law. We do not use your data to train models for other
              customers. Aggregated, anonymized usage statistics may be used to improve the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. AI & Data Processing</h2>
            <p className="text-slate-600 leading-relaxed">
              Our AI models process your data to generate analytics, recommendations, and narratives.
              AI processing occurs within our secure infrastructure and is subject to the same data
              protection standards as all other platform operations. AI outputs are designed for
              advisor review and are not shared externally.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Your Rights</h2>
            <ul className="space-y-2 text-slate-600 text-sm list-disc list-inside">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data (subject to regulatory retention requirements)</li>
              <li><strong>Portability:</strong> Export your data in machine-readable formats</li>
              <li><strong>Opt-out:</strong> Opt out of non-essential data processing</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              To exercise these rights, contact{' '}
              <a href="mailto:privacy@edge.com" className="text-blue-600 hover:text-blue-700 underline">privacy@edge.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. Material changes will be communicated
              via email at least 30 days before taking effect. The "Effective" date at the top of this
              page indicates the date of the latest revision.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For privacy-related inquiries, contact us at{' '}
              <a href="mailto:privacy@edge.com" className="text-blue-600 hover:text-blue-700 underline">privacy@edge.com</a>{' '}
              or write to: IAB Advisors, Inc., Privacy Office, Wilmington, DE 19801.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
