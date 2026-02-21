import { useEffect, useState } from 'react';
import { Check, Bell, Mail, Shield, User } from 'lucide-react';
import {
  getPreferences,
  updatePreferences,
  getPortalClientName,
  getPortalFirmName,
  Preferences,
} from '../../services/portalApi';

export default function PortalSettings() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const clientName = getPortalClientName() || 'Nicole Wilson';
  const firmName = getPortalFirmName() || 'IAB Advisors';

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const data = await getPreferences();
      setPrefs(data);
    } catch (err) {
      console.error('Failed to load preferences', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof Preferences) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await updatePreferences({ [key]: updated[key] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update', err);
      setPrefs(prefs); // revert
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your portal preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            Profile
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
              {clientName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <p className="text-lg font-medium text-slate-900">{clientName}</p>
              <p className="text-sm text-slate-500">nicole@example.com</p>
              <p className="text-sm text-slate-400 mt-0.5">{firmName}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Advisor</p>
              <p className="text-sm font-medium text-slate-900">Leslie Wilson, CFP®</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Account Since</p>
              <p className="text-sm font-medium text-slate-900">June 2024</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Risk Profile</p>
              <p className="text-sm font-medium text-slate-900">Moderate Growth</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">State</p>
              <p className="text-sm font-medium text-slate-900">Texas (TX)</p>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-blue-600" />
            Notification Preferences
          </h2>
          {saved && (
            <div className="mb-4 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2">
              <Check className="w-4 h-4" />
              Preferences saved
            </div>
          )}
          <div className="space-y-4">
            {[
              {
                key: 'email_narratives' as keyof Preferences,
                icon: Mail,
                title: 'Portfolio Update Emails',
                desc: 'Receive email notifications when your advisor publishes portfolio reviews and meeting summaries.',
              },
              {
                key: 'email_nudges' as keyof Preferences,
                icon: Bell,
                title: 'Action Item Alerts',
                desc: 'Get notified about important action items, such as rebalancing suggestions or document requests.',
              },
              {
                key: 'email_documents' as keyof Preferences,
                icon: Mail,
                title: 'Document Notifications',
                desc: 'Receive alerts when new statements, tax documents, or reports are available.',
              },
            ].map(({ key, icon: Icon, title, desc }) => (
              <div
                key={key}
                className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(key)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    prefs?.[key] ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      prefs?.[key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            Security
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Password</p>
                <p className="text-sm text-slate-500">Last changed: N/A</p>
              </div>
              <button
                onClick={() => alert('Password change is not available in demo mode. In production, this would send a password reset email.')}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Change Password
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                <p className="text-sm text-slate-500">Not enabled</p>
              </div>
              <button
                onClick={() => alert('2FA setup is not available in demo mode. In production, this would open an authenticator app setup wizard.')}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Enable 2FA
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-400 pb-8">
          <p>IAB Advisors LLC · Registered Investment Advisor</p>
          <p className="mt-1">
            Questions? Contact your advisor at{' '}
            <a href="mailto:leslie@iabadvisors.com" className="text-blue-500 hover:underline">
              leslie@iabadvisors.com
            </a>
          </p>
        </div>
    </div>
  );
}
