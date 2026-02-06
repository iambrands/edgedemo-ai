import { useState } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

export function Settings() {
  const { user } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const mockApiKey = 'edgeai_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxx';

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(mockApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and API settings</p>
      </div>

      {/* Profile Section */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-600">
                {user?.firstName[0]}
                {user?.lastName[0]}
              </span>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-gray-500">{user?.email}</p>
              <Badge variant="blue" className="mt-2">
                {user?.role === 'ria' ? 'Financial Professional' : 'Individual Investor'}
              </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500 mb-1">First Name</p>
              <p className="text-gray-900 font-medium">{user?.firstName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Last Name</p>
              <p className="text-gray-900 font-medium">{user?.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Email</p>
              <p className="text-gray-900 font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Account Type</p>
              <p className="text-gray-900 font-medium capitalize">{user?.role}</p>
            </div>
          </div>

          {user?.role === 'ria' && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-500 mb-1">Firm</p>
                <p className="text-gray-900 font-medium">{user?.firm || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">CRD Number</p>
                <p className="text-gray-900 font-medium">{user?.crd || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">State</p>
                <p className="text-gray-900 font-medium">{user?.state || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Licenses</p>
                <div className="flex flex-wrap gap-1">
                  {user?.licenses?.map((license) => (
                    <Badge key={license} variant="gray">
                      {license}
                    </Badge>
                  )) || 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* API Keys Section */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h2>
        <p className="text-sm text-gray-500 mb-6">
          Use API keys to integrate EdgeAI with your applications. Keep your keys secure
          and never share them publicly.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Live API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={mockApiKey}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono bg-gray-50 pr-20"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <Button
                variant="secondary"
                onClick={handleCopyApiKey}
                className="flex items-center gap-2"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> Your API key provides full access to your account.
              Never share it in client-side code or public repositories.
            </p>
          </div>
        </div>
      </Card>

      {/* Preferences Section */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive alerts and updates via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Weekly Reports</p>
              <p className="text-sm text-gray-500">Receive weekly portfolio summary reports</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">Compliance Alerts</p>
              <p className="text-sm text-gray-500">Get notified of compliance issues immediately</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Delete Account</p>
            <p className="text-sm text-gray-500">
              Permanently delete your account and all associated data
            </p>
          </div>
          <Button
            variant="secondary"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
