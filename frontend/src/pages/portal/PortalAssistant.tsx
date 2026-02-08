import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Loader2 } from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import { getChatHistory, sendChatMessage } from '../../services/portalApi';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  followUps?: string[];
}

export default function PortalAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getChatHistory()
      .then((d) => {
        if (d.messages) setMessages(d.messages.map((m: any) => ({ ...m, followUps: undefined })));
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          content: "Hi! I'm your AI financial assistant. Ask me anything about your accounts, performance, goals, or taxes.",
          timestamp: new Date().toISOString(),
        }]);
      })
      .finally(() => setInitialLoad(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(msg);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.response || "I'm not sure how to help with that. Try asking about your balance, performance, goals, or taxes.",
        timestamp: new Date().toISOString(),
        followUps: res.suggested_follow_ups,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PortalNav />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PortalNav />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4">
        {/* Header */}
        <div className="py-4 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">AI Financial Assistant</h1>
            <p className="text-xs text-slate-500">Ask about your accounts, performance, goals & more</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-blue-600 to-teal-500'
                  : 'bg-slate-600'
              }`}>
                {msg.role === 'assistant' ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
                }`}>
                  {/* Render markdown-style bold */}
                  {msg.content.split(/(\*\*.*?\*\*)/).map((part, j) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={j} className={msg.role === 'user' ? 'text-white' : 'text-slate-900'}>{part.slice(2, -2)}</strong>
                      : <span key={j}>{part}</span>
                  )}
                </div>

                {/* Follow-up chips */}
                {msg.followUps && msg.followUps.length > 0 && i === messages.length - 1 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.followUps.map((f, j) => (
                      <button
                        key={j}
                        onClick={() => handleSend(f)}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all shadow-sm"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-slate-50 py-4 border-t border-slate-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your accounts, performance, goals..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
            AI responses are generated from your account data. For personalized advice, consult your advisor.
          </p>
        </div>
      </div>
    </div>
  );
}
