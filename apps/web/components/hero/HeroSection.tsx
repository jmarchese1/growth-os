import ParticleCanvas from '@/components/ui/ParticleCanvas';
import CursorSpotlight from '@/components/ui/CursorSpotlight';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 bg-white overflow-hidden bg-grid">
      {/* Particle background */}
      <ParticleCanvas />

      {/* Cursor spotlight */}
      <CursorSpotlight />

      {/* Soft radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-50 opacity-70 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-indigo-200 bg-indigo-50 mb-10">
          <span className="w-2 h-2 rounded-full bg-embedo-accent animate-pulse" />
          <span className="text-xs font-semibold tracking-[0.15em] uppercase text-embedo-accent">
            AI Infrastructure for Local Business
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-bold tracking-tight leading-[1.02] text-balance mb-8">
          Your business,
          <br />
          <span className="text-gradient">now runs on AI.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed mb-12 text-balance">
          Embedo deploys a complete AI automation layer into your restaurant or local business —
          voice agent, chatbot, leads, social media, surveys, and more.
          <span className="text-gray-800 font-medium"> Live in days.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#proposal"
            className="px-9 py-4 text-gray-900 text-base font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4ade80, #22c55e)',
              boxShadow: '0 0 28px rgba(74,222,128,0.55), 0 4px 20px rgba(34,197,94,0.35)',
            }}
          >
            Generate Custom Proposal
          </a>
          <a
            href="#book"
            className="px-9 py-4 bg-white text-black text-base font-semibold rounded-full border border-gray-200 hover:border-gray-400 transition-all hover:scale-105 active:scale-95"
          >
            Schedule a Call →
          </a>
        </div>

      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <div className="w-6 h-10 border-2 border-gray-200 rounded-full flex items-start justify-center pt-2">
          <div className="w-1 h-3 bg-gray-300 rounded-full" />
        </div>
      </div>
    </section>
  );
}
