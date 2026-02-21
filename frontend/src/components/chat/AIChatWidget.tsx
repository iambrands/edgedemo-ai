import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, Minimize2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  'Portfolio summary',
  'Compliance alerts',
  'Tax-loss opportunities',
  'Fee comparison',
];

interface AIChatWidgetProps {
  variant?: 'ria' | 'client';
}

export default function AIChatWidget({ variant = 'ria' }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.response || 'I can help you with that. Try asking about portfolio analysis, compliance, or tax optimization.',
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: variant === 'ria'
            ? 'I can analyze portfolios, check compliance, and generate reports. What would you like to know?'
            : 'I can answer questions about your accounts, performance, and financial plan. What would you like to know?',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-emerald-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group"
        title="AI Assistant"
      >
        <MessageSquare size={24} className="group-hover:hidden" />
        <Sparkles size={24} className="hidden group-hover:block" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
            {messages.filter((m) => m.role === 'assistant').length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">AI Assistant</p>
            <p className="text-blue-200 text-xs">
              {variant === 'ria' ? 'Edge Platform' : 'Ask me anything'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 transition-colors"
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={() => { setIsOpen(false); setMessages([]); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <Bot size={24} className="text-blue-600" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">
              {variant === 'ria' ? 'How can I help your practice?' : 'How can I help you today?'}
            </p>
            <p className="text-xs text-slate-500 mb-4">
              {variant === 'ria'
                ? 'Ask about portfolios, compliance, reports, or tax strategies.'
                : 'Ask about your accounts, performance, or financial plan.'}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {(variant === 'ria' ? QUICK_PROMPTS : ['My balance', 'Performance', 'Tax docs', 'Schedule meeting']).map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={14} className="text-slate-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl rounded-bl-sm px-3 py-2">
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-200 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={variant === 'ria' ? 'Ask about any client or analysis...' : 'Ask a question...'}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
