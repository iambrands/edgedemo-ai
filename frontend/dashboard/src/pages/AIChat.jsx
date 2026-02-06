import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendChatMessage } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import { Send } from 'lucide-react';

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I can help you analyze portfolios, generate IPS documents, check compliance, and answer investment questions. What would you like to do today?',
    },
  ]);
  const [input, setInput] = useState('');

  const chatMutation = useMutation({
    mutationFn: (query) => sendChatMessage(query),
    onSuccess: (data, query) => {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: data.message || 'No response.' },
      ]);
    },
    onError: (err) => {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `Error: ${err.message}. Please try again.` },
      ]);
    },
  });

  const send = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    chatMutation.mutate(text);
  };

  return (
    <PageContainer title="EdgeAI Assistant">
      <div className="bg-white rounded-lg border border-[var(--border)] flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  m.role === 'user' ? 'bg-primary text-white' : 'bg-[var(--bg-light)]'
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {m.role === 'user' ? 'You' : '🤖 EdgeAI'}
                </p>
                <p className="text-sm">{m.text}</p>
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="rounded-lg px-4 py-2 bg-[var(--bg-light)] flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-[var(--text-muted)]">Thinking...</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-2">
          <input
            type="text"
            placeholder="Ask EdgeAI anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            className="flex-1 border rounded-lg px-4 py-2"
          />
          <button
            onClick={send}
            disabled={chatMutation.isPending}
            className="p-2 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          {['Analyze Portfolio', 'Check Compliance', 'Build IPS'].map((a) => (
            <button
              key={a}
              onClick={() => {
                setInput(a);
              }}
              className="px-3 py-1 text-sm border rounded-full hover:bg-[var(--bg-light)]"
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
