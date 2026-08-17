import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientPageShell } from './ClientPageShell';
import { b2cApi, storeB2CTokens } from '../../services/b2cApi';

type AuthMode = 'register' | 'login';

export default function ClientRegister() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('register');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email || !password || (isRegister && (!firstName || !lastName))) {
      setError('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = isRegister
        ? await b2cApi.register({
            email,
            password,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          })
        : await b2cApi.login(email, password);

      storeB2CTokens(response);
      navigate(isRegister ? '/client/onboarding' : '/client/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to authenticate';
      if (message.includes('404') || message.includes('Not Found')) {
        setError('Self-serve signup needs the B2C backend and database enabled.');
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientPageShell
      title={isRegister ? 'Create your Firmum account' : 'Sign in to Firmum'}
      subtitle="Aggregate held-away accounts, upload statements, and explore AI-powered suggestions — not investment advice."
      badge="Self-serve signup"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-lg py-2 transition-colors ${
              isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-lg py-2 transition-colors ${
              !isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign in
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-slate-700">
                First name
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Last name
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Working...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          By continuing, you agree that Firmum provides information and suggestions, not investment advice.
        </p>
      </div>
    </ClientPageShell>
  );
}
