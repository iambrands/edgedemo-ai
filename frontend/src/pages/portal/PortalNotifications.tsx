import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, FileText, AlertTriangle, Calendar, Target,
  ArrowRightLeft, TrendingUp, CheckCircle, Loader2,
} from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/portalApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { Icon: React.ElementType; bg: string; text: string }> = {
  document: { Icon: FileText, bg: 'bg-blue-50', text: 'text-blue-600' },
  alert: { Icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-600' },
  meeting: { Icon: Calendar, bg: 'bg-purple-50', text: 'text-purple-600' },
  goal: { Icon: Target, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  request: { Icon: ArrowRightLeft, bg: 'bg-amber-50', text: 'text-amber-600' },
  trade: { Icon: TrendingUp, bg: 'bg-teal-50', text: 'text-teal-600' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PortalNotifications() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    getNotifications()
      .then((d) => setNotifications(d.notifications || []))
      .catch((e) => console.error('notif load failed', e))
      .finally(() => setLoading(false));
  }, []);

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      } catch (e) {
        console.error('mark read failed', e);
      }
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('mark all read failed', e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-500 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {filtered.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.alert;
              const Icon = cfg.Icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-4 p-4 text-left transition-colors hover:bg-slate-50 ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                >
                  <div className={`p-2.5 rounded-xl ${cfg.bg} flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
    </div>
  );
}
