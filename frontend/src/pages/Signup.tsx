import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

type AccountType = 'user' | 'ria' | null;

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function Signup() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [error, setError] = useState('');

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // RIA-specific fields
  const [firmName, setFirmName] = useState('');
  const [crdNumber, setCrdNumber] = useState('');
  const [state, setState] = useState('');
  const [licenses, setLicenses] = useState('');

  const handleAccountTypeSelect = (type: AccountType) => {
    setAccountType(type);
  };

  const handleContinue = () => {
    if (!accountType) {
      setError('Please select an account type');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (accountType === 'ria' && !firmName) {
      setError('Firm name is required for RIA accounts');
      return;
    }

    const result = await signup({
      email,
      password,
      firstName,
      lastName,
      role: accountType!,
      ...(accountType === 'ria' && {
        firm: firmName,
        crd: crdNumber,
        state,
        licenses,
      }),
    });

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link to="/" className="mb-8">
        <span className="text-2xl font-bold">
          <span className="text-gray-900">Edge</span>
          <span className="text-primary-500">AI</span>
        </span>
      </Link>

      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              )}
            >
              1
            </div>
            <div
              className={clsx(
                'w-16 h-1 rounded',
                step >= 2 ? 'bg-primary-600' : 'bg-gray-200'
              )}
            />
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              )}
            >
              2
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step 1: Account Type Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-center text-gray-500 mb-4">What type of account?</p>

            <div className="space-y-4">
              <button
                onClick={() => handleAccountTypeSelect('user')}
                className={clsx(
                  'w-full p-4 border-2 rounded-xl text-left transition-all',
                  accountType === 'user'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Individual Investor</p>
                    <p className="text-sm text-gray-500">
                      Track your portfolio and get AI-powered insights
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleAccountTypeSelect('ria')}
                className={clsx(
                  'w-full p-4 border-2 rounded-xl text-left transition-all',
                  accountType === 'ria'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Financial Professional (RIA)
                    </p>
                    <p className="text-sm text-gray-500">
                      Manage clients, compliance, and portfolios
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <Button className="w-full" onClick={handleContinue}>
              Continue →
            </Button>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-center text-gray-500 mb-4">
              {accountType === 'ria' ? 'Professional Registration' : 'Create Your Account'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Last Name"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {accountType === 'ria' && (
              <>
                <Input
                  label="Firm Name *"
                  placeholder="Your firm name"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="CRD Number"
                    placeholder="Optional"
                    value={crdNumber}
                    onChange={(e) => setCrdNumber(e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      State
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[15px] text-gray-900 bg-white outline-none transition-all focus:border-primary-500 focus:ring-[3px] focus:ring-primary-50"
                    >
                      <option value="">Select...</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Licenses (comma-separated)"
                  placeholder="e.g., Series 7, Series 65"
                  value={licenses}
                  onChange={(e) => setLicenses(e.target.value)}
                />
              </>
            )}

            <Input
              label="Password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex items-center gap-2"
                onClick={handleBack}
              >
                <ArrowLeft size={18} />
                Back
              </Button>
              <Button type="submit" className="flex-1" isLoading={isLoading}>
                Create Account
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
            Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
}
