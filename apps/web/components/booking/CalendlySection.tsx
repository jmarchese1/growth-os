'use client';
import Image from 'next/image';
import CalModal from './CalendlyModal';
import ParticleCanvas from '@/components/ui/ParticleCanvas';

const badges = [
  { label: 'Senior Data Scientist' },
  { label: 'M.S. Business Analytics' },
  { label: 'Founder, Embedo' },
];

// Orbital rings behind the photo — same pattern as LogoDisplay
const RINGS = [
  { size: 460, r: 228, dash: '8 16',  dot: 3.0, dotColor: 'rgba(99,102,241,0.95)',  speed: '14s', cw: true  },
  { size: 540, r: 268, dash: '5 22',  dot: 2.5, dotColor: 'rgba(139,92,246,0.70)',  speed: '21s', cw: false },
  { size: 620, r: 308, dash: '3 30',  dot: 2.0, dotColor: 'rgba(167,139,250,0.45)', speed: '30s', cw: true  },
];

// Orbiting particles around the photo
const PARTICLES = [
  { duration: '4.5s', delay: '0s',    radius: 220, sz: 2.8, a: 0.80, rgb: '167,139,250' },
  { duration: '3.8s', delay: '-1.5s', radius: 242, sz: 2.2, a: 0.62, rgb: '139,92,246'  },
  { duration: '5.2s', delay: '-2.8s', radius: 208, sz: 3.0, a: 0.70, rgb: '99,102,241'  },
  { duration: '4.0s', delay: '-0.7s', radius: 258, sz: 1.8, a: 0.50, rgb: '196,181,253' },
  { duration: '6.0s', delay: '-3.5s', radius: 278, sz: 1.6, a: 0.40, rgb: '139,92,246'  },
  { duration: '5.5s', delay: '-1.2s', radius: 295, sz: 1.4, a: 0.35, rgb: '167,139,250' },
];

// Outer container must clear the largest ring + its dot + padding
const ORBIT_CONTAINER = 620 + 20; // largest ring size + breathing room

export default function CalendlySection() {
  const calLink =
    process.env['NEXT_PUBLIC_CAL_LINK'] ?? 'jason-marchese-mkfkwl/30min';

  return (
      <section id="book" className="relative bg-white overflow-hidden bg-grid pt-10 pb-20 px-6">
        {/* Neural network — same as proposal section */}
        <ParticleCanvas />
        {/* Soft radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-50 opacity-70 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">

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

              {/* Booking CTA — inline with bio */}
              <div className="mt-8">
                <div>
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
                </div>

                <div className="mt-4 flex items-center gap-6 text-sm text-gray-400">
                  <span>✓ 30 minutes</span>
                  <span>✓ No obligation</span>
                  <span>✓ Free</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}
