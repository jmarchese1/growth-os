'use client';

import { useState, useEffect, useCallback } from 'react';
import KpiCard from '../../../components/ui/kpi-card';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface ChatbotStatus {
  businessId: string;
  businessName: string;
  isEnabled: boolean;
  settings: {
    chatbotPersona: string | null;
    welcomeMessage: string | null;
    primaryColor: string | null;
    hours: Record<string, string> | null;
    cuisine: string | null;
  };
}

interface ChatbotStats {
  totalSessions: number;
  leadsCapture: number;
  appointmentsMade: number;
  totalMessages: number;
  channelBreakdown: Record<string, number>;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  sessionKey: string;
  channel: string;
  messages: ChatMessage[];
  leadCaptured: boolean;
  appointmentMade: boolean;
  createdAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  } | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const CHANNEL_COLORS: Record<string, string> = {
  WEB: 'bg-violet-100 text-violet-700',
  INSTAGRAM: 'bg-rose-100 text-rose-700',
  FACEBOOK: 'bg-sky-100 text-sky-700',
};

/* ── Deploy Hero ───────────────────────────────────────────────── */
function DeployHero({ businessId, onEnabled }: { businessId: string; onEnabled: () => void }) {
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('');

  async function handleEnable() {
    setDeploying(true);
    setError('');
    setStep('Enabling chatbot...');

    try {
      const res = await fetch(`${API_URL}/chatbot/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Deployment failed');
        setDeploying(false);
        return;
      }

      setStep('Chatbot deployed!');
      setTimeout(onEnabled, 1200);
    } catch {
      setError('Network error — please try again');
      setDeploying(false);
    }
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chat Widget</h1>
        <p className="text-sm text-slate-500 mt-1">AI chatbot — captures leads, answers questions, books appointments</p>
      </div>

      {/* Hero CTA */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-10 text-center mb-8 shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </div>
        <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-3">AI Chat Widget</p>
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Turn website visitors into customers</h2>
        <p className="text-violet-200 text-base max-w-lg mx-auto mb-8 leading-relaxed">
          Deploy an AI chatbot that answers questions about your menu, hours, parking, and more — and automatically captures lead information when visitors are interested.
        </p>

        {!deploying ? (
          <div className="max-w-sm mx-auto space-y-3">
            <button
              onClick={handleEnable}
              className="px-8 py-3 bg-white text-violet-700 font-semibold rounded-xl text-sm hover:bg-violet-50 transition-colors shadow-sm"
            >
              Deploy Chat Widget
            </button>
            {error && (
              <p className="text-sm text-rose-200 bg-rose-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-violet-100 text-sm font-medium">{step}</p>
          </div>
        )}
      </div>

      {/* What you get */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { title: 'Lead Capture', desc: 'Automatically asks for name, phone, and email when visitors show interest — leads flow to your CRM' },
          { title: 'Business Q&A', desc: 'Answers questions about your menu, hours, parking, outdoor seating, prices, and more' },
          { title: 'Appointment Booking', desc: 'Takes reservation details — party size, date, preferred time — and creates bookings' },
        ].map(({ title, desc }) => (
          <div key={title} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-1.5">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Deploy', desc: 'Click "Deploy Chat Widget" and we activate your AI chatbot' },
            { step: '2', title: 'Configure', desc: 'Set your chatbot personality, welcome message, and business details' },
            { step: '3', title: 'Embed', desc: 'Copy the widget code into your website — or we auto-embed it on your Embedo site' },
            { step: '4', title: 'Capture', desc: 'Visitors chat with your bot, leads are captured and sent to your dashboard' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-sm font-bold flex items-center justify-center mx-auto mb-2">{step}</div>
              <h4 className="text-sm font-semibold text-slate-800 mb-1">{title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Settings Panel ────────────────────────────────────────────── */
function SettingsPanel({ businessId, settings, onSaved }: {
  businessId: string;
  settings: ChatbotStatus['settings'];
  onSaved: () => void;
}) {
  const [persona, setPersona] = useState(settings.chatbotPersona ?? '');
  const [welcomeMsg, setWelcomeMsg] = useState(settings.welcomeMessage ?? '');
  const [color, setColor] = useState(settings.primaryColor ?? '#a855f7');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`${API_URL}/chatbot/settings/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotPersona: persona || undefined,
          welcomeMessage: welcomeMsg || undefined,
          primaryColor: color || undefined,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Chatbot Settings</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Personality / Persona</label>
          <input
            type="text"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="friendly, warm, and professional"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Welcome Message</label>
          <input
            type="text"
            value={welcomeMsg}
            onChange={(e) => setWelcomeMsg(e.target.value)}
            placeholder="Hi! How can I help you today?"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Widget Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-xs text-emerald-600 font-medium">Settings saved</span>}
      </div>
    </div>
  );
}

/* ── Widget Snippet Panel ──────────────────────────────────────── */
function WidgetSnippetPanel({ businessId }: { businessId: string }) {
  const [snippet, setSnippet] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSnippet() {
      try {
        const res = await fetch(`${API_URL}/chatbot/widget/snippet/${businessId}`);
        if (res.ok) setSnippet(await res.text());
      } catch {
        // Service may be unavailable
      } finally {
        setLoading(false);
      }
    }
    fetchSnippet();
  }, [businessId]);

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Widget Embed Code</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Paste this snippet before the closing &lt;/body&gt; tag on your website
          </p>
        </div>
        <button
          onClick={handleCopy}
          disabled={!snippet}
          className="px-4 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : snippet ? (
        <pre className="bg-slate-900 text-slate-300 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
          {snippet}
        </pre>
      ) : (
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <p className="text-xs text-slate-400">Widget snippet will be available once the chatbot service is running</p>
        </div>
      )}
    </div>
  );
}

/* ── Conversation Modal ────────────────────────────────────────── */
function ConversationModal({ session, onClose }: { session: ChatSession; onClose: () => void }) {
  const messages = (session.messages ?? []) as ChatMessage[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Conversation</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatDate(session.createdAt)}
              {' · '}
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${CHANNEL_COLORS[session.channel] ?? 'bg-slate-100 text-slate-500'}`}>
                {session.channel}
              </span>
              {session.contact && ` — ${session.contact.firstName} ${session.contact.lastName}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {/* Lead / Appointment badges */}
          {(session.leadCaptured || session.appointmentMade) && (
            <div className="mb-4 flex gap-2">
              {session.leadCaptured && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                  Lead Captured
                </span>
              )}
              {session.appointmentMade && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700">
                  Appointment Made
                </span>
              )}
            </div>
          )}

          {/* Contact info if captured */}
          {session.contact && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Contact Information</p>
              <div className="grid grid-cols-2 gap-1">
                <p className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Name:</span> {session.contact.firstName} {session.contact.lastName}
                </p>
                {session.contact.email && (
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Email:</span> {session.contact.email}
                  </p>
                )}
                {session.contact.phone && (
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Phone:</span> {session.contact.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 ? (
            <div className="space-y-2">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                      isUser
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No messages in this conversation</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Chatbot Dashboard ────────────────────────────────────── */
export default function ChatbotClient({ businessId }: { businessId: string }) {
  const [status, setStatus] = useState<ChatbotStatus | null>(null);
  const [stats, setStats] = useState<ChatbotStats | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, statsRes, sessionsRes] = await Promise.all([
        fetch(`${API_URL}/chatbot/status/${businessId}`),
        fetch(`${API_URL}/chatbot/stats/${businessId}`),
        fetch(`${API_URL}/chatbot/sessions/${businessId}`),
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.items);
        setTotalSessions(data.total);
      }
    } catch {
      // API may not be available in dev
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Show deploy hero if chatbot not enabled
  if (!status?.isEnabled) {
    return <DeployHero businessId={businessId} onEnabled={fetchAll} />;
  }

  const s = stats ?? { totalSessions: 0, leadsCapture: 0, appointmentsMade: 0, totalMessages: 0, channelBreakdown: {} };

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chat Widget</h1>
          <p className="text-sm text-slate-500 mt-1">AI chatbot — conversations, leads & analytics</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">Active</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Conversations" value={s.totalSessions} color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Leads Captured" value={s.leadsCapture} color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Appointments Made" value={s.appointmentsMade} color="amber"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Total Messages" value={s.totalMessages} color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" clipRule="evenodd" /></svg>} />
      </div>

      {/* Channel breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {[
          { channel: 'Web Widget', key: 'WEB', color: 'violet' },
          { channel: 'Instagram DMs', key: 'INSTAGRAM', color: 'rose' },
          { channel: 'Facebook Messenger', key: 'FACEBOOK', color: 'sky' },
        ].map(({ channel, key, color }) => (
          <div key={channel} className={`bg-${color}-50 border border-${color}-200/60 rounded-xl p-5`}>
            <p className="text-xs text-slate-500">{channel}</p>
            <p className={`text-xl font-bold text-${color}-600 mt-1`}>{s.channelBreakdown[key] ?? 0}</p>
            <p className="text-[10px] text-slate-400 mt-1">conversations</p>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="mb-8">
        <SettingsPanel businessId={businessId} settings={status.settings} onSaved={fetchAll} />
      </div>

      {/* Widget snippet */}
      <div className="mb-8">
        <WidgetSnippetPanel businessId={businessId} />
      </div>

      {/* Conversations table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Recent Conversations</h2>
          {totalSessions > 0 && <span className="text-xs text-slate-400">{totalSessions} total</span>}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Visitor</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Channel</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Messages</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                    No conversations yet. Your chatbot will log conversations here once visitors start chatting.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const msgCount = Array.isArray(session.messages) ? session.messages.length : 0;
                  return (
                    <tr key={session.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-slate-600">{formatDate(session.createdAt)}</td>
                      <td className="px-5 py-3 text-sm text-slate-800 font-medium">
                        {session.contact
                          ? `${session.contact.firstName} ${session.contact.lastName}`
                          : <span className="text-slate-400">Anonymous</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${CHANNEL_COLORS[session.channel] ?? 'bg-slate-100 text-slate-500'}`}>
                          {session.channel.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 tabular-nums">{msgCount}</td>
                      <td className="px-5 py-3">
                        {session.leadCaptured && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                            lead
                          </span>
                        )}
                        {session.appointmentMade && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700 ml-1">
                            booking
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversation modal */}
      {selectedSession && <ConversationModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  );
}
