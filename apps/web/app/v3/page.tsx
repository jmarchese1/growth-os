'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import {
  Phone, MessageSquare, Globe, Share2, QrCode,
  Mail, PhoneCall, Sparkles, ArrowRight, Shield,
  ChevronRight, ExternalLink,
} from 'lucide-react';
import CalModal from '@/components/booking/CalendlyModal';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.embedo.io';
const CAL_LINK = process.env['NEXT_PUBLIC_CAL_LINK'] ?? 'jason-marchese-mkfkwl/30min';

const MODULES = [
  { num: '01', name: 'Voice Agent', desc: 'Answers every call 24/7. Takes orders, books reservations, captures leads — in a natural voice.', icon: Phone },
  { num: '02', name: 'AI Chatbot', desc: 'Web widget + Instagram & Facebook DMs. Engages visitors, answers questions, never sleeps.', icon: MessageSquare },
  { num: '03', name: 'AI Website', desc: 'Professional site generated in 30 seconds. Fully editable. Deployed to your domain instantly.', icon: Globe },
  { num: '04', name: 'Social Media', desc: 'AI creates, schedules, and monitors posts across platforms. Hands-free content engine.', icon: Share2 },
  { num: '05', name: 'QR + Surveys', desc: 'Smart QR codes at every table. Instant feedback collection and contact capture.', icon: QrCode },
  { num: '06', name: 'CRM + Email', desc: 'Unified customer database with AI-drafted campaigns. Every touchpoint, one place.', icon: Mail },
  { num: '07', name: 'Dedicated Phone', desc: 'Local number with intelligent routing. AI handles after-hours, you handle peak.', icon: PhoneCall },
  { num: '08', name: 'White-Glove Setup', desc: 'We configure everything end-to-end. Your AI stack goes live in days, not months.', icon: Sparkles },
];

const STATS = [
  { value: 73, suffix: '%', label: 'of calls to restaurants go unanswered' },
  { value: 68, suffix: '%', label: 'of website visitors leave without engaging' },
  { value: 4, suffix: 'x', label: 'more conversions when follow-up is under 5 min' },
];

const STEPS = [
  { num: '01', title: 'Strategy call', desc: '30 minutes with Jason. We audit your current stack and map the gaps.' },
  { num: '02', title: 'We build your AI layer', desc: 'Voice, chat, website, social, CRM — configured for your business.' },
  { num: '03', title: 'Go live + optimize', desc: 'Launch in days. We monitor, tune, and improve continuously.' },
];

interface Plan {
  tier: string;
  name: string;
  price: number;
  tagline: string;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    tier: 'SOLO', name: 'Solo', price: 249, tagline: 'For solo operators',
    features: ['500 contacts', 'AI Voice Agent + phone', 'AI Website + Chatbot', '10 QR codes, 5 surveys', '100 emails/mo', '50 AI images/mo'],
  },
  {
    tier: 'SMALL', name: 'Small', price: 399, tagline: 'Most popular', popular: true,
    features: ['2,000 contacts', '3 chatbot widgets', 'Social media automation', 'Email sequences', '1,000 emails/mo', '200 AI images/mo', 'Unlimited surveys'],
  },
  {
    tier: 'MEDIUM', name: 'Medium', price: 549, tagline: 'For growing teams',
    features: ['10,000 contacts', '10 chatbot widgets', '3 phone numbers', '100 social posts/mo', '10,000 emails/mo', '500 AI images/mo', 'Priority support'],
  },
];

/* ═══════════════════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ═══════════════════════════════════════════════════════════
   HELPER: Animated counter
   ═══════════════════════════════════════════════════════════ */

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(eased * value));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}{suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION WRAPPER (scroll reveal)
   ═══════════════════════════════════════════════════════════ */

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════ */

export default function V3Page() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCheckout = async (tier: string) => {
    setLoadingTier(tier);
    try {
      const res = await fetch(`${API_BASE}/billing/public-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          successUrl: `${APP_URL}/login?checkout=success&tier=${tier}`,
          cancelUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
    } catch (err) {
      console.error('checkout failed:', err);
    }
    window.location.href = `${APP_URL}/login?plan=${tier}&signup=1`;
    setLoadingTier(null);
  };

  return (
    <div className="min-h-screen font-[family-name:var(--font-sans)] text-[var(--v3-text)]" style={{ background: 'var(--v3-bg)' }}>

      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#09090B]/80 backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="transition-transform duration-300 group-hover:rotate-12">
              <polygon points="16,4 28,10 16,16 4,10" fill="#7C3AED" />
              <polygon points="4,10 16,16 16,28 4,22" fill="#4C1D95" />
              <polygon points="28,10 16,16 16,28 28,22" fill="#6D28D9" />
            </svg>
            <span className="text-lg font-bold tracking-tight">Embedo</span>
          </a>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Platform', href: '#system' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'About', href: '#about' },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-[var(--v3-text-muted)] hover:text-white transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
            <CalModal calLink={CAL_LINK}>
              <span className="text-sm text-[var(--v3-text-muted)] hover:text-white transition-colors duration-200 cursor-pointer">
                Book a Call
              </span>
            </CalModal>
          </div>

          {/* CTA */}
          <a
            href="#pricing"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--v3-accent)] text-white hover:bg-[#6D28D9] transition-colors duration-200"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden v3-grid-bg">
        {/* Orbs */}
        <div className="v3-orb v3-orb-hero" />
        <div className="v3-orb v3-orb-hero-2" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24 text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-[var(--v3-text-muted)] font-[family-name:var(--font-mono)] tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--v3-accent)] v3-stat-glow" />
              AI infrastructure for local business
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-8 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-[family-name:var(--font-serif)] italic leading-[0.95] tracking-tight"
          >
            Your business,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--v3-accent-light)] to-[var(--v3-accent)]">
              now runs on AI.
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-7 text-lg sm:text-xl text-[var(--v3-text-muted)] max-w-2xl mx-auto leading-relaxed"
          >
            Voice agent, chatbot, website, social media, CRM — an entire AI layer
            deployed to your business in days, not months.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="#proposal"
              className="group inline-flex items-center gap-2 px-7 py-3.5 bg-[var(--v3-accent)] text-white text-sm font-semibold rounded-xl hover:bg-[#6D28D9] transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-purple-900/30"
            >
              Generate Custom Proposal
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <CalModal calLink={CAL_LINK}>
              <span className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl border border-white/[0.12] text-white hover:border-white/[0.25] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer">
                Book a Call
                <ExternalLink className="w-3.5 h-3.5 text-[var(--v3-text-dim)]" />
              </span>
            </CalModal>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="mt-20 flex flex-col items-center gap-2 text-[var(--v3-text-dim)]"
          >
            <span className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em]">Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-[var(--v3-text-dim)] to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ STATS ═══════════════════════ */}
      <Section className="py-24 px-6 border-y border-white/[0.04]" id="stats">
        <div className="max-w-6xl mx-auto">
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-[var(--v3-accent-light)] mb-16 text-center"
          >
            The reality for local business
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                custom={i + 1}
                className="text-center"
              >
                <div className="text-6xl sm:text-7xl font-bold tracking-tight text-white mb-3">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-sm text-[var(--v3-text-muted)] max-w-[260px] mx-auto leading-relaxed">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ THE SYSTEM ═══════════════════════ */}
      <Section className="py-28 lg:py-36 px-6" id="system">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-20">
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-[var(--v3-accent-light)] mb-5"
            >
              The Platform
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-5"
            >
              Eight modules.{' '}
              <span className="text-[var(--v3-text-muted)]">One stack.</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-[var(--v3-text-muted)] text-lg leading-relaxed"
            >
              Every module works together — voice feeds the CRM, chatbot captures leads,
              social drives traffic, email nurtures. No duct tape.
            </motion.p>
          </div>

          {/* Module list — staggered editorial layout */}
          <div className="space-y-0">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div
                  key={mod.num}
                  variants={fadeUp}
                  custom={i}
                  className="v3-module-item group grid grid-cols-[auto_1fr] md:grid-cols-[80px_200px_1fr] gap-4 md:gap-8 items-start py-7 border-b border-white/[0.04] cursor-default"
                >
                  {/* Number */}
                  <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--v3-text-dim)] pt-1">
                    {mod.num}
                  </span>

                  {/* Name + Icon */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--v3-accent)]/10 border border-[var(--v3-accent)]/20 flex items-center justify-center group-hover:bg-[var(--v3-accent)]/20 transition-colors duration-300">
                      <Icon className="w-4 h-4 text-[var(--v3-accent-light)]" />
                    </div>
                    <span className="text-base font-semibold text-white group-hover:text-[var(--v3-accent-light)] transition-colors duration-300">
                      {mod.name}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[var(--v3-text-muted)] leading-relaxed col-start-2 md:col-start-3">
                    {mod.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <Section className="py-28 lg:py-36 px-6 border-t border-white/[0.04]" id="how">
        <div className="max-w-5xl mx-auto">
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-[var(--v3-accent-light)] mb-5 text-center"
          >
            How it works
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-20 text-center"
          >
            Three steps to{' '}
            <span className="text-[var(--v3-text-muted)]">full automation.</span>
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                custom={i + 2}
                className="relative"
              >
                {/* Connector line (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block v3-step-line" />
                )}

                <div className="v3-glass rounded-2xl p-8 h-full">
                  {/* Step number */}
                  <div className="w-14 h-14 rounded-xl bg-[var(--v3-accent)]/10 border border-[var(--v3-accent)]/20 flex items-center justify-center mb-6">
                    <span className="text-lg font-bold text-[var(--v3-accent-light)] font-[family-name:var(--font-mono)]">
                      {step.num}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-[var(--v3-text-muted)] leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ PRICING ═══════════════════════ */}
      <Section className="py-28 lg:py-36 px-6 border-t border-white/[0.04]" id="pricing">
        <div className="max-w-6xl mx-auto">
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-[var(--v3-accent-light)] mb-5 text-center"
          >
            Pricing
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-5 text-center"
          >
            One platform.{' '}
            <span className="text-[var(--v3-text-muted)]">One price.</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-[var(--v3-text-muted)] text-center max-w-lg mx-auto mb-16"
          >
            Stop paying for 8 different tools. The entire AI stack — connected from day one.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.tier}
                variants={fadeUp}
                custom={i + 3}
                className={`relative rounded-2xl overflow-hidden ${
                  plan.popular ? 'v3-popular-ring' : ''
                }`}
              >
                <div className={`h-full v3-glass rounded-2xl ${plan.popular ? 'border-transparent' : ''}`}>
                  {plan.popular && (
                    <div className="bg-gradient-to-r from-[var(--v3-accent)] to-[var(--v3-accent-light)] text-center py-2">
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className={`px-7 ${plan.popular ? 'pt-7' : 'pt-8'} pb-8`}>
                    <p className="text-[10px] font-bold font-[family-name:var(--font-mono)] tracking-[0.2em] uppercase text-[var(--v3-accent-light)] mb-1">
                      {plan.tagline}
                    </p>
                    <h3 className="text-xl font-bold text-white mb-5">{plan.name}</h3>

                    <div className="flex items-baseline gap-0.5 mb-6">
                      <span className="text-sm text-[var(--v3-text-dim)] font-medium">$</span>
                      <span className="text-5xl font-extrabold text-white tracking-tight tabular-nums">
                        {plan.price}
                      </span>
                      <span className="text-sm text-[var(--v3-text-dim)] font-medium ml-1">/mo</span>
                    </div>

                    <button
                      onClick={() => void handleCheckout(plan.tier)}
                      disabled={loadingTier !== null}
                      className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                        plan.popular
                          ? 'bg-[var(--v3-accent)] text-white hover:bg-[#6D28D9] shadow-lg shadow-purple-900/25 hover:-translate-y-0.5'
                          : 'bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.10] hover:border-white/[0.15] hover:-translate-y-0.5'
                      }`}
                    >
                      {loadingTier === plan.tier ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Redirecting...
                        </span>
                      ) : (
                        'Start 14-Day Free Trial'
                      )}
                    </button>
                    <p className="text-center text-[10px] text-[var(--v3-text-dim)] mt-2.5">No credit card required</p>

                    <div className="h-px bg-white/[0.06] my-6" />

                    <div className="space-y-3">
                      {plan.features.map((f) => (
                        <div key={f} className="flex items-start gap-2.5">
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--v3-accent-light)] flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-[var(--v3-text-muted)]">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <motion.div
            variants={fadeUp}
            custom={7}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-xs text-[var(--v3-text-dim)]"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Secured by Stripe
            </span>
            <span>Cancel anytime</span>
            <span>14-day free trial on all plans</span>
          </motion.div>
        </div>
      </Section>

      {/* ═══════════════════════ ABOUT JASON ═══════════════════════ */}
      <Section className="py-28 lg:py-36 px-6 border-t border-white/[0.04]" id="about">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Photo */}
            <motion.div variants={fadeUp} custom={0} className="flex justify-center lg:justify-start order-2 lg:order-1">
              <div className="relative">
                {/* Glow behind photo */}
                <div
                  className="absolute -inset-8 rounded-3xl opacity-40"
                  style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }}
                />
                <div className="relative w-80 h-96 sm:w-96 sm:h-[28rem] rounded-2xl overflow-hidden border border-white/[0.08]">
                  <Image
                    src="/workday_photo.jpeg"
                    alt="Jason Marchese, Founder of Embedo"
                    fill
                    className="object-cover"
                    style={{ objectPosition: '50% 8%' }}
                    sizes="(max-width: 768px) 320px, 384px"
                  />
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--v3-bg)] via-transparent to-transparent opacity-60" />
                </div>
              </div>
            </motion.div>

            {/* Bio */}
            <div className="order-1 lg:order-2">
              <motion.p
                variants={fadeUp}
                custom={0}
                className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-[var(--v3-accent-light)] mb-5"
              >
                Who you&apos;ll be working with
              </motion.p>

              <motion.h2
                variants={fadeUp}
                custom={1}
                className="text-4xl sm:text-5xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-6"
              >
                Hey, I&apos;m Jason.
              </motion.h2>

              {/* Badges */}
              <motion.div variants={fadeUp} custom={2} className="flex flex-wrap gap-2 mb-8">
                {['Senior Data Scientist', 'M.S. Business Analytics', 'Founder, Embedo'].map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 rounded-full text-xs font-medium border border-[var(--v3-accent)]/30 bg-[var(--v3-accent)]/10 text-[var(--v3-accent-light)]"
                  >
                    {badge}
                  </span>
                ))}
              </motion.div>

              <motion.p variants={fadeUp} custom={3} className="text-[var(--v3-text-muted)] text-lg leading-relaxed mb-4">
                I spent years building AI models at scale as a{' '}
                <span className="text-white font-medium">Senior Data Scientist</span> — and watched
                small business owners get left completely behind by the technology wave.
              </motion.p>

              <motion.p variants={fadeUp} custom={4} className="text-[var(--v3-text-dim)] leading-relaxed mb-10">
                Embedo is the platform I wish existed. Me, my team, and our AI agents will be
                working with you every step of the way — from strategy call to go-live, and beyond.
              </motion.p>

              <motion.div variants={fadeUp} custom={5}>
                <CalModal calLink={CAL_LINK}>
                  <span className="group inline-flex items-center gap-3 px-7 py-4 bg-[var(--v3-accent)] text-white text-sm font-semibold rounded-xl hover:bg-[#6D28D9] transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-purple-900/30 cursor-pointer">
                    Book a Free Call with Jason
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CalModal>

                <div className="mt-4 flex items-center gap-5 text-xs text-[var(--v3-text-dim)] font-[family-name:var(--font-mono)]">
                  <span>30 min</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--v3-text-dim)]" />
                  <span>No obligation</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--v3-text-dim)]" />
                  <span>Free</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="border-t border-white/[0.04] py-16 px-6" style={{ background: 'var(--v3-surface)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <polygon points="16,4 28,10 16,16 4,10" fill="#7C3AED" />
                  <polygon points="4,10 16,16 16,28 4,22" fill="#4C1D95" />
                  <polygon points="28,10 16,16 16,28 28,22" fill="#6D28D9" />
                </svg>
                <span className="text-lg font-bold tracking-tight">Embedo</span>
              </div>
              <p className="text-sm text-[var(--v3-text-dim)] leading-relaxed max-w-xs mb-6">
                AI infrastructure for local businesses. Voice, chat, leads, social, surveys — deployed in days.
              </p>

              {/* Social links */}
              <div className="flex gap-3">
                {[
                  { label: 'LinkedIn', href: 'https://linkedin.com/company/embedo', icon: 'linkedin' },
                  { label: 'X', href: 'https://x.com/embedo_ai', icon: 'x' },
                  { label: 'Instagram', href: 'https://instagram.com/embedo.ai', icon: 'instagram' },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-center hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.iconify.design/simple-icons:${s.icon}.svg`}
                      alt={s.label}
                      style={{ width: 13, height: 13, filter: 'brightness(0) invert(1)', opacity: 0.5 }}
                    />
                  </a>
                ))}
              </div>
            </div>

            {/* Nav */}
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-[var(--v3-text-dim)] mb-5">
                Product
              </p>
              <ul className="space-y-3">
                {[
                  { label: 'Platform', href: '#system' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'Book a Call', href: '#about' },
                ].map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-[var(--v3-text-muted)] hover:text-white transition-colors duration-200">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-[var(--v3-text-dim)] mb-5">
                Contact
              </p>
              <ul className="space-y-3 text-sm text-[var(--v3-text-muted)]">
                <li>
                  <a href="mailto:hello@embedo.io" className="hover:text-white transition-colors duration-200">
                    hello@embedo.io
                  </a>
                </li>
                <li className="text-[var(--v3-text-dim)] text-xs pt-2">
                  Serving local businesses
                  <br />across the United States
                </li>
              </ul>

              {/* Founder badge */}
              <div className="mt-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/[0.08] flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/workday_photo.jpeg"
                    alt="Jason Marchese"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%' }}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white leading-none">Jason Marchese</p>
                  <p className="text-xs text-[var(--v3-text-dim)] leading-none mt-0.5">Founder &middot; Data Scientist</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[var(--v3-text-dim)]">&copy; 2026 Embedo. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-[var(--v3-text-dim)] hover:text-[var(--v3-text-muted)] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-[var(--v3-text-dim)] hover:text-[var(--v3-text-muted)] transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
