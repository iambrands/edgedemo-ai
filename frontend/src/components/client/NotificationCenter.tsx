import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, TrendingUp, Target, Wallet, DollarSign, AlertTriangle, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';

type Notification = {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  action_label: string;
  action_route: string;
  timestamp: string;
  read: boolean;
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  budget: Wallet,
  opportunity: TrendingUp,
  rebalance: TrendingUp,
  goal: Target,
  bill: DollarSign,
  income: DollarSign,
};

const SEVERITY_DOT: Record<string, string> = {
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  info: 'bg-blue-500',
  danger: 'bg-red-500',
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    b2cApi.getNotifications()
      .then((data) => {
        setNotifications(data.notifications);
        setUnread(data.unread_count);
      })
      .catch(() => {/* silent */});
  }, []);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
    await b2cApi.markNotificationRead(id).catch(() => {});
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const handleClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    navigate(n.action_route);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-lg text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-10 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-slate-600" />
              <span className="font-semibold text-slate-900 text-sm">Notifications</span>
              {unread > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread} new</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button type="button" onClick={markAllRead} className="text-[11px] text-blue-600 hover:underline">
                  Mark all read
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                <CheckCircle size={28} className="text-emerald-400" />
                <p className="text-sm font-medium">You're all caught up</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? AlertTriangle;
                const dotColor = SEVERITY_DOT[n.severity] ?? 'bg-slate-400';
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 ${!n.read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <Icon size={14} className="text-slate-500" />
                      </div>
                      {!n.read && (
                        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dotColor}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold leading-snug ${n.read ? 'text-slate-700' : 'text-slate-900'}`}>{n.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">{timeAgo(n.timestamp)}</span>
                        <span className="text-[10px] text-blue-600 font-medium">{n.action_label} →</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
