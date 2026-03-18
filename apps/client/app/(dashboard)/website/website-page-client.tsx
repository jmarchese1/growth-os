'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import WebsiteBuilder from './website-builder';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface WebsiteRecord {
  id: string;
  deployUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  config: Record<string, unknown> | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

type View =
  | { mode: 'loading' }
  | { mode: 'list'; sites: WebsiteRecord[] }
  | { mode: 'builder' }
  | { mode: 'editor'; site: WebsiteRecord; html: string };

function siteName(site: WebsiteRecord): string {
  return String(site.config?.['businessName'] ?? 'Untitled Website');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── List view ────────────────────────────────────────────────────────────────
function WebsiteList({
  sites,
  onSelect,
  onBuildNew,
}: {
  sites: WebsiteRecord[];
  onSelect: (site: WebsiteRecord) => void;
  onBuildNew: () => void;
}) {
  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Websites</h1>
          <p className="text-sm text-slate-500 mt-1">All your AI-generated websites</p>
        </div>
        <button
          onClick={onBuildNew}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Build New Website
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-violet-600">
              <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">No websites yet</h2>
          <p className="text-sm text-slate-500 mb-6">Generate your first AI-powered website in under 2 minutes.</p>
          <button
            onClick={onBuildNew}
            className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            Build My Website
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">URL</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Created</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Last updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr
                  key={site.id}
                  onClick={() => onSelect(site)}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-800">{siteName(site)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{String(site.config?.['cuisine'] ?? site.config?.['colorScheme'] ?? 'restaurant')}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      site.status === 'LIVE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${site.status === 'LIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {site.status === 'LIVE' ? 'Live' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {site.deployUrl ? (
                      <a
                        href={site.deployUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-violet-600 hover:text-violet-800 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <span className="truncate max-w-[180px]">{site.deployUrl.replace(/^https?:\/\//, '')}</span>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">{formatDate(site.createdAt)}</td>
                  <td className="px-4 py-4 text-xs text-slate-500">{formatDate(site.updatedAt)}</td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-violet-600 font-medium">Edit →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Editor view ──────────────────────────────────────────────────────────────
function WebsiteEditor({
  site,
  initialHtml,
  onBack,
}: {
  site: WebsiteRecord;
  initialHtml: string;
  onBack: () => void;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [deployUrl, setDeployUrl] = useState(site.deployUrl ?? '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, editing]);

  async function handleSend() {
    const text = input.trim();
    if (!text || editing) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setEditing(true);

    try {
      const res = await fetch(`${API_URL}/websites/${site.id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json() as { success: boolean; html?: string; url?: string; error?: string };

      if (!data.success || !data.html) {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.error ?? 'Something went wrong — try rephrasing.' }]);
        return;
      }

      setHtml(data.html);
      if (data.url) setDeployUrl(data.url);
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Done! Preview updated. Want anything else changed?' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Network error — please try again.' }]);
    } finally {
      setEditing(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Websites
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-800">{siteName(site)}</span>

        <div className="flex items-center gap-2 ml-auto">
          {site.status === 'LIVE' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-emerald-700">Live</span>
            </div>
          )}
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors"
            >
              <span className="truncate max-w-[220px]">{deployUrl.replace(/^https?:\/\//, '')}</span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded px-3 py-1 text-[11px] text-slate-500 truncate">
              {deployUrl ? deployUrl.replace(/^https?:\/\//, '') : 'local preview'}
            </div>
          </div>
          <iframe
            srcDoc={html}
            title="Website Preview"
            className="flex-1 w-full border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>

        {/* Chat */}
        <div className="w-80 flex flex-col bg-white flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs font-semibold text-slate-700">AI Editor</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ask me to change anything on this site</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Try asking:</p>
                {[
                  'Change the hero heading to "Best Pizza in Brooklyn"',
                  'Switch to the warm color scheme',
                  'Update the phone number to (212) 555-0100',
                  'Change the CTA button to say "Reserve Now"',
                  'Add "Closed" for Sunday hours',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                  >
                    {s}
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
                <div className="bg-slate-100 rounded-xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                placeholder="What would you like to change?"
                rows={2}
                disabled={editing}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 resize-none disabled:opacity-50"
              />
              <button
                onClick={() => void handleSend()}
                disabled={editing || !input.trim()}
                className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors flex-shrink-0 self-end"
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

// ── Root component ───────────────────────────────────────────────────────────
export default function WebsitePageClient({ businessId }: { businessId: string }) {
  const [view, setView] = useState<View>({ mode: 'loading' });

  const loadList = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/businesses/${businessId}/websites`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const d = await res.json() as { success: boolean; websites?: WebsiteRecord[] };
      setView({ mode: 'list', sites: d.websites ?? [] });
    } catch (err) {
      console.error('[Website] Failed to load websites:', err);
      setView({ mode: 'list', sites: [] });
    }
  }, [businessId]);

  useEffect(() => { void loadList(); }, [loadList]);

  async function handleSelectSite(site: WebsiteRecord) {
    // Fetch preview HTML then open editor
    try {
      const res = await fetch(`${API_URL}/websites/preview/${site.id}`);
      const html = res.ok ? await res.text() : '';
      setView({ mode: 'editor', site, html });
    } catch {
      setView({ mode: 'editor', site, html: '' });
    }
  }

  function handleGenerated(result: { websiteId: string; html: string; url: string }) {
    // After wizard completes, go directly into the editor for the new site
    const newSite: WebsiteRecord = {
      id: result.websiteId,
      deployUrl: result.url || null,
      status: result.url ? 'LIVE' : 'GENERATING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: null,
    };
    setView({ mode: 'editor', site: newSite, html: result.html });
  }

  if (view.mode === 'loading') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (view.mode === 'builder') {
    return <WebsiteBuilder businessId={businessId} onGenerated={handleGenerated} />;
  }

  if (view.mode === 'editor') {
    return (
      <WebsiteEditor
        site={view.site}
        initialHtml={view.html}
        onBack={() => { void loadList(); }}
      />
    );
  }

  // list
  return (
    <WebsiteList
      sites={view.sites}
      onSelect={(site) => { void handleSelectSite(site); }}
      onBuildNew={() => setView({ mode: 'builder' })}
    />
  );
}
