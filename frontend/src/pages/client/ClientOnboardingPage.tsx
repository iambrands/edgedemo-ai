/**
 * B2C-104 — 5-step guided onboarding wizard.
 * Full-screen pre-auth layout (no sidebar). Progress persists in localStorage.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ChevronRight,
  Lightbulb,
  Shield,
} from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { PlaidLinkButton } from '../../components/client/PlaidLinkButton';
import {
  b2cApi,
  type B2CDashboardResponse,
  type B2CGoalCreateRequest,
  type B2CRiskProfileResponse,
  type B2CRiskQuestion,
  type PlaidExchangeResponse,
} from '../../services/b2cApi';

/* ── localStorage helpers ─────────────────────────────────────────────── */

const STORAGE_STEP_KEY = 'firmum_onboarding_step';
const STORAGE_DONE_KEY = 'firmum_onboarding_done';
const TOTAL_STEPS = 5;

function loadSavedStep(): number {
  const raw = localStorage.getItem(STORAGE_STEP_KEY);
  const n = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n >= 1 && n <= TOTAL_STEPS ? n : 1;
}

function persistStep(step: number) {
  localStorage.setItem(STORAGE_STEP_KEY, String(step));
}

function markOnboardingDone() {
  localStorage.setItem(STORAGE_DONE_KEY, 'true');
  localStorage.removeItem(STORAGE_STEP_KEY);
}

/* ── progress indicator ───────────────────────────────────────────────── */

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 mb-6">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <div key={n} className="flex items-center gap-1.5">
              <div
                className={`rounded-full transition-all duration-200 flex items-center justify-center ${
                  done
                    ? 'w-5 h-5 bg-blue-600'
                    : current
                    ? 'w-5 h-5 bg-blue-600 ring-4 ring-blue-100'
                    : 'w-2.5 h-2.5 bg-slate-200'
                }`}
              >
                {done && <CheckCircle className="h-3 w-3 text-white" />}
              </div>
              {n < TOTAL_STEPS && (
                <div
                  className={`h-px w-5 transition-colors ${
                    done ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 font-medium tracking-wide">
        Step {step} of {TOTAL_STEPS}
      </p>
    </div>
  );
}

/* ── step 1: connect account ──────────────────────────────────────────── */

function Step1Connect({ onNext }: { onNext: () => void }) {
  const [linked, setLinked] = useState<PlaidExchangeResponse | null>(null);

  const handleLinked = useCallback((result: PlaidExchangeResponse) => {
    setLinked(result);
  }, []);

  return (
    <div className="space-y-5">
      <StepHeader
        emoji="🏦"
        title="Connect your accounts"
        subtitle="See your full financial picture in one place. Bank-level 256-bit encryption."
      />

      {linked ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-3">
          <CheckCircle className="h-9 w-9 text-emerald-600 mx-auto" />
          <div>
            <p className="font-semibold text-emerald-900">{linked.institution_name} connected</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {linked.accounts.length} account{linked.accounts.length !== 1 ? 's' : ''} linked
            </p>
          </div>
          <NextButton onClick={onNext} label="Continue" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <TrustRow icon={<Shield className="h-4 w-4 text-slate-400" />} text="Read-only access — we can never move your money" />
            <TrustRow icon={<Shield className="h-4 w-4 text-slate-400" />} text="Plaid-powered · used by thousands of apps" />
          </div>
          <PlaidLinkButton onLinked={handleLinked} />
        </div>
      )}
    </div>
  );
}

/* ── step 2: risk profile quiz ────────────────────────────────────────── */

function Step2RiskQuiz({ onNext }: { onNext: () => void }) {
  const [questions, setQuestions] = useState<B2CRiskQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<B2CRiskProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    b2cApi
      .getRiskQuestions()
      .then((res) => setQuestions(res.questions))
      .catch(() => setError('Could not load questions — skip to continue.'))
      .finally(() => setLoading(false));
  }, []);

  const allAnswered =
    questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await b2cApi.submitRiskProfile(answers);
      setResult(res);
      setTimeout(onNext, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — skip to continue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-5 text-center py-2">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
          <CheckCircle className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Risk profile saved</p>
          <p className="text-sm text-slate-500 mt-1">
            Tolerance:{' '}
            <span className="capitalize font-medium text-slate-700">
              {result.risk_tolerance.replace(/_/g, ' ')}
            </span>
          </p>
        </div>
        <p className="text-xs text-slate-400">Moving to next step…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepHeader
        emoji="🎯"
        title="What's your risk comfort?"
        subtitle="3 quick questions help us personalize your insights."
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <fieldset key={q.id} className="rounded-xl border border-slate-200 p-4">
              <legend className="text-sm font-semibold text-slate-900 px-1">
                {idx + 1}. {q.question}
              </legend>
              <div className="mt-3 space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={`${q.id}-${opt.score}`}
                    className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                      answers[q.id] === opt.score
                        ? 'border-blue-300 bg-blue-50 text-blue-950'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.score}
                      checked={answers[q.id] === opt.score}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: opt.score }))
                      }
                      className="mt-0.5 flex-shrink-0 accent-blue-600"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <PrimaryButton
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            label={submitting ? 'Saving…' : 'Save & continue'}
          />
        </div>
      )}
    </div>
  );
}

/* ── step 3: first goal ───────────────────────────────────────────────── */

function Step3Goal({ onNext }: { onNext: () => void }) {
  const [form, setForm] = useState<B2CGoalCreateRequest>({
    goal_type: 'retirement',
    name: '',
    target_amount: 0,
    target_date: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await b2cApi.createGoal(form);
      setSaved(true);
      setTimeout(onNext, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — skip to continue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (saved) {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto" />
        <p className="font-semibold text-slate-900">Goal created!</p>
        <p className="text-xs text-slate-400">Moving to next step…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepHeader
        emoji="🏁"
        title="Set your first goal"
        subtitle="What are you saving toward?"
      />

      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Goal name">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Retire by 65"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </FormField>

        <FormField label="Target amount">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">
              $
            </span>
            <input
              type="number"
              required
              min="1"
              value={form.target_amount || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, target_amount: parseFloat(e.target.value) || 0 }))
              }
              placeholder="500,000"
              className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </FormField>

        <FormField label="Target date">
          <input
            type="date"
            required
            value={form.target_date}
            onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </FormField>

        <PrimaryButton
          type="submit"
          disabled={submitting}
          label={submitting ? 'Saving…' : 'Create goal & continue'}
        />
      </form>
    </div>
  );
}

/* ── step 4: fee scan preview ─────────────────────────────────────────── */

function Step4FeeScan({ onNext }: { onNext: () => void }) {
  const [dashboard, setDashboard] = useState<B2CDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    b2cApi
      .getDashboard()
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const benchmarks = dashboard?.fee_benchmarks ?? [];

  return (
    <div className="space-y-5">
      <StepHeader
        emoji="📊"
        title="Your fee snapshot"
        subtitle="Here's how your portfolio costs compare to industry benchmarks."
      />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : benchmarks.length > 0 ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Source
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Rate
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Est. Annual
                </th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b, idx) => (
                <tr
                  key={b.label}
                  className={idx < benchmarks.length - 1 ? 'border-b border-slate-100' : ''}
                >
                  <td className="px-4 py-3 text-slate-700 text-sm">{b.label}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">
                    {Number(b.rate_pct).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                    $
                    {Number(b.annual_cost_at_aum).toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center">
          <Lightbulb className="h-6 w-6 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            Fee data loads after your first account is linked.
          </p>
          <p className="text-xs text-slate-400 mt-1">You can review this on your dashboard.</p>
        </div>
      )}

      <NextButton onClick={onNext} label="Continue" />
    </div>
  );
}

/* ── step 5: done ─────────────────────────────────────────────────────── */

const STEP_LABELS: Record<number, string> = {
  1: 'Account connected',
  2: 'Risk profile set',
  3: 'First goal created',
  4: 'Fee scan reviewed',
};

function Step5Done({
  onFinish,
  stepsCompleted,
}: {
  onFinish: () => void;
  stepsCompleted: ReadonlySet<number>;
}) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
          <CheckCircle className="h-9 w-9 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">You're all set!</h2>
        <p className="text-slate-500 text-sm mt-2">Your Firmum dashboard is ready.</p>
      </div>

      {/* completion checklist */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left space-y-3">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-3">
            {stepsCompleted.has(n) ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
            )}
            <span
              className={`text-sm ${
                stepsCompleted.has(n) ? 'text-slate-700' : 'text-slate-400'
              }`}
            >
              {STEP_LABELS[n]}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onFinish}
        className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm"
      >
        Go to dashboard
      </button>

      <p className="text-xs text-slate-400">
        Any skipped steps can be completed from your dashboard at any time.
      </p>
    </div>
  );
}

/* ── shared UI primitives ─────────────────────────────────────────────── */

function StepHeader({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <span className="text-3xl" role="img" aria-hidden="true">
        {emoji}
      </span>
      <h2 className="text-xl font-bold text-slate-900 mt-2">{title}</h2>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}

function TrustRow({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      {message}
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  label,
  type = 'button',
}: {
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {label}
      {!disabled && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
    </button>
  );
}

function NextButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
    >
      {label}
      <ChevronRight className="h-4 w-4 flex-shrink-0" />
    </button>
  );
}

/* ── main wizard ──────────────────────────────────────────────────────── */

export default function ClientOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(() => loadSavedStep());
  const [stepsCompleted, setStepsCompleted] = useState<Set<number>>(() => new Set());

  /** Called when user successfully completes a step (not skip). */
  const handleNext = useCallback(() => {
    setStepsCompleted((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
    setStep((s) => {
      const next = Math.min(s + 1, TOTAL_STEPS);
      persistStep(next);
      return next;
    });
  }, [step]);

  /** Called when user clicks "Skip this step". */
  const handleSkip = useCallback(() => {
    setStep((s) => {
      const next = Math.min(s + 1, TOTAL_STEPS);
      persistStep(next);
      return next;
    });
  }, []);

  const handleFinish = useCallback(() => {
    markOnboardingDone();
    navigate('/client/dashboard');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Logo */}
      <div className="flex justify-center pt-8 pb-2">
        <Logo size="md" to="/client/signup" variant="marketing" />
      </div>

      {/* Progress */}
      <div className="flex justify-center px-4">
        <div className="w-full max-w-lg">
          <ProgressDots step={step} />
        </div>
      </div>

      {/* Card */}
      <main className="flex-1 flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-7 space-y-1">
          {step === 1 && <Step1Connect onNext={handleNext} />}
          {step === 2 && <Step2RiskQuiz onNext={handleNext} />}
          {step === 3 && <Step3Goal onNext={handleNext} />}
          {step === 4 && <Step4FeeScan onNext={handleNext} />}
          {step === 5 && (
            <Step5Done onFinish={handleFinish} stepsCompleted={stepsCompleted} />
          )}

          {/* Skip link — not shown on final step */}
          {step < TOTAL_STEPS && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
              >
                Skip this step
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Compliance */}
      <p className="text-center text-xs text-slate-400 pb-5 px-4">
        Firmum provides information and suggestions — not investment advice. All data is encrypted.
      </p>
    </div>
  );
}
