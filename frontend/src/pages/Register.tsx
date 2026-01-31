import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const AUTH_GRADIENT = 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 25%, #D946EF 50%, #EC4899 75%, #F43F5E 100%)';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    betaCode: '',
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'betaCode' ? value.toUpperCase() : value,
    }));
    setError('');
  };

  const validateForm = (): string | null => {
    if (formData.username.trim().length < 3) return 'Username must be at least 3 characters';
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email address';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.betaCode.trim()) return 'Beta access code is required';
    if (!formData.agreeToTerms) return 'You must agree to the Terms of Service';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await register(
        formData.username.trim(),
        formData.email.trim().toLowerCase(),
        formData.password,
        'moderate',
        formData.betaCode.trim()
      );
      toast.success('Account created successfully! Welcome to OptionsEdge!');
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Token not saved');
      localStorage.removeItem('has_seen_onboarding');
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ background: AUTH_GRADIENT }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">OE</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600">Start trading options with AI-powered insights</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-gray-700"
              placeholder="Choose a username (min. 3 characters)"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-gray-700"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-gray-700 pr-12"
                placeholder="Create a password (min. 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters long</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-gray-700"
              placeholder="Confirm your password"
            />
          </div>

          <div>
            <label htmlFor="betaCode" className="block text-sm font-medium text-gray-700 mb-2">
              Beta Access Code
            </label>
            <input
              id="betaCode"
              name="betaCode"
              type="text"
              value={formData.betaCode}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-gray-700 uppercase"
              placeholder="Enter your beta code"
            />
            <p className="mt-1 text-xs text-gray-500">
              Don&apos;t have a code?{' '}
              <a
                href="mailto:leslie@iabadvisors.com?subject=OptionsEdge Beta Access Request"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Request access
              </a>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex">
              <span className="text-lg mr-2">📝</span>
              <div>
                <span className="text-blue-800 font-medium">Note:</span>
                <span className="text-blue-700 text-sm"> You&apos;ll start with $100,000 in paper trading mode. Virtual money for learning—no real money at risk.</span>
              </div>
            </div>
          </div>

          <div className="flex items-start">
            <input
              id="agreeToTerms"
              name="agreeToTerms"
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="h-4 w-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-700">
              I agree to the <Link to="/terms" className="text-indigo-600 hover:text-indigo-700 font-medium">Terms of Service</Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-3 rounded-lg font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Already have an account?</span>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Sign in to your account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
