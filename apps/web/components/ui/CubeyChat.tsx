'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

/**
 * CubeyChat for the Embedo landing page.
 * Light + dark themed, self-contained with inline SVG mascot.
 */
export default function CubeyChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [bubblePulse, setBubblePulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setBubblePulse(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const hasGreeted = useRef(false);
  useEffect(() => {
    if (open && !hasGreeted.current) {
      hasGreeted.current = true;
      setMessages([{
        role: 'assistant',
        content: "Hey! I'm Cubey, Embedo's AI assistant. Ask me anything about how Embedo can help your business grow!",
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'embedo-platform',
          message: text,
          sessionKey,
          channel: 'WEB',
          test: true,
          ...(!sessionKey ? {
            history: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
          } : {}),
        }),
      });

      if (!res.ok) throw new Error('Failed');

      const data = await res.json();
      if (data.sessionKey) setSessionKey(data.sessionKey);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply ?? "Sorry, I couldn't process that. Try again!",
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops! I'm having trouble connecting. Try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionKey, messages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }, [sendMessage]);

  const quickReplies = ['What can Embedo do?', 'How does pricing work?', 'Show me a demo'];

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[9998] w-[380px] max-w-[calc(100vw-2rem)]" style={{ maxHeight: 'calc(100vh - 140px)', animation: 'cubey-slide-up 0.25s ease-out' }}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: '520px' }}>
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center gap-3">
              <CubeyMini />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Cubey</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span className="text-[10px] text-white/70">Online</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/80">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                  {msg.role === 'assistant' && <CubeyMini />}
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-700 rounded-bl-sm border border-slate-200 shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex items-center gap-2">
                  <CubeyMini />
                  <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {messages.length === 1 && messages[0]?.role === 'assistant' && !sending && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr}
                      onClick={() => { setInput(qr); setTimeout(() => void sendMessage(), 50); }}
                      className="px-3 py-1.5 text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded-full hover:bg-violet-100 transition-colors"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-[9px] text-slate-400 mt-2">Powered by Embedo AI</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cubey Bubble */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-[9999] group"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <div className="relative">
          {bubblePulse && !open && (
            <>
              <div className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute -inset-1 rounded-full bg-violet-500/15 animate-pulse" />
            </>
          )}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 shadow-xl shadow-violet-600/25 flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-violet-500/40">
            {open ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-white">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <CubeyBubbleIcon />
            )}
          </div>
          {!open && bubblePulse && (
            <div className="absolute bottom-full mb-3 right-0 whitespace-nowrap bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg" style={{ animation: 'cubey-slide-up 0.3s ease-out' }}>
              <span>Chat with Cubey!</span>
              <div className="absolute top-full right-5 w-2 h-2 bg-slate-900 transform rotate-45 -translate-y-1" />
            </div>
          )}
        </div>
      </button>

      {/* Animations */}
      <style jsx global>{`
        @keyframes cubey-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>,
    document.body,
  );
}

/** Mini Cubey face for chat messages — inline SVG, no external deps */
function CubeyMini() {
  return (
    <div className="w-7 h-7 flex-shrink-0 relative">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <polygon points="16,4 28,10 16,16 4,10" fill="#8B5CF6" />
        <polygon points="16,4 28,10 16,16 4,10" fill="white" opacity="0.08" />
        <polygon points="4,10 16,16 16,28 4,22" fill="#4C1D95" />
        <polygon points="28,10 16,16 16,28 28,22" fill="#6D28D9" />
        {/* Eyes */}
        <ellipse cx="12" cy="9.5" rx="2" ry="2.2" fill="white" />
        <ellipse cx="12.5" cy="9.8" rx="1.1" ry="1.2" fill="#1e1b4b" />
        <ellipse cx="20" cy="9.5" rx="2" ry="2.2" fill="white" />
        <ellipse cx="20.5" cy="9.8" rx="1.1" ry="1.2" fill="#1e1b4b" />
        {/* Mouth */}
        <path d="M14 12.5 Q16 14.5 18 12.5" stroke="#1e1b4b" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        {/* Blush */}
        <ellipse cx="10" cy="12" rx="1.5" ry="0.8" fill="#EC4899" opacity="0.2" />
        <ellipse cx="22" cy="12" rx="1.5" ry="0.8" fill="#EC4899" opacity="0.2" />
      </svg>
    </div>
  );
}

/** Cubey icon for the floating bubble */
function CubeyBubbleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <polygon points="16,5 27,10.5 16,16 5,10.5" fill="white" opacity="0.9" />
      <polygon points="5,10.5 16,16 16,27 5,21.5" fill="white" opacity="0.6" />
      <polygon points="27,10.5 16,16 16,27 27,21.5" fill="white" opacity="0.75" />
      {/* Eyes */}
      <ellipse cx="12" cy="9.8" rx="1.5" ry="1.8" fill="white" />
      <ellipse cx="12.3" cy="10" rx="0.9" ry="1" fill="#4C1D95" />
      <ellipse cx="20" cy="9.8" rx="1.5" ry="1.8" fill="white" />
      <ellipse cx="20.3" cy="10" rx="0.9" ry="1" fill="#4C1D95" />
      {/* Smile */}
      <path d="M13.5 12.5 Q16 14.5 18.5 12.5" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}
