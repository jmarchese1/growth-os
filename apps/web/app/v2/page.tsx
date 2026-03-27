'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import './v2.css';

/* ═══════════════════════════════════════════════════════════════
   V2 Landing Page — Dark Editorial Aesthetic
   Direction: Linear.app meets Stripe dark mode
   Palette: Deep charcoal (#06060b) + emerald/teal accents
   Typography: Outfit (display) + Plus Jakarta Sans (body)
   ═══════════════════════════════════════════════════════════════ */

// ── Scroll Reveal Hook ──────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Also reveal children with v2-reveal class
            entry.target.querySelectorAll('.v2-reveal').forEach((child) => {
              child.classList.add('visible');
            });
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    observer.observe(el);
    el.querySelectorAll('.v2-reveal').forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ── Bento Card Mouse Tracking ────────────────────────────────────
function BentoCard({
  children,
  className = '',
  span = '',
}: {
  children: React.ReactNode;
  className?: string;
  span?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMouse = useCallback((e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    cardRef.current?.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    cardRef.current?.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouse}
      className={`v2-bento-card rounded-2xl border border-white/[0.06] bg-[var(--v2-surface)] p-6 lg:p-8 ${span} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Animated Counter ─────────────────────────────────────────────
function Counter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setVisible(true); },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <span
      ref={ref}
      className="inline-block"
      style={{
        animation: visible ? 'v2-count-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
        opacity: visible ? undefined : 0,
      }}
    >
      {value}{suffix}
    </span>
  );
}

// ── Nav ──────────────────────────────────────────────────────────
function V2Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(6,6,11,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(1.4)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/v2" className="flex items-center gap-2.5 group">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <polygon points="16,4 28,10 16,16 4,10" fill="#10b981" />
            <polygon points="4,10 16,16 16,28 4,22" fill="#065f46" />
            <polygon points="28,10 16,16 16,28 28,22" fill="#059669" />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors"
            style={{ fontFamily: 'var(--font-display, Outfit)' }}>
            embedo
          </span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {['System', 'Pricing', 'About'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              className="px-3 py-1.5 text-[13px] text-white/40 hover:text-white/80 transition-colors rounded-lg hover:bg-white/[0.04]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#proposal"
            className="px-5 py-2 text-[13px] font-semibold rounded-full bg-emerald-500 text-black hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Get Proposal
          </a>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────
function V2Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden v2-mesh v2-dots">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 60%)', animation: 'v2-glow-pulse 5s ease-in-out infinite' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 60%)', animation: 'v2-glow-pulse 7s ease-in-out infinite 2s' }} />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Status pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] mb-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-emerald-400/90"
            style={{ fontFamily: 'var(--font-body)' }}>
            Deploying AI for local businesses
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-[-0.03em] leading-[1.05] text-white mb-7"
          style={{ fontFamily: 'var(--font-display, Outfit)' }}
        >
          Your entire business,
          <br />
          <span className="v2-text-gradient">running on AI.</span>
        </h1>

        {/* Sub */}
        <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed mb-12"
          style={{ fontFamily: 'var(--font-body)' }}>
          One platform deploys voice agents, chatbots, lead engines, social automation,
          and a generated website into your business.{' '}
          <span className="text-white/70 font-medium">Live in days, not months.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#proposal"
            className="group px-8 py-3.5 rounded-full bg-emerald-500 text-black text-sm font-semibold transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Generate Custom Proposal
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </a>
          <a
            href="#book"
            className="px-8 py-3.5 rounded-full border border-white/10 text-white/70 text-sm font-medium hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Schedule a Call
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <div className="w-5 h-8 rounded-full border border-white/10 flex items-start justify-center pt-1.5">
          <div className="w-0.5 h-2 bg-white/20 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}

// ── Ticker ───────────────────────────────────────────────────────
const TICKER_ITEMS = [
  'Voice Receptionist', 'Lead Capture', 'Social Automation',
  'AI Chatbot', 'Website Generation', 'Survey Engine',
  'Appointment Booking', 'Email Sequences', 'Proposal Engine', 'QR Codes',
];

function V2Ticker() {
  const strip = TICKER_ITEMS.map((item, i) => (
    <span key={i} className="inline-flex items-center">
      <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/20"
        style={{ fontFamily: 'var(--font-body)' }}>
        {item}
      </span>
      <span className="mx-6 w-1 h-1 rounded-full bg-emerald-500/30" />
    </span>
  ));
  return (
    <div className="relative overflow-hidden border-y border-white/[0.04] py-4" style={{ background: 'var(--v2-bg)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-r from-[var(--v2-bg)] to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-l from-[var(--v2-bg)] to-transparent" />
      <div className="flex whitespace-nowrap v2-ticker">
        {strip}{strip}
      </div>
    </div>
  );
}

// ── Stats ────────────────────────────────────────────────────────
const STATS = [
  { value: '73%', label: 'of inbound calls go unanswered during peak hours' },
  { value: '68%', label: 'of website visitors leave without making contact' },
  { value: '4x', label: 'more revenue from leads followed up within 5 minutes' },
];

function V2Stats() {
  const ref = useScrollReveal();
  return (
    <section ref={ref} className="py-20 px-6 v2-reveal" style={{ background: 'var(--v2-bg)' }}>
      <div className="max-w-6xl mx-auto">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-emerald-500/70 mb-3"
          style={{ fontFamily: 'var(--font-body)' }}>The problem</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/90 mb-4"
          style={{ fontFamily: 'var(--font-display)' }}>
          Every missed touchpoint is <span className="v2-text-gradient">revenue lost.</span>
        </h2>
        <p className="text-white/30 text-base max-w-xl mb-14" style={{ fontFamily: 'var(--font-body)' }}>
          Local businesses run on relationships. But without AI, they can&apos;t scale the ones that matter.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.06]">
          {STATS.map((s) => (
            <div key={s.value} className="p-8 bg-[var(--v2-surface)]">
              <p className="text-4xl md:text-5xl font-bold v2-text-gradient mb-3"
                style={{ fontFamily: 'var(--font-display)' }}>
                <Counter value={s.value} />
              </p>
              <p className="text-sm text-white/35 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── System Bento Grid ────────────────────────────────────────────
const MODULES = [
  {
    tag: '01',
    name: 'AI Voice Receptionist',
    desc: 'A 24/7 AI phone agent handles every call — reservations, questions, lead capture. No more missed calls, ever.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-emerald-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    span: 'md:col-span-2',
  },
  {
    tag: '02',
    name: 'AI Website Chatbot',
    desc: 'Engages every visitor, books appointments, captures leads — across web, Instagram, and Facebook.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-cyan-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    span: '',
  },
  {
    tag: '03',
    name: 'Lead Generation Engine',
    desc: 'Every channel feeds one database. Automated SMS + email sequences follow up instantly.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-amber-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    span: '',
  },
  {
    tag: '04',
    name: 'Social Media Automation',
    desc: 'AI generates content, schedules posts, monitors comments, auto-DMs engaged followers.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-pink-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
    span: 'md:col-span-2',
  },
  {
    tag: '05',
    name: 'AI Website Generation',
    desc: 'A modern, high-converting website generated and deployed in 30 seconds — fully editable.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-violet-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    span: '',
  },
  {
    tag: '06',
    name: 'Survey & Feedback',
    desc: 'Post-visit surveys capture sentiment. Responses trigger personalized re-engagement.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-emerald-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    span: '',
  },
  {
    tag: '07',
    name: 'Appointment Scheduling',
    desc: 'Seamless booking with automatic reminders. Reduce no-shows without lifting a finger.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-cyan-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    span: '',
  },
  {
    tag: '08',
    name: 'Automated Follow-Ups',
    desc: 'SMS and email sequences triggered by every action. No lead goes cold.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-amber-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    span: 'md:col-span-2',
  },
];

function V2System() {
  const ref = useScrollReveal();
  return (
    <section id="system" ref={ref} className="py-24 px-6 v2-reveal" style={{ background: 'var(--v2-bg)' }}>
      <div className="max-w-6xl mx-auto">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-emerald-500/70 mb-3"
          style={{ fontFamily: 'var(--font-body)' }}>The system</p>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/90 mb-4"
          style={{ fontFamily: 'var(--font-display)' }}>
          One platform. <span className="v2-text-gradient">Eight AI modules.</span>
        </h2>
        <p className="text-white/30 text-base max-w-xl mb-14" style={{ fontFamily: 'var(--font-body)' }}>
          A complete AI infrastructure stack — every module connected, working together, deployed in days.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 v2-stagger">
          {MODULES.map((mod) => (
            <BentoCard key={mod.tag} span={mod.span}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  {mod.icon}
                </div>
                <span className="text-[10px] font-mono text-white/20">{mod.tag}</span>
              </div>
              <h3 className="text-base font-semibold text-white/85 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                {mod.name}
              </h3>
              <p className="text-sm text-white/30 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {mod.desc}
              </p>
            </BentoCard>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────
const PLANS = [
  {
    tier: 'Solo',
    price: 249,
    tagline: 'For solo operators',
    features: ['500 contacts', 'AI Voice Agent + phone number', 'AI Website + Chatbot', '10 QR codes, 5 surveys', '100 emails/mo', '50 AI images/mo'],
  },
  {
    tier: 'Small',
    price: 399,
    tagline: 'Most popular',
    popular: true,
    features: ['2,000 contacts', '3 chatbot widgets', 'Social media automation', 'Email sequences', '1,000 emails/mo', '200 AI images/mo', 'Unlimited surveys'],
  },
  {
    tier: 'Medium',
    price: 549,
    tagline: 'For growing teams',
    features: ['10,000 contacts', '10 chatbot widgets', '3 phone numbers', '100 social posts/mo', 'Unlimited email sequences', '10,000 emails/mo', '500 AI images/mo', 'Priority support'],
  },
];

function V2Pricing() {
  const ref = useScrollReveal();
  return (
    <section id="pricing" ref={ref} className="py-24 px-6 v2-reveal" style={{ background: 'var(--v2-surface)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-emerald-500/70 mb-3"
            style={{ fontFamily: 'var(--font-body)' }}>Pricing</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/90 mb-4"
            style={{ fontFamily: 'var(--font-display)' }}>
            Everything included. <span className="v2-text-gradient">One price.</span>
          </h2>
          <p className="text-white/30 text-base max-w-lg mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            Stop paying for 8 different tools. The entire AI stack — connected from day one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-2xl p-6 transition-all duration-300 ${
                plan.popular
                  ? 'bg-[var(--v2-bg)] border-2 border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.08)]'
                  : 'bg-[var(--v2-bg)] border border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold tracking-[0.15em] uppercase text-black">
                  Most Popular
                </div>
              )}

              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-emerald-500/70 mb-1"
                style={{ fontFamily: 'var(--font-body)' }}>{plan.tagline}</p>
              <h3 className="text-lg font-bold text-white/90 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                {plan.tier}
              </h3>

              <div className="flex items-baseline gap-0.5 mb-6">
                <span className="text-sm text-white/30">$</span>
                <span className="text-4xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  {plan.price}
                </span>
                <span className="text-sm text-white/30 ml-1">/mo</span>
              </div>

              <a
                href="#proposal"
                className={`block w-full py-3 rounded-xl text-sm font-semibold text-center transition-all ${
                  plan.popular
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                    : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Start 14-Day Free Trial
              </a>
              <p className="text-center text-[10px] text-white/20 mt-2" style={{ fontFamily: 'var(--font-body)' }}>
                No credit card required
              </p>

              <div className="h-px bg-white/[0.06] my-5" />

              <div className="space-y-2.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500/60 flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-white/35" style={{ fontFamily: 'var(--font-body)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-10 text-[11px] text-white/20"
          style={{ fontFamily: 'var(--font-body)' }}>
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-500/50">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Secured by Stripe
          </span>
          <span>Cancel anytime</span>
          <span>14-day free trial on all plans</span>
        </div>
      </div>
    </section>
  );
}

// ── About / Book a Call ──────────────────────────────────────────
function V2About() {
  const ref = useScrollReveal();
  return (
    <section id="about" ref={ref} className="py-24 px-6 v2-reveal" style={{ background: 'var(--v2-bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Photo */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              {/* Glow behind */}
              <div className="absolute -inset-8 rounded-3xl pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
              <div className="relative w-72 h-72 lg:w-80 lg:h-80 rounded-2xl overflow-hidden border border-white/[0.08]"
                style={{ boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }}>
                <Image
                  src="/workday_photo.jpeg"
                  alt="Jason Marchese, Founder of Embedo"
                  fill
                  className="object-cover"
                  style={{ objectPosition: '50% 8%' }}
                  sizes="320px"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-emerald-500/70 mb-3"
              style={{ fontFamily: 'var(--font-body)' }}>Who you&apos;ll be talking to</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/90 mb-6"
              style={{ fontFamily: 'var(--font-display)' }}>
              Hey, I&apos;m Jason.
            </h2>

            <div className="flex flex-wrap gap-2 mb-6">
              {['Senior Data Scientist', 'M.S. Business Analytics', 'Founder, Embedo'].map((b) => (
                <span key={b} className="px-3 py-1 rounded-full text-[11px] font-medium border border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-400/80"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  {b}
                </span>
              ))}
            </div>

            <p className="text-white/40 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              I&apos;m a{' '}
              <span className="text-white/70 font-medium">Senior Data Scientist</span> and
              M.S. Business Analytics graduate who spent years building AI models at scale —
              and watched small business owners get left behind by the technology wave.
            </p>
            <p className="text-white/30 leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
              Embedo is the platform I wish existed. Me, my team, and our AI agents will be
              working with you <span className="text-emerald-400/80 font-medium">every step of the way</span>.
            </p>

            <div id="book">
              <a
                href={`https://cal.com/${process.env['NEXT_PUBLIC_CAL_LINK'] ?? 'jason-marchese-mkfkwl/30min'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_40px_rgba(16,185,129,0.25)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Book a Free Call with Jason
                <span>&rarr;</span>
              </a>
              <div className="mt-4 flex items-center gap-5 text-[12px] text-white/25" style={{ fontFamily: 'var(--font-body)' }}>
                <span>30 minutes</span>
                <span className="w-0.5 h-0.5 rounded-full bg-white/15" />
                <span>No obligation</span>
                <span className="w-0.5 h-0.5 rounded-full bg-white/15" />
                <span>Free</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Proposal CTA ─────────────────────────────────────────────────
function V2Proposal() {
  const ref = useScrollReveal();
  const [step, setStep] = useState<'idle' | 'form' | 'loading' | 'done'>('idle');
  const [form, setForm] = useState({
    businessName: '', industry: 'restaurant', size: 'small',
    location: '', goals: '', contactName: '', contactEmail: '',
  });
  const [proposalUrl, setProposalUrl] = useState('');

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');
    try {
      const res = await fetch(
        `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3008'}/proposals/generate`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) },
      );
      const data = (await res.json()) as { shareUrl: string };
      setProposalUrl(data.shareUrl);
      setStep('done');
    } catch {
      setStep('form');
    }
  };

  const inputCls = 'w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/30 focus:bg-white/[0.04] transition-colors';
  const labelCls = 'block text-[11px] font-medium text-white/30 mb-1.5';

  return (
    <section id="proposal" ref={ref} className="py-24 px-6 v2-reveal relative overflow-hidden"
      style={{ background: 'var(--v2-surface)' }}>
      {/* Gradient mesh */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 70% 30%, rgba(16,185,129,0.04) 0%, transparent 60%)' }} />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: illustration */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative" style={{ animation: 'v2-float 6s ease-in-out infinite' }}>
              <div className="w-72 h-80 rounded-2xl border border-white/[0.06] bg-[var(--v2-bg)] p-6 shadow-2xl shadow-black/40">
                {/* Mock proposal document */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-emerald-400">AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 w-20 rounded bg-white/10" />
                    <div className="h-1.5 w-14 rounded bg-white/[0.05] mt-1" />
                  </div>
                </div>
                <div className="h-1.5 w-full rounded bg-gradient-to-r from-emerald-500/30 to-cyan-500/10 mb-3" />
                <div className="space-y-2">
                  <div className="h-1.5 w-full rounded bg-white/[0.05]" />
                  <div className="h-1.5 w-4/5 rounded bg-white/[0.05]" />
                  <div className="h-1.5 w-3/4 rounded bg-white/[0.05]" />
                </div>
                <div className="h-px bg-white/[0.04] my-4" />
                <div className="flex gap-2">
                  <div className="h-5 w-14 rounded-full bg-emerald-500/10" />
                  <div className="h-5 w-14 rounded-full bg-cyan-500/[0.07]" />
                  <div className="h-5 w-14 rounded-full bg-amber-500/[0.07]" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-1.5 w-full rounded bg-white/[0.04]" />
                  <div className="h-1.5 w-3/5 rounded bg-white/[0.04]" />
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div className="h-2 w-20 rounded bg-gradient-to-r from-emerald-500/20 to-transparent" />
                  <div className="h-7 w-16 rounded-lg bg-emerald-500/20" />
                </div>
              </div>
              {/* Floating sparkles */}
              <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-emerald-500/20 blur-sm"
                style={{ animation: 'v2-glow-pulse 3s ease-in-out infinite' }} />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-cyan-500/15 blur-sm"
                style={{ animation: 'v2-glow-pulse 4s ease-in-out infinite 1s' }} />
            </div>
          </div>

          {/* Right: copy + form */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-emerald-500/70 mb-3"
              style={{ fontFamily: 'var(--font-body)' }}>Custom proposal</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/90 mb-4"
              style={{ fontFamily: 'var(--font-display)' }}>
              See exactly what <span className="v2-text-gradient">AI</span>
              <br />can do for your business.
            </h2>
            <p className="text-white/30 text-base mb-8" style={{ fontFamily: 'var(--font-body)' }}>
              A <span className="text-white/60 font-medium">custom proposal generated in seconds</span> —
              specific to your business, industry, and goals.
            </p>

            {step === 'idle' && (
              <button
                onClick={() => setStep('form')}
                className="px-7 py-3 rounded-full bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Generate Custom Proposal &rarr;
              </button>
            )}

            {step === 'form' && (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} style={{ fontFamily: 'var(--font-body)' }}>Business Name *</label>
                    <input required value={form.businessName} onChange={(e) => update('businessName', e.target.value)}
                      className={inputCls} style={{ fontFamily: 'var(--font-body)' }} placeholder="The Golden Fork" />
                  </div>
                  <div>
                    <label className={labelCls} style={{ fontFamily: 'var(--font-body)' }}>Industry</label>
                    <select value={form.industry} onChange={(e) => update('industry', e.target.value)}
                      className={inputCls} style={{ fontFamily: 'var(--font-body)' }}>
                      <option value="restaurant">Restaurant</option>
                      <option value="salon">Salon / Spa</option>
                      <option value="fitness">Fitness Studio</option>
                      <option value="retail">Retail</option>
                      <option value="medical">Medical / Dental</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} style={{ fontFamily: 'var(--font-body)' }}>Business Size</label>
                    <select value={form.size} onChange={(e) => update('size', e.target.value)}
                      className={inputCls} style={{ fontFamily: 'var(--font-body)' }}>
                      <option value="solo">Just me</option>
                      <option value="small">2-10 employees</option>
                      <option value="medium">11-50 employees</option>
                      <option value="large">50+ employees</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} style={{ fontFamily: 'var(--font-body)' }}>Location *</label>
                    <input required value={form.location} onChange={(e) => update('location', e.target.value)}
                      className={inputCls} style={{ fontFamily: 'var(--font-body)' }} placeholder="Austin, TX" />
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: 'var(--font-body)' }}>Biggest challenge (optional)</label>
                  <textarea value={form.goals} onChange={(e) => update('goals', e.target.value)}
                    rows={2} className={`${inputCls} resize-none`} style={{ fontFamily: 'var(--font-body)' }}
                    placeholder="e.g. We miss too many calls. Social media is inconsistent." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} style={{ fontFamily: 'var(--font-body)' }}>Your Name</label>
                    <input value={form.contactName} onChange={(e) => update('contactName', e.target.value)}
                      className={inputCls} style={{ fontFamily: 'var(--font-body)' }} placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className={labelCls} style={{ fontFamily: 'var(--font-body)' }}>Email *</label>
                    <input required type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)}
                      className={inputCls} style={{ fontFamily: 'var(--font-body)' }} placeholder="jane@restaurant.com" />
                  </div>
                </div>
                <button type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-all"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  Generate My Proposal &rarr;
                </button>
              </form>
            )}

            {step === 'loading' && (
              <div className="py-10 text-center">
                <div className="w-7 h-7 border-2 border-white/10 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-white/30" style={{ fontFamily: 'var(--font-body)' }}>Generating your custom proposal...</p>
              </div>
            )}

            {step === 'done' && (
              <div className="py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white/90 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  Your proposal is ready.
                </h3>
                <p className="text-sm text-white/30 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
                  A custom AI transformation proposal for your business.
                </p>
                <a href={proposalUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-block px-7 py-3 rounded-full bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-all"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  View Your Proposal &rarr;
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────
function V2Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-14 px-6" style={{ background: 'var(--v2-bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <polygon points="16,4 28,10 16,16 4,10" fill="#10b981" />
                <polygon points="4,10 16,16 16,28 4,22" fill="#065f46" />
                <polygon points="28,10 16,16 16,28 28,22" fill="#059669" />
              </svg>
              <span className="text-sm font-semibold text-white/80" style={{ fontFamily: 'var(--font-display)' }}>embedo</span>
            </div>
            <p className="text-sm text-white/20 max-w-xs leading-relaxed mb-5" style={{ fontFamily: 'var(--font-body)' }}>
              AI infrastructure for local businesses. Voice, chat, leads, social, surveys,
              and more — deployed in days.
            </p>
            <div className="flex gap-2.5">
              {[
                { label: 'LinkedIn', href: 'https://linkedin.com/company/embedo', icon: 'linkedin' },
                { label: 'X', href: 'https://x.com/embedo_ai', icon: 'x' },
                { label: 'Instagram', href: 'https://instagram.com/embedo.ai', icon: 'instagram' },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-center hover:border-white/[0.12] hover:bg-white/[0.05] transition-all">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://api.iconify.design/simple-icons:${s.icon}.svg`} alt={s.label}
                    style={{ width: 12, height: 12, filter: 'brightness(0) invert(1)', opacity: 0.4 }} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/20 mb-4"
              style={{ fontFamily: 'var(--font-body)' }}>Product</p>
            <ul className="space-y-2.5">
              {['The System', 'Pricing', 'Book a Call', 'Custom Proposal'].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase().replace(/ /g, '-')}`}
                    className="text-sm text-white/25 hover:text-white/60 transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}>{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/20 mb-4"
              style={{ fontFamily: 'var(--font-body)' }}>Contact</p>
            <ul className="space-y-2.5 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              <li><a href="mailto:hello@embedo.io" className="text-white/25 hover:text-white/60 transition-colors">hello@embedo.io</a></li>
              <li><a href="#book" className="text-white/25 hover:text-white/60 transition-colors">Book a strategy call</a></li>
            </ul>
            <div className="mt-5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/[0.08] flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/workday_photo.jpeg" alt="Jason" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%' }} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/50">Jason Marchese</p>
                <p className="text-[10px] text-white/20">Founder</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/15" style={{ fontFamily: 'var(--font-body)' }}>
            &copy; 2026 Embedo. All rights reserved.
          </p>
          <div className="flex gap-5">
            <a href="#" className="text-[11px] text-white/15 hover:text-white/30 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}>Privacy</a>
            <a href="#" className="text-[11px] text-white/15 hover:text-white/30 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function V2Page() {
  return (
    <main className="v2-grain" style={{ background: 'var(--v2-bg)', color: 'var(--v2-text)' }}>
      <V2Nav />
      <V2Hero />
      <V2Ticker />
      <V2Stats />
      <V2System />
      <V2Pricing />
      <V2About />
      <V2Proposal />
      <V2Footer />
    </main>
  );
}
