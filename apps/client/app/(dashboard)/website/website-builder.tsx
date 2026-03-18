'use client';

import { useState, useCallback, type ChangeEvent } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type ColorScheme = 'midnight' | 'warm' | 'forest' | 'ocean' | 'ivory' | 'rose' | 'slate' | 'emerald' | 'amber' | 'crimson' | 'navy' | 'sage';
type FontPairing = 'modern' | 'classic' | 'minimal' | 'elegant' | 'luxury' | 'editorial' | 'tech' | 'literary';
type IndustryId = 'restaurant' | 'gym' | 'salon' | 'spa' | 'cafe' | 'retail';
type SectionKey = 'about' | 'features' | 'menu' | 'gallery' | 'testimonials' | 'hours' | 'reserve';

// ── Industry config ───────────────────────────────────────────────────────────
interface IndustryConfig {
  id: IndustryId;
  label: string;
  tagline: string;
  iconBg: string;
  iconColor: string;
  icon: string;
  defaultColorScheme: ColorScheme;
  defaultFontPairing: FontPairing;
  typeLabel: string;
  typePlaceholder: string;
  bookingLabel: string;
  bookingPlaceholder: string;
  descriptionPlaceholder: string;
  defaultSections: SectionDef[];
  ctaTextDefault: string;
}

interface SectionDef {
  id: SectionKey;
  label: string;
  hint?: string;
  locked?: boolean;
  defaultEnabled: boolean;
}

const BASE_SECTIONS: SectionDef[] = [
  { id: 'about',        label: 'About Us',         defaultEnabled: true },
  { id: 'features',     label: 'Why Choose Us',    defaultEnabled: true },
  { id: 'menu',         label: 'Menu / Services',  defaultEnabled: true },
  { id: 'gallery',      label: 'Photo Gallery',    hint: 'Best with images added', defaultEnabled: false },
  { id: 'testimonials', label: 'Reviews',          defaultEnabled: true },
  { id: 'hours',        label: 'Hours & Location', defaultEnabled: true },
  { id: 'reserve',      label: 'Booking CTA',      hint: 'Requires a booking URL', defaultEnabled: false },
];

function makeSections(overrides: Partial<Record<SectionKey, Partial<SectionDef>>>): SectionDef[] {
  return BASE_SECTIONS.map((s) => ({ ...s, ...(overrides[s.id] ?? {}) }));
}

const INDUSTRIES: IndustryConfig[] = [
  {
    id: 'restaurant',
    label: 'Restaurant',
    tagline: 'Full-service dining, bistros & bars',
    iconBg: '#fff1e6', iconColor: '#f97316',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    defaultColorScheme: 'warm', defaultFontPairing: 'elegant',
    typeLabel: 'Cuisine Type', typePlaceholder: 'Italian, Sushi, American, Mexican...',
    bookingLabel: 'Reservation URL', bookingPlaceholder: 'https://resy.com/...',
    descriptionPlaceholder: "A few sentences about your restaurant — the vibe, the food, what makes you special...",
    ctaTextDefault: 'Reserve a Table',
    defaultSections: makeSections({ menu: { label: 'Menu' }, reserve: { label: 'Reservations', defaultEnabled: true } }),
  },
  {
    id: 'gym',
    label: 'Gym & Fitness',
    tagline: 'Gyms, yoga studios, CrossFit & sports clubs',
    iconBg: '#eff6ff', iconColor: '#3b82f6',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    defaultColorScheme: 'ocean', defaultFontPairing: 'modern',
    typeLabel: 'Fitness Type', typePlaceholder: 'CrossFit, Yoga, Boxing, HIIT, Pilates...',
    bookingLabel: 'Membership / Trial URL', bookingPlaceholder: 'https://mindbodyonline.com/...',
    descriptionPlaceholder: "What makes your gym different? Training philosophy, equipment, community feel, coaches...",
    ctaTextDefault: 'Start Your Free Trial',
    defaultSections: makeSections({ menu: { label: 'Classes & Memberships' }, reserve: { label: 'Free Trial CTA', defaultEnabled: true }, features: { label: 'Why Train With Us' } }),
  },
  {
    id: 'salon',
    label: 'Hair Salon',
    tagline: 'Hair salons, barbershops & blow-dry bars',
    iconBg: '#fff1f4', iconColor: '#e11d48',
    icon: 'M6 2v3m0 0a2 2 0 100 4 2 2 0 000-4zm0 0l10 10m0-10a2 2 0 100 4 2 2 0 000-4zm0 4L6 16m0 0a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z',
    defaultColorScheme: 'rose', defaultFontPairing: 'elegant',
    typeLabel: 'Specialty', typePlaceholder: "Women's cuts, Color, Men's grooming...",
    bookingLabel: 'Booking URL', bookingPlaceholder: 'https://booksy.com/...',
    descriptionPlaceholder: "What's your salon known for? Techniques, team, the experience you create...",
    ctaTextDefault: 'Book Your Appointment',
    defaultSections: makeSections({ menu: { label: 'Services & Pricing' }, reserve: { label: 'Book Appointment', defaultEnabled: true }, features: { label: 'Why Our Clients Return' } }),
  },
  {
    id: 'spa',
    label: 'Spa & Wellness',
    tagline: 'Day spas, massage therapy & wellness centers',
    iconBg: '#f0fdf4', iconColor: '#22c55e',
    icon: 'M12 3a9 9 0 019 9M3 12a9 9 0 019-9m-9 9a9 9 0 009 9m0-18a9 9 0 000 18m0-9a3 3 0 100-6 3 3 0 000 6z',
    defaultColorScheme: 'forest', defaultFontPairing: 'elegant',
    typeLabel: 'Specialty', typePlaceholder: 'Massage, Facials, Full-body treatments...',
    bookingLabel: 'Booking URL', bookingPlaceholder: 'https://vagaro.com/...',
    descriptionPlaceholder: "Describe the experience your spa provides — treatments, ambiance, wellness philosophy...",
    ctaTextDefault: 'Book Your Treatment',
    defaultSections: makeSections({ menu: { label: 'Treatments & Packages' }, reserve: { label: 'Book Treatment', defaultEnabled: true }, features: { label: 'The Spa Experience' } }),
  },
  {
    id: 'cafe',
    label: 'Coffee Shop',
    tagline: 'Cafes, coffee shops & brunch spots',
    iconBg: '#fffbeb', iconColor: '#d97706',
    icon: 'M18 8h1a4 4 0 010 8h-1m-2 0H5a2 2 0 01-2-2v-6a2 2 0 012-2h11m0 0V6a2 2 0 00-2-2H7a2 2 0 00-2 2v2m9 8v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2',
    defaultColorScheme: 'ivory', defaultFontPairing: 'classic',
    typeLabel: 'Concept', typePlaceholder: 'Specialty coffee, Brunch, Tea room, Bakery cafe...',
    bookingLabel: 'Order / Catering URL', bookingPlaceholder: 'https://...',
    descriptionPlaceholder: "Tell us about your coffee shop — the beans, the vibe, the community you've built...",
    ctaTextDefault: 'Visit Us Today',
    defaultSections: makeSections({ menu: { label: 'Menu Highlights' } }),
  },
  {
    id: 'retail',
    label: 'Retail Boutique',
    tagline: 'Fashion boutiques, gift shops & specialty retail',
    iconBg: '#faf5ff', iconColor: '#a855f7',
    icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    defaultColorScheme: 'midnight', defaultFontPairing: 'minimal',
    typeLabel: 'Category', typePlaceholder: "Women's fashion, Vintage, Jewelry...",
    bookingLabel: 'Online Store URL', bookingPlaceholder: 'https://...',
    descriptionPlaceholder: "What does your boutique offer? Curation philosophy, brands, what makes your selection special...",
    ctaTextDefault: 'Shop the Collection',
    defaultSections: makeSections({ menu: { label: 'Featured Products' }, features: { label: 'Why Shop With Us' } }),
  },
];

// ── Colors + Fonts ────────────────────────────────────────────────────────────
const COLOR_SCHEMES: { id: ColorScheme; label: string; bg: string; accent: string; preview: string }[] = [
  { id: 'midnight', label: 'Midnight',  bg: '#0a0a0a', accent: '#a855f7', preview: 'Dark & moody' },
  { id: 'warm',     label: 'Warm',      bg: '#120800', accent: '#f97316', preview: 'Rich & inviting' },
  { id: 'forest',   label: 'Forest',    bg: '#0a1a0a', accent: '#22c55e', preview: 'Organic & fresh' },
  { id: 'ocean',    label: 'Ocean',     bg: '#06101a', accent: '#3b82f6', preview: 'Cool & coastal' },
  { id: 'ivory',    label: 'Ivory',     bg: '#fafaf8', accent: '#b8860b', preview: 'Light & elegant' },
  { id: 'rose',     label: 'Rose',      bg: '#12060a', accent: '#e11d48', preview: 'Bold & romantic' },
  { id: 'slate',    label: 'Slate',     bg: '#0f172a', accent: '#64748b', preview: 'Professional' },
  { id: 'emerald',  label: 'Emerald',   bg: '#022c22', accent: '#10b981', preview: 'Fresh & vibrant' },
  { id: 'amber',    label: 'Amber',     bg: '#1c0a00', accent: '#f59e0b', preview: 'Warm & golden' },
  { id: 'crimson',  label: 'Crimson',   bg: '#0c0404', accent: '#dc2626', preview: 'Dramatic' },
  { id: 'navy',     label: 'Navy',      bg: '#030712', accent: '#6366f1', preview: 'Timeless' },
  { id: 'sage',     label: 'Sage',      bg: '#f4f5f0', accent: '#6b7c5e', preview: 'Natural & calm' },
];

const FONT_PAIRINGS: { id: FontPairing; label: string; sample: string; desc: string; fontFamily?: string }[] = [
  { id: 'modern',    label: 'Modern',    sample: 'Aa', desc: 'Inter — clean, contemporary' },
  { id: 'classic',   label: 'Classic',   sample: 'Aa', desc: 'Georgia — timeless serif' },
  { id: 'minimal',   label: 'Minimal',   sample: 'Aa', desc: 'System UI — pure' },
  { id: 'elegant',   label: 'Elegant',   sample: 'Aa', desc: 'Playfair Display — refined' },
  { id: 'luxury',    label: 'Luxury',    sample: 'Aa', desc: 'Cormorant — ultra-refined' },
  { id: 'editorial', label: 'Editorial', sample: 'Aa', desc: 'DM Serif — magazine-editorial' },
  { id: 'tech',      label: 'Tech',      sample: 'Aa', desc: 'Space Grotesk — geometric' },
  { id: 'literary',  label: 'Literary',  sample: 'Aa', desc: 'Libre Baskerville — classic' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Section state ─────────────────────────────────────────────────────────────
interface SectionState {
  id: SectionKey;
  label: string;
  hint?: string;
  locked?: boolean;
  enabled: boolean;
}

function buildSectionState(industry: IndustryConfig): SectionState[] {
  return industry.defaultSections.map((s) => ({
    id: s.id,
    label: s.label,
    hint: s.hint,
    locked: s.locked,
    enabled: s.defaultEnabled,
  }));
}

// ── Form state ────────────────────────────────────────────────────────────────
interface FormData {
  industryType: IndustryId;
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

// ── Main component ────────────────────────────────────────────────────────────
export default function WebsiteBuilder({
  businessId,
  detectedIndustry,
  onGenerated,
}: {
  businessId: string;
  detectedIndustry?: string | null;
  onGenerated?: (result: { websiteId: string; html: string; url: string }) => void;
}) {
  const firstIndustry = INDUSTRIES.find((i) => i.id === (detectedIndustry ?? 'restaurant')) ?? INDUSTRIES[0]!;
  const industryKnown = detectedIndustry !== null && detectedIndustry !== undefined && detectedIndustry !== '';

  // If industry is detected, start at step 2 (Import); otherwise step 1 (Industry picker)
  const [step, setStep] = useState(industryKnown ? 2 : 1);

  const [inspirationUrls, setInspirationUrls] = useState<string[]>([]);
  const [menuInputMode, setMenuInputMode] = useState<'text' | 'image' | 'pdf' | null>(null);
  const [menuText, setMenuText] = useState('');
  const [extractingMenu, setExtractingMenu] = useState(false);

  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ url: string; html: string; websiteId: string } | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    industryType: firstIndustry.id,
    existingWebsiteUrl: '',
    businessName: '',
    cuisine: '',
    phone: '',
    address: '',
    city: '',
    description: '',
    heroImage: '',
    bookingUrl: '',
    colorScheme: firstIndustry.defaultColorScheme,
    fontPairing: firstIndustry.defaultFontPairing,
    hours: {},
    menuItems: [],
  });

  const [sections, setSections] = useState<SectionState[]>(buildSectionState(firstIndustry));

  const industry = INDUSTRIES.find((i) => i.id === form.industryType) ?? INDUSTRIES[0]!;

  const setForm_ = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  function selectIndustry(ind: IndustryConfig) {
    setForm((f) => ({
      ...f,
      industryType: ind.id,
      colorScheme: ind.defaultColorScheme,
      fontPairing: ind.defaultFontPairing,
    }));
    setSections(buildSectionState(ind));
  }

  function moveSection(idx: number, dir: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
  }

  function toggleSection(idx: number) {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s));
  }

  function addInspirationUrl() {
    if (inspirationUrls.length < 3) setInspirationUrls((prev) => [...prev, '']);
  }

  function removeInspirationUrl(idx: number) {
    setInspirationUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateInspirationUrl(idx: number, value: string) {
    setInspirationUrls((prev) => prev.map((u, i) => i === idx ? value : u));
  }

  async function handleMenuTextExtract() {
    if (!menuText.trim()) return;
    setExtractingMenu(true);
    try {
      const res = await fetch(`${API_URL}/websites/extract-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: menuText, mimeType: 'text/plain' }),
      });
      const json = await res.json() as { success: boolean; menuItems?: FormData['menuItems'] };
      if (json.success && json.menuItems) {
        setForm_('menuItems', json.menuItems);
        setMenuInputMode(null);
        setMenuText('');
      }
    } catch { /* silent */ }
    setExtractingMenu(false);
  }

  async function handleMenuFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingMenu(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(((reader.result as string).split(',')[1]) ?? '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API_URL}/websites/extract-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: base64, mimeType: file.type }),
      });
      const json = await res.json() as { success: boolean; menuItems?: FormData['menuItems'] };
      if (json.success && json.menuItems) {
        setForm_('menuItems', json.menuItems);
        setMenuInputMode(null);
      }
    } catch { /* silent */ }
    setExtractingMenu(false);
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
      // Silently continue
    }
    setScraping(false);
    setStep(3);
  }

  async function handleGenerate() {
    if (!form.businessName) { setError('Please enter your business name'); return; }
    setGenerating(true);
    setError('');
    try {
      const sectionsPayload = sections.map((s) => ({ id: s.id, enabled: s.enabled }));
      const res = await fetch(`${API_URL}/websites/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          businessId,
          sections: sectionsPayload,
          inspirationUrls: inspirationUrls.filter(Boolean),
        }),
      });
      const json = await res.json() as { success: boolean; url?: string; html?: string; websiteId?: string; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Generation failed');
      const r = { url: json.url ?? '', html: json.html ?? '', websiteId: json.websiteId ?? '' };
      setResult(r);
      setStep(6);
      onGenerated?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setGenerating(false);
  }

  // Steps: 1=Industry(conditional) 2=Import 3=Details 4=Structure 5=Style 6=Done
  const allStepLabels = industryKnown
    ? ['Import', 'Details', 'Structure', 'Style', 'Done']
    : ['Industry', 'Import', 'Details', 'Structure', 'Style', 'Done'];

  // Map display step index to logical step number (1-based in state)
  const displayStep = industryKnown ? step - 1 : step;

  return (
    <div className="min-h-screen p-8 animate-fade-up">
      {/* Steps header */}
      <div className="max-w-3xl mx-auto mb-10">
        <div className="flex items-center gap-0">
          {allStepLabels.map((label, i) => {
            const n = i + 1;
            const active = displayStep === n;
            const done = displayStep > n;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${done ? 'bg-violet-600 text-white' : active ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {done ? <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : n}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-slate-900' : done ? 'text-violet-600' : 'text-slate-400'}`}>{label}</span>
                </div>
                {i < allStepLabels.length - 1 && <div className={`flex-1 h-px mx-2 ${done ? 'bg-violet-300' : 'bg-slate-200'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">

        {/* ── STEP 1 — Industry (only shown if not auto-detected) ── */}
        {step === 1 && !industryKnown && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">What type of business are you?</h2>
              <p className="text-sm text-slate-500 mb-8">We&apos;ll tailor the design, copy, and AI defaults to your industry.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {INDUSTRIES.map((ind) => {
                  const selected = form.industryType === ind.id;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => selectIndustry(ind)}
                      className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-150 ${selected ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: ind.iconBg }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={ind.iconColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <path d={ind.icon} />
                        </svg>
                      </div>
                      <p className={`text-sm font-bold mb-0.5 ${selected ? 'text-violet-900' : 'text-slate-800'}`}>{ind.label}</p>
                      <p className="text-[11px] text-slate-500 leading-snug">{ind.tagline}</p>
                      {selected && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
              >
                Continue with {industry.label}
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 — Import ── */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            {industryKnown && (
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: industry.iconBg }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={industry.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d={industry.icon} />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-500">{industry.label}</span>
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-900 mb-1">Do you have an existing website?</h2>
            <p className="text-sm text-slate-500 mb-8">
              Paste your URL and we&apos;ll use AI to pull your hours, menu, photos, and contact info automatically. Or skip to start fresh.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Your current website URL</label>
              <input
                type="url"
                placeholder={`https://your${industry.id}.com`}
                value={form.existingWebsiteUrl}
                onChange={(e) => setForm_('existingWebsiteUrl', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <p className="text-xs text-slate-400 mt-2">We visit multiple pages (home, menu, contact) to extract as much as possible. You can edit everything after.</p>
            </div>

            {/* Inspiration websites */}
            <div className="border-t border-slate-100 pt-6 mb-6">
              <p className="text-sm font-bold text-slate-800 mb-1">Got style inspiration?</p>
              <p className="text-xs text-slate-400 mb-4">Paste URLs of websites whose look and feel you love. Our AI will study them and borrow the vibe — colors, typography mood, layout style.</p>
              <div className="space-y-2">
                {inspirationUrls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateInspirationUrl(i, e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <button
                      onClick={() => removeInspirationUrl(i)}
                      className="px-3 py-2 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0013.25 4.193V3.75A2.75 2.75 0 0010.5 1h-1.75zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-1.5c-.69 0-1.25.56-1.25 1.25v.325C9.327 4.025 10.157 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd"/></svg>
                    </button>
                  </div>
                ))}
              </div>
              {inspirationUrls.length < 3 && (
                <button
                  onClick={addInspirationUrl}
                  className="mt-3 flex items-center gap-1.5 text-xs text-violet-600 font-semibold hover:text-violet-800 transition-colors"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/></svg>
                  Add inspiration site{inspirationUrls.length > 0 ? ` (${inspirationUrls.length}/3)` : ''}
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {!industryKnown && <button onClick={() => setStep(1)} className="px-5 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">Back</button>}
              <button
                onClick={() => void handleScrape()}
                disabled={scraping}
                className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {scraping ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Scanning your website...
                  </span>
                ) : form.existingWebsiteUrl ? 'Import & Continue' : 'Skip — Start Fresh'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Details ── */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-900">Your {industry.label} Details</h2>
              {scraped && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Auto-filled from your site</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <Field label="Business Name *" value={form.businessName} onChange={(v) => setForm_('businessName', v)} placeholder={`Your ${industry.label} name`} />
              <Field label={industry.typeLabel} value={form.cuisine} onChange={(v) => setForm_('cuisine', v)} placeholder={industry.typePlaceholder} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm_('phone', v)} placeholder="(555) 123-4567" />
              <Field label="City" value={form.city} onChange={(v) => setForm_('city', v)} placeholder="New York, NY" />
              <div className="sm:col-span-2">
                <Field label="Address" value={form.address} onChange={(v) => setForm_('address', v)} placeholder="123 Main St, New York, NY 10001" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Short Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm_('description', e.target.value)}
                  placeholder={industry.descriptionPlaceholder}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
              <Field label="Hero Image URL" value={form.heroImage} onChange={(v) => setForm_('heroImage', v)} placeholder="https://..." />
              <Field label={industry.bookingLabel} value={form.bookingUrl} onChange={(v) => setForm_('bookingUrl', v)} placeholder={industry.bookingPlaceholder} />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Hours <span className="font-normal text-slate-400">(optional — AI will suggest if left blank)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-24 flex-shrink-0">{day}</span>
                    <input
                      value={form.hours[day] ?? ''}
                      onChange={(e) => setForm_('hours', { ...form.hours, [day]: e.target.value })}
                      placeholder="11am – 10pm or Closed"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* Menu / Services upload */}
            <div className="mb-6 border-t border-slate-100 pt-6">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                {industry.defaultSections.find((s) => s.id === 'menu')?.label ?? 'Menu / Services'}{' '}
                <span className="font-normal text-slate-400">(optional — upload to auto-populate)</span>
              </label>
              <div className="flex items-center gap-2 mt-3 mb-3">
                {(['text', 'image', 'pdf'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setMenuInputMode(menuInputMode === mode ? null : mode)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${menuInputMode === mode ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    {mode === 'text' ? 'Paste Text' : mode === 'image' ? 'Upload Photo' : 'Upload PDF'}
                  </button>
                ))}
                {form.menuItems.length > 0 && (
                  <span className="ml-auto px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                    {form.menuItems.length} items loaded
                  </span>
                )}
              </div>

              {menuInputMode === 'text' && (
                <div>
                  <textarea
                    value={menuText}
                    onChange={(e) => setMenuText(e.target.value)}
                    placeholder={"Paste your menu here in any format — items, prices, descriptions, categories..."}
                    rows={6}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none font-mono"
                  />
                  <button
                    onClick={() => void handleMenuTextExtract()}
                    disabled={!menuText.trim() || extractingMenu}
                    className="mt-2 w-full py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-violet-700 transition-colors"
                  >
                    {extractingMenu ? 'Extracting items...' : 'Extract Menu Items →'}
                  </button>
                </div>
              )}

              {(menuInputMode === 'image' || menuInputMode === 'pdf') && (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors">
                  <input
                    type="file"
                    accept={menuInputMode === 'image' ? 'image/*' : '.pdf,application/pdf'}
                    onChange={(e) => void handleMenuFileUpload(e)}
                    className="hidden"
                  />
                  {extractingMenu ? (
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                      Reading your {menuInputMode}...
                    </span>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-slate-400 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                      <span className="text-sm text-slate-500">Click to upload {menuInputMode === 'image' ? 'a photo of your menu' : 'a PDF menu'}</span>
                      <span className="text-xs text-slate-400 mt-1">{menuInputMode === 'image' ? 'JPG, PNG, HEIC, WEBP' : 'PDF'} · up to 10MB</span>
                    </>
                  )}
                </label>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-5 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">Back</button>
              <button onClick={() => setStep(4)} className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700">Continue to Structure</button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Page Structure ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Page Structure</h2>
              <p className="text-sm text-slate-500 mb-8">
                Choose which sections to include and drag them into your preferred order. Hero is always first.
              </p>

              {/* Hero — locked */}
              <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 opacity-60">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-600"><path fillRule="evenodd" d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.062 1.06A.75.75 0 016.11 5.173L5.05 4.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 01-1.062-1.061l1.061-1.06a.75.75 0 011.06 0zM3 8a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H3.75A.75.75 0 013 8zm11 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0114 8z" clipRule="evenodd"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">Hero Banner</p>
                  <p className="text-[11px] text-slate-400">Always first — your main headline and CTA</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">Locked</span>
              </div>

              {/* Reorderable sections */}
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
                      section.enabled
                        ? 'bg-white border-slate-200 hover:border-violet-200'
                        : 'bg-slate-50 border-slate-100 opacity-50'
                    }`}
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => toggleSection(idx)}
                      className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors relative ${section.enabled ? 'bg-violet-600' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${section.enabled ? 'left-5' : 'left-1'}`} />
                    </button>

                    {/* Drag handle / order arrows */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd"/></svg>
                      </button>
                      <button
                        onClick={() => moveSection(idx, 1)}
                        disabled={idx === sections.length - 1}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{section.label}</p>
                      {section.hint && <p className="text-[11px] text-slate-400 mt-0.5">{section.hint}</p>}
                    </div>

                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${section.enabled ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>
                      {section.enabled ? 'On' : 'Off'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-5 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">Back</button>
              <button onClick={() => setStep(5)} className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700">Continue to Style</button>
            </div>
          </div>
        )}

        {/* ── STEP 5 — Style ── */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Choose Your Style</h2>
              <p className="text-sm text-slate-500 mb-8">
                Color scheme and font pairing — pre-selected for your industry, but fully customizable.
              </p>

              {/* Color schemes — 12 total in 4-col grid */}
              <div className="mb-8">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">Color Scheme</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {COLOR_SCHEMES.map((cs) => (
                    <button
                      key={cs.id}
                      onClick={() => setForm_('colorScheme', cs.id)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all ${form.colorScheme === cs.id ? 'border-violet-500 shadow-md shadow-violet-200' : 'border-transparent hover:border-slate-300'}`}
                    >
                      <div style={{ background: cs.bg }} className="h-12 flex items-center justify-center gap-1.5 px-3">
                        <div style={{ background: cs.accent }} className="w-2.5 h-2.5 rounded-full" />
                        <span style={{ color: cs.accent }} className="text-[10px] font-bold">{cs.label}</span>
                      </div>
                      <div className="px-2 py-1.5 bg-white border-t border-slate-100">
                        <p className="text-[10px] text-slate-400">{cs.preview}</p>
                      </div>
                      {form.colorScheme === cs.id && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                      {cs.id === industry.defaultColorScheme && form.colorScheme !== cs.id && (
                        <div className="absolute top-1.5 left-1.5 text-[8px] font-bold uppercase bg-slate-800/60 text-white px-1 py-0.5 rounded-sm">Rec</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font pairings — 8 total in 4-col grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">Font Pairing</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FONT_PAIRINGS.map((fp) => (
                    <button
                      key={fp.id}
                      onClick={() => setForm_('fontPairing', fp.id)}
                      className={`relative p-3.5 rounded-xl border-2 text-left transition-all ${form.fontPairing === fp.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <p className={`text-xl font-bold mb-1 ${fp.id === 'classic' || fp.id === 'literary' ? 'font-serif' : fp.id === 'elegant' || fp.id === 'luxury' || fp.id === 'editorial' ? 'italic' : ''}`}>{fp.sample}</p>
                      <p className="text-xs font-semibold text-slate-700">{fp.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{fp.desc}</p>
                      {fp.id === industry.defaultFontPairing && form.fontPairing !== fp.id && (
                        <div className="absolute top-2 right-2 text-[8px] font-bold uppercase bg-slate-100 text-slate-500 px-1 py-0.5 rounded">Rec</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="px-5 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">Back</button>
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

        {/* ── STEP 6 — Done ── */}
        {step === 6 && result && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">This is your first draft</p>
                <p className="text-sm text-amber-700 leading-relaxed">Use the AI editor to refine copy, swap colors, add sections — anything you need.</p>
              </div>
            </div>

            {result.url && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Live Website</p>
                  <a href={result.url} target="_blank" rel="noreferrer" className="text-violet-600 font-semibold text-sm hover:underline break-all">{result.url}</a>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={result.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors">Visit Site</a>
                  <button onClick={() => void navigator.clipboard.writeText(result.url)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50">Copy Link</button>
                </div>
              </div>
            )}

            {result.html && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-md px-3 py-1.5 text-xs text-slate-400 truncate">{result.url || 'preview'}</div>
                </div>
                <iframe srcDoc={result.html} title="Website Preview" className="w-full" style={{ height: '600px', border: 'none' }} sandbox="allow-same-origin allow-scripts" />
              </div>
            )}

            <button onClick={() => { setStep(3); setResult(null); }} className="w-full py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50">
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
