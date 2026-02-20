/**
 * Secure advisor-client messaging page for RIA dashboard.
 * Two-panel layout: thread list (left) and message detail (right).
 */

import { useState } from 'react';
import { MessageCircle, Send, Search, Plus, User, Clock } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type Message = {
  id: string;
  sender: 'advisor' | 'client';
  senderName: string;
  body: string;
  timestamp: string;
};

type Thread = {
  id: string;
  clientName: string;
  subject: string;
  lastPreview: string;
  lastTimestamp: string;
  unreadCount: number;
  resolved?: boolean;
  messages: Message[];
};

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_THREADS: Thread[] = [
  {
    id: '1',
    clientName: 'Sarah & Michael Chen',
    subject: 'Quarterly Review Follow-up',
    lastPreview: 'Thank you for the detailed breakdown. We\'d like to schedule a call to discuss the rebalancing options.',
    lastTimestamp: '2025-02-20T10:30:00',
    unreadCount: 2,
    messages: [
      {
        id: 'm1',
        sender: 'client',
        senderName: 'Sarah Chen',
        body: 'Hi, we wanted to follow up on our quarterly review. Could you share the rebalancing recommendations you mentioned?',
        timestamp: '2025-02-19T14:00:00',
      },
      {
        id: 'm2',
        sender: 'advisor',
        senderName: 'Advisor',
        body: 'Of course. I\'ve attached a summary of the rebalancing opportunities. The main areas are your large-cap equity overweight and the bond duration extension we discussed.',
        timestamp: '2025-02-19T15:30:00',
      },
      {
        id: 'm3',
        sender: 'client',
        senderName: 'Michael Chen',
        body: 'Thank you for the detailed breakdown. We\'d like to schedule a call to discuss the rebalancing options.',
        timestamp: '2025-02-20T10:30:00',
      },
    ],
  },
  {
    id: '2',
    clientName: 'Robert & Lisa Johnson',
    subject: 'Rollover from Previous Employer 403(b)',
    lastPreview: 'We received the rollover paperwork. Should we complete sections 1–3 before our meeting?',
    lastTimestamp: '2025-02-19T16:45:00',
    unreadCount: 1,
    messages: [
      {
        id: 'm4',
        sender: 'advisor',
        senderName: 'Advisor',
        body: 'I\'ve sent the rollover initiation forms. Please complete sections 1–3 and we\'ll review them during our call.',
        timestamp: '2025-02-18T11:00:00',
      },
      {
        id: 'm5',
        sender: 'client',
        senderName: 'Lisa Johnson',
        body: 'We received the rollover paperwork. Should we complete sections 1–3 before our meeting?',
        timestamp: '2025-02-19T16:45:00',
      },
    ],
  },
  {
    id: '3',
    clientName: 'James Wilson',
    subject: 'Tax-Loss Harvesting Opportunities',
    lastPreview: 'Sounds good. I\'ll review the report and get back to you.',
    lastTimestamp: '2025-02-18T09:15:00',
    unreadCount: 0,
    messages: [
      {
        id: 'm6',
        sender: 'advisor',
        senderName: 'Advisor',
        body: 'I\'ve identified $12,400 in harvestable losses. The report is in your portal.',
        timestamp: '2025-02-17T14:00:00',
      },
      {
        id: 'm7',
        sender: 'client',
        senderName: 'James Wilson',
        body: 'Sounds good. I\'ll review the report and get back to you.',
        timestamp: '2025-02-18T09:15:00',
      },
    ],
  },
  {
    id: '4',
    clientName: 'Patricia Davis',
    subject: 'Beneficiary Update Request',
    lastPreview: 'All set. Thank you for your help.',
    lastTimestamp: '2025-02-15T11:00:00',
    unreadCount: 0,
    resolved: true,
    messages: [
      {
        id: 'm8',
        sender: 'client',
        senderName: 'Patricia Davis',
        body: 'I need to update my beneficiaries after my divorce. What forms do I need?',
        timestamp: '2025-02-14T10:00:00',
      },
      {
        id: 'm9',
        sender: 'advisor',
        senderName: 'Advisor',
        body: 'I\'ll send the beneficiary designation form. You\'ll need to have it notarized.',
        timestamp: '2025-02-14T14:30:00',
      },
      {
        id: 'm10',
        sender: 'client',
        senderName: 'Patricia Davis',
        body: 'All set. Thank you for your help.',
        timestamp: '2025-02-15T11:00:00',
      },
    ],
  },
  {
    id: '5',
    clientName: 'David & Maria Garcia',
    subject: 'New Account Opening - TSP Rollover',
    lastPreview: 'We\'re ready to proceed. When can we schedule the transfer?',
    lastTimestamp: '2025-02-17T13:20:00',
    unreadCount: 0,
    messages: [
      {
        id: 'm11',
        sender: 'client',
        senderName: 'David Garcia',
        body: 'We\'re ready to proceed. When can we schedule the transfer?',
        timestamp: '2025-02-17T13:20:00',
      },
    ],
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trim() + '…';
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function Messages() {
  const [threads, setThreads] = useState<Thread[]>(() =>
    MOCK_THREADS.map((t) => ({ ...t, messages: [...t.messages] }))
  );
  const [activeThreadId, setActiveThreadId] = useState<string | null>('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageText, setNewMessageText] = useState('');

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const filteredThreads = searchQuery.trim()
    ? threads.filter(
        (t) =>
          t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : threads;

  const handleSend = () => {
    const text = newMessageText.trim();
    if (!text || !activeThreadId) return;

    const newMsg: Message = {
      id: `m-${Date.now()}`,
      sender: 'advisor',
      senderName: 'Advisor',
      body: text,
      timestamp: new Date().toISOString(),
    };

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeThreadId) return t;
        const updated = {
          ...t,
          messages: [...t.messages, newMsg],
          lastPreview: truncate(text, 60),
          lastTimestamp: newMsg.timestamp,
        };
        return updated;
      })
    );
    setNewMessageText('');
  };

  const handleThreadSelect = (id: string) => {
    setActiveThreadId(id);
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, unreadCount: 0 } : t
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-slate-600" />
        <h1 className="text-xl font-semibold text-slate-900">Messages</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex min-h-[560px]">
          {/* Left Panel - Thread List */}
          <div className="w-1/3 flex flex-col border-r border-slate-200">
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No threads match your search.
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => handleThreadSelect(thread.id)}
                    className={`w-full text-left p-3 border-b border-slate-100 transition-colors ${
                      activeThreadId === thread.id
                        ? 'bg-blue-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">
                            {thread.clientName}
                          </span>
                          {thread.unreadCount > 0 && (
                            <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-xs font-medium">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600 truncate mt-0.5">
                          {thread.subject}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-1">
                          {truncate(thread.lastPreview, 50)}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(thread.lastTimestamp)}
                      </div>
                    </div>
                    {thread.resolved && (
                      <span className="inline-block mt-2 text-xs text-slate-400">
                        Resolved
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Message Detail */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeThread ? (
              <>
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-slate-500" />
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        {activeThread.clientName}
                      </h2>
                      <p className="text-sm text-slate-600">
                        {activeThread.subject}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeThread.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === 'advisor' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                          msg.sender === 'advisor'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <div className="text-xs font-medium opacity-90 mb-1">
                          {msg.senderName}
                        </div>
                        <div className="text-sm">{msg.body}</div>
                        <div
                          className={`text-xs mt-1.5 ${
                            msg.sender === 'advisor'
                              ? 'text-blue-100'
                              : 'text-slate-500'
                          }`}
                        >
                          {formatTimestamp(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-slate-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!newMessageText.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Select a thread to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
