'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { EmbedoCubeMascot } from './embedo-cube-mascot';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface CubeyChatProps {
  /** Business ID to chat with. If not provided, uses Embedo's own support chatbot. */
  businessId?: string;
  /** API base URL */
  apiUrl?: string;
  /** Position of the chat bubble */
  position?: 'bottom-right' | 'bottom-left';
  /** Initial greeting from Cubey */
  welcomeMessage?: string;
  /** Context label shown in the header */
  headerTitle?: string;
  /** Whether to show in "support" mode (for Embedo platform help) or "demo" mode */
  mode?: 'support' | 'demo';
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export function CubeyChat({
  businessId,
  apiUrl = API_BASE,
  position = 'bottom-right',
  welcomeMessage = "Hey! I'm Cubey, your AI assistant. How can I help you today?",
  headerTitle = 'Cubey',
  mode = 'support',
}: CubeyChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [bubblePulse, setBubblePulse] = useState(true);
  const [bubbleMood, setBubbleMood] = useState<'happy' | 'excited' | 'waving'>('happy');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Cycle bubble mood every 6 seconds
  useEffect(() => {
    const moods: Array<'happy' | 'excited' | 'waving'> = ['happy', 'excited', 'waving', 'happy', 'waving', 'excited'];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % moods.length;
      setBubbleMood(moods[i]!);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setBubblePulse(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Add welcome message on first open
  const hasGreeted = useRef(false);
  useEffect(() => {
    if (open && !hasGreeted.current) {
      hasGreeted.current = true;
      setMessages([{
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [open, welcomeMessage]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`${apiUrl}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: businessId ?? 'embedo-platform',
          message: text,
          sessionKey,
          channel: 'WEB',
          ...(mode === 'support' ? { test: true } : {}),
          ...(!sessionKey ? {
            history: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
          } : {}),
        }),
      });

      if (!res.ok) throw new Error('Failed to send');

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
        content: "Oops! I'm having trouble connecting right now. Try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, apiUrl, businessId, sessionKey, mode, messages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }, [sendMessage]);

  const quickReplies = mode === 'support'
    ? ['How do I set up my phone agent?', 'How do I send an email campaign?', 'What\'s the Tool Library?']
    : ['What are your hours?', 'Can I make a reservation?', 'What\'s on the menu?'];

  if (!mounted) return null;

  const posClass = position === 'bottom-right' ? 'right-5' : 'left-5';

  return createPortal(
    <>
      {/* Chat Window */}
      {open && (
        <div
          className={`fixed bottom-[88px] ${posClass} z-[9998] w-[380px] max-w-[calc(100vw-2rem)] animate-fade-up`}
          style={{ maxHeight: 'calc(100vh - 140px)' }}
        >
          <div className="bg-[#0f0d1a] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '520px' }}>
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border-b border-white/[0.06] flex items-center gap-3">
              <EmbedoCubeMascot size={36} mood="happy" bounce={false} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{headerTitle}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-slate-400">Online</span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1">
                      <EmbedoCubeMascot size={24} mood="happy" bounce={false} />
                    </div>
                  )}
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white/[0.06] text-slate-200 rounded-bl-sm border border-white/[0.06]'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div className="flex items-center gap-2">
                  <EmbedoCubeMascot size={24} mood="thinking" bounce={false} />
                  <div className="bg-white/[0.06] border border-white/[0.06] px-4 py-2.5 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick replies — vertical, right-aligned like user messages */}
              {messages.length === 1 && messages[0]?.role === 'assistant' && !sending && (
                <div className="flex flex-col items-end gap-1.5 pt-1">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr}
                      onClick={() => {
                        setInput(qr);
                        setTimeout(() => {
                          void sendMessage();
                        }, 50);
                      }}
                      className="px-3.5 py-2 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-2xl rounded-br-sm hover:bg-violet-500/20 transition-colors text-right"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/20 transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-[9px] text-slate-700 mt-2">Powered by Embedo AI</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cubey Bubble */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-5 ${posClass} z-[9999] group`}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <div className="relative">
          {/* Pulse ring when not yet clicked */}
          {bubblePulse && !open && (
            <>
              <div className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute -inset-1 rounded-full bg-violet-500/15 animate-pulse" />
            </>
          )}

          {/* The bubble */}
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 shadow-xl shadow-violet-600/30 flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-violet-500/40 ${
            open ? 'rotate-0' : ''
          }`}>
            {open ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-white">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <EmbedoCubeMascot size={38} mood={bubbleMood} bounce={false} />
            )}
          </div>

          {/* Tooltip */}
          {!open && bubblePulse && (
            <div className={`absolute bottom-full mb-3 ${position === 'bottom-right' ? 'right-0' : 'left-0'} whitespace-nowrap bg-white text-slate-800 text-xs font-medium px-3 py-2 rounded-xl shadow-lg border border-slate-100 animate-fade-up`}>
              <span>Need help? Chat with Cubey!</span>
              <div className={`absolute top-full ${position === 'bottom-right' ? 'right-5' : 'left-5'} w-2 h-2 bg-white border-r border-b border-slate-100 transform rotate-45 -translate-y-1`} />
            </div>
          )}
        </div>
      </button>
    </>,
    document.body,
  );
}
