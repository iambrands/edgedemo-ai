import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientPageShell } from './ClientPageShell';
import { b2cApi, type B2CRiskProfileResponse, type B2CRiskQuestion, getB2CToken } from '../../services/b2cApi';

export default function ClientOnboardingPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<B2CRiskQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<B2CRiskProfileResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      setIsLoading(true);
      setError('');
      try {
        const response = await b2cApi.getRiskQuestions();
        if (isMounted) {
          setQuestions(response.questions);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load onboarding questions';
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, []);

  const isComplete = questions.length > 0 && questions.every((question) => answers[question.id]);
  const hasToken = Boolean(getB2CToken());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!hasToken) {
      setError('Create an account or sign in before saving onboarding.');
      return;
    }
    if (!isComplete) {
      setError('Please answer each question before continuing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await b2cApi.submitRiskProfile(answers);
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save onboarding';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientPageShell
      title="Set up your profile"
      subtitle="Tell us about your goals and risk comfort. Your answers help personalize suggestions on your dashboard."
      badge="Onboarding"
      backTo="/client/signup"
      backLabel="Back to signup"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        {!hasToken && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Sign in or create an account first so your profile can be saved.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-20 rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-20 rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-20 rounded-lg bg-slate-100 animate-pulse" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question, index) => (
              <fieldset key={question.id} className="rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-semibold text-slate-900">
                  {index + 1}. {question.question}
                </legend>
                <div className="mt-4 space-y-2">
                  {question.options.map((option) => (
                    <label
                      key={`${question.id}-${option.score}-${option.label}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                        answers[question.id] === option.score
                          ? 'border-blue-300 bg-blue-50 text-blue-950'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.score}
                        checked={answers[question.id] === option.score}
                        onChange={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: option.score,
                          }))
                        }
                        className="mt-0.5"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <button
              type="submit"
              disabled={!hasToken || !isComplete || isSubmitting}
              className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving profile...' : 'Save profile'}
            </button>
          </form>
        )}

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="font-semibold text-emerald-950">Profile saved</h2>
            <p className="mt-1 text-sm text-emerald-900">
              Your current risk profile is {result.risk_tolerance.replace(/_/g, ' ')} with a
              {` ${result.time_horizon.replace(/_/g, ' ')}`} time horizon.
            </p>
            <button
              type="button"
              onClick={() => navigate('/client/dashboard')}
              className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Continue to dashboard
            </button>
          </div>
        )}
      </div>
    </ClientPageShell>
  );
}
