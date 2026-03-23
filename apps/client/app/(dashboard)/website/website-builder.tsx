'use client';

import React, { useState, useCallback, useEffect, type ChangeEvent } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type ColorScheme = 'midnight' | 'warm' | 'forest' | 'ocean' | 'ivory' | 'rose' | 'slate' | 'emerald' | 'amber' | 'crimson' | 'navy' | 'sage';
type FontPairing = 'modern' | 'classic' | 'minimal' | 'elegant' | 'luxury' | 'editorial' | 'tech' | 'literary';
type AnimationPreset = 'none' | 'fade-up' | 'slide-in' | 'scale-reveal' | 'blur-in' | 'stagger-cascade' | 'parallax-drift';
type TemplateId = 'premium' | 'minimal' | 'bold' | 'editorial';
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
    bookingLabel: 'Reservation URL', bookingPlaceholder: 'https://www.opentable.com/your-restaurant',
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

const FONT_PAIRINGS: { id: FontPairing; label: string; desc: string; headingFamily: string; bodyFamily: string }[] = [
  { id: 'modern',    label: 'Modern',    desc: 'Inter — clean & contemporary',      headingFamily: 'Inter, sans-serif',                       bodyFamily: 'Inter, sans-serif' },
  { id: 'classic',   label: 'Classic',   desc: 'Georgia — timeless serif',          headingFamily: 'Georgia, serif',                           bodyFamily: 'Georgia, serif' },
  { id: 'minimal',   label: 'Minimal',   desc: 'System UI — pure & fast',           headingFamily: 'system-ui, -apple-system, sans-serif',     bodyFamily: 'system-ui, -apple-system, sans-serif' },
  { id: 'elegant',   label: 'Elegant',   desc: 'Playfair Display + Lato',           headingFamily: "'Playfair Display', serif",                bodyFamily: "'Lato', sans-serif" },
  { id: 'luxury',    label: 'Luxury',    desc: 'Cormorant Garamond — ultra-refined', headingFamily: "'Cormorant Garamond', serif",              bodyFamily: "'Cormorant Garamond', serif" },
  { id: 'editorial', label: 'Editorial', desc: 'DM Serif Display + DM Sans',        headingFamily: "'DM Serif Display', serif",                bodyFamily: "'DM Sans', sans-serif" },
  { id: 'tech',      label: 'Tech',      desc: 'Space Grotesk — geometric',         headingFamily: "'Space Grotesk', sans-serif",              bodyFamily: "'Space Grotesk', sans-serif" },
  { id: 'literary',  label: 'Literary',  desc: 'Libre Baskerville — classic',       headingFamily: "'Libre Baskerville', serif",               bodyFamily: "'Libre Baskerville', serif" },

];

const ANIMATION_PRESETS: { id: AnimationPreset; label: string; desc: string; preview: string }[] = [
  { id: 'none',             label: 'None',             desc: 'No scroll animations',               preview: 'Clean & instant' },
  { id: 'fade-up',          label: 'Fade Up',          desc: 'Sections fade in and rise gently',    preview: 'Elegant & subtle' },
  { id: 'slide-in',         label: 'Slide In',         desc: 'Alternate left/right entrance',       preview: 'Dynamic & modern' },
  { id: 'scale-reveal',     label: 'Scale Reveal',     desc: 'Sections scale up from small',        preview: 'Bold & cinematic' },
  { id: 'blur-in',          label: 'Blur In',          desc: 'Blur-to-sharp focus effect',          preview: 'Dreamy & premium' },
  { id: 'stagger-cascade',  label: 'Stagger Cascade',  desc: 'Cards animate in sequence',           preview: 'Playful & lively' },
  { id: 'parallax-drift',   label: 'Parallax Drift',   desc: 'Layered depth on scroll',             preview: 'Immersive & deep' },
];

const TEMPLATES: { id: TemplateId; label: string; desc: string; preview: string }[] = [
  { id: 'premium',   label: 'Premium',   desc: 'Full-featured Apple-style layout with all sections',   preview: 'Best for most businesses' },
  { id: 'minimal',   label: 'Minimal',   desc: 'Clean single-page design, fast loading',              preview: 'Simple & elegant' },
  { id: 'bold',      label: 'Bold',      desc: 'Large typography, high contrast, statement design',    preview: 'Stand out from the crowd' },
  { id: 'editorial', label: 'Editorial', desc: 'Magazine-style layout with visual storytelling',       preview: 'For image-heavy brands' },
];

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400&family=Space+Grotesk:wght@300;400;500;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Section + Extra Page state ────────────────────────────────────────────────
interface SectionState {
  id: SectionKey;
  label: string;
  hint?: string;
  locked?: boolean;
  enabled: boolean;
  isPage: boolean; // true = full-height own-page in nav, false = inline section
}

type ExtraPageKey = 'contact' | 'careers' | 'team' | 'faq' | 'locations' | 'press';
interface ExtraPage { id: ExtraPageKey; label: string; slug: string; enabled: boolean; }

const AVAILABLE_EXTRA_PAGES: ExtraPage[] = [
  { id: 'contact',   label: 'Contact',   slug: 'contact',   enabled: false },
  { id: 'careers',   label: 'Careers',   slug: 'careers',   enabled: false },
  { id: 'team',      label: 'Our Team',  slug: 'team',      enabled: false },
  { id: 'faq',       label: 'FAQ',       slug: 'faq',       enabled: false },
  { id: 'locations', label: 'Locations', slug: 'locations', enabled: false },
  { id: 'press',     label: 'Press',     slug: 'press',     enabled: false },
];

function buildSectionState(industry: IndustryConfig): SectionState[] {
  return industry.defaultSections.map((s) => ({
    id: s.id,
    label: s.label,
    hint: s.hint,
    locked: s.locked,
    enabled: s.defaultEnabled,
    isPage: false,
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
  animationPreset: AnimationPreset;
  hours: Record<string, string>;
  menuItems: Array<{ name: string; description: string; price: string; category: string }>;
  galleryImages: string[];
  googleAnalyticsId: string;
  metaPixelId: string;
  template: TemplateId;
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
  const [dreamPrompt, setDreamPrompt] = useState('');
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
    animationPreset: 'fade-up',
    hours: {},
    menuItems: [],
    galleryImages: [],
    googleAnalyticsId: '',
    metaPixelId: '',
    template: 'premium',
  });

  const [sections, setSections] = useState<SectionState[]>(buildSectionState(firstIndustry));
  const [extraPages, setExtraPages] = useState<ExtraPage[]>(AVAILABLE_EXTRA_PAGES.map((p) => ({ ...p })));

  const industry = INDUSTRIES.find((i) => i.id === form.industryType) ?? INDUSTRIES[0]!;

  // Load Google Fonts for font preview cards
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

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

  function togglePageMode(idx: number) {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, isPage: !s.isPage } : s));
  }

  function toggleExtraPage(id: ExtraPageKey) {
    setExtraPages((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p));
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
    // Allow proceeding with just inspiration sites (no scrape URL needed)
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
      const sectionsPayload = sections.map((s) => ({ id: s.id, enabled: s.enabled, isPage: s.isPage }));
      const extraPagesPayload = extraPages.filter((p) => p.enabled).map(({ id, label, slug }) => ({ id, label, slug }));
      const res = await fetch(`${API_URL}/websites/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          businessId,
          sections: sectionsPayload,
          inspirationUrls: inspirationUrls.filter(Boolean),
          dreamPrompt: dreamPrompt || undefined,
          extraPages: extraPagesPayload,
          animationPreset: form.animationPreset,
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

  const hasInspirationUrls = inspirationUrls.some(Boolean);

  // Steps: 1=Industry(conditional) 2=Import 3=Details 4=Structure 6=Done (no Style step)
  const allStepLabels = industryKnown
    ? ['Import', 'Details', 'Structure', 'Done']
    : ['Industry', 'Import', 'Details', 'Structure', 'Done'];

  // Map display step index to logical step number (1-based in state)
  const displayStep = industryKnown ? step - 1 : step;

  return (
    <div className="min-h-screen p-8 animate-fade-up">

      {/* ── Generating overlay ── */}
      {generating && <GeneratingOverlay />}

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
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${done ? 'bg-violet-600 text-white' : active ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-white/[0.06] text-slate-400 dark:text-slate-400'}`}>
                    {done ? <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : n}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-slate-900 dark:text-white' : done ? 'text-violet-600' : 'text-slate-400 dark:text-slate-400'}`}>{label}</span>
                </div>
                {i < allStepLabels.length - 1 && <div className={`flex-1 h-px mx-2 ${done ? 'bg-violet-300' : 'bg-slate-200 dark:bg-white/[0.08]'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">

        {/* ── STEP 1 — Industry (only shown if not auto-detected) ── */}
        {step === 1 && !industryKnown && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">What type of business are you?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">We&apos;ll tailor the design, copy, and AI defaults to your industry.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {INDUSTRIES.map((ind) => {
                  const selected = form.industryType === ind.id;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => selectIndustry(ind)}
                      className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-150 ${selected ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 shadow-md shadow-violet-100 dark:shadow-none' : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/[0.12] hover:shadow-sm'}`}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: ind.iconBg }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={ind.iconColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <path d={ind.icon} />
                        </svg>
                      </div>
                      <p className={`text-sm font-bold mb-0.5 ${selected ? 'text-violet-900 dark:text-violet-300' : 'text-slate-800 dark:text-white'}`}>{ind.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{ind.tagline}</p>
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
          <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8">
            {industryKnown && (
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: industry.iconBg }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={industry.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d={industry.icon} />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{industry.label}</span>
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Import & Inspiration</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Import data from an existing site, add inspiration URLs for style reference, or skip both to start completely fresh.
            </p>

            {/* Existing website — collapsible if not needed */}
            <details className="mb-6" open={!!form.existingWebsiteUrl}>
              <summary className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer select-none mb-2">
                Import from existing website <span className="font-normal text-slate-400 dark:text-slate-400">(optional)</span>
              </summary>
              <input
                type="url"
                placeholder={`https://your${industry.id}.com`}
                value={form.existingWebsiteUrl}
                onChange={(e) => setForm_('existingWebsiteUrl', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-900 dark:text-white dark:bg-white/[0.06] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 mt-2"
              />
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-2">We&apos;ll pull hours, menu, photos, and contact info automatically.</p>
            </details>

            {/* Inspiration websites — prominently displayed */}
            <div className="border-t border-slate-100 dark:border-white/[0.06] pt-6 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white">Style Inspiration</p>
                <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 text-[10px] font-bold rounded-full">Recommended</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">Paste URLs of websites whose look and feel you love. Our AI will screenshot them, extract their design DNA (colors, typography, spacing, layout), and apply that aesthetic to your site. <strong className="text-slate-500 dark:text-slate-400">This is what makes each site unique.</strong></p>
              <div className="space-y-2">
                {inspirationUrls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateInspirationUrl(i, e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-900 dark:text-white dark:bg-white/[0.06] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
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

            {/* Dream prompt — describe what you want */}
            <div className="border-t border-slate-100 dark:border-white/[0.06] pt-6 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white">Or Describe Your Dream Site</p>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded-full">Alternative</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400 mb-3">No inspiration URL? Just describe the look and feel you want. The AI will design from your description.</p>
              <textarea
                value={dreamPrompt}
                onChange={(e) => setDreamPrompt(e.target.value)}
                placeholder="A warm, rustic Italian restaurant site with earth tones, lots of food photography, serif headings, and a cozy feel. Dark background with cream text. The menu should be prominent with categories..."
                rows={3}
                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                className="w-full px-4 py-3 border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm dark:text-white dark:bg-white/[0.06] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>

            <div className="flex gap-3">
              {!industryKnown && <button onClick={() => setStep(1)} className="px-5 py-3 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 font-medium rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-white/[0.04]">Back</button>}
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
                ) : form.existingWebsiteUrl && inspirationUrls.some(Boolean) ? 'Import + Inspiration → Continue'
                  : form.existingWebsiteUrl ? 'Import & Continue'
                  : inspirationUrls.some(Boolean) ? 'Continue with Inspiration'
                  : 'Start Fresh →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Details ── */}
        {step === 3 && (
          <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your {industry.label} Details</h2>
              {scraped && <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full">Auto-filled from your site</span>}
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
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Short Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm_('description', e.target.value)}
                  placeholder={industry.descriptionPlaceholder}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-900 dark:text-white dark:bg-white/[0.06] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
              <Field label="Hero Image URL" value={form.heroImage} onChange={(v) => setForm_('heroImage', v)} placeholder="https://..." />
              <div>
                <Field label={industry.bookingLabel} value={form.bookingUrl} onChange={(v) => setForm_('bookingUrl', v)} placeholder={industry.bookingPlaceholder} />
                {form.industryType === 'restaurant' && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">Most restaurants use <a href="https://www.opentable.com" target="_blank" rel="noreferrer" className="text-violet-500 hover:underline">OpenTable</a>, <a href="https://resy.com" target="_blank" rel="noreferrer" className="text-violet-500 hover:underline">Resy</a>, or <a href="https://www.yelp.com/reservations" target="_blank" rel="noreferrer" className="text-violet-500 hover:underline">Yelp Reservations</a></p>
                )}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Hours <span className="font-normal text-slate-400 dark:text-slate-400">(optional — AI will suggest if left blank)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">{day}</span>
                    <input
                      value={form.hours[day] ?? ''}
                      onChange={(e) => setForm_('hours', { ...form.hours, [day]: e.target.value })}
                      placeholder="11am – 10pm or Closed"
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-700 dark:text-slate-200 dark:bg-white/[0.06] placeholder-slate-300 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* Menu / Services upload */}
            <div className="mb-6 border-t border-slate-100 dark:border-white/[0.06] pt-6">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                {industry.defaultSections.find((s) => s.id === 'menu')?.label ?? 'Menu / Services'}{' '}
                <span className="font-normal text-slate-400 dark:text-slate-400">(optional — upload to auto-populate)</span>
              </label>
              <div className="flex items-center gap-2 mt-3 mb-3">
                {(['text', 'image', 'pdf'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setMenuInputMode(menuInputMode === mode ? null : mode)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${menuInputMode === mode ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400' : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.12]'}`}
                  >
                    {mode === 'text' ? 'Paste Text' : mode === 'image' ? 'Upload Photo' : 'Upload PDF'}
                  </button>
                ))}
                {form.menuItems.length > 0 && (
                  <span className="ml-auto px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full">
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
                    className="w-full px-4 py-3 border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-800 dark:text-white dark:bg-white/[0.06] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none font-mono"
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
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-white/[0.12] rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-500/10 transition-colors">
                  <input
                    type="file"
                    accept={menuInputMode === 'image' ? 'image/*' : '.pdf,application/pdf'}
                    onChange={(e) => void handleMenuFileUpload(e)}
                    className="hidden"
                  />
                  {extractingMenu ? (
                    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                      Reading your {menuInputMode}...
                    </span>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-slate-400 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                      <span className="text-sm text-slate-500 dark:text-slate-400">Click to upload {menuInputMode === 'image' ? 'a photo of your menu' : 'a PDF menu'}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-400 mt-1">{menuInputMode === 'image' ? 'JPG, PNG, HEIC, WEBP' : 'PDF'} · up to 10MB</span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Gallery Images */}
            <div className="mb-6 border-t border-slate-100 dark:border-white/[0.06] pt-6">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Photo Gallery <span className="font-normal text-slate-400 dark:text-slate-400">(paste image URLs — up to 6)</span>
              </label>
              <div className="space-y-2 mt-3">
                {form.galleryImages.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const next = [...form.galleryImages];
                        next[i] = e.target.value;
                        setForm_('galleryImages', next);
                      }}
                      placeholder="https://example.com/photo.jpg"
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-900 dark:text-white dark:bg-white/[0.06] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <button
                      onClick={() => setForm_('galleryImages', form.galleryImages.filter((_, j) => j !== i))}
                      className="px-3 py-2 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0013.25 4.193V3.75A2.75 2.75 0 0010.5 1h-1.75zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-1.5c-.69 0-1.25.56-1.25 1.25v.325C9.327 4.025 10.157 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd"/></svg>
                    </button>
                  </div>
                ))}
              </div>
              {form.galleryImages.length < 6 && (
                <button
                  onClick={() => setForm_('galleryImages', [...form.galleryImages, ''])}
                  className="mt-3 flex items-center gap-1.5 text-xs text-violet-600 font-semibold hover:text-violet-800 transition-colors"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/></svg>
                  Add image URL{form.galleryImages.length > 0 ? ` (${form.galleryImages.length}/6)` : ''}
                </button>
              )}
              {form.galleryImages.filter(Boolean).length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {form.galleryImages.filter(Boolean).map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08]">
                      <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analytics (collapsible) */}
            <details className="mb-6 border-t border-slate-100 dark:border-white/[0.06] pt-6">
              <summary className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer select-none">
                Analytics & Tracking <span className="font-normal text-slate-400 dark:text-slate-400">(optional)</span>
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Field label="Google Analytics ID" value={form.googleAnalyticsId} onChange={(v) => setForm_('googleAnalyticsId', v)} placeholder="G-XXXXXXXXXX" />
                <Field label="Meta Pixel ID" value={form.metaPixelId} onChange={(v) => setForm_('metaPixelId', v)} placeholder="123456789012345" />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2">Tracking codes will be injected into your generated website automatically.</p>
            </details>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-5 py-3 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 font-medium rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-white/[0.04]">Back</button>
              <button onClick={() => setStep(4)} className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700">Continue to Structure</button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Page Structure ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Page Structure</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                Choose which sections to include and drag them into your preferred order. Hero is always first.
              </p>

              {/* Hero — locked */}
              <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-xl mb-3 opacity-60">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-600"><path fillRule="evenodd" d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.062 1.06A.75.75 0 016.11 5.173L5.05 4.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 01-1.062-1.061l1.061-1.06a.75.75 0 011.06 0zM3 8a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H3.75A.75.75 0 013 8zm11 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0114 8z" clipRule="evenodd"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Hero Banner</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400">Always first — your main headline and CTA</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 bg-slate-200 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">Locked</span>
              </div>

              {/* Reorderable sections */}
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
                      section.isPage
                        ? 'bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20'
                        : section.enabled
                        ? 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] hover:border-violet-200'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.04] opacity-50'
                    }`}
                  >
                    {/* Enable toggle */}
                    <button
                      onClick={() => toggleSection(idx)}
                      className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors relative ${section.enabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/[0.12]'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${section.enabled ? 'left-5' : 'left-1'}`} />
                    </button>

                    {/* Order arrows */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd"/></svg>
                      </button>
                      <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{section.label}</p>
                      {section.hint && <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">{section.hint}</p>}
                    </div>

                    {/* Page mode toggle */}
                    <button
                      onClick={() => togglePageMode(idx)}
                      title={section.isPage ? 'Full-page section (click to make inline)' : 'Inline section (click to make a full page)'}
                      className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-colors ${
                        section.isPage
                          ? 'bg-indigo-100 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400'
                          : 'bg-slate-50 dark:bg-white/[0.06] border-slate-200 dark:border-white/[0.08] text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      {section.isPage ? (
                        <>
                          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M8.5 4.75a.75.75 0 00-1.5 0v5.19L5.03 7.97a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.5 9.94V4.75z"/><path d="M3.75 2a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"/></svg>
                          Page
                        </>
                      ) : 'Section'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Additional Pages */}
              <div className="mt-6 border-t border-slate-100 dark:border-white/[0.06] pt-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Additional Pages</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">Standalone pages with their own nav links and AI-generated content — perfect for Contact, Careers, Team pages.</p>
                <div className="grid grid-cols-3 gap-2">
                  {extraPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => toggleExtraPage(page.id)}
                      className={`px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                        page.enabled ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15' : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/[0.12]'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${page.enabled ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>{page.label}</p>
                      <p className={`text-[10px] mt-0.5 font-mono ${page.enabled ? 'text-violet-400' : 'text-slate-400 dark:text-slate-400'}`}>/{page.slug}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nav Preview */}
              <div className="mt-6 px-4 py-3.5 rounded-xl" style={{ background: '#0c0c10' }}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Nav Preview</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-bold text-white mr-2">Logo</span>
                  {sections.filter((s) => s.enabled && !s.isPage).slice(0, 4).map((s) => (
                    <span key={s.id} className="text-[11px] text-slate-400">{s.label}</span>
                  ))}
                  {sections.filter((s) => s.isPage).map((s) => (
                    <span key={s.id} className="text-[11px] text-indigo-400 font-semibold">{s.label} ↗</span>
                  ))}
                  {extraPages.filter((p) => p.enabled).map((p) => (
                    <span key={p.id} className="text-[11px] text-violet-400 font-semibold">{p.label} ↗</span>
                  ))}
                  <span className="ml-auto text-[10px] bg-violet-600 text-white px-3 py-1 rounded-full">Reserve</span>
                </div>
              </div>
            </div>

            {hasInspirationUrls && (
              <div className="bg-violet-50 dark:bg-violet-500/15 border border-violet-100 dark:border-violet-500/20 rounded-xl p-4 flex gap-3 items-start">
                <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-600"><path d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.062 1.06A.75.75 0 016.11 5.173L5.05 4.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 01-1.062-1.061l1.061-1.06a.75.75 0 011.06 0zM3 8a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H3.75A.75.75 0 013 8zm11 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0114 8z" clipRule="evenodd"/></svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-violet-800 dark:text-violet-300">AI will design your site from scratch</p>
                  <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5">Since you provided inspiration URLs, the AI will generate a completely custom layout, colors, typography, and CSS — no templates. You can fine-tune everything after with the AI editor.</p>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-5 py-3 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 font-medium rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-white/[0.04]">Back</button>
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="flex-1 py-3.5 bg-violet-600 text-white font-bold rounded-xl text-sm hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : `Generate My ${industry.label} Website`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5 — Style ── */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Choose Your Style</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                Pick a template, color scheme, font, and scroll animation.
              </p>

              {/* Template selector */}
              <div className="mb-8">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">Template</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {TEMPLATES.map((tmpl) => {
                    const selected = form.template === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => setForm_('template', tmpl.id)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${selected ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 shadow-md shadow-violet-100 dark:shadow-none' : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.12] bg-white dark:bg-white/[0.04]'}`}
                      >
                        <div className="w-full h-16 rounded-lg mb-3 overflow-hidden" style={{ background: tmpl.id === 'premium' ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' : tmpl.id === 'minimal' ? '#fafafa' : tmpl.id === 'bold' ? 'linear-gradient(135deg, #000 0%, #1a0030 100%)' : 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d0 100%)' }}>
                          <div className="flex items-end justify-center h-full pb-2">
                            <div className="flex gap-1">
                              {[1, 2, 3].map(n => (
                                <div key={n} className="rounded" style={{ width: tmpl.id === 'bold' ? 18 : 14, height: tmpl.id === 'editorial' ? 20 : 10, background: tmpl.id === 'minimal' ? '#ddd' : tmpl.id === 'editorial' ? '#c8b8a0' : 'rgba(255,255,255,0.2)' }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className={`text-[11px] font-bold ${selected ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>{tmpl.label}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">{tmpl.desc}</p>
                        {selected && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                            <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color schemes — 12 total in 4-col grid */}
              <div className="mb-8">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">Color Scheme</label>
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
                      <div className="px-2 py-1.5 bg-white dark:bg-white/[0.04] border-t border-slate-100 dark:border-white/[0.06]">
                        <p className="text-[10px] text-slate-400 dark:text-slate-400">{cs.preview}</p>
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

              {/* Font pairings — 8 total in 2x4 grid with real font previews */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">Font Pairing</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FONT_PAIRINGS.map((fp) => {
                    const selected = form.fontPairing === fp.id;
                    const recommended = fp.id === industry.defaultFontPairing && !selected;
                    return (
                      <button
                        key={fp.id}
                        onClick={() => setForm_('fontPairing', fp.id)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${selected ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 shadow-md shadow-violet-100 dark:shadow-none' : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.12] bg-white dark:bg-white/[0.04]'}`}
                      >
                        {/* Live font preview */}
                        <div className="mb-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                          <p style={{ fontFamily: fp.headingFamily, fontSize: '15px', fontWeight: 700, lineHeight: 1.2, color: '#0f172a', marginBottom: '4px' }}>
                            The Art of Dining
                          </p>
                          <p style={{ fontFamily: fp.bodyFamily, fontSize: '11px', lineHeight: 1.5, color: '#64748b' }}>
                            Every evening becomes a memory.
                          </p>
                        </div>
                        <p className={`text-[11px] font-bold ${selected ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>{fp.label}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">{fp.desc}</p>
                        {selected && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                            <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                        {recommended && (
                          <div className="absolute top-2 right-2 text-[8px] font-bold uppercase bg-slate-100 text-slate-500 px-1 py-0.5 rounded">Rec</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scroll Animations */}
              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/[0.06]">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Scroll Animations</label>
                <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">Sections animate into view as visitors scroll. Powered by native CSS scroll-driven animations.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ANIMATION_PRESETS.map((ap) => {
                    const selected = form.animationPreset === ap.id;
                    return (
                      <button
                        key={ap.id}
                        onClick={() => setForm_('animationPreset', ap.id)}
                        className={`relative p-3.5 rounded-xl border-2 text-left transition-all ${selected ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 shadow-md shadow-violet-100 dark:shadow-none' : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.12] bg-white dark:bg-white/[0.04]'}`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${selected ? 'bg-violet-500' : 'bg-slate-100'}`}>
                            {ap.id === 'none' ? (
                              <svg viewBox="0 0 16 16" fill={selected ? 'white' : '#94a3b8'} className="w-3 h-3"><path d="M3 8h10M8 3v10" stroke={selected ? 'white' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
                            ) : ap.id === 'fade-up' ? (
                              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><path d="M8 12V4m-3 3l3-3 3 3" stroke={selected ? 'white' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            ) : ap.id === 'slide-in' ? (
                              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><path d="M2 8h12M10 5l3 3-3 3" stroke={selected ? 'white' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            ) : ap.id === 'scale-reveal' ? (
                              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><rect x="4" y="4" width="8" height="8" rx="2" stroke={selected ? 'white' : '#94a3b8'} strokeWidth="1.5"/><rect x="2" y="2" width="12" height="12" rx="3" stroke={selected ? 'white' : '#94a3b8'} strokeWidth="1" opacity="0.4"/></svg>
                            ) : ap.id === 'blur-in' ? (
                              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><circle cx="8" cy="8" r="3" stroke={selected ? 'white' : '#94a3b8'} strokeWidth="1.5"/><circle cx="8" cy="8" r="6" stroke={selected ? 'white' : '#94a3b8'} strokeWidth="1" opacity="0.3"/></svg>
                            ) : ap.id === 'stagger-cascade' ? (
                              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><rect x="2" y="3" width="3" height="3" rx="0.5" fill={selected ? 'white' : '#94a3b8'}/><rect x="6.5" y="5" width="3" height="3" rx="0.5" fill={selected ? 'white' : '#94a3b8'} opacity="0.7"/><rect x="11" y="7" width="3" height="3" rx="0.5" fill={selected ? 'white' : '#94a3b8'} opacity="0.4"/></svg>
                            ) : (
                              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><path d="M3 13L8 3l5 10" stroke={selected ? 'white' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 9h6" stroke={selected ? 'white' : '#94a3b8'} strokeWidth="1" opacity="0.5"/></svg>
                            )}
                          </div>
                          <span className={`text-[11px] font-bold ${selected ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>{ap.label}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-snug">{ap.desc}</p>
                        <p className="text-[8px] text-slate-300 mt-1">{ap.preview}</p>
                        {selected && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                            <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="px-5 py-3 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 font-medium rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-white/[0.04]">Back</button>
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
            <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5 flex gap-4">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/15 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">This is your first draft</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">Use the AI editor to refine copy, swap colors, add sections — anything you need.</p>
              </div>
            </div>

            {result.url && (
              <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Your Live Website</p>
                  <a href={result.url} target="_blank" rel="noreferrer" className="text-violet-600 font-semibold text-sm hover:underline break-all">{result.url}</a>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={result.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors">Visit Site</a>
                  <button onClick={() => void navigator.clipboard.writeText(result.url)} className="px-4 py-2 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04]">Copy Link</button>
                </div>
              </div>
            )}

            {result.html && (
              <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 bg-slate-100 dark:bg-white/[0.06] rounded-md px-3 py-1.5 text-xs text-slate-400 dark:text-slate-400 truncate">{result.url || 'preview'}</div>
                </div>
                <iframe srcDoc={result.html} title="Website Preview" className="w-full" style={{ height: '600px', border: 'none' }} sandbox="allow-same-origin allow-scripts" />
              </div>
            )}

            <button onClick={() => { setStep(3); setResult(null); }} className="w-full py-3 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 font-medium rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-white/[0.04]">
              Regenerate with different settings
            </button>
          </div>
        )}
      </div>{/* end max-w-3xl */}
    </div>
  );
}

// ── Generating Overlay with fun rotating messages ────────────────────────────
const LOADING_MESSAGES = [
  // Classics
  'Wiring things up...', 'Connecting the dots...', 'Stitching it together...',
  'Snapping pieces into place...', 'Tightening the bolts...', 'Laying the foundation...',
  // Playful
  'Aligning the pixels...', 'Herding the divs...', 'Untangling spaghetti...',
  'Polishing the edges...', 'Shuffling the deck...', 'Tuning the knobs...',
  // Builder vibes
  'Sketching things out...', 'Mixing the colors...', 'Arranging the furniture...',
  'Hanging the curtains...', 'Painting the walls...', 'Sweeping up the sawdust...',
  // Charming
  'Convincing the buttons to behave...', 'Negotiating with the layout...',
  'Giving it a pep talk...', 'Poking it with a stick...', 'Asking nicely...',
  'Shaking out the wrinkles...', 'Feeding the hamsters...',
  // Originals
  'Conbobulating the pixels...', 'Majestifying your brand...',
  'Teaching AI about good taste...', 'Making it look expensive...',
  'Crafting your digital storefront...', 'Optimizing the vibes...',
];

function GeneratingOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    // Start with random message
    setMsgIndex(Math.floor(Math.random() * LOADING_MESSAGES.length));
    const interval = setInterval(() => {
      setMsgIndex((prev) => {
        let next = prev;
        // Avoid showing the same message twice in a row
        while (next === prev) next = Math.floor(Math.random() * LOADING_MESSAGES.length);
        return next;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
      style={{ background: 'rgba(10,8,20,0.88)', backdropFilter: 'blur(10px)' }}
    >
      <EmbedoCube size={64} />
      <div className="text-center">
        <p className="text-white text-xl font-semibold mb-2">Building your website...</p>
        <p
          key={msgIndex}
          className="text-violet-300/70 text-sm"
          style={{ animation: 'fadeInMsg 0.5s ease-out' }}
        >
          {LOADING_MESSAGES[msgIndex]}
        </p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-400"
            style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
      <style>{`@keyframes fadeInMsg{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}`}</style>
    </div>
  );
}

// ── Embedo Cube Loading Animation ─────────────────────────────────────────────
function EmbedoCube({ size = 48 }: { size?: number }) {
  const h = size / 2;
  const face = (transform: string, bg: string): React.CSSProperties => ({
    position: 'absolute', width: size, height: size,
    background: bg, border: '1px solid rgba(196,181,253,0.15)', transform,
  });
  return (
    <>
      <style>{`@keyframes embedo-cube-spin{from{transform:rotateX(-22deg) rotateY(0deg)}to{transform:rotateX(-22deg) rotateY(360deg)}}`}</style>
      <div style={{ width: size, height: size, perspective: size * 4, display: 'inline-block' }}>
        <div style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d', animation: 'embedo-cube-spin 1.8s linear infinite' }}>
          <div style={face(`translateZ(${h}px)`,          'rgba(124,58,237,0.95)')} />
          <div style={face(`rotateY(180deg) translateZ(${h}px)`, 'rgba(91,33,182,0.95)')} />
          <div style={face(`rotateY(90deg) translateZ(${h}px)`,  'rgba(109,40,217,0.9)')} />
          <div style={face(`rotateY(-90deg) translateZ(${h}px)`, 'rgba(109,40,217,0.9)')} />
          <div style={face(`rotateX(90deg) translateZ(${h}px)`,  'rgba(167,139,250,0.95)')} />
          <div style={face(`rotateX(-90deg) translateZ(${h}px)`, 'rgba(76,29,149,0.95)')} />
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-900 dark:text-white dark:bg-white/[0.06] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
      />
    </div>
  );
}
