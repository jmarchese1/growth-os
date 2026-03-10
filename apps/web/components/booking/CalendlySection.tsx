'use client';
import Image from 'next/image';
import CalModal from './CalendlyModal';

const badges = [
  { label: 'Senior Data Scientist' },
  { label: 'M.S. Business Analytics' },
  { label: 'Founder, Embedo' },
];

// Orbital rings behind the photo — same pattern as LogoDisplay
const RINGS = [
  { size: 324, r: 160, dash: '8 16',  dot: 3.0, dotColor: 'rgba(99,102,241,0.95)',  speed: '14s', cw: true  },
  { size: 390, r: 193, dash: '5 22',  dot: 2.5, dotColor: 'rgba(139,92,246,0.70)',  speed: '21s', cw: false },
  { size: 452, r: 224, dash: '3 30',  dot: 2.0, dotColor: 'rgba(167,139,250,0.45)', speed: '30s', cw: true  },
];

// Orbiting particles around the photo
const PARTICLES = [
  { duration: '4.5s', delay: '0s',    radius: 152, sz: 2.8, a: 0.80, rgb: '167,139,250' },
  { duration: '3.8s', delay: '-1.5s', radius: 168, sz: 2.2, a: 0.62, rgb: '139,92,246'  },
  { duration: '5.2s', delay: '-2.8s', radius: 145, sz: 3.0, a: 0.70, rgb: '99,102,241'  },
  { duration: '4.0s', delay: '-0.7s', radius: 178, sz: 1.8, a: 0.50, rgb: '196,181,253' },
  { duration: '6.0s', delay: '-3.5s', radius: 196, sz: 1.6, a: 0.40, rgb: '139,92,246'  },
  { duration: '5.5s', delay: '-1.2s', radius: 212, sz: 1.4, a: 0.35, rgb: '167,139,250' },
];

// Outer container must clear the largest ring + its dot + padding
const ORBIT_CONTAINER = 452 + 16; // largest ring size + breathing room

export default function CalendlySection() {
  const calLink =
    process.env['NEXT_PUBLIC_CAL_LINK'] ?? 'jason-marchese-mkfkwl/30min';

  return (
    <>
      {/* ── Founder intro — light with grid (like hero) ────── */}
      <section className="relative bg-white overflow-hidden bg-grid py-20 px-6">
        {/* Soft radial glow matching hero */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-50 opacity-60 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">

            {/* Photo with orbital background */}
            <div className="flex justify-center lg:justify-start">
              <div
                className="relative flex items-center justify-center"
                style={{ width: ORBIT_CONTAINER, height: ORBIT_CONTAINER, maxWidth: '100%' }}
              >
                {/* Multi-layer purple glow — pulsing */}
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 380, height: 380,
                    background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 68%)',
                    animation: 'pulse-glow 3.5s ease-in-out infinite',
                  }}
                />
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 260, height: 260,
                    background: 'radial-gradient(circle, rgba(139,92,246,0.24) 0%, transparent 68%)',
                    animation: 'pulse-glow 2.8s ease-in-out infinite 0.7s',
                  }}
                />

                {/* Counter-rotating dashed rings with orbiting dots */}
                {RINGS.map((ring, i) => (
                  <div
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                      width: ring.size, height: ring.size,
                      left: '50%', top: '50%',
                      marginLeft: -(ring.size / 2),
                      marginTop: -(ring.size / 2),
                      animation: `logo-orbit ${ring.speed} linear infinite${ring.cw ? '' : ' reverse'}`,
                    }}
                  >
                    <svg
                      width={ring.size}
                      height={ring.size}
                      viewBox={`0 0 ${ring.size} ${ring.size}`}
                      fill="none"
                    >
                      <circle
                        cx={ring.size / 2} cy={ring.size / 2} r={ring.r}
                        stroke={`rgba(99,102,241,${0.20 - i * 0.04})`}
                        strokeWidth={1.1 - i * 0.15}
                        strokeDasharray={ring.dash}
                      />
                      {/* Orbiting dot sits at top of ring */}
                      <circle
                        cx={ring.size / 2}
                        cy={ring.size / 2 - ring.r}
                        r={ring.dot}
                        fill={ring.dotColor}
                      />
                    </svg>
                  </div>
                ))}

                {/* Orbiting particles */}
                {PARTICLES.map((p, i) => (
                  <div
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                      width: p.radius * 2 + p.sz,
                      height: p.radius * 2 + p.sz,
                      left: '50%', top: '50%',
                      marginLeft: -(p.radius + p.sz / 2),
                      marginTop: -(p.radius + p.sz / 2),
                      animation: `logo-orbit ${p.duration} linear infinite`,
                      animationDelay: p.delay,
                    }}
                  >
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: p.sz, height: p.sz,
                        background: `rgba(${p.rgb}, ${p.a})`,
                        top: 0, left: '50%',
                        marginLeft: -(p.sz / 2),
                        boxShadow: `0 0 ${p.sz * 3}px rgba(${p.rgb}, ${p.a * 0.8})`,
                      }}
                    />
                  </div>
                ))}

                {/* Photo — on top of orbital background */}
                <div className="relative z-10">
                  <div className="w-80 h-80 lg:w-[400px] lg:h-[400px] rounded-3xl overflow-hidden shadow-2xl shadow-violet-900/40"
                    style={{ border: '1.5px solid rgba(139,92,246,0.35)' }}
                  >
                    <Image
                      src="/workday_photo.jpeg"
                      alt="Jason Marchese, Founder of Embedo"
                      fill
                      className="object-cover"
                      style={{ objectPosition: '50% 8%' }}
                      sizes="(max-width: 768px) 320px, 400px"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-4">
                Who you&apos;ll be talking to
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-gray-900 mb-4">
                Hey, I&apos;m Jason.
              </h2>

              {/* Credential badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {badges.map((b) => (
                  <span
                    key={b.label}
                    className="px-3 py-1 rounded-full text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700"
                  >
                    {b.label}
                  </span>
                ))}
              </div>

              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                I&apos;m a{' '}
                <span className="text-gray-900 font-semibold">Senior Data Scientist</span> and
                M.S. Business Analytics graduate who spent years building AI models at scale —
                and watched small business owners get left completely behind by the technology wave.
              </p>
              <p className="text-gray-500 leading-relaxed">
                Embedo is the platform I wish existed. Me, my team, and our AI agents will be
                working with you{' '}
                <span className="text-embedo-accent font-medium">every step of the way</span> —
                from strategy call to go-live, and beyond.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Booking CTA — light ──────────────────────── */}
      <section id="book" className="relative py-20 px-6 bg-gray-50 text-gray-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-100 opacity-60 blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-violet-100 opacity-40 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-[0.15em] uppercase text-indigo-600">
              Free Strategy Call
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
            Book a call. Find out how AI
            <br />
            <span className="text-gradient">can evolve your business.</span>
          </h2>

          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
            In 30 minutes, we&apos;ll walk through exactly what&apos;s possible for your business —
            which modules make the most impact, what it costs, and how fast we can go live.{' '}
            <span className="text-gray-700 font-medium">No pressure, no obligation.</span>
          </p>

          <CalModal calLink={calLink}>
            <span
              className="inline-flex items-center gap-3 px-8 py-4 text-gray-900 text-sm font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                boxShadow: '0 0 24px rgba(74,222,128,0.50), 0 4px 16px rgba(34,197,94,0.30)',
              }}
            >
              Book a Free Call with Jason
              <span className="text-xl">→</span>
            </span>
          </CalModal>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
            <span>✓ 30 minutes</span>
            <span>✓ No obligation</span>
            <span>✓ Free</span>
          </div>
        </div>
      </section>
    </>
  );
}
