import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const TradierSetup: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    apiKey: '',
    accountId: '',
    environment: 'sandbox' as 'sandbox' | 'live'
  });
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    
    try {
      const response = await api.post('/tradier/test-connection', {
        api_key: formData.apiKey,
        account_id: formData.accountId,
        environment: formData.environment
      });
      
      if (response.data.success) {
        toast.success('Connection test successful!');
        setStep(3); // Move to success step
      } else {
        setError(response.data.message || 'Connection test failed');
        toast.error(response.data.message || 'Connection test failed');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to test connection';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCredentials = async () => {
    try {
      await api.post('/user/tradier-credentials', {
        api_key: formData.apiKey,
        account_id: formData.accountId,
        environment: formData.environment
      });
      
      toast.success('✅ Tradier credentials saved successfully!');
      navigate('/settings');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to save credentials';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-secondary mb-2">🔐 Connect Your Tradier Account</h1>
          <p className="text-gray-600">Set up live trading by connecting your Tradier brokerage account</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <span className="ml-2 font-medium hidden sm:inline">Get API Key</span>
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium hidden sm:inline">Enter Credentials</span>
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className={`flex items-center ${step >= 3 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <span className="ml-2 font-medium hidden sm:inline">Test Connection</span>
          </div>
        </div>

        {/* Step 1: Instructions */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-secondary">Step 1: Get Your Tradier API Key</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">📋 How to get your API key:</h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-800">
                <li>
                  <strong>Create a Tradier account</strong> (if you don't have one)
                  <br />
                  <a 
                    href="https://brokerage.tradier.com/signup" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Sign up at Tradier.com →
                  </a>
                </li>
                <li><strong>Login to your Tradier account</strong></li>
                <li><strong>Navigate to:</strong> Settings → API Access</li>
                <li><strong>Create a new API token</strong></li>
                <li><strong>Copy your API key and Account ID</strong></li>
              </ol>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">🎓 New to Tradier?</h4>
              <p className="text-sm text-gray-700 mb-2">
                Tradier is a brokerage that provides commission-free options trading. 
                You'll need to fund your account before placing live trades.
              </p>
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Start with their sandbox (test) environment to practice 
                with simulated data before using real money.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
            >
              I Have My API Key →
            </button>
          </div>
        )}

        {/* Step 2: Enter Credentials */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-secondary">Step 2: Enter Your Credentials</h2>

            <form onSubmit={(e) => { e.preventDefault(); handleTestConnection(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, environment: 'sandbox' })}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      formData.environment === 'sandbox'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📄 Sandbox (Test Mode)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, environment: 'live' })}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      formData.environment === 'live'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    💰 Live (Real Money)
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {formData.environment === 'sandbox' 
                    ? '✅ Recommended for testing - no real money at risk'
                    : '⚠️ Real money mode - use with caution'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tradier API Key
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your API key is encrypted and stored securely
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account ID
                </label>
                <input
                  type="text"
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  placeholder="Enter your account ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">❌ {error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={testing || !formData.apiKey || !formData.accountId}
                >
                  {testing ? 'Testing Connection...' : 'Test Connection'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-secondary">Connection Successful!</h2>
            <p className="text-gray-600">Your Tradier account is connected and ready to use.</p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <h3 className="font-semibold text-gray-900 mb-2">Account Details:</h3>
              <p className="text-sm text-gray-700">
                Environment: <strong>{formData.environment === 'sandbox' ? 'Sandbox (Test)' : 'Live'}</strong>
              </p>
              <p className="text-sm text-gray-700">
                Account ID: <strong>{formData.accountId}</strong>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Your credentials are saved securely</li>
                <li>You can now enable live trading mode</li>
                <li>Remember to start with small positions</li>
              </ul>
            </div>

            <button
              onClick={handleSaveCredentials}
              className="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
            >
              Finish Setup →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradierSetup;

