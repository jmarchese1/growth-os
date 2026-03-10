'use client';

const features = [
  { icon: '🎙️', title: 'Never miss a call again', description: 'Your AI receptionist answers at 2am. Your chatbot engages visitors on Sunday. Revenue doesn\'t stop when you do.', accent: true },
  { icon: '⚡', title: 'Every lead, captured', description: 'Phone calls, DMs, form fills — every lead flows into one place and gets followed up within seconds. Automatically.', accent: false },
  { icon: '🎯', title: 'Built for your business', description: 'Each AI agent is trained on your menu, hours, tone, and personality. Not a generic bot — your brand, automated.', accent: false },
  { icon: '📱', title: 'Social that sells', description: 'AI generates posts, schedules them, and DMs anyone who engages. Your feed stays active even when you\'re slammed.', accent: false },
  { icon: '🔗', title: 'One connected system', description: 'Voice, chat, leads, social, surveys, booking — all talking to each other. One action triggers the next automatically.', accent: true },
  { icon: '🚀', title: 'Live in days, not months', description: 'From onboarding to fully deployed AI infrastructure in days. No dev team, no technical knowledge required.', accent: false },
];

const ORBIT_R = 162;
const NODE_D  = 68;
const DURATION = 24;
const COUNT = 6;
const INNER_R = 93;
const OUTER_R = 228;

const TOOLS = [
  { name: 'Anthropic',  color: '#D97706', slug: 'anthropic'  },
  { name: 'ElevenLabs', color: '#8B5CF6', slug: 'elevenlabs' },
  { name: 'Twilio',     color: '#F22F46', slug: 'twilio'     },
  { name: 'SendGrid',   color: '#1A82E2', slug: 'sendgrid'   },
  { name: 'X',          color: '#94a3b8', slug: 'x'          },
  { name: 'Vercel',     color: '#e2e8f0', slug: 'vercel'     },
];

// 3 inner accent dots at 0°, 120°, 240°
const INNER_DOTS = [0, 120, 240].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { left: INNER_R + INNER_R * Math.cos(rad) - 4, top: INNER_R + INNER_R * Math.sin(rad) - 4 };
});

const NODES = TOOLS.map((t, i) => {
  const angleDeg = -90 + (i / COUNT) * 360;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    ...t,
    left: ORBIT_R + ORBIT_R * Math.cos(rad) - NODE_D / 2,
    top:  ORBIT_R + ORBIT_R * Math.sin(rad) - NODE_D / 2,
  };
});

const containerMin = (ORBIT_R + NODE_D / 2) * 2 + 24;
const PULSES = [0, 1.8, 3.6];

const bullets = [
  {
    label: 'Answers every call, captures every lead',
    sub: 'Voice AI live 24/7 — reservations booked, info captured, zero staff required.',
  },
  {
    label: 'Social content created and posted for you',
    sub: 'AI writes captions, schedules posts, and auto-DMs anyone who engages.',
  },
  {
    label: 'Complete AI stack live in days',
    sub: 'No dev team. No months of setup. Every module connected from day one.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="pt-8 pb-10 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch mb-16">

          {/* Left: stronger, more specific copy */}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-4">Why Embedo</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
              Your competitors<br />
              hire staff.<br />
              <span className="text-gradient">You deploy AI.</span>
            </h2>

            <div className="space-y-5">
              {bullets.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.label}</p>
                    <p className="text-sm text-gray-500 leading-snug">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Powered-by orbital — enhanced with inner ring + signal pulses */}
          <div className="flex flex-col items-center justify-center" style={{ animation: 'proposal-float 5s ease-in-out infinite' }}>
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-gray-500 mb-2">
              Powered by best-in-class AI
            </p>

            <div
              className="relative flex-1 flex items-center justify-center overflow-visible"
              style={{ minHeight: containerMin }}
            >
              {/* Signal pulse rings expanding from center */}
              {PULSES.map((delay, i) => (
                <div
                  key={i}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 60, height: 60,
                    border: '1.5px solid rgba(99,102,241,0.55)',
                    animation: `signal-pulse 3.6s ease-out infinite`,
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}

              {/* Outer decorative faint ring — very slow reverse spin */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: OUTER_R * 2, height: OUTER_R * 2,
                  border: '1px dashed rgba(99,102,241,0.07)',
                  animation: `logo-orbit 55s linear infinite reverse`,
                }}
              />

              {/* Center radial glow */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 200, height: 200,
                  background: 'radial-gradient(circle, rgba(99,102,241,0.32) 0%, transparent 68%)',
                  animation: 'pulse-glow 3.5s ease-in-out infinite',
                }}
              />

              {/* Inner orbit — counter-rotating with 3 bright accent dots */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: INNER_R * 2, height: INNER_R * 2,
                  left: '50%', top: '50%',
                  marginLeft: -INNER_R, marginTop: -INNER_R,
                  animation: `logo-orbit 12s linear infinite reverse`,
                }}
              >
                <svg width={INNER_R * 2} height={INNER_R * 2} viewBox={`0 0 ${INNER_R * 2} ${INNER_R * 2}`} fill="none" className="absolute inset-0">
                  <circle cx={INNER_R} cy={INNER_R} r={INNER_R - 1} stroke="rgba(99,102,241,0.13)" strokeWidth={1} strokeDasharray="4 10" />
                </svg>
                {INNER_DOTS.map((d, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: 8, height: 8,
                      left: d.left, top: d.top,
                      background: 'rgba(139,92,246,0.95)',
                      boxShadow: '0 0 8px 3px rgba(139,92,246,0.65)',
                      animation: `counter-orbit 12s linear infinite`,
                    }}
                  />
                ))}
              </div>

              {/* Static dashed middle orbit ring */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: ORBIT_R * 2, height: ORBIT_R * 2,
                  border: '1px dashed rgba(99,102,241,0.20)',
                }}
              />

              {/* Main rotating ring with 6 tool nodes */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: ORBIT_R * 2, height: ORBIT_R * 2,
                  left: '50%', top: '50%',
                  marginLeft: -ORBIT_R, marginTop: -ORBIT_R,
                  animation: `logo-orbit ${DURATION}s linear infinite`,
                }}
              >
                {NODES.map((t) => (
                  <div
                    key={t.name}
                    style={{
                      position: 'absolute',
                      left: t.left, top: t.top,
                      width: NODE_D, height: NODE_D,
                      animation: `counter-orbit ${DURATION}s linear infinite`,
                    }}
                  >
                    <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 16px 4px ${t.color}55` }} />
                    <div
                      style={{
                        width: NODE_D, height: NODE_D,
                        borderRadius: '50%',
                        background: 'rgba(10,8,35,0.97)',
                        border: `1.5px solid ${t.color}`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.iconify.design/simple-icons:${t.slug}.svg`}
                        alt={t.name}
                        style={{ width: 20, height: 20, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                      />
                      <span style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.85)', fontWeight: 600, letterSpacing: 0.4, lineHeight: 1 }}>
                        {t.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Center hub — slightly larger, brighter glow */}
              <div
                className="absolute z-10 flex flex-col items-center justify-center"
                style={{
                  width: 80, height: 80,
                  borderRadius: '50%',
                  background: 'rgba(10,8,35,0.97)',
                  border: '1.5px solid rgba(99,102,241,0.75)',
                  boxShadow: '0 0 36px rgba(99,102,241,0.50), 0 0 14px rgba(139,92,246,0.30)',
                }}
              >
                <span style={{ fontSize: 8.5, fontWeight: 700, color: 'white', letterSpacing: 2 }}>
                  EMBEDO
                </span>
                <span style={{ fontSize: 6.5, color: 'rgba(165,180,252,0.80)', letterSpacing: 1 }}>
                  AI CORE
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-7 rounded-2xl border border-indigo-100 bg-indigo-50 cursor-default"
              style={{
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'translateY(-6px)';
                el.style.boxShadow = '0 12px 40px rgba(99,102,241,0.28), 0 4px 16px rgba(139,92,246,0.18)';
                el.style.borderColor = 'rgba(99,102,241,0.45)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = '';
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                el.style.borderColor = '';
              }}
            >
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="text-base font-semibold mb-2 text-indigo-900">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
