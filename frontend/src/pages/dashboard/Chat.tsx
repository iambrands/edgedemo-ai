import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { chatApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  pipeline?: {
    iim: string;
    cim: string;
    bim: string;
    latency_ms: number;
  };
}

const QUICK_PROMPTS = [
  "Analyze Wilson Household fees",
  "Check concentration risk across all households",
  "What-if: trim NVDA to 15%?",
  "Generate quarterly compliance summary",
  "Compare Henderson vs Martinez risk profiles",
  "Tax-loss harvesting opportunities",
];

export function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(text);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        pipeline: response.pipeline,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const formatContent = (content: string) => {
    // Convert markdown-style formatting to HTML
    return content
      .split('\n')
      .map((line) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Headers
        if (line.startsWith('### ')) return `<h4 class="font-semibold text-gray-900 mt-3 mb-1">${line.slice(4)}</h4>`;
        if (line.startsWith('## ')) return `<h3 class="font-semibold text-gray-900 text-lg mt-4 mb-2">${line.slice(3)}</h3>`;
        // List items
        if (line.startsWith('- ')) return `<li class="ml-4">${line.slice(2)}</li>`;
        if (line.startsWith('• ')) return `<li class="ml-4">${line.slice(2)}</li>`;
        if (line.match(/^\d+\. /)) return `<li class="ml-4">${line.replace(/^\d+\. /, '')}</li>`;
        // Empty lines
        if (!line.trim()) return '<br/>';
        // Regular paragraphs
        return `<p>${line}</p>`;
      })
      .join('');
  };

  const getPipelineIcon = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'completed' || normalizedStatus === 'validated' || normalizedStatus === 'pass' || normalizedStatus === 'formatted') {
      return <CheckCircle size={12} className="text-green-500" />;
    } else if (normalizedStatus === 'fail' || normalizedStatus === 'error') {
      return <AlertTriangle size={12} className="text-red-500" />;
    } else {
      return <CheckCircle size={12} className="text-green-500" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">EdgeAI Assistant</h2>
            <p className="text-sm text-gray-500">Powered by IIM → CIM → BIM pipeline</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-blue-100 flex items-center justify-center mb-4">
              <Bot size={32} className="text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Hi {user?.firstName || 'there'}! How can I help today?
            </h3>
            <p className="text-gray-500 mb-6 max-w-md">
              I can analyze portfolios, check compliance, generate reports, or answer investment questions. 
              Every response runs through our AI pipeline for accuracy.
            </p>
            
            {/* Quick Prompts */}
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={18} className="text-white" />
                  </div>
                )}
                
                <div className={`max-w-[70%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <div 
                        className="prose prose-sm max-w-none [&_p]:mb-1 [&_li]:mb-0.5"
                        dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                      />
                    )}
                  </div>
                  
                  {/* Pipeline metadata for assistant messages */}
                  {message.role === 'assistant' && message.pipeline && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        {getPipelineIcon(message.pipeline.iim)}
                        IIM
                      </span>
                      <span className="flex items-center gap-1">
                        {getPipelineIcon(message.pipeline.cim)}
                        CIM
                      </span>
                      <span className="flex items-center gap-1">
                        {getPipelineIcon(message.pipeline.bim)}
                        BIM
                      </span>
                      <span className="text-gray-300">•</span>
                      <span>{message.pipeline.latency_ms}ms</span>
                    </div>
                  )}
                  
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Analyzing with IIM → CIM → BIM...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any household, account, or analysis..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
        
        {/* Quick prompts when chat has messages */}
        {messages.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {QUICK_PROMPTS.slice(0, 4).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleQuickPrompt(prompt)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-full whitespace-nowrap transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
