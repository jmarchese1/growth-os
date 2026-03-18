'use client';

import { useState } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type ColorScheme = 'midnight' | 'warm' | 'forest' | 'ocean' | 'ivory' | 'rose';
type FontPairing = 'modern' | 'classic' | 'minimal' | 'elegant';
type IndustryId = 'restaurant' | 'gym' | 'salon' | 'spa' | 'cafe' | 'retail';

// ── Industry config ───────────────────────────────────────────────────────────
interface IndustryConfig {
  id: IndustryId;
  label: string;
  tagline: string;
  iconBg: string;
  iconColor: string;
  icon: string; // SVG path d=""
  defaultColorScheme: ColorScheme;
  defaultFontPairing: FontPairing;
  typeLabel: string;
  typePlaceholder: string;
  bookingLabel: string;
  bookingPlaceholder: string;
  descriptionPlaceholder: string;
  itemsLabel: string;
  itemCategoryDefault: string;
  ctaTextDefault: string;
  status: 'ready' | 'beta';
}

const INDUSTRIES: IndustryConfig[] = [
  {
    id: 'restaurant',
    label: 'Restaurant',
    tagline: 'Full-service dining, bistros & bars',
    iconBg: '#fff1e6',
    iconColor: '#f97316',
    // Plate with utensils
    icon: 'M12 3a9 9 0 100 18A9 9 0 0012 3zm0 2a7 7 0 110 14A7 7 0 0112 5zm-1.5 3v4.5l3 1.8',
    defaultColorScheme: 'warm',
    defaultFontPairing: 'elegant',
    typeLabel: 'Cuisine Type',
    typePlaceholder: 'Italian, Sushi, American, Mexican...',
    bookingLabel: 'Reservation URL',
    bookingPlaceholder: 'https://resy.com/...',
    descriptionPlaceholder: 'A few sentences about your restaurant — the vibe, the food, what makes you special...',
    itemsLabel: 'Menu Items',
    itemCategoryDefault: 'Mains',
    ctaTextDefault: 'Reserve a Table',
    status: 'ready',
  },
  {
    id: 'gym',
    label: 'Gym & Fitness',
    tagline: 'Gyms, yoga studios, CrossFit & sports clubs',
    iconBg: '#eff6ff',
    iconColor: '#3b82f6',
    // Lightning bolt
    icon: 'M13 2L4.09 12.96A.5.5 0 004.5 13.5H11l-2 8.5L19.91 11.04A.5.5 0 0019.5 10.5H13l2-8.5z',
    defaultColorScheme: 'ocean',
    defaultFontPairing: 'modern',
    typeLabel: 'Fitness Type',
    typePlaceholder: 'CrossFit, Yoga, Boxing, HIIT, Pilates...',
    bookingLabel: 'Membership / Trial URL',
    bookingPlaceholder: 'https://mindbodyonline.com/...',
    descriptionPlaceholder: 'What makes your gym different? Training philosophy, equipment, community feel, coaches...',
    itemsLabel: 'Classes & Services',
    itemCategoryDefault: 'Classes',
    ctaTextDefault: 'Start Your Free Trial',
    status: 'ready',
  },
  {
    id: 'salon',
    label: 'Hair Salon',
    tagline: 'Hair salons, barbershops & blow-dry bars',
    iconBg: '#fff1f4',
    iconColor: '#e11d48',
    // Scissors
    icon: 'M6 2v3m0 0a2 2 0 100 4 2 2 0 000-4zm0 0l10 10m0-10a2 2 0 100 4 2 2 0 000-4zm0 4L6 16m0 0a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z',
    defaultColorScheme: 'rose',
    defaultFontPairing: 'elegant',
    typeLabel: 'Specialty',
    typePlaceholder: "Women's cuts, Color & highlights, Men's grooming...",
    bookingLabel: 'Booking URL',
    bookingPlaceholder: 'https://booksy.com/...',
    descriptionPlaceholder: "What's your salon known for? Techniques, team, the experience you create for clients...",
    itemsLabel: 'Services & Pricing',
    itemCategoryDefault: 'Hair Services',
    ctaTextDefault: 'Book Your Appointment',
    status: 'ready',
  },
  {
    id: 'spa',
    label: 'Spa & Wellness',
    tagline: 'Day spas, massage therapy & wellness centers',
    iconBg: '#f0fdf4',
    iconColor: '#22c55e',
    // Leaf
    icon: 'M12 2C6.48 2 3 7 3 12c0 4.5 3 9 9 9s9-4.5 9-9c0-5-3.48-10-9-10zm0 2c3.5 0 6.5 3.5 7 7.5C17.5 15 15 19 12 19S6.5 15 5 11.5C5.5 7.5 8.5 4 12 4z',
    defaultColorScheme: 'forest',
    defaultFontPairing: 'elegant',
    typeLabel: 'Specialty',
    typePlaceholder: 'Massage, Facials, Full-body treatments, Float therapy...',
    bookingLabel: 'Booking URL',
    bookingPlaceholder: 'https://vagaro.com/...',
    descriptionPlaceholder: 'Describe the experience your spa provides — the treatments, ambiance, wellness philosophy...',
    itemsLabel: 'Treatments & Packages',
    itemCategoryDefault: 'Signature Treatments',
    ctaTextDefault: 'Book Your Treatment',
    status: 'ready',
  },
  {
    id: 'cafe',
    label: 'Coffee Shop',
    tagline: 'Cafes, coffee shops & brunch spots',
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    // Coffee cup
    icon: 'M18 8h1a4 4 0 010 8h-1m-2 0H5a2 2 0 01-2-2v-6a2 2 0 012-2h11m0 0V6a2 2 0 00-2-2H7a2 2 0 00-2 2v2m9 8v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2',
    defaultColorScheme: 'ivory',
    defaultFontPairing: 'classic',
    typeLabel: 'Concept',
    typePlaceholder: 'Specialty coffee, Brunch, Tea room, Bakery cafe...',
    bookingLabel: 'Order / Catering URL',
    bookingPlaceholder: 'https://...',
    descriptionPlaceholder: "Tell us about your coffee shop — the beans you source, the vibe, the community you've built...",
    itemsLabel: 'Menu Highlights',
    itemCategoryDefault: 'Drinks',
    ctaTextDefault: 'Visit Us Today',
    status: 'ready',
  },
  {
    id: 'retail',
    label: 'Retail Boutique',
    tagline: 'Fashion boutiques, gift shops & specialty retail',
    iconBg: '#faf5ff',
    iconColor: '#a855f7',
    // Shopping bag
    icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    defaultColorScheme: 'midnight',
    defaultFontPairing: 'minimal',
    typeLabel: 'Category',
    typePlaceholder: "Women's fashion, Vintage, Jewelry, Home goods...",
    bookingLabel: 'Online Store URL',
    bookingPlaceholder: 'https://...',
    descriptionPlaceholder: 'What does your boutique offer? Curation philosophy, brands, what makes your selection special...',
    itemsLabel: 'Featured Products',
    itemCategoryDefault: 'Featured',
    ctaTextDefault: 'Shop the Collection',
    status: 'ready',
  },
];

// ── Color / font options ──────────────────────────────────────────────────────
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

// ── Form state ────────────────────────────────────────────────────────────────
interface FormData {
  industryType: IndustryId;
  existingWebsiteUrl: string;
  businessName: string;
  cuisine: string; // holds the type/specialty for any industry
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

// ── Main component ────────────────────────────────────────────────────────────
export default function WebsiteBuilder({ businessId, onGenerated }: {
  businessId: string;
  onGenerated?: (result: { websiteId: string; html: string; url: string }) => void;
}) {
  const [step, setStep] = useState(1); // 1=Industry 2=Import 3=Details 4=Style 5=Done
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ url: string; html: string; websiteId: string } | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    industryType: 'restaurant',
    existingWebsiteUrl: '',
    businessName: '',
    cuisine: '',
    phone: '',
    address: '',
    city: '',
    description: '',
    heroImage: '',
    bookingUrl: '',
    colorScheme: 'warm',
    fontPairing: 'elegant',
    hours: {},
    menuItems: [],
  });

  const industry = INDUSTRIES.find((i) => i.id === form.industryType) ?? INDUSTRIES[0]!;

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectIndustry(ind: IndustryConfig) {
    setForm((f) => ({
      ...f,
      industryType: ind.id,
      colorScheme: ind.defaultColorScheme,
      fontPairing: ind.defaultFontPairing,
    }));
  }

  async function handleScrape() {
    if (!form.existingWebsiteUrl) { setStep(3); return; }
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
    setStep(3);
  }

  async function handleGenerate() {
    if (!form.businessName) { setError('Please enter your business name'); return; }
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/websites/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, businessId }),
      });
      const json = await res.json() as { success: boolean; url?: string; html?: string; websiteId?: string; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Generation failed');
      const r = { url: json.url ?? '', html: json.html ?? '', websiteId: json.websiteId ?? '' };
      setResult(r);
      setStep(5);
      onGenerated?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setGenerating(false);
  }

  const STEP_LABELS = ['Industry', 'Import', 'Details', 'Style', 'Done'];

  return (
    <div className="min-h-screen p-8 animate-fade-up">
      {/* Steps header */}
      <div className="max-w-3xl mx-auto mb-10">
        <div className="flex items-center gap-0">
          {STEP_LABELS.map((label, i) => {
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
                {i < 4 && <div className={`flex-1 h-px mx-3 ${done ? 'bg-violet-300' : 'bg-slate-200'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">

        {/* ── STEP 1 — Industry ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">What type of business are you?</h2>
              <p className="text-sm text-slate-500 mb-8">
                We&apos;ll tailor the design, copy, and AI defaults to match your industry.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {INDUSTRIES.map((ind) => {
                  const selected = form.industryType === ind.id;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => selectIndustry(ind)}
                      className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-150 ${
                        selected
                          ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: ind.iconBg }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={ind.iconColor}
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          <path d={ind.icon} />
                        </svg>
                      </div>

                      <p className={`text-sm font-bold mb-1 ${selected ? 'text-violet-900' : 'text-slate-800'}`}>
                        {ind.label}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-snug">{ind.tagline}</p>

                      {ind.status === 'beta' && (
                        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Beta</span>
                      )}

                      {selected && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Industry-specific preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: industry.iconBg }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={industry.iconColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d={industry.icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700">{industry.label} selected</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Default style: {COLOR_SCHEMES.find(c => c.id === industry.defaultColorScheme)?.label} · {FONT_PAIRINGS.find(f => f.id === industry.defaultFontPairing)?.label} · CTA: &ldquo;{industry.ctaTextDefault}&rdquo;
                </p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors flex-shrink-0"
              >
                Continue
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 — Import ───────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: industry.iconBg }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={industry.iconColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d={industry.icon} />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{industry.label}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Do you have an existing website?</h2>
            <p className="text-sm text-slate-500 mb-8">
              Paste your URL and we&apos;ll automatically import your details. Or skip to start fresh.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Your current website URL</label>
              <input
                type="url"
                placeholder={`https://your${industry.id}.com`}
                value={form.existingWebsiteUrl}
                onChange={(e) => set('existingWebsiteUrl', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-2">We&apos;ll use AI to extract your business details — you can edit everything after.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-5 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">Back</button>
              <button
                onClick={() => void handleScrape()}
                disabled={scraping}
                className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {scraping ? 'Importing...' : form.existingWebsiteUrl ? 'Import & Continue' : 'Skip — Start Fresh'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Details ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-900">Your {industry.label} Details</h2>
              {scraped && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Auto-filled from your site</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <Field label="Business Name *" value={form.businessName} onChange={(v) => set('businessName', v)} placeholder={`Your ${industry.label} name`} />
              <Field label={industry.typeLabel} value={form.cuisine} onChange={(v) => set('cuisine', v)} placeholder={industry.typePlaceholder} />
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
                  placeholder={industry.descriptionPlaceholder}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
              <Field label="Hero Image URL" value={form.heroImage} onChange={(v) => set('heroImage', v)} placeholder="https://..." />
              <Field label={industry.bookingLabel} value={form.bookingUrl} onChange={(v) => set('bookingUrl', v)} placeholder={industry.bookingPlaceholder} />
            </div>

            {/* Hours */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Hours <span className="font-normal text-slate-400">(optional — AI will suggest realistic hours if left blank)</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
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
              <button onClick={() => setStep(2)} className="px-5 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">Back</button>
              <button onClick={() => setStep(4)} className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 transition-colors">
                Continue to Style
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Style ───────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Choose Your Style</h2>
              <p className="text-sm text-slate-500 mb-8">
                Pick a color scheme and font pairing. We&apos;ve pre-selected the best defaults for a {industry.label.toLowerCase()}.
              </p>

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
                      {cs.id === industry.defaultColorScheme && form.colorScheme !== cs.id && (
                        <div className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-slate-800/70 text-white px-1.5 py-0.5 rounded-full">
                          Recommended
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
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${form.fontPairing === fp.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <p className={`text-2xl font-bold mb-1 ${fp.id === 'classic' ? 'font-serif' : fp.id === 'elegant' ? 'italic' : ''}`}>{fp.sample}</p>
                      <p className="text-xs font-semibold text-slate-700">{fp.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{fp.desc}</p>
                      {fp.id === industry.defaultFontPairing && form.fontPairing !== fp.id && (
                        <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Rec</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-5 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">Back</button>
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="flex-1 py-3.5 bg-violet-600 text-white font-bold rounded-xl text-sm hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating your website...
                  </span>
                ) : `Generate My ${industry.label} Website`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5 — Done ────────────────────────────────────────────── */}
        {step === 5 && result && (
          <div className="space-y-6">
            {/* First draft notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">This is your first draft</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Your website has been generated and deployed. Use the AI editor to refine copy, change colors, add sections — anything you need.
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
                    onClick={() => void navigator.clipboard.writeText(result.url)}
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

            <button
              onClick={() => { setStep(3); setResult(null); }}
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
