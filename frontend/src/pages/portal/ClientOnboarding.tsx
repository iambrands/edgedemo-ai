import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  FileText,
  Target,
  Shield,
  CheckCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
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
/*  Steps                                                              */
/* ------------------------------------------------------------------ */

const CLIENT_STEPS: StepDef[] = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with your portal', icon: Sparkles },
  { id: 'personal', title: 'Personal Information', description: 'Your basic details', icon: User },
  { id: 'financial', title: 'Financial Profile', description: 'Income and assets overview', icon: FileText },
  { id: 'goals', title: 'Investment Goals', description: 'What you want to achieve', icon: Target },
  { id: 'risk', title: 'Risk Assessment', description: 'Your risk tolerance', icon: Shield },
  { id: 'documents', title: 'Documents', description: 'Upload required documents', icon: Upload },
  { id: 'review', title: 'Review & Sign', description: 'Confirm your information', icon: CheckCircle },
];

/* ------------------------------------------------------------------ */
/*  Step Components                                                    */
/* ------------------------------------------------------------------ */

function ClientWelcomeStep() {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="h-10 w-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">Welcome!</h3>
      <p className="text-slate-600 max-w-md mx-auto mb-8">
        Your advisor has invited you to set up your client portal. This quick
        process will help us understand your financial goals and create a
        personalized experience for you.
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">10 min</p>
          <p className="text-xs text-slate-600">Estimated time</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-lg">
          <p className="text-2xl font-bold text-emerald-600">Secure</p>
          <p className="text-xs text-slate-600">256-bit encrypted</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">7</p>
          <p className="text-xs text-slate-600">Quick steps</p>
        </div>
      </div>
    </div>
  );
}

function PersonalInfoStep({ formData, setFormData }: StepProps) {
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
            placeholder="Jane"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
          <input
            type="text"
            value={formData.lastName || ''}
            onChange={(e) => update('lastName', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
        <input
          type="date"
          value={formData.dateOfBirth || ''}
          onChange={(e) => update('dateOfBirth', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) => update('email', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="jane@example.com"
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
        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
        <input
          type="text"
          value={formData.address || ''}
          onChange={(e) => update('address', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="123 Main St, City, State ZIP"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Social Security Number
        </label>
        <input
          type="password"
          value={formData.ssn || ''}
          onChange={(e) => update('ssn', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="XXX-XX-XXXX"
        />
        <p className="text-xs text-slate-400 mt-1">
          Encrypted and stored securely. Required for account setup.
        </p>
      </div>
    </div>
  );
}

function FinancialProfileStep({ formData, setFormData }: StepProps) {
  const update = (key: string, value: any) => setFormData({ ...formData, [key]: value });

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Annual Household Income</label>
        <select
          value={formData.income || ''}
          onChange={(e) => update('income', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select range...</option>
          <option value="under_50k">Under $50,000</option>
          <option value="50k_100k">$50,000 - $100,000</option>
          <option value="100k_250k">$100,000 - $250,000</option>
          <option value="250k_500k">$250,000 - $500,000</option>
          <option value="over_500k">Over $500,000</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Total Net Worth</label>
        <select
          value={formData.netWorth || ''}
          onChange={(e) => update('netWorth', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select range...</option>
          <option value="under_100k">Under $100,000</option>
          <option value="100k_500k">$100,000 - $500,000</option>
          <option value="500k_1m">$500,000 - $1,000,000</option>
          <option value="1m_5m">$1,000,000 - $5,000,000</option>
          <option value="over_5m">Over $5,000,000</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Liquid Assets</label>
        <select
          value={formData.liquidAssets || ''}
          onChange={(e) => update('liquidAssets', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select range...</option>
          <option value="under_50k">Under $50,000</option>
          <option value="50k_250k">$50,000 - $250,000</option>
          <option value="250k_1m">$250,000 - $1,000,000</option>
          <option value="over_1m">Over $1,000,000</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Employment Status</label>
        <select
          value={formData.employment || ''}
          onChange={(e) => update('employment', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select status...</option>
          <option value="employed">Employed</option>
          <option value="self_employed">Self-Employed</option>
          <option value="retired">Retired</option>
          <option value="not_employed">Not Currently Employed</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tax Filing Status</label>
        <select
          value={formData.taxStatus || ''}
          onChange={(e) => update('taxStatus', e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select status...</option>
          <option value="single">Single</option>
          <option value="married_joint">Married Filing Jointly</option>
          <option value="married_separate">Married Filing Separately</option>
          <option value="head">Head of Household</option>
        </select>
      </div>
    </div>
  );
}

function GoalsStep({ formData, setFormData }: StepProps) {
  const goals = [
    { id: 'retirement', label: 'Retirement Planning', desc: 'Build wealth for a comfortable retirement' },
    { id: 'education', label: 'Education Funding', desc: 'Save for children\'s or grandchildren\'s education' },
    { id: 'wealth', label: 'Wealth Building', desc: 'Grow assets and increase net worth' },
    { id: 'income', label: 'Income Generation', desc: 'Generate regular income from investments' },
    { id: 'preservation', label: 'Wealth Preservation', desc: 'Protect existing assets and purchasing power' },
    { id: 'estate', label: 'Estate Planning', desc: 'Plan for efficient wealth transfer' },
  ];

  const selectedGoals: string[] = formData.goals || [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Select all that apply. This helps your advisor tailor recommendations to your needs.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {goals.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <button
              key={goal.id}
              onClick={() => {
                const next = isSelected
                  ? selectedGoals.filter((g) => g !== goal.id)
                  : [...selectedGoals, goal.id];
                setFormData({ ...formData, goals: next });
              }}
              className={`p-4 border rounded-xl text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isSelected && <CheckCircle className="h-4 w-4 text-blue-600" />}
                <p className="font-medium text-slate-900">{goal.label}</p>
              </div>
              <p className="text-sm text-slate-500">{goal.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RiskAssessmentStep({ formData, setFormData }: StepProps) {
  const questions = [
    {
      id: 'timeHorizon',
      question: 'What is your investment time horizon?',
      options: [
        { value: 1, label: 'Less than 3 years' },
        { value: 2, label: '3–5 years' },
        { value: 3, label: '5–10 years' },
        { value: 4, label: '10–20 years' },
        { value: 5, label: 'More than 20 years' },
      ],
    },
    {
      id: 'marketDrop',
      question: 'If your portfolio dropped 20% in value, what would you do?',
      options: [
        { value: 1, label: 'Sell everything immediately' },
        { value: 2, label: 'Sell some investments to reduce risk' },
        { value: 3, label: 'Hold and wait for recovery' },
        { value: 4, label: 'Buy more at lower prices' },
        { value: 5, label: 'Aggressively buy the dip' },
      ],
    },
    {
      id: 'experience',
      question: 'How would you describe your investment experience?',
      options: [
        { value: 1, label: "None — I'm new to investing" },
        { value: 2, label: 'Limited — Savings accounts and CDs' },
        { value: 3, label: 'Moderate — Stocks and mutual funds' },
        { value: 4, label: 'Experienced — Options, ETFs, alternatives' },
        { value: 5, label: 'Expert — Professional trading experience' },
      ],
    },
    {
      id: 'incomeStability',
      question: 'How stable is your current income?',
      options: [
        { value: 1, label: 'Unstable — Freelance or variable income' },
        { value: 2, label: 'Somewhat stable — Commission-based' },
        { value: 3, label: 'Stable — Salaried employee' },
        { value: 4, label: 'Very stable — Multiple income sources' },
        { value: 5, label: 'Not dependent — Retired with pension' },
      ],
    },
    {
      id: 'lossTolerance',
      question: 'What is the maximum portfolio loss you could tolerate in a single year?',
      options: [
        { value: 1, label: 'Less than 5%' },
        { value: 2, label: '5–10%' },
        { value: 3, label: '10–20%' },
        { value: 4, label: '20–30%' },
        { value: 5, label: 'More than 30%' },
      ],
    },
  ];

  const answeredCount = questions.filter((q) => formData[q.id] != null).length;
  const allAnswered = answeredCount === questions.length;
  const totalScore = allAnswered
    ? questions.reduce((sum, q) => sum + (formData[q.id] || 0), 0)
    : 0;
  const maxScore = questions.length * 5;
  const pct = Math.round((totalScore / maxScore) * 100);
  const riskProfile =
    pct <= 25 ? 'Conservative' : pct <= 45 ? 'Moderately Conservative' : pct <= 60 ? 'Moderate' : pct <= 75 ? 'Moderate-Aggressive' : 'Aggressive';

  return (
    <div className="space-y-8">
      {questions.map((q, index) => (
        <div key={q.id}>
          <p className="font-medium text-slate-900 mb-3">
            {index + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData[q.id] === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={option.value}
                  checked={formData[q.id] === option.value}
                  onChange={() => setFormData({ ...formData, [q.id]: option.value })}
                  className="border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {allAnswered && (
        <div className="p-6 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100">
          <p className="text-sm text-slate-600 mb-2">Your Risk Profile</p>
          <p className="text-2xl font-bold text-slate-900">{riskProfile}</p>
          <p className="text-sm text-slate-500 mt-1 mb-3">
            Score: {pct}/100 — Based on your responses, your advisor will
            recommend an appropriate portfolio allocation.
          </p>
          <p className="text-xs text-slate-400">
            You can retake this assessment anytime from your portal's Risk Profile page.
          </p>
        </div>
      )}
    </div>
  );
}

function DocumentsStep({ formData, setFormData }: StepProps) {
  const documents = [
    { id: 'govId', label: 'Government-Issued ID', desc: 'Driver\'s license or passport', required: true },
    { id: 'statements', label: 'Recent Account Statements', desc: 'Last 3 months from current accounts', required: false },
    { id: 'taxReturn', label: 'Most Recent Tax Return', desc: 'For financial planning purposes', required: false },
  ];

  const uploaded: string[] = formData.uploadedDocs || [];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          Upload the following documents to complete your account setup.
          All documents are encrypted and stored securely.
        </p>
      </div>

      <div className="space-y-4">
        {documents.map((doc) => {
          const isUploaded = uploaded.includes(doc.id);
          return (
            <div
              key={doc.id}
              className={`p-4 border rounded-xl transition-all ${
                isUploaded ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{doc.label}</p>
                    {doc.required && (
                      <span className="text-xs text-red-500 font-medium">Required</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{doc.desc}</p>
                </div>
                {isUploaded ? (
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                    <CheckCircle className="h-5 w-5" />
                    Uploaded
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setFormData({ ...formData, uploadedDocs: [...uploaded, doc.id] })
                    }
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
                  >
                    <Upload className="h-4 w-4 inline mr-2" />
                    Upload
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStep({ formData }: { formData: Record<string, any> }) {
  const sections = [
    {
      title: 'Personal Information',
      fields: [
        { label: 'Name', value: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || '—' },
        { label: 'Email', value: formData.email || '—' },
        { label: 'Phone', value: formData.phone || '—' },
      ],
    },
    {
      title: 'Financial Profile',
      fields: [
        { label: 'Income Range', value: formData.income || '—' },
        { label: 'Net Worth', value: formData.netWorth || '—' },
        { label: 'Employment', value: formData.employment || '—' },
      ],
    },
    {
      title: 'Investment Goals',
      fields: [
        { label: 'Goals', value: (formData.goals || []).join(', ') || '—' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <h4 className="font-medium text-slate-900">{section.title}</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {section.fields.map((field) => (
              <div key={field.label} className="flex justify-between p-3">
                <span className="text-sm text-slate-500">{field.label}</span>
                <span className="text-sm font-medium text-slate-900">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
        <input
          type="checkbox"
          className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <p className="font-medium text-slate-900">I agree to the terms and conditions</p>
          <p className="text-sm text-slate-500">
            By signing, I confirm the information above is accurate and I agree to
            the advisory agreement and privacy policy.
          </p>
        </div>
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, any>>({});

  const step = CLIENT_STEPS[currentStep];
  const progress = Math.round((completedSteps.size / CLIENT_STEPS.length) * 100);

  const handleNext = async () => {
    setCompletedSteps((prev) => new Set([...prev, step.id]));
    if (currentStep < CLIENT_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Auto-authenticate after completing onboarding
      const email = formData.email || 'client@demo.com';
      const name = `${formData.firstName || 'Demo'} ${formData.lastName || 'Client'}`;
      const apiBase = import.meta.env.VITE_API_URL || '';

      try {
        // 1. Login
        const res = await fetch(`${apiBase}/api/v1/portal/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'onboarding-complete' }),
        });
        if (res.ok) {
          const data = await res.json();
          const token = data.access_token;
          localStorage.setItem('portal_token', token);
          localStorage.setItem('portal_refresh_token', data.refresh_token);
          localStorage.setItem('portal_client_name', data.client_name || name);
          if (data.firm_name) localStorage.setItem('portal_firm_name', data.firm_name);

          // 2. Save risk profile from onboarding answers
          if (formData.timeHorizon || formData.marketDrop || formData.experience) {
            try {
              await fetch(`${apiBase}/api/v1/portal/risk-profile`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  time_horizon: formData.timeHorizon || 3,
                  market_drop: formData.marketDrop || 3,
                  experience: formData.experience || 3,
                  income_stability: formData.incomeStability || 3,
                  loss_tolerance: formData.lossTolerance || 3,
                }),
              });
            } catch {
              // Risk profile save is non-critical; continue
            }
          }
        } else {
          localStorage.setItem('portal_token', 'demo-onboarding-token');
          localStorage.setItem('portal_client_name', name);
        }
      } catch {
        localStorage.setItem('portal_token', 'demo-onboarding-token');
        localStorage.setItem('portal_client_name',
          `${formData.firstName || 'Demo'} ${formData.lastName || 'Client'}`);
      }
      navigate('/portal/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <ClientWelcomeStep />;
      case 1: return <PersonalInfoStep formData={formData} setFormData={setFormData} />;
      case 2: return <FinancialProfileStep formData={formData} setFormData={setFormData} />;
      case 3: return <GoalsStep formData={formData} setFormData={setFormData} />;
      case 4: return <RiskAssessmentStep formData={formData} setFormData={setFormData} />;
      case 5: return <DocumentsStep formData={formData} setFormData={setFormData} />;
      case 6: return <ReviewStep formData={formData} />;
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
            <span className="ml-2 text-xs text-slate-400 uppercase tracking-wider">Client Portal</span>
          </div>
          <span className="text-sm text-slate-400">
            Step {currentStep + 1} of {CLIENT_STEPS.length}
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Onboarding Progress</span>
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
              {CLIENT_STEPS.map((s, index) => {
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
                        isCompleted ? 'bg-emerald-100' : isCurrent ? 'bg-blue-100' : 'bg-slate-100'
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
          </div>

          {/* Step Content */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-900">{step.title}</h2>
                <p className="text-slate-500 mt-1">{step.description}</p>
              </div>
              <div className="p-6">{renderStep()}</div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentStep === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {currentStep === CLIENT_STEPS.length - 1 ? 'Submit & Sign' : 'Continue'}
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
