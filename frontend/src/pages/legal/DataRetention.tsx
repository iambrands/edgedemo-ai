import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Clock, Shield, Trash2, Archive, FileCheck } from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const EFFECTIVE_DATE = 'March 1, 2026';
const VERSION = '1.0';

const RETENTION_SCHEDULE = [
  {
    category: 'Client Account Records',
    description: 'KYC documentation, account opening forms, IPS, risk profiles, signed agreements',
    regulation: 'SEC Rule 204-2(a)(10), FINRA 4512',
    retention: '6 years after account closure',
    disposal: 'Secure deletion with certificate of destruction',
  },
  {
    category: 'Trade & Transaction Records',
    description: 'Order tickets, confirmations, execution reports, allocation records',
    regulation: 'SEC Rule 17a-4(b), FINRA 3110',
    retention: '6 years from creation',
    disposal: 'Secure deletion; aggregate audit trail preserved',
  },
  {
    category: 'Communications & Correspondence',
    description: 'Emails, chat logs, meeting notes, client communications',
    regulation: 'SEC Rule 17a-4(b)(4), FINRA 3110(b)',
    retention: '3 years (general), 6 years (trade-related)',
    disposal: 'Secure deletion after regulatory hold expires',
  },
  {
    category: 'Compliance & Regulatory Filings',
    description: 'ADV filings, Form CRS, exception reports, audit logs, suitability documentation',
    regulation: 'SEC Rule 204-2(a)(17), IAA §206',
    retention: '5 years from filing date',
    disposal: 'Secure deletion with compliance officer sign-off',
  },
  {
    category: 'Financial Statements & Reports',
    description: 'Portfolio statements, performance reports, billing records, fee calculations',
    regulation: 'SEC Rule 204-2(a)(6)',
    retention: '5 years from generation',
    disposal: 'Secure deletion; summary records preserved',
  },
  {
    category: 'Tax Documents',
    description: '1099s, 1040 uploads, tax-loss harvesting records, cost basis reports',
    regulation: 'IRS Rev. Proc. 98-25, SEC Rule 204-2',
    retention: '7 years from tax year end',
    disposal: 'Secure deletion with audit trail entry',
  },
  {
    category: 'AI-Generated Content',
    description: 'Model outputs, recommendations, risk assessments, narrative reports',
    regulation: 'SEC AI Guidance (2024), FINRA 2210',
    retention: '3 years from generation',
    disposal: 'Automated purge; metadata logs retained',
  },
  {
    category: 'System & Access Logs',
    description: 'Authentication events, API access logs, data modification records',
    regulation: 'SOC 2 Type II, NIST 800-53',
    retention: '2 years from event date',
    disposal: 'Automated rotation with compressed archival',
  },
  {
    category: 'Marketing & Advertising',
    description: 'Marketing materials, advertisements, social media posts, website content',
    regulation: 'FINRA 2210, SEC Rule 204-2(a)(11)',
    retention: '3 years from last use',
    disposal: 'Secure deletion',
  },
];

export default function DataRetention() {
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
            <Link to="/legal/disclosures" className="text-slate-500 hover:text-slate-900">Disclosures</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-3xl font-bold text-slate-900">Data Retention &amp; Disposal Policy</h1>
          <a
            href="/documents/data-retention-policy.pdf"
            download
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 ml-4"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        </div>
        <p className="text-sm text-slate-500 mb-2">Effective: {EFFECTIVE_DATE} &middot; Version {VERSION}</p>
        <p className="text-sm text-slate-500 mb-10">IAB Advisors, Inc. d/b/a Edge</p>

        <div className="prose prose-slate max-w-none space-y-8">

          {/* Purpose */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              1. Purpose
            </h2>
            <p className="text-slate-600 leading-relaxed">
              This Data Retention and Disposal Policy ("Policy") establishes the requirements for
              retaining, archiving, and securely disposing of data processed by the Edge platform.
              It ensures compliance with federal securities regulations, FINRA rules, state privacy laws,
              and industry best practices while protecting client confidentiality and minimizing data
              exposure risk.
            </p>
          </section>

          {/* Scope */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              2. Scope
            </h2>
            <p className="text-slate-600 leading-relaxed">
              This Policy applies to all data created, received, maintained, or transmitted by the Edge
              platform, including but not limited to:
            </p>
            <ul className="space-y-2 text-slate-600 text-sm list-disc list-inside mt-3">
              <li>Client personal and financial information (PII / NPI)</li>
              <li>Portfolio holdings, transactions, and trade records</li>
              <li>Communications between advisors and clients</li>
              <li>Compliance documentation and regulatory filings</li>
              <li>AI-generated analytics, recommendations, and reports</li>
              <li>System logs, audit trails, and access records</li>
              <li>Uploaded documents (tax returns, statements, agreements)</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              This Policy applies to all employees, contractors, and third-party service providers with
              access to Edge platform data, regardless of storage medium (electronic, cloud, or physical).
            </p>
          </section>

          {/* Regulatory Framework */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              3. Regulatory Framework
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Retention periods in this Policy are governed by the following regulatory requirements.
              Where multiple regulations apply, the longest retention period controls.
            </p>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 space-y-3">
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">01</span>
                <p className="text-sm text-slate-700"><strong>SEC Rule 17a-4:</strong> Books and records preservation — 6 years for trade records, 3 years for general correspondence, first 2 years in an accessible location.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">02</span>
                <p className="text-sm text-slate-700"><strong>SEC Rule 204-2:</strong> Investment adviser recordkeeping — 5 years for advisory contracts, financial statements, and written communications relating to recommendations.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">03</span>
                <p className="text-sm text-slate-700"><strong>FINRA Rules 3110 / 4511:</strong> Supervision and general books and records — correspondence review, order handling, and suitability documentation.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">04</span>
                <p className="text-sm text-slate-700"><strong>Investment Advisers Act §206:</strong> Fiduciary records including conflict disclosures, suitability analyses, and best interest documentation.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">05</span>
                <p className="text-sm text-slate-700"><strong>IRS Revenue Procedure 98-25:</strong> Electronic storage requirements for tax-related records — 7 years from the relevant tax year.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">06</span>
                <p className="text-sm text-slate-700"><strong>CCPA / State Privacy Laws:</strong> Consumer data deletion rights (subject to regulatory retention exceptions under Cal. Civ. Code §1798.105(d)).</p>
              </div>
            </div>
          </section>

          {/* Retention Schedule */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Archive className="h-5 w-5 text-blue-600" />
              4. Retention Schedule
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              The following table specifies minimum retention periods by data category. Data may be
              retained longer if subject to a legal hold, pending investigation, or client instruction.
            </p>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b border-slate-200">Data Category</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b border-slate-200 hidden md:table-cell">Regulation</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b border-slate-200">Retention Period</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b border-slate-200 hidden lg:table-cell">Disposal Method</th>
                  </tr>
                </thead>
                <tbody>
                  {RETENTION_SCHEDULE.map((row, i) => (
                    <tr key={row.category} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3 border-b border-slate-100">
                        <p className="font-medium text-slate-800">{row.category}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{row.description}</p>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100 text-slate-600 hidden md:table-cell">
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{row.regulation}</code>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium whitespace-nowrap">{row.retention}</td>
                      <td className="px-4 py-3 border-b border-slate-100 text-slate-600 hidden lg:table-cell">{row.disposal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Disposal Procedures */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-blue-600" />
              5. Disposal Procedures
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              When data reaches the end of its retention period and is not subject to a legal hold,
              it must be disposed of using methods appropriate to its classification level.
            </p>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <h3 className="font-medium text-slate-800 mb-2">5.1 Electronic Data</h3>
                <ul className="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
                  <li>Database records: Cryptographic erasure (key destruction) or NIST SP 800-88 compliant secure deletion</li>
                  <li>File storage: Multi-pass overwrite followed by verification</li>
                  <li>Cloud storage (AWS S3 / Railway): Object deletion with versioning purge</li>
                  <li>Redis cache: Automatic TTL-based expiration; manual FLUSHDB for decommissioning</li>
                  <li>Encrypted backups: Key destruction renders backup data unrecoverable</li>
                </ul>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <h3 className="font-medium text-slate-800 mb-2">5.2 Physical Media</h3>
                <ul className="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
                  <li>Paper documents: Cross-cut shredding (DIN 66399 Level P-4 or higher)</li>
                  <li>Storage drives: Degaussing followed by physical destruction</li>
                  <li>Portable media (USB, external drives): NIST SP 800-88 purge + physical destruction</li>
                </ul>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <h3 className="font-medium text-slate-800 mb-2">5.3 Certificate of Destruction</h3>
                <p className="text-slate-600 text-sm">
                  For all disposals of client financial data, a Certificate of Destruction is generated
                  and retained for 3 years. Each certificate includes: data category, volume destroyed,
                  method of destruction, date, and authorizing officer. Certificates are stored in the
                  Edge compliance audit log and are available for regulatory examination.
                </p>
              </div>
            </div>
          </section>

          {/* Legal Holds */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Legal Holds &amp; Exceptions</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Standard retention periods may be suspended when a <strong>legal hold</strong> is in effect.
              Legal holds apply when:
            </p>
            <ul className="space-y-2 text-slate-600 text-sm list-disc list-inside">
              <li>Litigation is pending, threatened, or reasonably anticipated</li>
              <li>A regulatory examination or investigation is active (SEC, FINRA, state regulators)</li>
              <li>An internal investigation requires evidence preservation</li>
              <li>A client disputes or requests data related to an open matter</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              The Chief Compliance Officer issues and lifts legal holds. All personnel are notified in
              writing and must suspend destruction of affected data immediately upon notice.
            </p>
          </section>

          {/* Client Data Deletion Requests */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Client Data Deletion Requests</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Clients may request deletion of their personal data under CCPA, GDPR, or general privacy
              rights. Upon receiving a verified deletion request:
            </p>
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 space-y-3">
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">A.</span>
                <p className="text-sm text-slate-700">We identify all data associated with the requesting party across all systems</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">B.</span>
                <p className="text-sm text-slate-700">Data subject to regulatory retention is flagged and retained for the minimum required period only</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">C.</span>
                <p className="text-sm text-slate-700">All non-regulated data is deleted within 30 calendar days using approved disposal methods</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-mono text-sm font-medium w-6">D.</span>
                <p className="text-sm text-slate-700">The client receives written confirmation of deletion and a list of any data retained under regulatory exception, with estimated disposal dates</p>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed mt-3 text-sm">
              Regulatory exceptions to deletion requests include records required by SEC Rule 17a-4,
              FINRA Rule 4511, and IRS recordkeeping requirements. These exceptions are disclosed to
              the client per Cal. Civ. Code §1798.105(d).
            </p>
          </section>

          {/* Third-Party Data */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Third-Party &amp; Vendor Data</h2>
            <p className="text-slate-600 leading-relaxed">
              Data shared with or received from third-party vendors (custodians, market data providers,
              AI model providers) is subject to the same retention and disposal requirements as
              internally-generated data. Vendor contracts include data destruction clauses requiring:
            </p>
            <ul className="space-y-2 text-slate-600 text-sm list-disc list-inside mt-3">
              <li>Certification of data deletion upon contract termination</li>
              <li>No retained copies beyond the contracted retention period</li>
              <li>Written acknowledgment that client data was not used for model training or secondary purposes</li>
              <li>Compliance with NIST SP 800-88 or equivalent for disposal</li>
            </ul>
          </section>

          {/* Backup & Archival */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Backup &amp; Archival</h2>
            <div className="space-y-3">
              <p className="text-slate-600 leading-relaxed">
                Data is backed up daily to encrypted, geographically-separated storage. Backups follow
                a tiered lifecycle:
              </p>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 space-y-3">
                <div className="flex gap-3">
                  <span className="text-blue-600 font-mono text-sm font-medium w-6">01</span>
                  <p className="text-sm text-slate-700"><strong>Hot (0–30 days):</strong> Full backups in primary region, immediate restore capability</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-600 font-mono text-sm font-medium w-6">02</span>
                  <p className="text-sm text-slate-700"><strong>Warm (30–365 days):</strong> Compressed backups in secondary region, 4-hour restore SLA</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-600 font-mono text-sm font-medium w-6">03</span>
                  <p className="text-sm text-slate-700"><strong>Cold (1–7 years):</strong> Archived to long-term storage, 24-hour restore SLA, retained per regulatory schedule</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-600 font-mono text-sm font-medium w-6">04</span>
                  <p className="text-sm text-slate-700"><strong>Expiration:</strong> Backups older than the maximum applicable retention period are destroyed via key destruction</p>
                </div>
              </div>
            </div>
          </section>

          {/* Governance */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">10. Governance &amp; Review</h2>
            <ul className="space-y-2 text-slate-600 text-sm list-disc list-inside">
              <li><strong>Policy Owner:</strong> Chief Compliance Officer, IAB Advisors, Inc.</li>
              <li><strong>Review Cadence:</strong> Annually, or upon material regulatory change</li>
              <li><strong>Audit:</strong> Retention and disposal practices are audited as part of the annual SOC 2 Type II examination</li>
              <li><strong>Training:</strong> All employees and contractors receive data handling and retention training within 30 days of hire and annually thereafter</li>
              <li><strong>Violations:</strong> Non-compliance with this Policy may result in disciplinary action, up to and including termination, and may expose the firm to regulatory sanctions</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">11. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Questions about this Policy or data retention practices should be directed to:
            </p>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mt-3 text-sm text-slate-700 space-y-1">
              <p><strong>IAB Advisors, Inc. — Compliance Office</strong></p>
              <p>Email: <a href="mailto:compliance@edge.com" className="text-blue-600 hover:text-blue-700 underline">compliance@edge.com</a></p>
              <p>Privacy inquiries: <a href="mailto:privacy@edge.com" className="text-blue-600 hover:text-blue-700 underline">privacy@edge.com</a></p>
              <p>Mail: IAB Advisors, Inc., Compliance Office, Wilmington, DE 19801</p>
            </div>
          </section>

          {/* Version History */}
          <section className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-3">Version History</h2>
            <table className="text-sm w-full">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2 pr-4">Version</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr>
                  <td className="py-1 pr-4">1.0</td>
                  <td className="py-1 pr-4">March 1, 2026</td>
                  <td className="py-1">Initial policy adopted</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
