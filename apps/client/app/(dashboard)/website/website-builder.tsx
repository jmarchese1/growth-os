'use client';

import { useState } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type ColorScheme = 'midnight' | 'warm' | 'forest' | 'ocean' | 'ivory' | 'rose';
type FontPairing = 'modern' | 'classic' | 'minimal' | 'elegant';

const COLOR_SCHEMES: { id: ColorScheme; label: string; bg: string; accent: string; preview: string }[] = [
  { id: 'midnight', label: 'Midnight', bg: '#0a0a0a', accent: '#a855f7', preview: 'Dark & moody' },
  { id: 'warm',     label: 'Warm',     bg: '#120800', accent: '#f97316', preview: 'Rich & inviting' },
  { id: 'forest',   label: 'Forest',   bg: '#0a1a0a', accent: '#22c55e', preview: 'Organic & fresh' },
  { id: 'ocean',    label: 'Ocean',    bg: '#06101a', accent: '#3b82f6', preview: 'Cool & coastal' },
  { id: 'ivory',    label: 'Ivory',    bg: '#fafaf8', accent: '#b8860b', preview: 'Light & elegant' },
  { id: 'rose',     label: 'Rose',     bg: '#12060a', accent: '#e11d48', preview: 'Bold & romantic' },
];

const FONT_PAIRINGS: { id: FontPairing; label: string; sample: string; desc: string }[] = [
  { id: 'modern',  label: 'Modern',  sample: 'Aa', desc: 'Inter — clean, contemporary' },
  { id: 'classic', label: 'Classic', sample: 'Aa', desc: 'Georgia — timeless, editorial' },
  { id: 'minimal', label: 'Minimal', sample: 'Aa', desc: 'System UI — pure & unadorned' },
  { id: 'elegant', label: 'Elegant', sample: 'Aa', desc: 'Playfair — refined, upscale' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface FormData {
  existingWebsiteUrl: string;
  businessName: string;
  cuisine: string;
  phone: string;
  address: string;
  city: string;
  description: string;
  heroImage: string;
  bookingUrl: string;
  colorScheme: ColorScheme;
  fontPairing: FontPairing;
  hours: Record<string, string>;
  menuItems: Array<{ name: string; description: string; price: string; category: string }>;
}

export default function WebsiteBuilder() {
  const [step, setStep] = useState(1);
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ url: string; html: string; websiteId: string } | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    existingWebsiteUrl: '',
    businessName: '',
    cuisine: '',
    phone: '',
    address: '',
    city: '',
    description: '',
    heroImage: '',
    bookingUrl: '',
    colorScheme: 'midnight',
    fontPairing: 'elegant',
    hours: {},
    menuItems: [],
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleScrape() {
    if (!form.existingWebsiteUrl) { setStep(2); return; }
    setScraping(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/websites/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.existingWebsiteUrl }),
      });
      const json = await res.json() as { data: Partial<FormData> & { imageUrls?: string[] } };
      const d = json.data ?? {};
      setForm((f) => ({
        ...f,
        businessName: d.businessName ?? f.businessName,
        cuisine: d.cuisine ?? f.cuisine,
        phone: d.phone ?? f.phone,
        address: d.address ?? f.address,
        city: d.city ?? f.city,
        description: d.description ?? f.description,
        bookingUrl: d.bookingUrl ?? f.bookingUrl,
        heroImage: d.imageUrls?.[0] ?? f.heroImage,
        hours: (d.hours as Record<string, string>) ?? f.hours,
        menuItems: (d.menuItems as FormData['menuItems']) ?? f.menuItems,
      }));
      setScraped(true);
    } catch {
      // Silently continue — scrape is optional
    }
    setScraping(false);
    setStep(2);
  }

  async function handleGenerate() {
    if (!form.businessName) { setError('Please enter your business name'); return; }
    setGenerating(true);
    setError('');
    try {
      // Get businessId from session cookie via Supabase — for now use a placeholder
      const businessId = 'demo'; // TODO: wire from auth context
      const res = await fetch(`${API_URL}/websites/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, businessId }),
      });
      const json = await res.json() as { success: boolean; url?: string; html?: string; websiteId?: string; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Generation failed');
      setResult({ url: json.url ?? '', html: json.html ?? '', websiteId: json.websiteId ?? '' });
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setGenerating(false);
  }

  return (
    <div className="min-h-screen p-8 animate-fade-up">
      {/* Steps header */}
      <div className="max-w-3xl mx-auto mb-10">
        <div className="flex items-center gap-0">
          {['Import', 'Details', 'Style', 'Done'].map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${done ? 'bg-violet-600 text-white' : active ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {done ? (
                      <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : n}
                  </div>
                  <span className={`text-sm font-medium ${active ? 'text-slate-900' : done ? 'text-violet-600' : 'text-slate-400'}`}>{label}</span>
                </div>
                {i < 3 && <div className={`flex-1 h-px mx-3 ${done ? 'bg-violet-300' : 'bg-slate-200'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">

        {/* STEP 1 — Import */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Do you have an existing website?</h2>
            <p className="text-sm text-slate-500 mb-8">Paste your URL and we&apos;ll automatically import your hours, menu, photos, and contact info. Or skip to start fresh.</p>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Your current website URL</label>
              <input
                type="url"
                placeholder="https://yourrestaurant.com"
                value={form.existingWebsiteUrl}
                onChange={(e) => set('existingWebsiteUrl', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-2">We&apos;ll use AI to extract your business details — you can edit everything after.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleScrape}
                disabled={scraping}
                className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {scraping ? 'Importing...' : form.existingWebsiteUrl ? 'Import & Continue' : 'Skip — Start Fresh'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Details */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-900">Your Business Details</h2>
              {scraped && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Auto-filled from your site</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <Field label="Business Name *" value={form.businessName} onChange={(v) => set('businessName', v)} placeholder="Joe's Italian Kitchen" />
              <Field label="Cuisine / Type" value={form.cuisine} onChange={(v) => set('cuisine', v)} placeholder="Italian, American, Sushi..." />
              <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} placeholder="(555) 123-4567" />
              <Field label="City" value={form.city} onChange={(v) => set('city', v)} placeholder="New York, NY" />
              <div className="sm:col-span-2">
                <Field label="Address" value={form.address} onChange={(v) => set('address', v)} placeholder="123 Main St, New York, NY 10001" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Short Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="A few sentences about your restaurant — the vibe, the food, what makes you special..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
              <Field label="Hero Image URL" value={form.heroImage} onChange={(v) => set('heroImage', v)} placeholder="https://..." />
              <Field label="Booking / Reservation URL" value={form.bookingUrl} onChange={(v) => set('bookingUrl', v)} placeholder="https://resy.com/..." />
            </div>

            {/* Hours */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Hours (optional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-24 flex-shrink-0">{day}</span>
                    <input
                      value={form.hours[day] ?? ''}
                      onChange={(e) => set('hours', { ...form.hours, [day]: e.target.value })}
                      placeholder="11am – 10pm or Closed"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-5 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 transition-colors">
                Continue to Style
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Style */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Choose Your Style</h2>
              <p className="text-sm text-slate-500 mb-8">Pick a color scheme and font pairing that matches your restaurant&apos;s personality.</p>

              {/* Color schemes */}
              <div className="mb-8">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">Color Scheme</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {COLOR_SCHEMES.map((cs) => (
                    <button
                      key={cs.id}
                      onClick={() => set('colorScheme', cs.id)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all ${form.colorScheme === cs.id ? 'border-violet-500 shadow-md shadow-violet-200' : 'border-transparent hover:border-slate-300'}`}
                    >
                      <div style={{ background: cs.bg }} className="h-16 flex items-center justify-center gap-1.5 px-4">
                        <div style={{ background: cs.accent }} className="w-3 h-3 rounded-full" />
                        <span style={{ color: cs.accent }} className="text-xs font-bold">{cs.label}</span>
                      </div>
                      <div className="px-3 py-2 bg-white border-t border-slate-100">
                        <p className="text-xs text-slate-500">{cs.preview}</p>
                      </div>
                      {form.colorScheme === cs.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font pairings */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">Font Pairing</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FONT_PAIRINGS.map((fp) => (
                    <button
                      key={fp.id}
                      onClick={() => set('fontPairing', fp.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${form.fontPairing === fp.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <p className={`text-2xl font-bold mb-1 ${fp.id === 'classic' ? 'font-serif' : fp.id === 'elegant' ? 'italic' : ''}`}>{fp.sample}</p>
                      <p className="text-xs font-semibold text-slate-700">{fp.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{fp.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-5 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">Back</button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 py-3.5 bg-violet-600 text-white font-bold rounded-xl text-sm hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating your website...
                  </span>
                ) : 'Generate My Website'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Result */}
        {step === 4 && result && (
          <div className="space-y-6">
            {/* First draft notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">This is your first draft</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Your website has been generated and deployed. It should look great, but nothing is ever perfect on the first try.
                  If you&apos;d like changes — copy, layout, colors, sections — just let us know and we&apos;ll update it personally.
                </p>
              </div>
            </div>

            {/* Live URL */}
            {result.url && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Live Website</p>
                  <a href={result.url} target="_blank" rel="noreferrer" className="text-violet-600 font-semibold text-sm hover:underline break-all">{result.url}</a>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={result.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors">
                    Visit Site
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.url)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            )}

            {/* Preview iframe */}
            {result.html && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-md px-3 py-1.5 text-xs text-slate-400 truncate">
                    {result.url || 'preview'}
                  </div>
                </div>
                <iframe
                  srcDoc={result.html}
                  title="Website Preview"
                  className="w-full"
                  style={{ height: '600px', border: 'none' }}
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            )}

            {/* Request changes */}
            <RequestChanges />

            <button
              onClick={() => { setStep(2); setResult(null); }}
              className="w-full py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50 transition-colors"
            >
              Regenerate with different settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
      />
    </div>
  );
}

function RequestChanges() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
        <p className="text-sm font-semibold text-emerald-700">Request received!</p>
        <p className="text-xs text-emerald-600 mt-1">We&apos;ll update your site and let you know when it&apos;s ready.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Want changes?</p>
          <p className="text-xs text-slate-500 mt-0.5">Tell us what to fix — we&apos;ll update it personally.</p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
        >
          {open ? 'Cancel' : 'Request Changes'}
        </button>
      </div>
      {open && (
        <div className="mt-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Change the font to something more rustic, add our Instagram link, update the hero text to say 'Authentic Neapolitan Pizza since 1987'..."
            rows={4}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          />
          <button
            onClick={() => { if (message.trim()) setSent(true); }}
            className="mt-3 w-full py-2.5 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 transition-colors"
          >
            Send Request
          </button>
        </div>
      )}
    </div>
  );
}
