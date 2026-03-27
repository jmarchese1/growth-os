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

/* ═══════════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

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

  return <span ref={ref} className="tabular-nums">{display}{suffix}</span>;
}

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
    <div className="min-h-screen font-[family-name:var(--font-sans)] text-slate-100" style={{ background: '#0C0E1A' }}>

      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'border-b' : 'bg-transparent'
        }`}
        style={scrolled ? { background: 'rgba(12,14,26,0.88)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.07)' } : {}}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="transition-transform duration-300 group-hover:rotate-12">
              <polygon points="16,4 28,10 16,16 4,10" fill="#7C3AED" />
              <polygon points="4,10 16,16 16,28 4,22" fill="#4C1D95" />
              <polygon points="28,10 16,16 16,28 28,22" fill="#6D28D9" />
            </svg>
            <span className="text-lg font-bold tracking-tight text-white">Embedo</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Platform', href: '#system' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'About', href: '#about' },
            ].map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                {l.label}
              </a>
            ))}
            <CalModal calLink={CAL_LINK}>
              <span className="text-sm text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer">
                Book a Call
              </span>
            </CalModal>
          </div>

          <a href="#pricing" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors duration-200 hover:brightness-110" style={{ background: '#7C3AED' }}>
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden v3-grid-bg">
        {/* Animated orbs */}
        <div className="v3-orb v3-orb-1" style={{ top: '-15%', right: '-5%' }} />
        <div className="v3-orb v3-orb-2" style={{ bottom: '-10%', left: '-5%' }} />
        <div className="v3-orb v3-orb-3" style={{ top: '20%', left: '55%' }} />

        {/* Center radial wash */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 45%, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-300 font-[family-name:var(--font-mono)] tracking-wide" style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)' }}>
              <span className="w-1.5 h-1.5 rounded-full v3-stat-glow" style={{ background: '#7C3AED' }} />
              AI infrastructure for local business
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }} className="mt-8 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-[family-name:var(--font-serif)] italic leading-[0.95] tracking-tight text-white">
            Your business,<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #C4B5FD, #7C3AED, #6D28D9)' }}>
              now runs on AI.
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }} className="mt-7 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Voice agent, chatbot, website, social media, CRM — an entire AI layer deployed to your business in days, not months.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#pricing" className="group inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5" style={{ background: '#7C3AED', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}>
              Generate Custom Proposal <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <CalModal calLink={CAL_LINK}>
              <span className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl text-white transition-all duration-200 cursor-pointer hover:-translate-y-0.5" style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}>
                Book a Call <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </span>
            </CalModal>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.2 }} className="mt-20 flex flex-col items-center gap-2 text-slate-600">
            <span className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em]">Scroll</span>
            <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, #5C6280, transparent)' }} />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ STATS ═══════════════════════ */}
      <Section className="relative py-28 px-6 v3-section-glow" id="stats" >
        {/* Visible alternate bg */}
        <div className="absolute inset-0" style={{ background: '#111427' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(124,58,237,0.10) 0%, transparent 60%)' }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-16 text-center">
            The reality for local business
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i + 1} className="text-center">
                <div className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-4">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="w-12 h-px mx-auto mb-4" style={{ background: 'rgba(124,58,237,0.5)' }} />
                <p className="text-sm text-slate-400 max-w-[240px] mx-auto leading-relaxed">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ THE SYSTEM ═══════════════════════ */}
      <Section className="relative py-28 lg:py-36 px-6 overflow-hidden" id="system">
        {/* Background */}
        <div className="absolute inset-0" style={{ background: '#0C0E1A' }} />
        <div className="v3-orb v3-orb-2" style={{ top: '5%', right: '-10%', opacity: 0.7 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 60% at 75% 30%, rgba(124,58,237,0.08) 0%, transparent 60%)' }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-5">
              The Platform
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight text-white mb-5">
              Eight modules. <span className="text-slate-500">One stack.</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-slate-400 text-lg leading-relaxed">
              Every module works together — voice feeds the CRM, chatbot captures leads, social drives traffic, email nurtures. No duct tape.
            </motion.p>
          </div>

          <div>
            {MODULES.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div key={mod.num} variants={fadeUp} custom={i} className="v3-module-item group grid grid-cols-[auto_1fr] md:grid-cols-[80px_220px_1fr] gap-4 md:gap-8 items-center py-6 px-4 -mx-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs font-[family-name:var(--font-mono)] text-slate-600">{mod.num}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                      <Icon className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors duration-300">{mod.name}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed col-start-2 md:col-start-3">{mod.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <Section className="relative py-28 lg:py-36 px-6 overflow-hidden" id="how">
        {/* Alt bg */}
        <div className="absolute inset-0" style={{ background: '#111427' }} />
        <div className="v3-orb v3-orb-3" style={{ bottom: '-15%', left: '15%', opacity: 0.8 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 60%, rgba(124,58,237,0.08) 0%, transparent 60%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-5 text-center">
            How it works
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-20 text-center text-white">
            Three steps to <span className="text-slate-500">full automation.</span>
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div key={step.num} variants={fadeUp} custom={i + 2} className="relative">
                {i < STEPS.length - 1 && <div className="hidden md:block v3-step-line" />}
                <div className="v3-glass rounded-2xl p-8 h-full">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.30)' }}>
                    <span className="text-lg font-bold text-purple-400 font-[family-name:var(--font-mono)]">{step.num}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ PRICING ═══════════════════════ */}
      <Section className="relative py-28 lg:py-36 px-6 overflow-hidden" id="pricing">
        <div className="absolute inset-0" style={{ background: '#0C0E1A' }} />
        <div className="v3-orb v3-orb-1" style={{ top: '-15%', left: '50%', marginLeft: '-350px', opacity: 0.5 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 25%, rgba(124,58,237,0.10) 0%, transparent 60%)' }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-5 text-center">
            Pricing
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-5 text-center text-white">
            One platform. <span className="text-slate-500">One price.</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-slate-400 text-center max-w-lg mx-auto mb-16">
            Stop paying for 8 different tools. The entire AI stack — connected from day one.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.tier} variants={fadeUp} custom={i + 3} className={`relative rounded-2xl overflow-hidden ${plan.popular ? 'v3-popular-ring' : ''}`}>
                <div className={`h-full v3-glass rounded-2xl ${plan.popular ? 'border-transparent' : ''}`}>
                  {plan.popular && (
                    <div className="text-center py-2" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">Most Popular</span>
                    </div>
                  )}
                  <div className={`px-7 ${plan.popular ? 'pt-7' : 'pt-8'} pb-8`}>
                    <p className="text-[10px] font-bold font-[family-name:var(--font-mono)] tracking-[0.2em] uppercase text-purple-400 mb-1">{plan.tagline}</p>
                    <h3 className="text-xl font-bold text-white mb-5">{plan.name}</h3>
                    <div className="flex items-baseline gap-0.5 mb-6">
                      <span className="text-sm text-slate-500 font-medium">$</span>
                      <span className="text-5xl font-extrabold text-white tracking-tight tabular-nums">{plan.price}</span>
                      <span className="text-sm text-slate-500 font-medium ml-1">/mo</span>
                    </div>
                    <button
                      onClick={() => void handleCheckout(plan.tier)}
                      disabled={loadingTier !== null}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5"
                      style={plan.popular
                        ? { background: '#7C3AED', color: 'white', boxShadow: '0 8px 24px rgba(124,58,237,0.30)' }
                        : { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.10)' }
                      }
                    >
                      {loadingTier === plan.tier ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Redirecting...
                        </span>
                      ) : 'Start 14-Day Free Trial'}
                    </button>
                    <p className="text-center text-[10px] text-slate-500 mt-2.5">No credit card required</p>
                    <div className="h-px my-6" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <div className="space-y-3">
                      {plan.features.map((f) => (
                        <div key={f} className="flex items-start gap-2.5">
                          <ChevronRight className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-300">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} custom={7} className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" />Secured by Stripe</span>
            <span>Cancel anytime</span>
            <span>14-day free trial on all plans</span>
          </motion.div>
        </div>
      </Section>

      {/* ═══════════════════════ ABOUT JASON ═══════════════════════ */}
      <Section className="relative py-28 lg:py-36 px-6 overflow-hidden" id="about">
        <div className="absolute inset-0" style={{ background: '#111427' }} />
        <div className="v3-orb v3-orb-1" style={{ top: '-5%', left: '-10%', opacity: 0.5 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 70% at 25% 50%, rgba(124,58,237,0.08) 0%, transparent 60%)' }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Photo */}
            <motion.div variants={fadeUp} custom={0} className="flex justify-center lg:justify-start order-2 lg:order-1">
              <div className="relative">
                <div className="absolute -inset-12 rounded-3xl" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.20) 0%, transparent 70%)', filter: 'blur(40px)' }} />
                <div className="relative w-80 h-96 sm:w-96 sm:h-[28rem] rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Image src="/workday_photo.jpeg" alt="Jason Marchese, Founder of Embedo" fill className="object-cover" style={{ objectPosition: '50% 8%' }} sizes="(max-width: 768px) 320px, 384px" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #111427 0%, transparent 40%)' }} />
                </div>
              </div>
            </motion.div>

            {/* Bio */}
            <div className="order-1 lg:order-2">
              <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-5">
                Who you&apos;ll be working with
              </motion.p>
              <motion.h2 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-6 text-white">
                Hey, I&apos;m Jason.
              </motion.h2>
              <motion.div variants={fadeUp} custom={2} className="flex flex-wrap gap-2 mb-8">
                {['Senior Data Scientist', 'M.S. Business Analytics', 'Founder, Embedo'].map((badge) => (
                  <span key={badge} className="px-3 py-1 rounded-full text-xs font-medium text-purple-300" style={{ border: '1px solid rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.12)' }}>
                    {badge}
                  </span>
                ))}
              </motion.div>
              <motion.p variants={fadeUp} custom={3} className="text-slate-300 text-lg leading-relaxed mb-4">
                I spent years building AI models at scale as a <span className="text-white font-medium">Senior Data Scientist</span> — and watched small business owners get left completely behind by the technology wave.
              </motion.p>
              <motion.p variants={fadeUp} custom={4} className="text-slate-400 leading-relaxed mb-10">
                Embedo is the platform I wish existed. Me, my team, and our AI agents will be working with you every step of the way — from strategy call to go-live, and beyond.
              </motion.p>
              <motion.div variants={fadeUp} custom={5}>
                <CalModal calLink={CAL_LINK}>
                  <span className="group inline-flex items-center gap-3 px-7 py-4 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer" style={{ background: '#7C3AED', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}>
                    Book a Free Call with Jason <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CalModal>
                <div className="mt-4 flex items-center gap-5 text-xs text-slate-500 font-[family-name:var(--font-mono)]">
                  <span>30 min</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span>No obligation</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span>Free</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="py-16 px-6" style={{ background: '#161A30', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <polygon points="16,4 28,10 16,16 4,10" fill="#7C3AED" />
                  <polygon points="4,10 16,16 16,28 4,22" fill="#4C1D95" />
                  <polygon points="28,10 16,16 16,28 28,22" fill="#6D28D9" />
                </svg>
                <span className="text-lg font-bold tracking-tight text-white">Embedo</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs mb-6">
                AI infrastructure for local businesses. Voice, chat, leads, social, surveys — deployed in days.
              </p>
              <div className="flex gap-3">
                {[
                  { label: 'LinkedIn', href: 'https://linkedin.com/company/embedo', icon: 'linkedin' },
                  { label: 'X', href: 'https://x.com/embedo_ai', icon: 'x' },
                  { label: 'Instagram', href: 'https://instagram.com/embedo.ai', icon: 'instagram' },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:brightness-125" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://api.iconify.design/simple-icons:${s.icon}.svg`} alt={s.label} style={{ width: 13, height: 13, filter: 'brightness(0) invert(1)', opacity: 0.6 }} />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-slate-500 mb-5">Product</p>
              <ul className="space-y-3">
                {[{ label: 'Platform', href: '#system' }, { label: 'Pricing', href: '#pricing' }, { label: 'Book a Call', href: '#about' }].map((link) => (
                  <li key={link.label}><a href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors duration-200">{link.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-slate-500 mb-5">Contact</p>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="mailto:hello@embedo.io" className="hover:text-white transition-colors duration-200">hello@embedo.io</a></li>
                <li className="text-slate-500 text-xs pt-2">Serving local businesses<br />across the United States</li>
              </ul>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/workday_photo.jpeg" alt="Jason Marchese" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white leading-none">Jason Marchese</p>
                  <p className="text-xs text-slate-500 leading-none mt-0.5">Founder &middot; Data Scientist</p>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-slate-500">&copy; 2026 Embedo. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Privacy Policy</a>
              <a href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
