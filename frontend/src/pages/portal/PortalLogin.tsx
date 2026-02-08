import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { portalLogin, isPortalAuthenticated, getBranding, BrandingConfig, PortalApiError } from '../../services/portalApi';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig | null>(null);

  useEffect(() => {
    // Redirect if already logged in
    if (isPortalAuthenticated()) {
      navigate('/portal/dashboard');
    }
    // Load branding configuration
    getBranding()
      .then((data) => setBranding(data))
      .catch(() => {}); // Ignore branding errors
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    
    try {
      await portalLogin(email, password);
      navigate('/portal/dashboard');
    } catch (err) {
      if (err instanceof PortalApiError) {
        if (err.status === 401) {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(err.message || 'Login failed');
        }
      } else {
        setError('Unable to connect. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = branding?.primary_color || '#1a56db';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="Logo" className="h-12 mx-auto" />
          ) : (
            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
              {branding?.portal_title || 'Client Portal'}
            </h1>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Welcome Back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to access your portfolio</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
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
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              type="button"
              onClick={() => alert('Password reset is not available in demo mode. Please contact your advisor.')}
              className="text-sm text-blue-600 hover:underline block mx-auto"
            >
              Forgot your password?
            </button>
            <p className="text-sm text-gray-500">
              First time?{' '}
              <Link to="/portal/onboarding" className="text-blue-600 font-medium hover:underline">
                Set up your account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Looking for the advisor portal?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>

        {branding?.disclaimer_text && (
          <p className="mt-4 text-xs text-gray-400 text-center">
            {branding.disclaimer_text}
          </p>
        )}
      </div>
    </div>
  );
}
