import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { clsx } from 'clsx';
import ClientNav from './ClientNav';
import AIChatWidget from '../chat/AIChatWidget';
import { clearB2CTokens, getB2CToken } from '../../services/b2cApi';
import { ClientProfileProvider } from '../../contexts/ClientProfileContext';

const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_KEY = 'firmum_last_activity';

function touchActivity() {
  sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export default function ClientLayout() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.innerWidth < 768,
  );

  // 30-minute inactivity session timeout
  useEffect(() => {
    touchActivity(); // record activity on mount

    let lastFlush = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // throttle sessionStorage writes to once per minute
      if (now - lastFlush > 60_000) {
        lastFlush = now;
        touchActivity();
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }));

    // Check for idle timeout every 60 seconds
    const idleTimer = setInterval(() => {
      const last = Number(sessionStorage.getItem(ACTIVITY_KEY)) || Date.now();
      if (Date.now() - last > IDLE_MS) {
        clearB2CTokens();
        navigate('/client/signup?reason=session_expired');
      }
    }, 60_000);

    return () => {
      events.forEach((e) => document.removeEventListener(e, handleActivity));
      clearInterval(idleTimer);
    };
  }, [navigate]);

  return (
    <ClientProfileProvider>
      <div className="min-h-screen bg-slate-50">
        <ClientNav
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((c) => !c)}
        />

        <div
          className={clsx(
            'transition-all duration-200',
            isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64',
          )}
        >
          {/* Mobile top bar — hamburger only */}
          <header className="h-12 bg-white border-b border-slate-200 flex items-center px-4 sticky top-0 z-30 md:hidden">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setIsSidebarCollapsed((c) => !c)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <Menu size={20} />
            </button>
          </header>

          <main className="p-6 max-w-5xl mx-auto">
            <Outlet />
          </main>
        </div>

        <AIChatWidget
          variant="client"
          apiEndpoint="/api/v1/b2c/chat"
          authToken={getB2CToken() ?? undefined}
        />
      </div>
    </ClientProfileProvider>
  );
}
