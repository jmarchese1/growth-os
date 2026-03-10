'use client';

const features = [
  { icon: '🎙️', title: 'Never miss a call again', description: 'Your AI receptionist answers at 2am. Your chatbot engages visitors on Sunday. Revenue doesn\'t stop when you do.', accent: true },
  { icon: '⚡', title: 'Every lead, captured', description: 'Phone calls, DMs, form fills — every lead flows into one place and gets followed up within seconds. Automatically.', accent: false },
  { icon: '🎯', title: 'Built for your business', description: 'Each AI agent is trained on your menu, hours, tone, and personality. Not a generic bot — your brand, automated.', accent: false },
  { icon: '📱', title: 'Social that sells', description: 'AI generates posts, schedules them, and DMs anyone who engages. Your feed stays active even when you\'re slammed.', accent: false },
  { icon: '🔗', title: 'One connected system', description: 'Voice, chat, leads, social, surveys, booking — all talking to each other. One action triggers the next automatically.', accent: true },
  { icon: '🚀', title: 'Live in days, not months', description: 'From onboarding to fully deployed AI infrastructure in days. No dev team, no technical knowledge required.', accent: false },
];

const ORBIT_R = 108;
const NODE_D  = 58;
const DURATION = 24;
const COUNT = 6;

const TOOLS = [
  { name: 'Anthropic',  color: '#D97706', slug: 'anthropic'  },
  { name: 'ElevenLabs', color: '#8B5CF6', slug: 'elevenlabs' },
  { name: 'Twilio',     color: '#F22F46', slug: 'twilio'     },
  { name: 'SendGrid',   color: '#1A82E2', slug: 'sendgrid'   },
  { name: 'X',          color: '#94a3b8', slug: 'x'          },
  { name: 'Vercel',     color: '#e2e8f0', slug: 'vercel'     },
];

// Pre-calculate node positions at exact 60° intervals, starting from top (−90°)
const NODES = TOOLS.map((t, i) => {
  const angleDeg = -90 + (i / COUNT) * 360;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    ...t,
    // position within the ORBIT_R×2 ring wrapper
    left: ORBIT_R + ORBIT_R * Math.cos(rad) - NODE_D / 2,
    top:  ORBIT_R + ORBIT_R * Math.sin(rad) - NODE_D / 2,
  };
});

const containerMin = (ORBIT_R + NODE_D / 2) * 2 + 24;

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch mb-16">

          {/* Left: heading + subtext */}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-4">Why Embedo</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-5">
              Your business,<br />
              <span className="text-gray-400">running itself.</span>
            </h2>
            <p className="text-gray-500 leading-relaxed text-base max-w-sm">
              Powered by Anthropic, ElevenLabs, Twilio, SendGrid, and more — every tool in your AI stack connected and working together, automatically.
            </p>
          </div>

          {/* Right: Powered-by orbital animation */}
          <div className="bg-gray-950 rounded-2xl p-5 shadow-lg flex flex-col">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-gray-500 mb-2">
              Powered by best-in-class AI
            </p>

            <div
              className="relative flex-1 flex items-center justify-center overflow-visible"
              style={{ minHeight: containerMin }}
            >
              {/* Center glow */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 180, height: 180,
                  background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)',
                  animation: 'pulse-glow 3.5s ease-in-out infinite',
                }}
              />

              {/* Static dashed orbit ring */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: ORBIT_R * 2,
                  height: ORBIT_R * 2,
                  border: '1px dashed rgba(99,102,241,0.18)',
                }}
              />

              {/* Single rotating ring — all nodes ride this, guaranteed even spacing */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: ORBIT_R * 2,
                  height: ORBIT_R * 2,
                  left: '50%', top: '50%',
                  marginLeft: -ORBIT_R,
                  marginTop: -ORBIT_R,
                  animation: `logo-orbit ${DURATION}s linear infinite`,
                }}
              >
                {NODES.map((t) => (
                  <div
                    key={t.name}
                    style={{
                      position: 'absolute',
                      left: t.left,
                      top: t.top,
                      width: NODE_D,
                      height: NODE_D,
                      // Counter-rotate so each node stays upright
                      animation: `counter-orbit ${DURATION}s linear infinite`,
                    }}
                  >
                    {/* Outer glow ring */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ boxShadow: `0 0 14px 3px ${t.color}50` }}
                    />
                    {/* Node */}
                    <div
                      style={{
                        width: NODE_D, height: NODE_D,
                        borderRadius: '50%',
                        background: 'rgba(10,8,35,0.97)',
                        border: `1.5px solid ${t.color}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.iconify.design/simple-icons:${t.slug}.svg`}
                        alt={t.name}
                        style={{
                          width: 20, height: 20,
                          objectFit: 'contain',
                          // Force white regardless of SVG fill color
                          filter: 'brightness(0) invert(1)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 6,
                          color: 'rgba(255,255,255,0.85)',
                          fontWeight: 600,
                          letterSpacing: 0.4,
                          lineHeight: 1,
                        }}
                      >
                        {t.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Center hub */}
              <div
                className="absolute z-10 flex flex-col items-center justify-center"
                style={{
                  width: 72, height: 72,
                  borderRadius: '50%',
                  background: 'rgba(10,8,35,0.97)',
                  border: '1.5px solid rgba(99,102,241,0.65)',
                  boxShadow: '0 0 28px rgba(99,102,241,0.35)',
                }}
              >
                <span style={{ fontSize: 8.5, fontWeight: 700, color: 'white', letterSpacing: 2 }}>
                  EMBEDO
                </span>
                <span style={{ fontSize: 6.5, color: 'rgba(165,180,252,0.65)', letterSpacing: 1 }}>
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
              className="p-7 rounded-2xl border border-indigo-100 bg-indigo-50 transition-all duration-200 hover:-translate-y-1.5 group cursor-default"
              style={{
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 12px 40px rgba(99,102,241,0.28), 0 4px 16px rgba(139,92,246,0.18)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.45)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                (e.currentTarget as HTMLDivElement).style.borderColor = '';
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
