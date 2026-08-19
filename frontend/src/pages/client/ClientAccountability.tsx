import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle,
  Download,
  Smartphone,
  User,
  XCircle,
} from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';

// ─────────────────────────────────────────────────────────────────────────────
// Install prompt hook
// ─────────────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed as a standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setPrompt(null);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  };

  return { prompt, installed, triggerInstall };
}

// ─────────────────────────────────────────────────────────────────────────────
// Push notifications toggle
// ─────────────────────────────────────────────────────────────────────────────

function PushNotificationsSection() {
  const [subscribed, setSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if ('Notification' in window) setPermissionState(Notification.permission);

    b2cApi.getPushStatus()
      .then((res) => setSubscribed(res.subscribed))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEnable = async () => {
    setToggling(true);
    setFeedback('');
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setFeedback('Push notifications are not supported in this browser.');
        return;
      }

      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        setFeedback('Permission denied. You can enable notifications in your browser settings.');
        return;
      }

      // Get the active service worker registration.
      const reg = await navigator.serviceWorker.ready;

      // Use a real VAPID key if configured; otherwise create a mock subscription object.
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      let endpoint = 'mock-endpoint-no-vapid-key';
      let keys: Record<string, string> = {};

      if (vapidKey) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        const json = sub.toJSON();
        endpoint = json.endpoint ?? '';
        keys = (json.keys as Record<string, string>) ?? {};
      }

      await b2cApi.subscribePush({ endpoint, keys });
      setSubscribed(true);
      setFeedback('Notifications enabled — you\'ll be alerted for budget warnings and advisor messages.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Could not enable notifications.');
    } finally {
      setToggling(false);
    }
  };

  const handleDisable = async () => {
    setToggling(true);
    setFeedback('');
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      await b2cApi.unsubscribePush();
      setSubscribed(false);
      setFeedback('Notifications disabled.');
    } catch {
      setFeedback('Could not disable notifications.');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            {subscribed ? (
              <Bell className="h-5 w-5 text-blue-600" />
            ) : (
              <BellOff className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Budget &amp; advisor alerts</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Get notified when you exceed a budget, your advisor shares a document, or a message
              arrives — even when the app is closed.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={subscribed ? handleDisable : handleEnable}
          disabled={toggling || permissionState === 'denied'}
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
            subscribed ? 'bg-blue-600' : 'bg-slate-200'
          }`}
          aria-label={subscribed ? 'Disable notifications' : 'Enable notifications'}
        >
          <span
            className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ${
              subscribed ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {permissionState === 'denied' && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Notifications are blocked in your browser. Open your browser settings to allow them for
          this site.
        </p>
      )}

      {feedback && (
        <p className={`mt-3 text-xs px-3 py-2 rounded-lg ${
          feedback.includes('enabled') || feedback.includes('disabled')
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {feedback}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Install prompt section
// ─────────────────────────────────────────────────────────────────────────────

function InstallAppSection() {
  const { prompt, installed, triggerInstall } = useInstallPrompt();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

  if (installed) {
    return (
      <div className="bg-white rounded-xl border border-emerald-200 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">App installed</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Firmum is installed on your device and works offline.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari: no beforeinstallprompt — show manual instructions.
  if (isIOS && isSafari && !prompt) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Install on iPhone / iPad</h3>
            <ol className="text-xs text-slate-500 mt-2 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Tap the Share button (box with arrow) in Safari</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> — Firmum will appear on your home screen</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Android / desktop Chrome: show install button when prompt is available.
  if (prompt) {
    return (
      <div className="bg-white rounded-xl border border-blue-200 bg-blue-50/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Download className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Install Firmum app</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Add to your home screen for instant access and offline support.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={triggerInstall}
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    );
  }

  // Already on desktop / not installable — show a note.
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
          <Smartphone className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Install as app</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Open Firmum in Chrome on Android or Safari on iOS to add it to your home screen for
            offline access.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile section
// ─────────────────────────────────────────────────────────────────────────────

function ProfileSection() {
  const email = localStorage.getItem('firmum_b2c_email') || '—';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 text-sm">Account</h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{email}</p>
        </div>
        <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex-shrink-0">
          Free plan
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main settings page
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientAccountability() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account, notifications, and app preferences.</p>
      </div>

      {/* Account */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Account</h2>
        <ProfileSection />
      </section>

      {/* Notifications */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notifications</h2>
        <PushNotificationsSection />
      </section>

      {/* App */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Mobile app</h2>
        <InstallAppSection />
      </section>

      {/* Sign out */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Session</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Sign out</h3>
            <p className="text-xs text-slate-500 mt-0.5">You'll need to sign in again to access your account.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('firmum_b2c_token');
              localStorage.removeItem('firmum_b2c_refresh_token');
              localStorage.removeItem('firmum_b2c_email');
              window.location.href = '/client/signup';
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
