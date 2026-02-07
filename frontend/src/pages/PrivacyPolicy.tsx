import React from 'react';
import { Link } from 'react-router-dom';

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-8">
    <h2 className="text-xl font-bold mb-4 pb-2 border-b">{title}</h2>
    {children}
  </section>
);

const PrivacyPolicy: React.FC = () => {
  const sections = [
    'Information We Collect',
    'How We Use Your Information',
    'Information Sharing',
    'Data Security',
    'Data Retention',
    'Your Rights',
    'Cookies and Tracking',
    'Third-Party Services',
    "Children's Privacy",
    'California Privacy Rights (CCPA)',
    'International Users',
    'Changes to This Policy',
    'Contact Us',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-700 to-purple-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="text-purple-200 hover:text-white text-sm mb-4 inline-block">
            &larr; Back to OptionsEdge
          </Link>
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-purple-200">Last updated: February 2026</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <nav className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="font-semibold mb-4">Table of Contents</h2>
          <ol className="list-decimal list-inside space-y-1 text-purple-700">
            {sections.map((s, i) => (
              <li key={i}>
                <a href={`#p${i + 1}`} className="hover:underline">{s}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="bg-white rounded-lg shadow p-8 space-y-8">
          <Section id="p1" title="1. Information We Collect">
            <h3 className="font-semibold mt-4 mb-2">Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Account Information:</strong> Name, email address, password (hashed using bcrypt)</li>
              <li><strong>Brokerage Credentials:</strong> Tradier API keys and account identifiers (encrypted at rest)</li>
              <li><strong>Trading Preferences:</strong> Risk settings, automation rules, watchlists</li>
              <li><strong>Communications:</strong> Support requests, feedback, and chat interactions</li>
            </ul>
            <h3 className="font-semibold mt-4 mb-2">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Trading Data:</strong> All trades executed through the Platform (stored for audit purposes)</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on Platform</li>
              <li><strong>Device Information:</strong> Browser type, IP address, device identifiers</li>
              <li><strong>Log Data:</strong> Server logs, error reports, performance metrics</li>
            </ul>
            <h3 className="font-semibold mt-4 mb-2">Information from Third Parties</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Tradier:</strong> Account balances, positions, and trade execution data</li>
              <li><strong>Market Data Providers:</strong> Stock quotes, options chains, news feeds</li>
            </ul>
          </Section>

          <Section id="p2" title="2. How We Use Your Information">
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve the Platform&apos;s features and functionality</li>
              <li>Execute trades and manage your portfolio on your behalf</li>
              <li>Generate AI-powered analysis and recommendations</li>
              <li>Send important notifications about your account and trades</li>
              <li>Provide customer support</li>
              <li>Maintain security and prevent fraud</li>
              <li>Comply with legal and regulatory requirements</li>
              <li>Analyze usage patterns to improve user experience</li>
            </ul>
          </Section>

          <Section id="p3" title="3. Information Sharing">
            <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
              <p className="text-green-800 font-semibold">We do NOT sell your personal information to third parties.</p>
            </div>
            <p className="mb-4">We may share your information with:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 mb-4 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 p-3 text-left">Provider</th>
                    <th className="border border-gray-200 p-3 text-left">Purpose</th>
                    <th className="border border-gray-200 p-3 text-left">Data Shared</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-gray-200 p-3">Tradier Brokerage</td><td className="border border-gray-200 p-3">Trade execution</td><td className="border border-gray-200 p-3">API credentials, orders</td></tr>
                  <tr><td className="border border-gray-200 p-3">Anthropic (Claude AI)</td><td className="border border-gray-200 p-3">AI analysis generation</td><td className="border border-gray-200 p-3">Market data, anonymized queries</td></tr>
                  <tr><td className="border border-gray-200 p-3">Railway (Hosting)</td><td className="border border-gray-200 p-3">Platform hosting</td><td className="border border-gray-200 p-3">Server logs, encrypted database</td></tr>
                </tbody>
              </table>
            </div>
            <p>We may also disclose information when required by law, court order, or to protect our rights.</p>
          </Section>

          <Section id="p4" title="4. Data Security">
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <p className="text-blue-800">We implement industry-standard security measures:</p>
            </div>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encryption:</strong> All data encrypted in transit (TLS 1.3) and at rest</li>
              <li><strong>Password Security:</strong> Passwords hashed using bcrypt with salt</li>
              <li><strong>API Key Storage:</strong> Brokerage credentials encrypted with application-level encryption</li>
              <li><strong>Access Controls:</strong> Role-based access, audit logging, session management</li>
              <li><strong>Infrastructure:</strong> Hosted on Railway with automatic security updates</li>
              <li><strong>Monitoring:</strong> Real-time security monitoring and alerting</li>
            </ul>
            <p className="mt-4 text-gray-600 text-sm">
              While we implement robust security measures, no system is 100% secure. You are responsible for maintaining
              the security of your account credentials.
            </p>
          </Section>

          <Section id="p5" title="5. Data Retention">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 p-3 text-left">Data Type</th>
                    <th className="border border-gray-200 p-3 text-left">Retention Period</th>
                    <th className="border border-gray-200 p-3 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-gray-200 p-3">Account Information</td><td className="border border-gray-200 p-3">Until account deletion + 30 days</td><td className="border border-gray-200 p-3">Account recovery</td></tr>
                  <tr><td className="border border-gray-200 p-3">Trade History</td><td className="border border-gray-200 p-3">7 years</td><td className="border border-gray-200 p-3">Regulatory compliance (IRS, FINRA)</td></tr>
                  <tr><td className="border border-gray-200 p-3">Audit Logs</td><td className="border border-gray-200 p-3">7 years</td><td className="border border-gray-200 p-3">Compliance, dispute resolution</td></tr>
                  <tr><td className="border border-gray-200 p-3">Usage Analytics</td><td className="border border-gray-200 p-3">2 years</td><td className="border border-gray-200 p-3">Product improvement</td></tr>
                  <tr><td className="border border-gray-200 p-3">Support Communications</td><td className="border border-gray-200 p-3">3 years</td><td className="border border-gray-200 p-3">Customer service continuity</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="p6" title="6. Your Rights">
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data (subject to retention requirements)</li>
              <li><strong>Portability:</strong> Export your trade history and portfolio data</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Restriction:</strong> Request limitation of certain data processing</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at <strong>privacy@iabadvisors.com</strong>
            </p>
          </Section>

          <Section id="p7" title="7. Cookies and Tracking">
            <p className="mb-4">We use the following types of cookies:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for Platform functionality (authentication, session management)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the Platform</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="mt-4">
              You can manage cookie preferences through your browser settings. Disabling essential cookies may affect
              Platform functionality.
            </p>
          </Section>

          <Section id="p8" title="8. Third-Party Services">
            <p className="mb-4">The Platform integrates with third-party services that have their own privacy policies:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><a href="https://tradier.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline">Tradier Privacy Policy</a></li>
              <li><a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline">Anthropic Privacy Policy</a></li>
            </ul>
            <p className="mt-4">We encourage you to review these policies to understand how these services handle your data.</p>
          </Section>

          <Section id="p9" title="9. Children's Privacy">
            <p>
              The Platform is not intended for users under 18 years of age. We do not knowingly collect personal
              information from children. If we discover we have collected information from a child, we will promptly
              delete it.
            </p>
          </Section>

          <Section id="p10" title="10. California Privacy Rights (CCPA)">
            <p className="mb-4">California residents have additional rights under the California Consumer Privacy Act (CCPA):</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to opt-out of the sale of personal information (we do not sell data)</li>
              <li>Right to non-discrimination for exercising privacy rights</li>
            </ul>
            <p className="mt-4">
              To submit a CCPA request, contact us at <strong>privacy@iabadvisors.com</strong> with &ldquo;CCPA
              Request&rdquo; in the subject line.
            </p>
          </Section>

          <Section id="p11" title="11. International Users">
            <p>
              The Platform is operated from the United States. If you access the Platform from outside the U.S., your
              information will be transferred to, stored, and processed in the United States. By using the Platform, you
              consent to this transfer.
            </p>
          </Section>

          <Section id="p12" title="12. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or
              prominent notice on the Platform. Your continued use of the Platform after changes constitutes acceptance of
              the updated policy.
            </p>
          </Section>

          <Section id="p13" title="13. Contact Us">
            <p className="mb-4">For privacy inquiries or to exercise your rights:</p>
            <div className="bg-gray-100 rounded p-4">
              <p className="font-semibold">IAB Advisors, Inc.</p>
              <p>Privacy Officer</p>
              <p>Email: privacy@iabadvisors.com</p>
              <p>Support: support@optionsedge.ai</p>
            </div>
          </Section>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>&copy; 2026 IAB Advisors, Inc. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link to="/terms" className="hover:text-gray-700">Terms of Service</Link>
            <span>|</span>
            <Link to="/" className="hover:text-gray-700">Back to OptionsEdge</Link>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
