import React from 'react';
import { Link } from 'react-router-dom';

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-8">
    <h2 className="text-xl font-bold mb-4 pb-2 border-b">{title}</h2>
    {children}
  </section>
);

const TermsOfService: React.FC = () => {
  const sections = [
    'Acceptance of Terms',
    'Description of Service',
    'Investment Disclaimers and Risk Warnings',
    'Not Investment Advice',
    'AI-Generated Content Disclaimer',
    'Brokerage Integration',
    'User Accounts and Responsibilities',
    'Beta Program',
    'Fees and Payments',
    'Intellectual Property',
    'Limitation of Liability',
    'Disclaimer of Warranties',
    'Indemnification',
    'Dispute Resolution and Arbitration',
    'Governing Law',
    'Modifications to Terms',
    'Termination',
    'Severability',
    'Contact Information',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-700 to-purple-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="text-purple-200 hover:text-white text-sm mb-4 inline-block">
            &larr; Back to OptionsEdge
          </Link>
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-purple-200">Last updated: February 2026</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Critical Warning */}
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-8">
          <h2 className="text-red-800 font-bold text-lg mb-2">IMPORTANT RISK WARNING</h2>
          <p className="text-red-700 font-semibold">
            OPTIONS TRADING INVOLVES SUBSTANTIAL RISK OF LOSS AND IS NOT SUITABLE FOR ALL INVESTORS. You could lose your
            entire investment, and in some cases, more than your initial investment. Before trading options, carefully
            consider your investment objectives, level of experience, and risk tolerance.
          </p>
        </div>

        {/* TOC */}
        <nav className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="font-semibold mb-4">Table of Contents</h2>
          <ol className="list-decimal list-inside space-y-1 text-purple-700">
            {sections.map((s, i) => (
              <li key={i}>
                <a href={`#s${i + 1}`} className="hover:underline">
                  {s}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="bg-white rounded-lg shadow p-8 space-y-8">
          <Section id="s1" title="1. Acceptance of Terms">
            <p className="mb-4">
              By accessing or using OptionsEdge (&ldquo;the Platform&rdquo;), operated by IAB Advisors, Inc.
              (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you (&ldquo;User&rdquo;
              or &ldquo;you&rdquo;) agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not
              agree to these Terms, do not use the Platform.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and IAB Advisors, Inc., a Delaware
              corporation. Your continued use of the Platform constitutes acceptance of any modifications to these Terms.
            </p>
          </Section>

          <Section id="s2" title="2. Description of Service">
            <p className="mb-4">OptionsEdge is an AI-powered options trading analysis and automation platform that provides:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>AI-generated options trading signals and analysis</li>
              <li>Portfolio tracking and performance analytics</li>
              <li>Automated trading capabilities through third-party broker integration</li>
              <li>Risk management tools and alerts</li>
              <li>Educational content and market news</li>
            </ul>
            <p>
              The Platform connects to third-party brokerage services (currently Tradier) to execute trades on your behalf
              based on your settings and preferences.
            </p>
          </Section>

          <Section id="s3" title="3. Investment Disclaimers and Risk Warnings">
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-800 font-semibold">
                OPTIONS TRADING INVOLVES SUBSTANTIAL RISK OF LOSS AND IS NOT SUITABLE FOR ALL INVESTORS. You could lose
                your entire investment, and in some cases, more than your initial investment.
              </p>
            </div>
            <p className="mb-4 font-semibold">
              PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS. Any historical returns, backtested results, expected
              returns, or probability projections displayed on the Platform may not reflect actual future performance.
            </p>
            <p className="mb-4">You acknowledge and agree that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Options are complex financial instruments that carry significant risk</li>
              <li>You may lose more than your initial investment</li>
              <li>Market conditions can change rapidly and unpredictably</li>
              <li>Stop-loss orders may not execute at expected prices during volatile conditions or market gaps</li>
              <li>System failures, broker outages, or connectivity issues may prevent trade execution</li>
              <li>You are solely responsible for understanding the risks before trading</li>
            </ul>
          </Section>

          <Section id="s4" title="4. Not Investment Advice">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="text-yellow-800 font-semibold">
                OPTIONSEDGE DOES NOT PROVIDE INVESTMENT ADVICE, FINANCIAL PLANNING, TAX ADVICE, OR PERSONALIZED
                RECOMMENDATIONS. ALL TRADING DECISIONS ARE MADE BY YOU AND ARE YOUR SOLE RESPONSIBILITY.
              </p>
            </div>
            <p className="mb-4">
              The Company and its founders hold FINRA Series 6, 7, and 63 licenses as individual registered
              representatives, not as investment advisors to Platform users. These licenses do not create a fiduciary
              relationship between the Company and users.
            </p>
            <p>
              All content, analysis, signals, and recommendations provided through the Platform are for informational and
              educational purposes only. You should consult with a qualified financial advisor, tax professional, or legal
              counsel before making any investment decisions.
            </p>
          </Section>

          <Section id="s5" title="5. AI-Generated Content Disclaimer">
            <p className="mb-4">
              The Platform uses artificial intelligence (currently Claude by Anthropic) to generate trading signals,
              analysis, and recommendations. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI-generated content may contain errors, inaccuracies, or outdated information</li>
              <li>AI models can produce inconsistent or unexpected results</li>
              <li>AI analysis is based on historical patterns that may not predict future outcomes</li>
              <li>The AI does not have access to all relevant market information</li>
              <li>AI recommendations should not be the sole basis for trading decisions</li>
            </ul>
          </Section>

          <Section id="s6" title="6. Brokerage Integration">
            <p className="mb-4">
              The Platform integrates with third-party brokerage services (currently Tradier Brokerage Inc.) to execute
              trades. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>You must maintain a separate, valid brokerage account with Tradier</li>
              <li>You are bound by Tradier&apos;s terms of service and customer agreements</li>
              <li>We are not responsible for broker outages, delays, or execution failures</li>
              <li>Trade execution prices may differ from displayed prices</li>
              <li>API limitations may affect order execution timing</li>
              <li>Your brokerage credentials are stored securely but you assume risk of credential storage</li>
            </ul>
            <p>
              IAB Advisors, Inc. is not a broker-dealer and does not hold customer funds. All trades are executed through
              your brokerage account, and all funds remain with your broker.
            </p>
          </Section>

          <Section id="s7" title="7. User Accounts and Responsibilities">
            <p className="mb-4">You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate, current, and complete registration information</li>
              <li>Maintain the security and confidentiality of your account credentials</li>
              <li>Notify us immediately of any unauthorized account access</li>
              <li>Be solely responsible for all activity under your account</li>
              <li>Monitor your positions and account regularly</li>
              <li>Set appropriate risk limits based on your financial situation</li>
              <li>Not rely solely on automated systems for risk management</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </Section>

          <Section id="s8" title="8. Beta Program">
            <p className="mb-4">
              The Platform is currently in beta testing. By participating in the beta program, you acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Platform may contain bugs, errors, or incomplete features</li>
              <li>Features may change without notice</li>
              <li>Data may be lost or corrupted</li>
              <li>The Platform may experience downtime or instability</li>
              <li>Beta features are provided &ldquo;as is&rdquo; without warranty</li>
            </ul>
          </Section>

          <Section id="s9" title="9. Fees and Payments">
            <p>
              Current beta users receive free access. Future pricing will be announced prior to general availability. You
              are responsible for any fees charged by your broker, including commissions, exchange fees, and regulatory
              fees.
            </p>
          </Section>

          <Section id="s10" title="10. Intellectual Property">
            <p className="mb-4">
              All content, features, and functionality of the Platform, including but not limited to text, graphics, logos,
              algorithms, and software, are owned by IAB Advisors, Inc. and protected by intellectual property laws.
            </p>
            <p>You may not copy, modify, distribute, sell, or lease any part of the Platform without our written consent.</p>
          </Section>

          <Section id="s11" title="11. Limitation of Liability">
            <div className="bg-gray-100 border rounded p-4 mb-4">
              <p className="font-semibold text-sm">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IAB ADVISORS, INC. AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND
                AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES.
              </p>
            </div>
            <p className="mb-4">This limitation applies to damages resulting from:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Your use or inability to use the Platform</li>
              <li>Any trades executed through the Platform</li>
              <li>Errors, bugs, or inaccuracies in the Platform</li>
              <li>Unauthorized access to your account</li>
              <li>Broker API failures or delays</li>
              <li>Market conditions or price movements</li>
              <li>AI-generated signals or recommendations</li>
              <li>Stop-loss failures or execution delays</li>
            </ul>
            <p className="font-semibold">
              YOU SPECIFICALLY ACKNOWLEDGE THAT WE ARE NOT LIABLE FOR ANY TRADING LOSSES, regardless of whether such
              losses resulted from AI-generated signals, automated trade execution, system failures, data errors, or any
              other cause related to the Platform.
            </p>
          </Section>

          <Section id="s12" title="12. Disclaimer of Warranties">
            <p className="mb-4 font-semibold">
              THE PLATFORM IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES
              OF ANY KIND, either express or implied, including but not limited to warranties of merchantability, fitness
              for a particular purpose, non-infringement, accuracy, or completeness.
            </p>
            <p className="mb-2">We do not warrant that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Platform will be uninterrupted, secure, or error-free</li>
              <li>AI-generated content will be accurate or reliable</li>
              <li>Trade orders will execute successfully</li>
              <li>The Platform will meet your specific requirements</li>
              <li>Any information provided is complete or current</li>
            </ul>
          </Section>

          <Section id="s13" title="13. Indemnification">
            <p className="mb-4">
              You agree to indemnify, defend, and hold harmless IAB Advisors, Inc., its officers, directors, employees,
              agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses
              (including reasonable attorneys&apos; fees) arising out of or related to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use of the Platform</li>
              <li>Your violation of these Terms</li>
              <li>Your trading decisions and their outcomes</li>
              <li>Your violation of any applicable laws or regulations</li>
              <li>Any content you submit to the Platform</li>
            </ul>
          </Section>

          <Section id="s14" title="14. Dispute Resolution and Arbitration">
            <p className="mb-4">
              Any dispute, controversy, or claim arising out of or relating to these Terms or the Platform shall first be
              attempted to be resolved through good-faith negotiation for a period of thirty (30) days.
            </p>
            <p className="mb-4">
              If the dispute cannot be resolved through negotiation, it shall be resolved by binding arbitration
              administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. The
              arbitration shall take place in Houston, Texas, and shall be conducted by a single arbitrator.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800 font-semibold text-sm">
                YOU AGREE THAT ANY ARBITRATION SHALL BE CONDUCTED ON AN INDIVIDUAL BASIS AND NOT AS A CLASS, CONSOLIDATED,
                OR REPRESENTATIVE ACTION. You waive any right to participate in a class action lawsuit or class-wide
                arbitration.
              </p>
            </div>
          </Section>

          <Section id="s15" title="15. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without
              regard to its conflict of law provisions. Any legal action or proceeding not subject to arbitration shall be
              brought exclusively in the state or federal courts located in Houston, Texas.
            </p>
          </Section>

          <Section id="s16" title="16. Modifications to Terms">
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or
              prominent notice on the Platform. Your continued use of the Platform after such modifications constitutes
              acceptance of the updated Terms.
            </p>
          </Section>

          <Section id="s17" title="17. Termination">
            <p className="mb-4">
              We may suspend or terminate your access to the Platform at any time, with or without cause or notice. Upon
              termination, your right to use the Platform ceases immediately.
            </p>
            <p>
              You may terminate your account at any time by contacting support. Termination does not affect any rights or
              obligations that accrued prior to termination.
            </p>
          </Section>

          <Section id="s18" title="18. Severability">
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or
              eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and
              effect.
            </p>
          </Section>

          <Section id="s19" title="19. Contact Information">
            <p className="mb-4">For questions about these Terms, please contact:</p>
            <div className="bg-gray-100 rounded p-4">
              <p className="font-semibold">IAB Advisors, Inc.</p>
              <p>Email: legal@iabadvisors.com</p>
              <p>Support: support@optionsedge.ai</p>
            </div>
          </Section>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>&copy; 2026 IAB Advisors, Inc. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link to="/privacy" className="hover:text-gray-700">Privacy Policy</Link>
            <span>|</span>
            <Link to="/" className="hover:text-gray-700">Back to OptionsEdge</Link>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default TermsOfService;
