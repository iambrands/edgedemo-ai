import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const result = await login(email, password, rememberMe);

      if (result.success) {
        navigate('/dashboard');
      } else {
        // Provide more specific error messages
        if (result.error?.includes('401') || result.error?.includes('Invalid')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (result.error?.includes('422')) {
          setError('Please enter a valid email address.');
        } else if (result.error?.includes('Network') || result.error?.includes('fetch')) {
          setError('Unable to connect to server. Please check your internet connection.');
        } else {
          setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link to="/" className="mb-8">
        <span className="text-2xl font-bold">
          <span className="text-gray-900">Edge</span>
          <span className="text-primary-500">AI</span>
        </span>
      </Link>

      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h1>
          <p className="text-gray-500 text-sm">Welcome back to EdgeAI</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            error={error && !email ? 'Email is required' : undefined}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {error && !password && (
              <p className="text-sm text-red-500 mt-1">Password is required</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                Remember me
              </span>
            </label>
            <Link 
              to="/forgot-password" 
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary-600 font-medium hover:text-primary-700">
            Sign Up
          </Link>
        </p>
      </Card>

      {/* Demo credentials hint */}
      <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg max-w-md w-full shadow-sm">
        <p className="text-xs text-gray-500 text-center">
          <span className="font-medium text-gray-700">Demo Credentials:</span>{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">leslie@iabadvisors.com</code>{' '}
          /{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">CreateWealth2026$</code>
        </p>
      </div>
    </div>
  );
}
