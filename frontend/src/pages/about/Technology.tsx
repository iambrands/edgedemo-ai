import { Link } from 'react-router-dom';
import {
  Shield, Brain, Eye, Users, Lock, CheckCircle,
  ArrowLeft, ChevronRight, Cpu, Layers, BarChart3,
} from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const PILLARS = [
  {
    icon: Brain,
    title: 'Three Proprietary AI Models',
    description:
      'Edge is powered by three purpose-built intelligence models, each designed for a specific domain of wealth management.',
    details: [
      {
        name: 'Investment Intelligence Model (IIM)',
        role: 'Analyzes portfolio construction, fee impact, concentration risk, tax optimization, and rebalancing opportunities across multi-account households.',
      },
      {
        name: 'Compliance Investment Model (CIM)',
        role: 'Validates suitability, monitors regulatory compliance (FINRA/SEC), generates audit trails, and flags potential issues before they become problems.',
      },
      {
        name: 'Behavioral Intelligence Model (BIM)',
        role: 'Generates personalized client narratives, coaching messages, and meeting preparation using behavioral finance principles.',
      },
    ],
  },
  {
    icon: Users,
    title: 'Human-in-the-Loop by Design',
    description:
      'Every AI-generated output is designed for advisor review before reaching clients. Edge augments your expertise — it never replaces it.',
    details: [
      { name: 'Advisor Review', role: 'All AI-generated narratives, compliance alerts, and recommendations pass through an advisor approval layer.' },
      { name: 'Editable Outputs', role: 'Advisors can review, edit, and personalize any AI-generated content before publishing to clients.' },
      { name: 'Transparent Reasoning', role: 'Each recommendation includes the data points and logic that drove the conclusion, so advisors can verify independently.' },
    ],
  },
  {
    icon: Shield,
    title: 'Security & Data Protection',
    description:
      'Client data is handled with the highest standards of security and privacy, meeting institutional-grade requirements.',
    details: [
      { name: 'Encryption', role: 'All data encrypted at rest (AES-256) and in transit (TLS 1.3). API keys and credentials use additional envelope encryption.' },
      { name: 'Isolation', role: 'Each firm\'s data is logically isolated. No cross-firm data access is possible, even at the infrastructure level.' },
      { name: 'Compliance', role: 'SOC 2 Type II audit trail, FINRA 17a-4 compliant record retention, and SEC Reg S-P data protection standards.' },
    ],
  },
];

const RELIABILITY_POINTS = [
  {
    icon: Cpu,
    title: 'Deterministic Core Logic',
    text: 'Portfolio calculations, tax computations, and compliance rules use deterministic algorithms — not probabilistic AI — ensuring mathematically verifiable results.',
  },
  {
    icon: Eye,
    title: 'AI for Insight, Not Execution',
    text: 'AI generates insights and recommendations. All actions (trades, transfers, compliance sign-offs) require explicit human authorization.',
  },
  {
    icon: Layers,
    title: 'Multi-Model Validation',
    text: 'Critical outputs are cross-validated across models. A compliance flag from CIM is verified against IIM portfolio data before surfacing to advisors.',
  },
  {
    icon: BarChart3,
    title: 'Continuous Monitoring',
    text: 'Model outputs are logged, monitored, and regularly reviewed for accuracy. Drift detection ensures models remain calibrated over time.',
  },
];

export default function Technology() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Edge</span>
          </Link>
          <Link to="/about/methodology" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Methodology <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-16">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            AI Transparency
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Our Technology
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Edge is a wealth management platform designed to enhance efficiency, built from the ground up with proprietary
            models purpose-designed for financial advisory. Here's how it works, why you can trust it,
            and how we protect your data.
          </p>
        </section>

        {/* Pillars */}
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <section key={pillar.title} className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{pillar.title}</h2>
                  <p className="text-slate-600 mt-1">{pillar.description}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4 ml-0 md:ml-16">
                {pillar.details.map((d) => (
                  <div key={d.name} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <h3 className="font-semibold text-slate-900 mb-2">{d.name}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{d.role}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Reliability */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Reliability & Accuracy</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We take a conservative approach to AI: use it where it excels (pattern recognition,
              natural language, personalization) and rely on deterministic logic where precision is non-negotiable.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {RELIABILITY_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="flex gap-4 p-5 bg-white border border-slate-200 rounded-xl">
                  <Icon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{point.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{point.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* IP Notice */}
        <section className="bg-slate-900 text-white rounded-2xl p-8 md:p-10">
          <div className="flex items-start gap-4">
            <Lock className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold mb-3">Proprietary & Protected</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Edge's AI models, algorithms, training methodologies, and data processing pipelines are proprietary
                intellectual property of IAB Advisors, Inc. Our technology is protected by trade secret law,
                copyright, and contractual protections. The models incorporate significant human expertise from
                financial advisors, compliance officers, and behavioral finance researchers — strengthening both
                the quality of outputs and the scope of IP protection.
              </p>
              <div className="flex flex-wrap gap-3">
                {['Trade Secret Protected', 'Copyright Registered', 'Human-Authored Algorithms'].map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-sm text-slate-200">
                    <CheckCircle className="h-3.5 w-3.5 text-blue-400" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pb-8">
          <p className="text-slate-500 mb-4">
            Want to learn more about our analytical approach?
          </p>
          <Link
            to="/about/methodology"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Read Our Methodology <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
