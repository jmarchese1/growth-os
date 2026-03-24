'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import KpiCard from '../../../components/ui/kpi-card';
import { CapabilitiesPanel } from '../../../components/ui/capabilities-panel';

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
    chatbotSystemPrompt?: string | null;
    chatbotKnowledgeBase?: string | null;
    chatbotBubbleSize?: number | null;
    chatbotBorderRadius?: number | null;
    chatbotFontFamily?: string | null;
    chatbotPosition?: string | null;
    chatbotWindowWidth?: number | null;
    chatbotWindowHeight?: number | null;
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
  WEB: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  INSTAGRAM: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  FACEBOOK: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'appearance', label: 'Appearance', icon: 'M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z' },
  { id: 'options', label: 'Options', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z' },
  { id: 'prompt', label: 'System Prompt', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z' },
  { id: 'knowledge', label: 'Knowledge Base', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { id: 'capabilities', label: 'Capabilities', icon: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085' },
  { id: 'test', label: 'Test Chat', icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155' },
];

const FONT_OPTIONS = [
  { label: 'System Default', value: '-apple-system, BlinkMacSystemFont, sans-serif', gf: '' },
  { label: 'Inter', value: "'Inter', sans-serif", gf: 'Inter:wght@400;500;600' },
  { label: 'Poppins', value: "'Poppins', sans-serif", gf: 'Poppins:wght@400;500;600' },
  { label: 'DM Sans', value: "'DM Sans', sans-serif", gf: 'DM+Sans:wght@400;500;600' },
  { label: 'Nunito', value: "'Nunito', sans-serif", gf: 'Nunito:wght@400;600;700' },
  { label: 'Roboto', value: "'Roboto', sans-serif", gf: 'Roboto:wght@400;500;700' },
  { label: 'Open Sans', value: "'Open Sans', sans-serif", gf: 'Open+Sans:wght@400;600;700' },
  { label: 'Lato', value: "'Lato', sans-serif", gf: 'Lato:wght@400;700' },
  { label: 'Montserrat', value: "'Montserrat', sans-serif", gf: 'Montserrat:wght@400;500;600' },
  { label: 'Playfair Display', value: "'Playfair Display', serif", gf: 'Playfair+Display:wght@400;600;700' },
  { label: 'Raleway', value: "'Raleway', sans-serif", gf: 'Raleway:wght@400;500;600' },
  { label: 'Source Sans 3', value: "'Source Sans 3', sans-serif", gf: 'Source+Sans+3:wght@400;600' },
  { label: 'Merriweather', value: "'Merriweather', serif", gf: 'Merriweather:wght@400;700' },
  { label: 'Quicksand', value: "'Quicksand', sans-serif", gf: 'Quicksand:wght@400;500;600' },
  { label: 'Josefin Sans', value: "'Josefin Sans', sans-serif", gf: 'Josefin+Sans:wght@400;500;600' },
  { label: 'Outfit', value: "'Outfit', sans-serif", gf: 'Outfit:wght@400;500;600' },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif", gf: 'Space+Grotesk:wght@400;500;600' },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif", gf: 'Plus+Jakarta+Sans:wght@400;500;600' },
  { label: 'Cabin', value: "'Cabin', sans-serif", gf: 'Cabin:wght@400;500;600' },
  { label: 'Work Sans', value: "'Work Sans', sans-serif", gf: 'Work+Sans:wght@400;500;600' },
];

const PROMPT_TEMPLATES = [
  { label: 'Restaurant', prompt: `You are a friendly AI assistant for {{businessName}}, a restaurant. You help customers with:\n- Menu questions (dishes, prices, ingredients, allergens)\n- Hours of operation\n- Reservations and party sizes\n- Location, parking, and directions\n- Special events, catering, and private dining\n- Dietary accommodations\n\nBe warm, helpful, and concise. If you don't know something specific, say so and offer to connect them with staff. Never make up menu items or prices.` },
  { label: 'Bakery / Cafe', prompt: `You are a helpful AI assistant for {{businessName}}, a bakery/cafe. You help customers with:\n- Menu items, flavors, and daily specials\n- Custom orders (cakes, catering, events)\n- Hours and pickup/delivery options\n- Allergen and dietary information\n- Loyalty programs and gift cards\n\nBe cheerful and warm. Suggest popular items when asked for recommendations.` },
  { label: 'Retail / Shop', prompt: `You are a helpful AI assistant for {{businessName}}. You help customers with:\n- Product availability and details\n- Store hours and location\n- Return and exchange policies\n- Shipping and delivery options\n- Gift recommendations\n\nBe professional and helpful. Guide customers toward what they're looking for.` },
  { label: 'Service Business', prompt: `You are a professional AI assistant for {{businessName}}. You help potential clients with:\n- Services offered and pricing\n- Booking appointments and consultations\n- Business hours and availability\n- Answering frequently asked questions\n- Collecting contact information for follow-up\n\nBe professional, knowledgeable, and solution-oriented.` },
];

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
      if (!res.ok) { setError(data.error ?? 'Deployment failed'); setDeploying(false); return; }
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Chat Widget</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">AI chatbot — captures leads, answers questions, books appointments</p>
      </div>
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-10 text-center mb-8 shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
        </div>
        <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-3">AI Chat Widget</p>
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Turn visitors into customers</h2>
        <p className="text-violet-200 text-base max-w-lg mx-auto mb-8 leading-relaxed">Deploy an AI chatbot that answers questions, captures leads, and books appointments — automatically.</p>
        {!deploying ? (
          <div className="max-w-sm mx-auto space-y-3">
            <button onClick={handleEnable} className="px-8 py-3 bg-white text-violet-700 font-semibold rounded-xl text-sm hover:bg-violet-50 transition-colors shadow-sm">Deploy Chat Widget</button>
            {error && <p className="text-sm text-rose-200 bg-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-violet-100 text-sm font-medium">{step}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Live Preview Widget ──────────────────────────────────────── */
function WidgetPreview({ color, secondaryColor, bubbleSize, borderRadius, fontFamily, welcomeMsg, businessName, windowWidth, windowHeight, subtitle, quickReplies }: {
  color: string; secondaryColor: string; bubbleSize: number; borderRadius: number; fontFamily: string; welcomeMsg: string; businessName: string; windowWidth: number; windowHeight: number; subtitle?: string; quickReplies?: string[];
}) {
  // Load Google Font for preview
  const fontOption = FONT_OPTIONS.find((f) => f.value === fontFamily);
  useEffect(() => {
    if (!fontOption?.gf) return;
    const id = `gf-${fontOption.gf.replace(/[^a-z]/gi, '')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontOption.gf}&display=swap`;
    document.head.appendChild(link);
  }, [fontOption]);

  const msgBr = Math.max(borderRadius * 0.75, 8);
  const inputBr = Math.max(borderRadius / 2, 6);

  return (
    <div className="relative bg-slate-100 dark:bg-white/[0.06] rounded-xl p-6 min-h-[400px] flex items-end justify-end">
      <p className="absolute top-3 left-4 text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Live Preview</p>
      {/* Chat window preview */}
      <div className="mr-2 mb-16 shadow-xl" style={{ width: Math.min(windowWidth, 320), height: Math.min(windowHeight, 380), background: '#fff', borderRadius, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily }}>
        <div style={{ background: color, padding: '14px 16px', color: '#fff', borderRadius: `${borderRadius}px ${borderRadius}px 0 0`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{businessName || 'Your Business'}</div>
            {subtitle && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <div style={{ width: 18, height: 18, cursor: 'pointer', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white"><path d="M1 1l10 10M11 1L1 11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
        </div>
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-end' }}>
          <div style={{ alignSelf: 'flex-start', background: secondaryColor || '#f0f0f0', color: '#333', padding: '6px 10px', borderRadius: msgBr, fontSize: 12, maxWidth: '80%' }}>
            {welcomeMsg || 'Hi! How can I help you today?'}
          </div>
          {quickReplies && quickReplies.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
              {quickReplies.filter(Boolean).slice(0, 4).map((qr, i) => (
                <div key={i} style={{ padding: '4px 10px', borderRadius: msgBr, fontSize: 11, border: `1px solid ${color}`, color: color, cursor: 'pointer', background: '#fff' }}>{qr}</div>
              ))}
            </div>
          )}
          <div style={{ alignSelf: 'flex-end', background: color, color: '#fff', padding: '6px 10px', borderRadius: msgBr, fontSize: 12 }}>
            What are your hours?
          </div>
          <div style={{ alignSelf: 'flex-start', background: secondaryColor || '#f0f0f0', color: '#333', padding: '6px 10px', borderRadius: msgBr, fontSize: 12, maxWidth: '80%' }}>
            We&apos;re open Mon-Sat 11am-10pm!
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: inputBr, padding: '6px 10px', fontSize: 11, color: '#999' }}>Type a message...</div>
          <div style={{ background: color, color: '#fff', border: 'none', borderRadius: inputBr, padding: '6px 12px', fontSize: 11, fontWeight: 600 }}>Send</div>
        </div>
      </div>
      {/* Bubble preview */}
      <div className="absolute bottom-6 right-6" style={{ width: bubbleSize, height: bubbleSize, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', cursor: 'pointer' }}>
        <svg width={bubbleSize * 0.43} height={bubbleSize * 0.43} fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      </div>
    </div>
  );
}

/* ── Appearance Tab ───────────────────────────────────────────── */
function AppearanceTab({ businessId, settings, businessName, onSaved }: {
  businessId: string; settings: ChatbotStatus['settings']; businessName: string; onSaved: () => void;
}) {
  const [color, setColor] = useState(settings.primaryColor ?? '#a855f7');
  const [secondaryColor, setSecondaryColor] = useState((settings as Record<string, unknown>)['chatbotSecondaryColor'] as string ?? '#f0f0f0');
  const [subtitle, setSubtitle] = useState((settings as Record<string, unknown>)['chatbotSubtitle'] as string ?? '');
  const [welcomeMsg, setWelcomeMsg] = useState(settings.welcomeMessage ?? 'Hi! How can I help you today?');
  const [bubbleSize, setBubbleSize] = useState(settings.chatbotBubbleSize ?? 56);
  const [borderRadius, setBorderRadius] = useState(settings.chatbotBorderRadius ?? 16);
  const [fontFamily, setFontFamily] = useState(settings.chatbotFontFamily ?? '-apple-system, BlinkMacSystemFont, sans-serif');
  const [position, setPosition] = useState(settings.chatbotPosition ?? 'bottom-right');
  const [windowWidth, setWindowWidth] = useState(settings.chatbotWindowWidth ?? 360);
  const [windowHeight, setWindowHeight] = useState(settings.chatbotWindowHeight ?? 500);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`${API_URL}/chatbot/settings/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: color,
          chatbotSecondaryColor: secondaryColor,
          chatbotSubtitle: subtitle,
          welcomeMessage: welcomeMsg,
          chatbotBubbleSize: bubbleSize,
          chatbotBorderRadius: borderRadius,
          chatbotFontFamily: fontFamily,
          chatbotPosition: position,
          chatbotWindowWidth: windowWidth,
          chatbotWindowHeight: windowHeight,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Colors & Branding</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Widget Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-10 rounded-lg border border-slate-200 dark:border-white/[0.08] cursor-pointer p-0.5" />
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-lg text-sm text-slate-800 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#000000', '#1e293b', '#dc2626', '#0ea5e9'].map((c) => (
                  <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110" style={{ background: c, borderColor: color === c ? '#333' : 'transparent' }} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Secondary Color <span className="text-slate-400 dark:text-slate-400">(bot messages background)</span></label>
              <div className="flex items-center gap-3">
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-12 h-10 rounded-lg border border-slate-200 dark:border-white/[0.08] cursor-pointer p-0.5" />
                <input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-lg text-sm text-slate-800 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['#f0f0f0', '#e8e0f7', '#dbeafe', '#d1fae5', '#fef3c7', '#ffe4e6', '#f1f5f9', '#fdf4ff', '#ecfdf5', '#fff7ed'].map((c) => (
                  <button key={c} onClick={() => setSecondaryColor(c)} className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110" style={{ background: c, borderColor: secondaryColor === c ? '#333' : 'transparent' }} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Welcome Message <span className="text-slate-400 dark:text-slate-400">(first chat bubble)</span></label>
              <input type="text" value={welcomeMsg} onChange={(e) => setWelcomeMsg(e.target.value)} placeholder="Hi! How can I help you today?" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Header Subtitle <span className="text-slate-400 dark:text-slate-400">(optional — below business name)</span></label>
              <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Typically replies in seconds" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {['Typically replies in seconds', 'Online now', 'Ask us anything', 'We usually reply instantly'].map((s) => (
                  <button key={s} onClick={() => setSubtitle(s)} className="px-2 py-0.5 text-[10px] rounded border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all">{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Font</label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Size & Position</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Bubble Size: {bubbleSize}px</label>
              <input type="range" min={40} max={80} value={bubbleSize} onChange={(e) => setBubbleSize(Number(e.target.value))} className="w-full accent-violet-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Border Radius: {borderRadius}px</label>
              <input type="range" min={0} max={24} value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} className="w-full accent-violet-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Window Width: {windowWidth}px</label>
                <input type="range" min={280} max={420} step={10} value={windowWidth} onChange={(e) => setWindowWidth(Number(e.target.value))} className="w-full accent-violet-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Window Height: {windowHeight}px</label>
                <input type="range" min={350} max={600} step={10} value={windowHeight} onChange={(e) => setWindowHeight(Number(e.target.value))} className="w-full accent-violet-600" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Position</label>
              <div className="grid grid-cols-2 gap-2">
                {['bottom-right', 'bottom-left'].map((p) => (
                  <button key={p} onClick={() => setPosition(p)} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${position === p ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-300 dark:border-violet-500/30 text-violet-700 dark:text-violet-400' : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
                    {p === 'bottom-right' ? 'Bottom Right' : 'Bottom Left'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Appearance'}
          </button>
          {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Saved</span>}
        </div>
      </div>

      {/* Live Preview */}
      <div className="lg:sticky lg:top-4">
        <WidgetPreview color={color} secondaryColor={secondaryColor} bubbleSize={bubbleSize} borderRadius={borderRadius} fontFamily={fontFamily} welcomeMsg={welcomeMsg} businessName={businessName} windowWidth={windowWidth} windowHeight={windowHeight} subtitle={subtitle} />
      </div>
    </div>
  );
}

/* ── System Prompt Tab ────────────────────────────────────────── */
function generatePromptFromTraits(traits: { tone: number; length: number; energy: number; expertise: number }, name: string): string {
  const tone = traits.tone > 65 ? 'casual, friendly, and conversational' : traits.tone < 35 ? 'professional and formal' : 'warm and approachable';
  const length = traits.length > 65 ? 'Give detailed, thorough answers with examples' : traits.length < 35 ? 'Keep responses very brief — 1-2 sentences max' : 'Keep responses concise but helpful — 2-3 sentences';
  const energy = traits.energy > 65 ? 'Be enthusiastic and upbeat' : traits.energy < 35 ? 'Be calm and measured' : 'Be naturally engaged';
  const expertise = traits.expertise > 65 ? 'Show deep expertise — share specific details, insider knowledge, and recommendations' : traits.expertise < 35 ? 'Keep things simple and easy to understand — avoid jargon' : 'Be knowledgeable but accessible';
  return `You are the AI assistant for ${name}. Your tone is ${tone}. ${length}. ${energy}. ${expertise}.\n\nHelp customers with questions about the menu, hours, reservations, location, and anything else about the business. When visitors share their name, email, or phone, use the capture_lead tool. Help book reservations when asked.`;
}

function SystemPromptTab({ businessId, settings, businessName, onSaved }: {
  businessId: string; settings: ChatbotStatus['settings']; businessName: string; onSaved: () => void;
}) {
  const stg = settings as Record<string, unknown>;
  const savedTraits = (stg['chatbotPersonalityTraits'] as { tone: number; length: number; energy: number; expertise: number }) ?? null;
  const [mode, setMode] = useState<'wizard' | 'advanced'>(savedTraits ? 'wizard' : (settings.chatbotSystemPrompt ? 'advanced' : 'wizard'));
  const [traits, setTraits] = useState(savedTraits ?? { tone: 65, length: 50, energy: 60, expertise: 50 });
  const [prompt, setPrompt] = useState(settings.chatbotSystemPrompt ?? generatePromptFromTraits(savedTraits ?? traits, businessName));
  const [persona, setPersona] = useState(settings.chatbotPersona ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateTrait(key: keyof typeof traits, value: number) {
    const next = { ...traits, [key]: value };
    setTraits(next);
    setPrompt(generatePromptFromTraits(next, businessName));
    // Auto-generate persona from traits
    const toneWord = next.tone > 65 ? 'casual' : next.tone < 35 ? 'formal' : 'warm';
    const energyWord = next.energy > 65 ? 'enthusiastic' : next.energy < 35 ? 'calm' : 'friendly';
    setPersona(`${toneWord}, ${energyWord}, and helpful`);
  }

  function applyTemplate(template: string) {
    setPrompt(template.replace(/\{\{businessName\}\}/g, businessName));
    setMode('advanced');
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`${API_URL}/chatbot/settings/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotSystemPrompt: prompt,
          chatbotPersona: persona,
          ...(mode === 'wizard' ? { chatbotPersonalityTraits: traits } : {}),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally { setSaving(false); }
  }

  const sliders: Array<{ key: keyof typeof traits; label: string; left: string; right: string; leftEmoji: string; rightEmoji: string }> = [
    { key: 'tone', label: 'Tone', left: 'Formal', right: 'Casual', leftEmoji: '\uD83D\uDC54', rightEmoji: '\uD83E\uDD19' },
    { key: 'length', label: 'Response Length', left: 'Brief', right: 'Detailed', leftEmoji: '\u26A1', rightEmoji: '\uD83D\uDCDD' },
    { key: 'energy', label: 'Energy', left: 'Calm', right: 'Enthusiastic', leftEmoji: '\uD83E\uDDD8', rightEmoji: '\uD83C\uDF89' },
    { key: 'expertise', label: 'Expertise', left: 'Simple', right: 'Expert', leftEmoji: '\uD83D\uDC76', rightEmoji: '\uD83C\uDF93' },
  ];

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-slate-100 dark:bg-white/[0.06] rounded-xl p-1">
          <button onClick={() => setMode('wizard')} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${mode === 'wizard' ? 'bg-white dark:bg-white/[0.08] text-violet-700 dark:text-violet-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            Personality Wizard
          </button>
          <button onClick={() => setMode('advanced')} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${mode === 'advanced' ? 'bg-white dark:bg-white/[0.08] text-violet-700 dark:text-violet-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            Advanced Editor
          </button>
        </div>
      </div>

      {mode === 'wizard' ? (
        <div className="space-y-6">
          {/* Personality Sliders */}
          <div className="bg-gradient-to-br from-violet-50/50 to-indigo-50/50 dark:from-violet-500/5 dark:to-indigo-500/5 border border-violet-200/40 dark:border-violet-500/20 rounded-2xl p-6">
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-4 uppercase tracking-wider">Drag the sliders to shape your chatbot&apos;s personality</p>
            <div className="space-y-5">
              {sliders.map(({ key, label, left, right, leftEmoji, rightEmoji }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
                    <span className="text-xs text-slate-400 dark:text-slate-400">{traits[key]}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-24 text-right text-slate-500 dark:text-slate-400">{leftEmoji} {left}</span>
                    <input type="range" min={0} max={100} value={traits[key]} onChange={(e) => updateTrait(key, Number(e.target.value))} className="flex-1 accent-violet-600 h-2" />
                    <span className="text-sm w-24 text-slate-500 dark:text-slate-400">{right} {rightEmoji}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-generated prompt preview */}
          <div className="bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Generated System Prompt</p>
              <button onClick={() => setMode('advanced')} className="text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium">Edit manually</button>
            </div>
            <pre className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{prompt}</pre>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {mode === 'advanced' && savedTraits && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs text-amber-700 dark:text-amber-400">Manual edits will disconnect from the personality wizard sliders.</p>
              <button onClick={() => { setMode('wizard'); setPrompt(generatePromptFromTraits(traits, businessName)); }} className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium whitespace-nowrap ml-4">Back to wizard</button>
            </div>
          )}

          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {PROMPT_TEMPLATES.map((t) => (
                <button key={t.label} onClick={() => applyTemplate(t.prompt)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-300 dark:hover:border-violet-500/30 hover:text-violet-700 dark:hover:text-violet-400 transition-all">
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="You are a helpful AI assistant for our business..."
              rows={12}
              className="w-full px-4 py-3 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-xl text-sm text-slate-800 dark:text-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-y"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">{prompt.length} characters</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Personality / Persona</label>
            <input type="text" value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="friendly, warm, and professional" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Personality'}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Saved</span>}
      </div>
    </div>
  );
}

/* ── Knowledge Base Tab ───────────────────────────────────────── */
function KnowledgeBaseTab({ businessId, settings, onSaved }: {
  businessId: string; settings: ChatbotStatus['settings']; onSaved: () => void;
}) {
  const [kb, setKb] = useState(settings.chatbotKnowledgeBase ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`${API_URL}/chatbot/settings/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatbotKnowledgeBase: kb }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Knowledge Base</h3>
        <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">
          Paste your menu, FAQ, business details, parking info, policies — anything you want the chatbot to know. The AI will reference this when answering questions.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: 'Menu', placeholder: '## Menu\n\n### Appetizers\n- Bruschetta - $12\n- Calamari - $14\n\n### Entrees\n- Margherita Pizza - $18\n- Pasta Carbonara - $22' },
            { label: 'Hours', placeholder: '## Hours\n\nMonday-Thursday: 11am-9pm\nFriday-Saturday: 11am-11pm\nSunday: 12pm-8pm\n\nHappy Hour: Mon-Fri 4-6pm' },
            { label: 'FAQ', placeholder: '## FAQ\n\nQ: Do you take reservations?\nA: Yes! Call us or book online at...\n\nQ: Is there parking?\nA: Free parking lot behind the building, plus street parking\n\nQ: Do you offer catering?\nA: Yes, we cater events of all sizes.' },
            { label: 'Policies', placeholder: '## Policies\n\n- Large parties (8+): please call ahead\n- Cancellation: 24 hour notice required\n- Dietary: We can accommodate most allergies, please inform your server' },
          ].map((t) => (
            <button key={t.label} onClick={() => setKb((prev) => prev ? prev + '\n\n' + t.placeholder : t.placeholder)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-300 dark:hover:border-violet-500/30 hover:text-violet-700 dark:hover:text-violet-400 transition-all">
              + {t.label}
            </button>
          ))}
        </div>

        <textarea
          value={kb}
          onChange={(e) => setKb(e.target.value)}
          placeholder="Paste your menu, FAQ, hours, parking details, policies, and anything else your chatbot should know..."
          rows={16}
          className="w-full px-4 py-3 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-xl text-sm text-slate-800 dark:text-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 dark:focus:border-violet-500/40 resize-y"
        />
        <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">{kb.length} characters · ~{Math.ceil(kb.length / 4)} tokens</p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Knowledge Base'}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Saved</span>}
      </div>
    </div>
  );
}

/* ── Options Tab ──────────────────────────────────────────────── */
function OptionsTab({ businessId, settings, onSaved }: {
  businessId: string; settings: ChatbotStatus['settings']; onSaved: () => void;
}) {
  const s = settings as Record<string, unknown>;
  const [showCloseBtn, setShowCloseBtn] = useState((s['chatbotShowClose'] as boolean) ?? true);
  const [soundEnabled, setSoundEnabled] = useState((s['chatbotSoundEnabled'] as boolean) ?? false);
  const [autoOpenEnabled, setAutoOpenEnabled] = useState((s['chatbotAutoOpen'] as boolean) ?? false);
  const [autoOpenDelay, setAutoOpenDelay] = useState((s['chatbotAutoOpenDelay'] as number) ?? 5);
  const [quickRepliesEnabled, setQuickRepliesEnabled] = useState((s['chatbotQuickRepliesEnabled'] as boolean) ?? false);
  const [quickReplies, setQuickReplies] = useState<string[]>((s['chatbotQuickReplies'] as string[]) ?? ['View Menu', 'Make Reservation', 'Hours & Location']);
  const [poweredBy, setPoweredBy] = useState((s['chatbotPoweredBy'] as boolean) ?? true);
  const [newQuickReply, setNewQuickReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addQuickReply() {
    const text = newQuickReply.trim();
    if (!text || quickReplies.length >= 6) return;
    setQuickReplies([...quickReplies, text]);
    setNewQuickReply('');
  }

  function removeQuickReply(index: number) {
    setQuickReplies(quickReplies.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`${API_URL}/chatbot/settings/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotShowClose: showCloseBtn,
          chatbotSoundEnabled: soundEnabled,
          chatbotAutoOpen: autoOpenEnabled,
          chatbotAutoOpenDelay: autoOpenDelay,
          chatbotQuickRepliesEnabled: quickRepliesEnabled,
          chatbotQuickReplies: quickReplies,
          chatbotPoweredBy: poweredBy,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      {/* Toggle options */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Behavior</h3>
        <div className="space-y-5">
          {/* Close Button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Close Button (X)</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Show an X button in the header to close the chat window</p>
            </div>
            <button onClick={() => setShowCloseBtn(!showCloseBtn)} className={`relative w-11 h-6 rounded-full transition-colors ${showCloseBtn ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/[0.12]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showCloseBtn ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Sound Notification</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Play a subtle chime when the bot responds</p>
            </div>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/[0.12]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${soundEnabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Powered By */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Show &quot;Powered by Embedo&quot;</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Display branding footer in the chat window</p>
            </div>
            <button onClick={() => setPoweredBy(!poweredBy)} className={`relative w-11 h-6 rounded-full transition-colors ${poweredBy ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/[0.12]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${poweredBy ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Open */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Auto-Open Chat</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Automatically open the chat window after a delay — 3-5x more engagement</p>
          </div>
          <button onClick={() => setAutoOpenEnabled(!autoOpenEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${autoOpenEnabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/[0.12]'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoOpenEnabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
        {autoOpenEnabled && (
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Delay: {autoOpenDelay} seconds</label>
            <input type="range" min={1} max={30} value={autoOpenDelay} onChange={(e) => setAutoOpenDelay(Number(e.target.value))} className="w-full accent-violet-600" />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-400 mt-1">
              <span>1s (aggressive)</span>
              <span>5s (recommended)</span>
              <span>30s (subtle)</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Replies */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quick Reply Buttons</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Show clickable buttons below the welcome message — removes the &quot;what do I say?&quot; barrier</p>
          </div>
          <button onClick={() => setQuickRepliesEnabled(!quickRepliesEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${quickRepliesEnabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/[0.12]'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${quickRepliesEnabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
        {quickRepliesEnabled && (
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {quickReplies.map((qr, i) => (
                <div key={i} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/15 text-sm text-violet-700 dark:text-violet-400">
                  {qr}
                  <button onClick={() => removeQuickReply(i)} className="ml-1 text-violet-400 hover:text-violet-700 text-xs">x</button>
                </div>
              ))}
            </div>
            {quickReplies.length < 6 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newQuickReply}
                  onChange={(e) => setNewQuickReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuickReply(); } }}
                  placeholder="Add a quick reply..."
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <button onClick={addQuickReply} disabled={!newQuickReply.trim()} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors">Add</button>
              </div>
            )}
            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2">{quickReplies.length}/6 quick replies. Keep them short and action-oriented.</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['View Menu', 'Make Reservation', 'Hours & Location', 'Catering Info', 'Delivery Options', 'Special Events'].filter((s) => !quickReplies.includes(s)).slice(0, 3).map((s) => (
                <button key={s} onClick={() => { if (quickReplies.length < 6) setQuickReplies([...quickReplies, s]); }} className="px-2 py-0.5 text-[10px] rounded border border-slate-200 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-all">+ {s}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Options'}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Saved</span>}
      </div>

      {/* Embed Code */}
      <div className="mt-6">
        <EmbedSnippet businessId={businessId} />
      </div>
    </div>
  );
}

/* ── Test Chat Tab ────────────────────────────────────────────── */
function TestChatTab({ businessId }: { businessId: string }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg = { role: 'user' as const, content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setSending(true);
    try {
      const history = updated.map((m) => ({ ...m, timestamp: new Date().toISOString() }));
      const res = await fetch(`${API_URL}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, message: text, channel: 'WEB', test: true, history: history.slice(0, -1) }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Could not connect to chatbot.' }]);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => { msgsRef.current?.scrollTo(0, msgsRef.current.scrollHeight); }, [messages]);

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm">Test Your Chatbot</h3>
            <p className="text-violet-200 text-xs mt-0.5">Conversations here are not logged</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/20 text-amber-200">TEST MODE</span>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="px-2.5 py-1 text-[10px] font-medium text-violet-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors">Clear</button>
            )}
          </div>
        </div>
      </div>
      <div ref={msgsRef} className="h-96 overflow-y-auto p-4 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mx-auto mb-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-500"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400">Type a message to test your chatbot</p>
              <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">Try: &quot;What&apos;s on the menu?&quot; or &quot;I&apos;d like to book a table&quot;</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-br-md' : 'bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 rounded-bl-md shadow-sm'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Type a test message..." disabled={sending} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50" />
        <button onClick={handleSend} disabled={!input.trim() || sending} className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-500 disabled:opacity-50 transition-colors">Send</button>
      </div>
    </div>
  );
}

/* ── History Tab ──────────────────────────────────────────────── */
function HistoryTab({ sessions, totalSessions, onSelect }: {
  sessions: ChatSession[]; totalSessions: number; onSelect: (s: ChatSession) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Conversations</h2>
        {totalSessions > 0 && <span className="text-xs text-slate-400 dark:text-slate-400">{totalSessions} total</span>}
      </div>
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/[0.06]">
              {['Date', 'Visitor', 'Channel', 'Messages', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400 dark:text-slate-400">No conversations yet.</td></tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="border-b border-slate-50 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => onSelect(session)}>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(session.createdAt)}</td>
                  <td className="px-5 py-3 text-sm text-slate-800 dark:text-white font-medium">
                    {session.contact ? `${session.contact.firstName} ${session.contact.lastName}` : <span className="text-slate-400 dark:text-slate-400">Anonymous</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${CHANNEL_COLORS[session.channel] ?? 'bg-slate-100 text-slate-500'}`}>{session.channel.toLowerCase()}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300 tabular-nums">{Array.isArray(session.messages) ? session.messages.length : 0}</td>
                  <td className="px-5 py-3">
                    {session.leadCaptured && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">lead</span>}
                    {session.appointmentMade && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 ml-1">booking</span>}
                  </td>
                  <td className="px-5 py-3"><span className="text-xs text-violet-600 font-medium">View</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Conversation Modal ───────────────────────────────────────── */
function ConversationModal({ session, onClose }: { session: ChatSession; onClose: () => void }) {
  const messages = (session.messages ?? []) as ChatMessage[];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1730] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Conversation</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDate(session.createdAt)}{' · '}
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${CHANNEL_COLORS[session.channel] ?? 'bg-slate-100 text-slate-500'}`}>{session.channel}</span>
              {session.contact && ` — ${session.contact.firstName} ${session.contact.lastName}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-2">
          {(session.leadCaptured || session.appointmentMade) && (
            <div className="mb-4 flex gap-2">
              {session.leadCaptured && <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Lead Captured</span>}
              {session.appointmentMade && <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400">Appointment Made</span>}
            </div>
          )}
          {session.contact && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Contact</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{session.contact.firstName} {session.contact.lastName} {session.contact.email && `· ${session.contact.email}`} {session.contact.phone && `· ${session.contact.phone}`}</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200'}`}>{msg.content}</div>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-400 text-center py-8">No messages</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Quick Setup Templates (Phase 4) ──────────────────────────── */
const BUSINESS_TEMPLATES = [
  {
    id: 'italian', label: 'Italian Restaurant', emoji: '\uD83C\uDF55', color: '#dc2626',
    persona: 'warm, passionate about food, welcoming',
    welcomeMessage: 'Benvenuto! Welcome — can I help you with our menu or a reservation?',
    primaryColor: '#dc2626',
    prompt: 'You are a warm, friendly AI host for {{name}}, an Italian restaurant. Help with menu questions, reservations, hours, and catering. Be passionate about the food. Keep responses concise.',
    knowledge: '## Menu Highlights\n\n### Antipasti\n- Bruschetta - $12\n- Calamari Fritti - $14\n\n### Pasta\n- Spaghetti Carbonara - $18\n- Fettuccine Alfredo - $17\n\n### Pizza\n- Margherita - $16\n- Diavola - $18\n\n### Dessert\n- Tiramisu - $10\n- Panna Cotta - $9',
    quickReplies: ['View Menu', 'Make Reservation', 'Hours & Location'],
  },
  {
    id: 'coffee', label: 'Coffee Shop / Bakery', emoji: '\u2615', color: '#92400e',
    persona: 'cheerful, warm, knowledgeable about coffee',
    welcomeMessage: 'Hey there! What can I brew up for you today?',
    primaryColor: '#92400e',
    prompt: 'You are a cheerful AI barista for {{name}}, a coffee shop and bakery. Help with menu items, daily specials, custom cake orders, loyalty program, and hours. Be enthusiastic about the craft.',
    knowledge: '## Drinks\n\n- Espresso - $3.50\n- Latte - $5\n- Cappuccino - $4.50\n- Cold Brew - $5\n- Matcha Latte - $5.50\n\n## Bakery\n\n- Croissant - $4\n- Blueberry Muffin - $3.50\n- Sourdough Loaf - $8\n- Chocolate Chip Cookie - $3',
    quickReplies: ['Today\'s Specials', 'Order Ahead', 'Catering Info'],
  },
  {
    id: 'salon', label: 'Hair Salon / Spa', emoji: '\uD83D\uDC87', color: '#ec4899',
    persona: 'elegant, professional, warm',
    welcomeMessage: 'Welcome! Looking to book an appointment or learn about our services?',
    primaryColor: '#ec4899',
    prompt: 'You are an elegant AI receptionist for {{name}}, a hair salon and spa. Help with booking appointments, services and pricing, availability, and aftercare tips. Be professional yet warm.',
    knowledge: '## Services\n\n### Hair\n- Women\'s Cut & Style - $65+\n- Men\'s Cut - $35\n- Color & Highlights - $120+\n- Blowout - $45\n\n### Spa\n- Swedish Massage (60min) - $90\n- Facial Treatment - $80\n- Mani/Pedi Combo - $65',
    quickReplies: ['Book Appointment', 'Services & Pricing', 'Gift Cards'],
  },
  {
    id: 'professional', label: 'Professional Services', emoji: '\uD83D\uDCBC', color: '#1e40af',
    persona: 'professional, knowledgeable, solution-oriented',
    welcomeMessage: 'Hello! How can we help your business today?',
    primaryColor: '#1e40af',
    prompt: 'You are a professional AI assistant for {{name}}. Help potential clients understand services, book consultations, and answer FAQ. Be knowledgeable and solution-oriented. Collect contact info when appropriate.',
    knowledge: '## Services\n\n- Strategy Consulting\n- Implementation Support\n- Ongoing Management\n- Training & Workshops\n\n## Process\n\n1. Free Discovery Call (30 min)\n2. Custom Proposal\n3. Kickoff & Onboarding\n4. Ongoing Support',
    quickReplies: ['Book Consultation', 'Our Services', 'Pricing Info'],
  },
];

function QuickSetupTemplates({ businessId, businessName, onApplied }: {
  businessId: string; businessName: string; onApplied: () => void;
}) {
  const [applying, setApplying] = useState<string | null>(null);

  async function applyTemplate(t: typeof BUSINESS_TEMPLATES[0]) {
    setApplying(t.id);
    try {
      await fetch(`${API_URL}/chatbot/settings/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotSystemPrompt: t.prompt.replace(/\{\{name\}\}/g, businessName),
          chatbotKnowledgeBase: t.knowledge,
          chatbotPersona: t.persona,
          welcomeMessage: t.welcomeMessage,
          primaryColor: t.color,
          chatbotQuickRepliesEnabled: true,
          chatbotQuickReplies: t.quickReplies,
        }),
      });
      onApplied();
    } finally { setApplying(null); }
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-500/5 dark:to-indigo-500/5 border border-violet-200/60 dark:border-violet-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">&#x2728;</span>
        <h3 className="text-sm font-bold text-violet-900 dark:text-violet-300">Quick Setup</h3>
      </div>
      <p className="text-xs text-violet-600 dark:text-violet-400 mb-4">Pick a template to instantly configure your chatbot — system prompt, knowledge base, colors, and quick replies. You can customize everything after.</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {BUSINESS_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => applyTemplate(t)}
            disabled={!!applying}
            className="bg-white dark:bg-white/[0.04] border border-violet-200/60 dark:border-violet-500/20 rounded-xl p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 group"
          >
            <div className="text-2xl mb-2">{t.emoji}</div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">{t.label}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
              <span className="text-[10px] text-slate-400 dark:text-slate-400">{t.quickReplies.length} quick replies</span>
            </div>
            {applying === t.id && <div className="mt-2 w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Widget Snippet Panel ─────────────────────────────────────── */
function EmbedSnippet({ businessId }: { businessId: string }) {
  const [snippet, setSnippet] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/chatbot/widget/snippet/${businessId}`).then((r) => r.ok ? r.text() : '').then(setSnippet).catch(() => {}).finally(() => setLoading(false));
  }, [businessId]);

  return (
    <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Embed Code</h3>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Paste before &lt;/body&gt; on your website</p>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); }} disabled={!snippet} className="px-4 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-50 transition-colors">
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
      {loading ? (
        <div className="h-20 flex items-center justify-center"><div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
      ) : snippet ? (
        <pre className="bg-slate-900 text-slate-300 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">{snippet}</pre>
      ) : (
        <div className="bg-slate-50 dark:bg-white/[0.04] rounded-lg p-4 text-center"><p className="text-xs text-slate-400 dark:text-slate-400">Snippet unavailable</p></div>
      )}
    </div>
  );
}

/* ── Main Chatbot Dashboard ───────────────────────────────────── */
export default function ChatbotClient({ businessId }: { businessId: string }) {
  const [tab, setTab] = useState('dashboard');
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
      if (sessionsRes.ok) { const data = await sessionsRes.json(); setSessions(data.items); setTotalSessions(data.total); }
    } catch {} finally { setLoading(false); }
  }, [businessId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!status?.isEnabled) return <DeployHero businessId={businessId} onEnabled={fetchAll} />;

  const s = stats ?? { totalSessions: 0, leadsCapture: 0, appointmentsMade: 0, totalMessages: 0, channelBreakdown: {} };

  // Check if unconfigured (for showing templates)
  const stg = status.settings as Record<string, unknown>;
  const doneCount = [stg['chatbotSystemPrompt'], stg['chatbotKnowledgeBase']].filter(Boolean).length;

  const tabContent = (
    <>
      {tab === 'dashboard' && (
        <div className="space-y-8">
          {/* One-Click Templates (Phase 4) — show when unconfigured */}
          {doneCount < 2 && (
            <QuickSetupTemplates businessId={businessId} businessName={status.businessName} onApplied={() => { fetchAll(); setTab('prompt'); }} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Conversations" value={s.totalSessions} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
            <KpiCard label="Leads Captured" value={s.leadsCapture} color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
            <KpiCard label="Appointments" value={s.appointmentsMade} color="amber" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" clipRule="evenodd" /></svg>} />
            <KpiCard label="Messages" value={s.totalMessages} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" clipRule="evenodd" /></svg>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[{ channel: 'Web Widget', key: 'WEB', color: 'violet' }, { channel: 'Instagram DMs', key: 'INSTAGRAM', color: 'rose' }, { channel: 'Facebook Messenger', key: 'FACEBOOK', color: 'sky' }].map(({ channel, key }) => (
              <div key={channel} className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <p className="text-xs text-slate-500 dark:text-slate-400">{channel}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{s.channelBreakdown[key] ?? 0}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">conversations</p>
              </div>
            ))}
          </div>

          {/* Recent Conversations */}
          <HistoryTab sessions={sessions} totalSessions={totalSessions} onSelect={setSelectedSession} />
        </div>
      )}

      {tab === 'appearance' && <AppearanceTab businessId={businessId} settings={status.settings} businessName={status.businessName} onSaved={fetchAll} />}
      {tab === 'prompt' && <SystemPromptTab businessId={businessId} settings={status.settings} businessName={status.businessName} onSaved={fetchAll} />}
      {tab === 'knowledge' && <KnowledgeBaseTab businessId={businessId} settings={status.settings} onSaved={fetchAll} />}
      {tab === 'options' && <OptionsTab businessId={businessId} settings={status.settings} onSaved={fetchAll} />}
      {tab === 'capabilities' && (
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enable capabilities for your chatbot — orders, reservations, waitlist, and more. Settings are shared with your phone agent.</p>
          <CapabilitiesPanel businessId={businessId} />
        </div>
      )}
      {tab === 'test' && <TestChatTab businessId={businessId} />}
    </>
  );

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 dark:shadow-violet-900/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Chat Widget</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">AI chatbot — configure, customize, and monitor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Active</span>
          </div>
        </div>
      </div>

      {/* Pill Tabs */}
      <div className="flex gap-1.5 mb-8 bg-slate-100/80 dark:bg-white/[0.06] rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200 ${tab === t.id ? 'bg-white dark:bg-white/[0.08] text-violet-700 dark:text-violet-400 shadow-sm border border-violet-100 dark:border-violet-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white/60 dark:hover:bg-white/[0.04]'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Animated Tab Content */}
      <div key={tab} className="animate-fade-up">
        {tabContent}
      </div>

      {selectedSession && <ConversationModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  );
}
