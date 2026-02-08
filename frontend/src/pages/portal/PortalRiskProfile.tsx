import { useEffect, useState } from 'react';
import { Shield, CheckCircle, RefreshCw, PieChart, AlertTriangle } from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';

interface RiskProfile {
  risk_score: number;
  risk_level: string;
  description: string;
  target_equity: number;
  target_fixed_income: number;
  target_alternatives: number;
  answers: Record<string, number>;
  completed_at: string;
}

const QUESTIONS = [
  {
    id: 'time_horizon',
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
    id: 'market_drop',
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
    id: 'income_stability',
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
    id: 'loss_tolerance',
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

const LEVEL_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  Conservative: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' },
  'Moderately Conservative': { bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-200' },
  Moderate: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  'Moderate-Aggressive': { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  Aggressive: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
};

export default function PortalRiskProfile() {
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'view' | 'questionnaire'>('view');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  const apiBase = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('portal_token');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch(`${apiBase}/api/v1/portal/risk-profile`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.completed && data.risk_profile) {
          setProfile(data.risk_profile);
          setAnswers(data.risk_profile.answers || {});
        }
      }
    } catch (err) {
      console.error('Failed to load risk profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/portal/risk-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(answers),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.risk_profile) {
          setProfile(data.risk_profile);
          setMode('view');
        }
      }
    } catch (err) {
      console.error('Failed to save risk profile', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Auto-advance to next question
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ((q) => q + 1), 300);
    }
  };

  const startRetake = () => {
    setAnswers(profile?.answers || {});
    setCurrentQ(0);
    setMode('questionnaire');
  };

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalNav />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  const levelColor = profile ? LEVEL_COLORS[profile.risk_level] || LEVEL_COLORS['Moderate'] : LEVEL_COLORS['Moderate'];

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNav />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Risk Profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'view'
              ? 'Your investment risk tolerance and recommended allocation'
              : 'Answer each question to determine your risk profile'}
          </p>
        </div>

        {/* ── VIEW MODE ─────────────────────────────────────── */}
        {mode === 'view' && profile && (
          <>
            {/* Score Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Your Risk Score
                </h2>
                <button
                  onClick={startRetake}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake Assessment
                </button>
              </div>

              <div className="flex items-center gap-8">
                {/* Score Ring */}
                <div className="relative flex-shrink-0">
                  <svg className="w-32 h-32" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke={profile.risk_score >= 76 ? '#ef4444' : profile.risk_score >= 61 ? '#f59e0b' : profile.risk_score >= 46 ? '#10b981' : '#3b82f6'}
                      strokeWidth="8"
                      strokeDasharray={`${(profile.risk_score / 100) * 326.73} 326.73`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{profile.risk_score}</span>
                    <span className="text-xs text-gray-500">/ 100</span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ring-1 ${levelColor.bg} ${levelColor.text} ${levelColor.ring}`}>
                      {profile.risk_level}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{profile.description}</p>
                  <p className="text-xs text-gray-400 mt-3">
                    Last assessed: {new Date(profile.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Target Allocation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-blue-600" />
                Recommended Allocation
              </h2>

              <div className="space-y-4">
                {[
                  { label: 'Equities', pct: profile.target_equity, color: 'bg-blue-500' },
                  { label: 'Fixed Income', pct: profile.target_fixed_income, color: 'bg-emerald-500' },
                  { label: 'Alternatives', pct: profile.target_alternatives, color: 'bg-purple-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.pct}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This recommended allocation is based on your risk profile questionnaire answers.
                  Your actual allocation may differ based on discussions with your advisor and specific financial circumstances.
                </p>
              </div>
            </div>

            {/* No profile yet banner */}
          </>
        )}

        {/* No profile completed */}
        {mode === 'view' && !profile && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Profile Not Completed</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Complete a short questionnaire to determine your risk tolerance and get a recommended investment allocation.
              This helps your advisor build the right portfolio for you.
            </p>
            <button
              onClick={() => {
                setAnswers({});
                setCurrentQ(0);
                setMode('questionnaire');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Shield className="w-5 h-5" />
              Take Risk Assessment
            </button>
          </div>
        )}

        {/* ── QUESTIONNAIRE MODE ─────────────────────────────── */}
        {mode === 'questionnaire' && (
          <>
            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Question {currentQ + 1} of {QUESTIONS.length}
                </span>
                <span className="text-sm text-gray-500">
                  {Object.keys(answers).length} of {QUESTIONS.length} answered
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Navigation */}
            <div className="flex gap-2">
              {QUESTIONS.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    i === currentQ
                      ? 'bg-blue-600'
                      : answers[q.id] !== undefined
                      ? 'bg-emerald-400'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Current Question */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-lg font-medium text-gray-900 mb-6">
                {currentQ + 1}. {QUESTIONS[currentQ].question}
              </p>
              <div className="space-y-3">
                {QUESTIONS[currentQ].options.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                      answers[QUESTIONS[currentQ].id] === option.value
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={QUESTIONS[currentQ].id}
                      value={option.value}
                      checked={answers[QUESTIONS[currentQ].id] === option.value}
                      onChange={() => handleAnswer(QUESTIONS[currentQ].id, option.value)}
                      className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                disabled={currentQ === 0}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentQ === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                ← Previous
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMode('view');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                {currentQ < QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setCurrentQ((q) => q + 1)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Get My Results
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
