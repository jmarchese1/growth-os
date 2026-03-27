'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Phone, MessageSquare, Globe, Share2, QrCode,
  Mail, PhoneCall, Sparkles, ArrowRight, Shield,
  ChevronRight, ExternalLink, Check, Zap, Gift, Clock, MapPin,
} from 'lucide-react';
import CalModal from '@/components/booking/CalendlyModal';
import InteractiveGrid from './v3/InteractiveGrid';
import CubeyChat from '@/components/ui/CubeyChat';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.embedo.io';
const CAL_LINK = process.env['NEXT_PUBLIC_CAL_LINK'] ?? 'jason-marchese-mkfkwl/30min';

const MODULES = [
  { num: '01', name: 'AI Voice Agent', desc: 'Answers every call 24/7 in a natural voice. Takes orders, books tables, captures leads while you focus on running the floor.', icon: Phone, value: '$400/mo' },
  { num: '02', name: 'AI Chatbot', desc: 'Embedded on your website, Instagram, and Facebook. Answers questions, takes orders, and captures contact info around the clock.', icon: MessageSquare, value: '$200/mo' },
  { num: '03', name: 'AI Website', desc: 'A premium, conversion-optimized site generated and deployed in 48 hours. Fully editable. Your domain.', icon: Globe, value: '$300/mo' },
  { num: '04', name: 'Social Media Engine', desc: 'AI writes, designs, schedules, and posts content across all platforms. Monitors comments. Auto-replies to DMs.', icon: Share2, value: '$350/mo' },
  { num: '05', name: 'Smart Surveys + QR', desc: 'QR codes at every table. Instant feedback, review requests, and contact capture on autopilot.', icon: QrCode, value: '$150/mo' },
  { num: '06', name: 'CRM + Email Engine', desc: 'Every customer, every touchpoint, one place. AI-drafted campaigns, automated follow-ups, birthday specials.', icon: Mail, value: '$300/mo' },
  { num: '07', name: 'Dedicated AI Phone', desc: 'A local phone number with intelligent routing. AI handles after-hours and overflow. You handle what matters.', icon: PhoneCall, value: '$200/mo' },
  { num: '08', name: 'White-Glove Onboarding', desc: 'We set up everything for you. Menu training, voice calibration, social accounts, domain config. Live in 48 hours.', icon: Sparkles, value: '$500' },
];

const STATS = [
  { value: 73, suffix: '%', label: 'of calls to local businesses go unanswered' },
  { value: 15, suffix: '+', label: 'hours per week wasted on tasks AI can handle' },
  { value: 2160, suffix: '', prefix: '$', label: 'saved per month vs. buying 8 separate tools' },
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

const BONUSES = [
  { name: '48-Hour Priority Launch', value: 500, desc: 'Skip the line. Your entire AI stack goes live within 48 hours of signing up.' },
  { name: 'Custom Menu + Business Training', value: 300, desc: 'We train your voice agent and chatbot on your actual menu, services, FAQs, and policies.' },
  { name: 'Dedicated Onboarding Specialist', value: 200, desc: 'A real human configures everything for you. Domain, socials, voice calibration, CRM import.' },
];

/* ═══════════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 1.1, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

const fadeScale = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 1.1, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

const slideIn = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.8, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

const ROTATING_WORDS = ['runs on autopilot.', 'never sleeps.', 'works while you rest.', 'runs itself now.', 'operates 24/7.', 'is fully automated.'];

function RotatingText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block align-bottom" style={{ lineHeight: 1.3 }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={ROTATING_WORDS[index]}
          initial={{ opacity: 0, rotateX: 60, filter: 'blur(4px)' }}
          animate={{ opacity: 1, rotateX: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, rotateX: -60, filter: 'blur(4px)' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block text-transparent bg-clip-text v3-shimmer-text"
          style={{
            backgroundImage: 'linear-gradient(90deg, #C4B5FD, #7C3AED, #A78BFA, #C4B5FD)',
            transformOrigin: 'center bottom',
            lineHeight: 1.3,
            paddingBottom: '0.15em',
          }}
        >
          {ROTATING_WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Counter({ value, suffix, prefix }: { value: number; suffix: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(eased * value));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return <span ref={ref} className="tabular-nums">{prefix}{display.toLocaleString()}{suffix}</span>;
}

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
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
    <div className="min-h-screen font-[family-name:var(--font-sans)] text-slate-100" style={{ background: '#10132A' }}>

      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'border-b' : 'bg-transparent'}`}
        style={scrolled ? { background: 'rgba(16,19,42,0.90)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.08)' } : {}}
      >
        <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <motion.svg whileHover={{ rotate: 15, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }} width="28" height="28" viewBox="0 0 32 32" fill="none">
              <polygon points="16,4 28,10 16,16 4,10" fill="#7C3AED" />
              <polygon points="4,10 16,16 16,28 4,22" fill="#4C1D95" />
              <polygon points="28,10 16,16 16,28 28,22" fill="#6D28D9" />
            </motion.svg>
            <span className="text-lg font-bold tracking-tight text-white">Embedo</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Platform', href: '#system' },
              { label: 'The Offer', href: '#offer' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'About', href: '#about' },
            ].map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors duration-200">{l.label}</a>
            ))}
            <CalModal calLink={CAL_LINK}>
              <span className="text-sm text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer">Book a Call</span>
            </CalModal>
          </div>

          <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} href="#pricing" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white v3-btn-glow" style={{ background: '#7C3AED' }}>
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </motion.a>
        </div>
      </motion.nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <InteractiveGrid />
        {/* Warm accent blob */}
        <div className="absolute w-[35%] aspect-square top-[18%] right-[8%] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56, 189, 248, 0.13) 0%, transparent 55%)', filter: 'blur(70px)', animation: 'v3-morph-3 16s ease-in-out infinite' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-200 font-[family-name:var(--font-mono)] tracking-wide" style={{ border: '1px solid rgba(124,58,237,0.30)', background: 'rgba(124,58,237,0.10)' }}>
              <span className="w-1.5 h-1.5 rounded-full v3-stat-glow" style={{ background: '#A78BFA' }} />
              AI infrastructure for local business
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }} className="mt-8 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-[family-name:var(--font-serif)] italic leading-[0.95] tracking-tight text-white">
            Your business,<br />
            <RotatingText />
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-7 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Replace 8 different tools with one AI platform. Voice agent, chatbot, website, social media, CRM &mdash; deployed to your business in 48 hours.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.65 }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <CalModal calLink={CAL_LINK}>
              <motion.span whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} className="group inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold rounded-xl cursor-pointer v3-btn-glow" style={{ background: '#7C3AED' }}>
                Book a Free Strategy Call <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.span>
            </CalModal>
            <motion.a whileHover={{ scale: 1.04, y: -2 }} href="#offer" className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl text-white" style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}>
              See The Offer <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </motion.a>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.85 }} className="mt-5 text-sm text-slate-400">
            Or just email <a href="mailto:jason@embedo.io" className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2">jason@embedo.io</a> &mdash; happy to answer any questions.
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.4 }} className="mt-20 flex flex-col items-center gap-2 text-slate-500">
            <span className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em]">Scroll</span>
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="w-px h-8" style={{ background: 'linear-gradient(to bottom, #7C3AED, transparent)' }} />
          </motion.div>
        </div>
      </section>

      {/* Animated divider */}
      <div className="v3-divider mx-auto" style={{ maxWidth: '70%' }} />

      {/* ═══════════════════════ STATS ═══════════════════════ */}
      <Section className="relative py-32 px-6 v3-section-glow" id="stats">
        <div className="absolute inset-0" style={{ background: '#161B3A' }} />
        <div className="v3-mesh-blob v3-mesh-section-1" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(124,58,237,0.12) 0%, transparent 55%)' }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-16 text-center">
            The reality for local business
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} variants={fadeScale} custom={i + 1} className="text-center">
                <div className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-4 v3-stat-number">
                  <Counter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                </div>
                <div className="w-12 h-px mx-auto mb-4" style={{ background: 'rgba(124,58,237,0.6)' }} />
                <p className="text-base text-slate-300 max-w-[280px] mx-auto leading-relaxed">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <div className="v3-divider mx-auto" style={{ maxWidth: '70%' }} />

      {/* ═══════════════════════ THE SYSTEM ═══════════════════════ */}
      <Section className="relative py-32 lg:py-40 px-6 overflow-hidden" id="system">
        <div className="absolute inset-0" style={{ background: '#10132A' }} />
        <div className="v3-mesh-blob v3-mesh-section-2" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="max-w-2xl mb-20">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-5">The Platform</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight text-white mb-5">
              Eight modules. <span className="text-slate-400">One platform.</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-slate-300 text-lg leading-relaxed">
              Every module works together. Voice feeds the CRM. Chatbot captures leads. Social drives traffic. Email nurtures. No duct tape. No integrations. It just works.
            </motion.p>
          </div>

          <div>
            {MODULES.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div key={mod.num} variants={slideIn} custom={i} className="v3-module-item group grid grid-cols-[auto_1fr_auto] md:grid-cols-[80px_240px_1fr_auto] gap-4 md:gap-8 items-center py-7 px-4 -mx-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-xs font-[family-name:var(--font-mono)] text-slate-500">{mod.num}</span>
                  <div className="flex items-center gap-3">
                    <div className="v3-icon-box w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.30)' }}>
                      <Icon className="w-4.5 h-4.5 text-purple-400" />
                    </div>
                    <span className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors duration-300">{mod.name}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed col-start-2 md:col-start-3 col-span-2 md:col-span-1">{mod.desc}</p>
                  <span className="hidden md:block text-xs font-[family-name:var(--font-mono)] text-red-400/60 text-right line-through">{mod.value}</span>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={fadeUp} custom={10} className="mt-10 pt-8 rounded-2xl" style={{ borderTop: '1px solid rgba(124,58,237,0.25)' }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Purchased separately</p>
                <span className="text-2xl font-bold text-red-400/70 line-through">$2,400/mo</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400 mb-1">With Embedo &mdash; everything included</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-emerald-400 font-medium">Starting at</span>
                  <span className="text-4xl font-extrabold text-white">$249</span>
                  <span className="text-sm text-slate-400">/mo</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center mt-6">
              <motion.a whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} href="#pricing" className="group inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold rounded-xl v3-btn-glow" style={{ background: '#7C3AED' }}>
                See Plans <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.a>
            </div>
          </motion.div>
        </div>
      </Section>

      <div className="v3-divider mx-auto" style={{ maxWidth: '70%' }} />

      {/* ═══════════════════════ THE OFFER ═══════════════════════ */}
      <Section className="relative py-32 lg:py-40 px-6 overflow-hidden" id="offer">
        <div className="absolute inset-0" style={{ background: '#161B3A' }} />
        <div className="v3-mesh-blob v3-mesh-section-3" />
        <div className="absolute w-[30%] aspect-square bottom-[10%] right-[5%] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 55%)', filter: 'blur(65px)', animation: 'v3-morph-1 20s ease-in-out infinite' }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-5 text-center">The Offer</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-6 text-center text-white">
            Here&apos;s exactly what<br className="hidden sm:block" /> you&apos;re getting.
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-slate-300 text-center max-w-2xl mx-auto mb-16 text-lg">
            Not a demo. Not a trial of one feature. The full AI stack &mdash; configured, deployed, and running for your business.
          </motion.p>

          {/* ROI headline cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
            {[
              { num: '$25,920', label: 'saved per year vs. separate tools', color: 'text-emerald-400' },
              { num: '15+', label: 'hours freed up every single week', color: 'text-purple-300' },
              { num: '48h', label: 'from signup to fully live', color: 'text-amber-400' },
            ].map((item, i) => (
              <motion.div key={item.label} variants={fadeScale} custom={i + 3} className="v3-glass rounded-2xl p-7 text-center">
                <p className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${item.color}`}>{item.num}</p>
                <p className="text-sm text-slate-300">{item.label}</p>
              </motion.div>
            ))}
          </div>

          {/* What's included stack */}
          <motion.div variants={fadeUp} custom={6} className="rounded-2xl overflow-hidden mb-16" style={{ border: '1px solid rgba(124,58,237,0.20)', background: 'rgba(16,19,42,0.60)' }}>
            <div className="px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(124,58,237,0.06)' }}>
              <span className="text-sm font-semibold text-white">What&apos;s included</span>
              <span className="text-xs font-[family-name:var(--font-mono)] text-slate-400">If purchased separately</span>
            </div>
            {[
              { name: 'AI Voice Agent + dedicated phone number', price: '$400/mo' },
              { name: 'AI Chatbot (web + Instagram + Facebook)', price: '$200/mo' },
              { name: 'AI-generated premium website', price: '$300/mo' },
              { name: 'Social media content engine', price: '$350/mo' },
              { name: 'CRM + email marketing automation', price: '$300/mo' },
              { name: 'Smart surveys + QR codes', price: '$150/mo' },
              { name: 'Dedicated AI phone line with routing', price: '$200/mo' },
              { name: 'White-glove setup + menu training', price: '$500 one-time' },
            ].map((item, i) => (
              <div key={item.name} className="px-8 py-4 flex items-center justify-between" style={{ borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-slate-200">{item.name}</span>
                </div>
                <span className="text-xs font-[family-name:var(--font-mono)] text-red-400/60 line-through ml-4 flex-shrink-0">{item.price}</span>
              </div>
            ))}
            <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: 'rgba(124,58,237,0.08)', borderTop: '1px solid rgba(124,58,237,0.20)' }}>
              <div>
                <span className="text-sm text-slate-400">Total value: </span>
                <span className="text-lg font-bold text-red-400/70 line-through">$2,400/mo</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-emerald-400 font-medium">You pay:</span>
                <span className="text-3xl font-extrabold text-white">$249</span>
                <span className="text-sm text-slate-400">/mo</span>
              </div>
            </div>
          </motion.div>

          {/* Bonuses */}
          <motion.div variants={fadeUp} custom={7} className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-yellow-300" style={{ border: '1px solid rgba(250,204,21,0.30)', background: 'rgba(250,204,21,0.08)' }}>
              <Gift className="w-4 h-4" /> Sign up this month and get $1,000 in bonuses &mdash; free
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {BONUSES.map((bonus, i) => (
              <motion.div key={bonus.name} variants={fadeScale} custom={i + 8} whileHover={{ y: -4 }} className="v3-glass rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.25)' }}>
                    {i === 0 ? <Zap className="w-5 h-5 text-yellow-400" /> : i === 1 ? <Sparkles className="w-5 h-5 text-yellow-400" /> : <Clock className="w-5 h-5 text-yellow-400" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-[family-name:var(--font-mono)] text-yellow-400/80 uppercase tracking-wider">${bonus.value} value &mdash; free</p>
                    <h4 className="text-base font-bold text-white">{bonus.name}</h4>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{bonus.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Guarantee + Scarcity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <motion.div variants={fadeScale} custom={11} className="v3-glass rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">30-Day &ldquo;See It Work&rdquo; Guarantee</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">If you don&apos;t see real results in 30 days, we refund every penny. No hoops, no questions, no hard feelings.</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeScale} custom={12} className="v3-glass rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
                  <MapPin className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">Exclusive territory &mdash; one per zip code</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">We only onboard one business per area. Your AI won&apos;t compete with the restaurant next door. First come, first served.</p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} custom={13} className="text-center">
            <CalModal calLink={CAL_LINK}>
              <motion.span whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} className="group inline-flex items-center gap-2 px-8 py-4 text-white text-base font-semibold rounded-xl cursor-pointer v3-btn-glow" style={{ background: '#7C3AED' }}>
                Claim Your Spot <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.span>
            </CalModal>
            <p className="mt-3 text-xs text-slate-400">30 min &middot; Free &middot; No obligation</p>
          </motion.div>
        </div>
      </Section>

      <div className="v3-divider mx-auto" style={{ maxWidth: '70%' }} />

      {/* ═══════════════════════ PRICING ═══════════════════════ */}
      <Section className="relative py-32 lg:py-40 px-6 overflow-hidden" id="pricing">
        <div className="absolute inset-0" style={{ background: '#10132A' }} />
        <div className="v3-mesh-blob v3-mesh-section-1" style={{ top: 'auto', bottom: '-15%', left: '50%' }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-5 text-center">Pricing</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-5 text-center text-white">
            One platform. <span className="text-slate-400">One price.</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-slate-300 text-center max-w-lg mx-auto mb-16 text-lg">
            Stop paying $2,400/mo for 8 different tools. Get the entire AI stack &mdash; connected from day one.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.tier} variants={fadeScale} custom={i + 3} whileHover={{ y: -6 }} className={`relative rounded-2xl overflow-hidden ${plan.popular ? 'v3-popular-ring' : ''}`}>
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
                      <span className="text-sm text-slate-400 font-medium">$</span>
                      <span className="text-5xl font-extrabold text-white tracking-tight tabular-nums">{plan.price}</span>
                      <span className="text-sm text-slate-400 font-medium ml-1">/mo</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => void handleCheckout(plan.tier)}
                      disabled={loadingTier !== null}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                      style={plan.popular
                        ? { background: '#7C3AED', color: 'white', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }
                        : { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }
                      }
                    >
                      {loadingTier === plan.tier ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Redirecting...
                        </span>
                      ) : 'Start 14-Day Free Trial'}
                    </motion.button>
                    <p className="text-center text-[10px] text-slate-400 mt-2.5">No credit card required</p>
                    <div className="h-px my-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    <div className="space-y-3">
                      {plan.features.map((f) => (
                        <div key={f} className="flex items-start gap-2.5">
                          <ChevronRight className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-200">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} custom={7} className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" />Secured by Stripe</span>
            <span>Cancel anytime</span>
            <span>14-day free trial on all plans</span>
          </motion.div>
        </div>
      </Section>

      <div className="v3-divider mx-auto" style={{ maxWidth: '70%' }} />

      {/* ═══════════════════════ ABOUT JASON ═══════════════════════ */}
      <Section className="relative py-32 lg:py-40 px-6 overflow-hidden" id="about">
        <div className="absolute inset-0" style={{ background: '#161B3A' }} />
        <div className="v3-mesh-blob v3-mesh-section-2" style={{ top: 'auto', bottom: '-10%', right: '-5%' }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Photo */}
            <motion.div variants={fadeScale} custom={0} className="flex justify-center lg:justify-start order-2 lg:order-1">
              <div className="relative">
                <div className="absolute -inset-12 rounded-3xl" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 65%)', filter: 'blur(40px)' }} />
                <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 200 }} className="relative w-80 h-96 sm:w-96 sm:h-[28rem] rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.14)' }}>
                  <Image src="/workday_photo.jpeg" alt="Jason Marchese, Founder of Embedo" fill className="object-cover" style={{ objectPosition: '50% 8%' }} sizes="(max-width: 768px) 320px, 384px" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #161B3A 0%, transparent 40%)' }} />
                </motion.div>
              </div>
            </motion.div>

            {/* Bio */}
            <div className="order-1 lg:order-2">
              <motion.p variants={fadeUp} custom={0} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.25em] text-purple-400 mb-5">Who you&apos;ll be working with</motion.p>
              <motion.h2 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-tight mb-6 text-white">
                Hey, I&apos;m Jason.
              </motion.h2>
              <motion.div variants={fadeUp} custom={2} className="flex flex-wrap gap-2 mb-8">
                {['Senior Data Scientist', 'M.S. Business Analytics', 'Founder, Embedo'].map((badge) => (
                  <span key={badge} className="v3-badge px-3 py-1 rounded-full text-xs font-medium text-purple-200" style={{ border: '1px solid rgba(124,58,237,0.40)', background: 'rgba(124,58,237,0.15)' }}>
                    {badge}
                  </span>
                ))}
              </motion.div>
              <motion.p variants={fadeUp} custom={3} className="text-slate-200 text-lg leading-relaxed mb-4">
                I spent years building AI models at scale as a <span className="text-white font-semibold">Senior Data Scientist</span> &mdash; and watched local business owners get completely left behind by the technology wave.
              </motion.p>
              <motion.p variants={fadeUp} custom={4} className="text-slate-300 text-base leading-relaxed mb-10">
                Embedo is the platform I wish existed. I personally configure every client&apos;s AI stack. You&apos;re not buying software &mdash; you&apos;re getting a dedicated AI team that knows your business by name.
              </motion.p>
              <motion.div variants={fadeUp} custom={5}>
                <CalModal calLink={CAL_LINK}>
                  <motion.span whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} className="group inline-flex items-center gap-3 px-7 py-4 text-white text-sm font-semibold rounded-xl cursor-pointer v3-btn-glow" style={{ background: '#7C3AED' }}>
                    Book a Free Call with Jason <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </motion.span>
                </CalModal>
                <div className="mt-4 flex items-center gap-5 text-xs text-slate-400 font-[family-name:var(--font-mono)]">
                  <span>30 min</span>
                  <span className="w-1 h-1 rounded-full bg-slate-500" />
                  <span>No obligation</span>
                  <span className="w-1 h-1 rounded-full bg-slate-500" />
                  <span>Free</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="py-16 px-6 lg:px-10" style={{ background: '#1C2248', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 lg:gap-16 mb-14">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <polygon points="16,4 28,10 16,16 4,10" fill="#7C3AED" />
                  <polygon points="4,10 16,16 16,28 4,22" fill="#4C1D95" />
                  <polygon points="28,10 16,16 16,28 28,22" fill="#6D28D9" />
                </svg>
                <span className="text-lg font-bold tracking-tight text-white">Embedo</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xs mb-6">AI infrastructure for local businesses. Voice, chat, website, social, CRM &mdash; one platform, deployed in days.</p>
              <div className="flex gap-3">
                {[
                  { label: 'LinkedIn', href: 'https://linkedin.com/company/embedo', icon: 'linkedin' },
                  { label: 'X', href: 'https://x.com/embedo_ai', icon: 'x' },
                  { label: 'Instagram', href: 'https://instagram.com/embedo.ai', icon: 'instagram' },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:brightness-150 hover:scale-110" style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://api.iconify.design/simple-icons:${s.icon}.svg`} alt={s.label} style={{ width: 13, height: 13, filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-slate-400 mb-5">Product</p>
              <ul className="space-y-3">
                {[{ label: 'Platform', href: '#system' }, { label: 'The Offer', href: '#offer' }, { label: 'Pricing', href: '#pricing' }].map((link) => (
                  <li key={link.label}><a href={link.href} className="text-sm text-slate-300 hover:text-white transition-colors duration-200">{link.label}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-slate-400 mb-5">Company</p>
              <ul className="space-y-3">
                <li><a href="#about" className="text-sm text-slate-300 hover:text-white transition-colors duration-200">About</a></li>
                <li><a href="mailto:jason@embedo.io" className="text-sm text-slate-300 hover:text-white transition-colors duration-200">jason@embedo.io</a></li>
                <li>
                  <CalModal calLink={CAL_LINK}>
                    <span className="text-sm text-slate-300 hover:text-white transition-colors duration-200 cursor-pointer">Book a Call</span>
                  </CalModal>
                </li>
              </ul>
            </div>

            {/* Founder */}
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-slate-400 mb-5">Founder</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/workday_photo.jpeg" alt="Jason Marchese" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-none">Jason Marchese</p>
                  <p className="text-xs text-slate-400 leading-none mt-1">Data Scientist</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">Serving local businesses<br />across the United States</p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-slate-400">&copy; 2026 Embedo. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Privacy Policy</a>
              <a href="#" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Chatbot */}
      <CubeyChat />
    </div>
  );
}
