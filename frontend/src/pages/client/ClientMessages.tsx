import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Shield } from 'lucide-react';
import {
  b2cApi,
  type B2CAdvisorInfo,
  type B2CAdvisorMessage,
} from '../../services/b2cApi';

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ClientMessages() {
  const [advisor, setAdvisor] = useState<B2CAdvisorInfo | null>(null);
  const [messages, setMessages] = useState<B2CAdvisorMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    b2cApi
      .getAdvisorMessages()
      .then((res) => {
        setAdvisor(res.advisor);
        setMessages(res.messages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load messages'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError('');
    try {
      const sent = await b2cApi.sendAdvisorMessage(text);
      setMessages((prev) => [...prev, sent]);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Secure thread with {advisor?.name ?? 'your advisor'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[480px] max-h-[calc(100vh-220px)]">
        {/* Thread header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{advisor?.name}</p>
            <p className="text-xs text-slate-500">{advisor?.firm}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {messages.map((msg) => {
            const isClient = msg.sender === 'client';
            return (
              <div
                key={msg.id}
                className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isClient
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                  }`}
                >
                  {!isClient && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.body}</p>
                  <p
                    className={`text-[10px] mt-1 tabular-nums ${
                      isClient ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {fmtTimestamp(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message to your advisor…"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        Messages are encrypted in transit. Demo mode — responses are not live.
      </p>
    </div>
  );
}
