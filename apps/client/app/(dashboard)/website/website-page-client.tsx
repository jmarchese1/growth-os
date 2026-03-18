'use client';

import { useState, useEffect, useRef } from 'react';
import WebsiteBuilder from './website-builder';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

type View =
  | { mode: 'loading' }
  | { mode: 'no-site' }
  | { mode: 'builder' }
  | { mode: 'editor'; websiteId: string; html: string; deployUrl: string };

export default function WebsitePageClient({ businessId }: { businessId: string }) {
  const [view, setView] = useState<View>({ mode: 'loading' });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [deployUrl, setDeployUrl] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // On mount: check for existing deployed site
  useEffect(() => {
    async function load() {
      try {
        // Check if a GeneratedWebsite record exists
        const res = await fetch(`${API_URL}/businesses/${businessId}/website`);
        const d = await res.json() as { success: boolean; website?: { id: string; deployUrl: string | null; status: string } };

        if (!d.success || !d.website) {
          setView({ mode: 'no-site' });
          return;
        }

        // Fetch the live preview HTML from the preview endpoint
        const previewRes = await fetch(`${API_URL}/websites/preview/${d.website.id}`);
        if (!previewRes.ok) {
          setView({ mode: 'no-site' });
          return;
        }
        const html = await previewRes.text();
        setDeployUrl(d.website.deployUrl ?? '');
        setView({ mode: 'editor', websiteId: d.website.id, html, deployUrl: d.website.deployUrl ?? '' });
      } catch {
        setView({ mode: 'no-site' });
      }
    }
    void load();
  }, [businessId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, editing]);

  function handleGenerated(result: { websiteId: string; html: string; url: string }) {
    setDeployUrl(result.url);
    setView({ mode: 'editor', websiteId: result.websiteId, html: result.html, deployUrl: result.url });
  }

  async function handleSendMessage() {
    const text = input.trim();
    if (!text || editing || view.mode !== 'editor') return;

    const websiteId = view.websiteId;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setEditing(true);

    try {
      const res = await fetch(`${API_URL}/websites/${websiteId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json() as { success: boolean; html?: string; url?: string; error?: string };

      if (!data.success || !data.html) {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.error ?? 'Something went wrong. Try rephrasing.' }]);
        return;
      }

      const newUrl = data.url ?? deployUrl;
      setDeployUrl(newUrl);
      setView({ mode: 'editor', websiteId, html: data.html, deployUrl: newUrl });
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Done! The preview has been updated. Let me know if you want any other changes.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Network error — please try again.' }]);
    } finally {
      setEditing(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (view.mode === 'loading') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Builder wizard ─────────────────────────────────────────────────────────
  if (view.mode === 'builder') {
    return <WebsiteBuilder businessId={businessId} onGenerated={handleGenerated} />;
  }

  // ── No site yet ────────────────────────────────────────────────────────────
  if (view.mode === 'no-site') {
    return (
      <div className="p-8 animate-fade-up">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Website</h1>
          <p className="text-sm text-slate-500 mt-1">Your AI-generated business website, live on the web in minutes</p>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-10 text-center mb-8 shadow-lg">
          <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-3">AI Website Generator</p>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Your restaurant, beautifully online</h2>
          <p className="text-violet-200 text-base max-w-md mx-auto mb-8 leading-relaxed">
            Point us at your existing website (or start fresh), choose a style, and we&apos;ll generate a stunning Apple-style site and deploy it live — in under 2 minutes.
          </p>
          <button
            onClick={() => setView({ mode: 'builder' })}
            className="px-8 py-3.5 bg-white text-violet-700 font-semibold rounded-full text-sm hover:bg-violet-50 transition-colors shadow-sm"
          >
            Build My Website
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { title: 'Scrapes Your Current Site', desc: 'Paste your existing URL — we pull your hours, menu, photos, and contact info automatically' },
            { title: 'You Pick the Style', desc: 'Choose a color palette, font pairing, and upload your hero image. Full control over the look.' },
            { title: 'Live in Minutes', desc: 'One click deploys your site live with a shareable URL. Custom domain available anytime.' },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-1.5">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">What&apos;s included</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Hero Section', 'About & Story', 'Menu Highlights', 'Photo Gallery', 'Hours & Location', 'Reservations', 'Chat Widget', 'Mobile Ready'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                    <path d="M2 6l3 3 5-5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-xs text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Editor view: preview + AI chat ────────────────────────────────────────
  const liveUrl = deployUrl || view.deployUrl;

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-slate-800">Website</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-emerald-700">Live</span>
          </div>
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors"
            >
              <span className="truncate max-w-[260px]">{liveUrl.replace(/^https?:\/\//, '')}</span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          )}
        </div>
        <button
          onClick={() => setView({ mode: 'builder' })}
          className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Rebuild from scratch
        </button>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Preview iframe */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
          {/* Browser chrome */}
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded px-3 py-1 text-[11px] text-slate-500 truncate">
              {liveUrl ? liveUrl.replace(/^https?:\/\//, '') : 'preview'}
            </div>
          </div>
          <iframe
            srcDoc={view.html}
            title="Website Preview"
            className="flex-1 w-full border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>

        {/* Chat panel */}
        <div className="w-80 flex flex-col bg-white flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs font-semibold text-slate-700">AI Editor</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ask me to change anything on your site</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Try asking:</p>
                {[
                  'Change the hero text to "Authentic Pizza Since 1987"',
                  'Switch the color scheme to warm',
                  'Update the phone number to (555) 123-4567',
                  'Change Monday hours to 12pm – 11pm',
                  'Make the CTA button say "Book a Table"',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {editing && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendMessage(); } }}
                placeholder="What would you like to change?"
                rows={2}
                disabled={editing}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 resize-none disabled:opacity-50"
              />
              <button
                onClick={() => void handleSendMessage()}
                disabled={editing || !input.trim()}
                className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}
