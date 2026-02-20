import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  Shield,
  Link2,
  Palette,
  CreditCard,
  Sparkles,
  HelpCircle,
  ClipboardList,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StepDef {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface StepProps {
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

const STEPS: StepDef[] = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with Edge', icon: Sparkles },
  { id: 'profile', title: 'Your Profile', description: 'Personal & professional info', icon: User },
  { id: 'firm', title: 'Firm Details', description: 'Your practice information', icon: Building2 },
  { id: 'clientTypes', title: 'Client Types', description: 'Account & rollover types you handle', icon: ClipboardList },
  { id: 'compliance', title: 'Compliance Setup', description: 'Regulatory requirements', icon: Shield },
  { id: 'custodians', title: 'Connect Custodians', description: 'Link your custodial accounts', icon: Link2 },
  { id: 'branding', title: 'Branding', description: 'Customize your client portal', icon: Palette },
  { id: 'billing', title: 'Billing', description: 'Subscription & payment', icon: CreditCard },
];

/* ------------------------------------------------------------------ */
/*  Individual Step Components                                         */
/* ------------------------------------------------------------------ */

function WelcomeStep() {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="h-10 w-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">Welcome to Edge!</h3>
      <p className="text-slate-600 max-w-md mx-auto mb-8">
        Let&apos;s get your practice set up. This wizard will guide you through
        connecting your accounts, setting up compliance, and customizing your
        client portal.
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">5 min</p>
          <p className="text-xs text-slate-600">Setup time</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-lg">
          <p className="text-2xl font-bold text-emerald-600">7</p>
          <p className="text-xs text-slate-600">Quick steps</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">24/7</p>
          <p className="text-xs text-slate-600">Support</p>
        </div>
      </div>
    </div>
  );
}

function ProfileStep({ formData, setFormData }: StepProps) {
  const update = (key: string, value: any) => setFormData({ ...formData, [key]: value });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
          <input
            type="text"
            value={formData.firstName || ''}
            onChange={(e) => update('firstName', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
          <input
            type="text"
            value={formData.lastName || ''}
            onChange={(e) => update('lastName', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Smith"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) => update('email', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => update('phone', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">CRD Number</label>
        <input
          type="text"
          value={formData.crdNumber || ''}
          onChange={(e) => update('crdNumber', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="1234567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Licenses</label>
        <div className="flex flex-wrap gap-2">
          {['Series 6', 'Series 7', 'Series 63', 'Series 65', 'Series 66'].map((license) => (
            <label
              key={license}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.licenses?.includes(license) || false}
                onChange={(e) => {
                  const licenses: string[] = formData.licenses || [];
                  if (e.target.checked) {
                    update('licenses', [...licenses, license]);
                  } else {
                    update('licenses', licenses.filter((l) => l !== license));
                  }
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{license}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function FirmStep({ formData, setFormData }: StepProps) {
  const update = (key: string, value: any) => setFormData({ ...formData, [key]: value });

  const states = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY',
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Firm Name</label>
        <input
          type="text"
          value={formData.firmName || ''}
          onChange={(e) => update('firmName', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="ABC Advisory LLC"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Firm CRD Number</label>
        <input
          type="text"
          value={formData.firmCrd || ''}
          onChange={(e) => update('firmCrd', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="123456"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
          <select
            value={formData.state || ''}
            onChange={(e) => update('state', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select state...</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
          <input
            type="text"
            value={formData.zipCode || ''}
            onChange={(e) => update('zipCode', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="77001"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">AUM Range</label>
        <select
          value={formData.aumRange || ''}
          onChange={(e) => update('aumRange', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select range...</option>
          <option value="under_10m">Under $10M</option>
          <option value="10m_50m">$10M - $50M</option>
          <option value="50m_100m">$50M - $100M</option>
          <option value="100m_500m">$100M - $500M</option>
          <option value="over_500m">Over $500M</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Number of Clients</label>
        <select
          value={formData.clientCount || ''}
          onChange={(e) => update('clientCount', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select range...</option>
          <option value="1_25">1 - 25</option>
          <option value="26_50">26 - 50</option>
          <option value="51_100">51 - 100</option>
          <option value="over_100">100+</option>
        </select>
      </div>
    </div>
  );
}

const PLAN_TYPES = [
  { id: '401k', label: '401(k)', desc: 'Traditional employer-sponsored plans' },
  { id: '403b', label: '403(b)', desc: 'Teachers, non-profit employees, clergy' },
  { id: '457b', label: '457(b)', desc: 'State & local government employees' },
  { id: 'tsp', label: 'TSP', desc: 'Federal employees & military (Thrift Savings Plan)' },
  { id: 'pension_rollover', label: 'Pension Rollover', desc: 'Traditional pension plan rollovers' },
  { id: 'traditional_ira', label: 'Traditional IRA', desc: 'Individual retirement accounts' },
  { id: 'roth_ira', label: 'Roth IRA', desc: 'After-tax retirement accounts' },
  { id: 'sep_ira', label: 'SEP IRA', desc: 'Self-employed & small business' },
  { id: 'simple_ira', label: 'SIMPLE IRA', desc: 'Small employer plans (< 100 employees)' },
  { id: 'inherited_ira', label: 'Inherited IRA', desc: 'Beneficiary inherited accounts' },
  { id: 'brokerage', label: 'Taxable Brokerage', desc: 'Individual & joint investment accounts' },
  { id: 'trust', label: 'Trust Accounts', desc: 'Revocable & irrevocable trusts' },
];

function ClientTypesStep({ formData, setFormData }: StepProps) {
  const selected: string[] = formData.clientPlanTypes || [];
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setFormData({ ...formData, clientPlanTypes: next });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          Select the account and plan types your firm commonly handles. Edge supports
          automated rollovers and onboarding for all of these plan types, including
          specialized support for teachers, government employees, and public-sector workers.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Account & Plan Types You Handle</label>
        <div className="grid grid-cols-2 gap-3">
          {PLAN_TYPES.map((pt) => (
            <label
              key={pt.id}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                selected.includes(pt.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(pt.id)}
                onChange={() => toggle(pt.id)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">{pt.label}</p>
                <p className="text-xs text-slate-500">{pt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Estimated Monthly Rollover Volume
        </label>
        <select
          value={formData.rolloverVolume || ''}
          onChange={(e) => setFormData({ ...formData, rolloverVolume: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select range...</option>
          <option value="0_5">0 - 5 per month</option>
          <option value="5_15">5 - 15 per month</option>
          <option value="15_30">15 - 30 per month</option>
          <option value="over_30">30+ per month</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-sm font-medium text-emerald-800 mb-2">
            Edge Rollover Workflow for Selected Plans
          </p>
          <ol className="text-xs text-emerald-700 space-y-1 list-decimal list-inside">
            <li>Client initiates rollover request via portal</li>
            <li>Edge extracts account details from uploaded statement</li>
            <li>Auto-generates transfer paperwork for the plan type</li>
            <li>Compliance pre-check for suitability</li>
            <li>Advisor review and approval</li>
            <li>Electronic submission to receiving custodian</li>
          </ol>
          <p className="text-xs text-emerald-600 mt-2">
            Estimated processing: same-day vs. industry average of 5-7 business days.
          </p>
        </div>
      )}
    </div>
  );
}

function ComplianceStep({ formData, setFormData }: StepProps) {
  const update = (key: string, value: any) => setFormData({ ...formData, [key]: value });

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          Edge helps you maintain compliance with SEC and FINRA regulations.
          Let&apos;s configure your compliance preferences.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Registration Type</label>
        <div className="space-y-2">
          {[
            { value: 'sec', label: 'SEC Registered', desc: 'AUM over $100M' },
            { value: 'state', label: 'State Registered', desc: 'AUM under $100M' },
            { value: 'era', label: 'Exempt Reporting Advisor', desc: 'Limited exemptions' },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="radio"
                name="registrationType"
                value={option.value}
                checked={formData.registrationType === option.value}
                onChange={(e) => update('registrationType', e.target.value)}
                className="mt-1 border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-slate-900">{option.label}</p>
                <p className="text-sm text-slate-500">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Compliance Features</label>
        <div className="space-y-2">
          {[
            { key: 'autoAlerts', label: 'Automated Compliance Alerts', desc: 'Get notified of potential issues' },
            { key: 'docReview', label: 'AI Document Review', desc: 'Pre-screen marketing materials' },
            { key: 'auditTrail', label: 'Full Audit Trail', desc: 'Track all compliance activities' },
            { key: 'archiving', label: 'Communication Archiving', desc: 'Archive client communications' },
          ].map((feature) => (
            <label
              key={feature.key}
              className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData[feature.key] !== false}
                onChange={(e) => update(feature.key, e.target.checked)}
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-slate-900">{feature.label}</p>
                <p className="text-sm text-slate-500">{feature.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustodiansStep({ formData, setFormData }: StepProps) {
  const custodians = [
    { id: 'schwab', name: 'Charles Schwab', logo: '\uD83C\uDFE6' },
    { id: 'fidelity', name: 'Fidelity', logo: '\uD83C\uDFDB\uFE0F' },
    { id: 'pershing', name: 'Pershing', logo: '\uD83D\uDCBC' },
    { id: 'interactive', name: 'Interactive Brokers', logo: '\uD83D\uDCC8' },
  ];

  const connected: string[] = formData.connectedCustodians || [];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
        <p className="text-sm text-amber-800">
          Connect your custodial accounts to automatically sync client data,
          positions, and transactions. You can skip this step and connect later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {custodians.map((c) => {
          const isConnected = connected.includes(c.id);
          return (
            <div
              key={c.id}
              className={`p-4 border rounded-xl transition-all ${
                isConnected
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{c.logo}</span>
                <span className="font-medium text-slate-900">{c.name}</span>
              </div>
              {isConnected ? (
                <div className="flex items-center gap-2 text-emerald-700 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Connected
                </div>
              ) : (
                <button
                  onClick={() =>
                    setFormData({
                      ...formData,
                      connectedCustodians: [...connected, c.id],
                    })
                  }
                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrandingStep({ formData, setFormData }: StepProps) {
  const update = (key: string, value: any) => setFormData({ ...formData, [key]: value });

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Palette className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600">Click to upload your logo</p>
          <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={formData.primaryColor || '#3B82F6'}
            onChange={(e) => update('primaryColor', e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer"
          />
          <input
            type="text"
            value={formData.primaryColor || '#3B82F6'}
            onChange={(e) => update('primaryColor', e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="#3B82F6"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Client Portal Welcome Message
        </label>
        <textarea
          value={formData.welcomeMessage || ''}
          onChange={(e) => update('welcomeMessage', e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Welcome to your client portal. Here you can view your accounts, documents, and communicate with your advisor."
        />
      </div>
    </div>
  );
}

function BillingStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            id: 'starter',
            name: 'Starter',
            price: 99,
            features: ['Up to 25 clients', 'Basic analytics', 'Email support'],
          },
          {
            id: 'professional',
            name: 'Professional',
            price: 299,
            features: ['Up to 100 clients', 'Advanced analytics', 'Priority support', 'Client portal'],
          },
        ].map((plan) => (
          <div
            key={plan.id}
            onClick={() => setFormData({ ...formData, plan: plan.id })}
            className={`p-6 border rounded-xl cursor-pointer transition-all ${
              formData.plan === plan.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            <h4 className="font-semibold text-slate-900">{plan.name}</h4>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              ${plan.price}
              <span className="text-sm font-normal text-slate-500">/mo</span>
            </p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-600">
          Start with a <strong>14-day free trial</strong>. No credit card required. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function RIAOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, any>>({});

  const step = STEPS[currentStep];
  const progress = Math.round((completedSteps.size / STEPS.length) * 100);

  const handleNext = () => {
    setCompletedSteps((prev) => new Set([...prev, step.id]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleSkip = () => navigate('/dashboard');

  /* -- Step renderer -- */
  const renderStep = () => {
    switch (currentStep) {
      case 0: return <WelcomeStep />;
      case 1: return <ProfileStep formData={formData} setFormData={setFormData} />;
      case 2: return <FirmStep formData={formData} setFormData={setFormData} />;
      case 3: return <ClientTypesStep formData={formData} setFormData={setFormData} />;
      case 4: return <ComplianceStep formData={formData} setFormData={setFormData} />;
      case 5: return <CustodiansStep formData={formData} setFormData={setFormData} />;
      case 6: return <BrandingStep formData={formData} setFormData={setFormData} />;
      case 7: return <BillingStep formData={formData} setFormData={setFormData} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-blue-600">Edge</span>
            <span className="text-xl font-bold text-teal-500">AI</span>
          </div>
          <button onClick={handleSkip} className="text-sm text-slate-500 hover:text-slate-700">
            Skip for now
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Setup Progress</span>
            <span className="text-sm text-slate-500">{progress}% complete</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Step Navigation */}
          <div className="col-span-12 lg:col-span-4">
            <nav className="space-y-1">
              {STEPS.map((s, index) => {
                const isCompleted = completedSteps.has(s.id);
                const isCurrent = index === currentStep;
                const Icon = s.icon;

                return (
                  <button
                    key={s.id}
                    onClick={() => (isCompleted || isCurrent) && setCurrentStep(index)}
                    disabled={!isCompleted && !isCurrent}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                      isCurrent
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : isCompleted
                        ? 'hover:bg-slate-50 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isCompleted
                          ? 'bg-emerald-100'
                          : isCurrent
                          ? 'bg-blue-100'
                          : 'bg-slate-100'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Icon className={`h-5 w-5 ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${isCurrent ? 'text-blue-900' : 'text-slate-900'}`}>
                        {s.title}
                      </p>
                      <p className="text-xs text-slate-500">{s.description}</p>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Help Link */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600">
                <HelpCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Need help?</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Check our{' '}
                <a href="/help" className="text-blue-600 hover:underline">
                  setup guide
                </a>{' '}
                or contact support.
              </p>
            </div>
          </div>

          {/* Step Content */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              {/* Step Header */}
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-900">{step.title}</h2>
                <p className="text-slate-500 mt-1">{step.description}</p>
              </div>

              {/* Step Content */}
              <div className="p-6">{renderStep()}</div>

              {/* Step Actions */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentStep === 0
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {currentStep === STEPS.length - 1 ? 'Complete Setup' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
