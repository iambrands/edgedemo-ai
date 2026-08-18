import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Mail } from 'lucide-react';
import { ClientPageShell } from './ClientPageShell';
import { b2cApi } from '../../services/b2cApi';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setSubmitting(true);
    try {
      await b2cApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ClientPageShell
      title="Reset your password"
      subtitle="Enter your email and we'll send instructions if an account exists."
      badge="Account recovery"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        {sent ? (
          <div className="text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-slate-900">Check your inbox</h2>
              <p className="text-sm text-slate-500">
                If <span className="font-medium text-slate-700">{email}</span> is registered,
                you'll receive a reset link shortly.
              </p>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              Demo mode — no email is actually sent.
            </p>
            <button
              type="button"
              onClick={() => navigate('/client/signup')}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Email address
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-sm">
              <button
                type="button"
                onClick={() => navigate('/client/signup')}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                Back to sign in
              </button>
            </p>
          </>
        )}
      </div>
    </ClientPageShell>
  );
}
