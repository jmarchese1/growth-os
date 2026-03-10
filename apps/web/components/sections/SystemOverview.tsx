'use client';

const modules = [
  {
    number: '01',
    name: 'AI Voice Receptionist',
    description:
      'A 24/7 AI phone agent answers every call, handles reservations, answers questions, and captures lead data — automatically.',
  },
  {
    number: '02',
    name: 'AI Website Chatbot',
    description:
      'Deployed on your website and social channels. Engages visitors, books appointments, and captures leads around the clock.',
  },
  {
    number: '03',
    name: 'Lead Generation Engine',
    description:
      'Every lead from every channel flows into a central database. Automated SMS and email sequences follow up instantly.',
  },
  {
    number: '04',
    name: 'Social Media Automation',
    description:
      'AI generates and schedules content. Monitors comments. Auto-DMs engaged followers. Turns social activity into leads.',
  },
  {
    number: '05',
    name: 'Survey & Feedback Engine',
    description:
      'Automated post-visit surveys capture customer sentiment. Responses trigger personalized promotions and re-engagement.',
  },
  {
    number: '06',
    name: 'AI Website Generation',
    description:
      'A modern, high-converting website generated and deployed for your business — with integrated booking, chatbot, and lead capture.',
  },
  {
    number: '07',
    name: 'Appointment Scheduling',
    description:
      'Seamless booking management with automatic reminders. Reduce no-shows without lifting a finger.',
  },
  {
    number: '08',
    name: 'Automated Follow-Ups',
    description:
      'SMS and email sequences triggered by every customer action. No lead goes cold, ever.',
  },
];

export default function SystemOverview() {
  return (
    <section id="system" className="bg-white bg-grid relative overflow-hidden">
      {/* Ambient glow — mirrors hero */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-indigo-50 opacity-70 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-violet-50 opacity-50 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 py-10 px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: copy */}
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400 mb-4">
                The System
              </p>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-4">
                One platform.
                <br />
                <span className="text-gradient">Eight AI modules.</span>
              </h2>
              <p className="text-xl text-gray-500 max-w-2xl leading-relaxed">
                We deploy a complete AI infrastructure stack — every module
                working together, all connected, live in days.
              </p>
            </div>

            {/* Right: floating AI brain illustration */}
            <div className="hidden lg:flex items-center justify-center">
              <div style={{ animation: 'proposal-float 5s ease-in-out infinite' }}>
                <svg width="320" height="300" viewBox="0 0 320 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="brain-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(99,102,241,0.15)" />
                      <stop offset="100%" stopColor="rgba(99,102,241,0)" />
                    </radialGradient>
                    <linearGradient id="node-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="node-grad2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>

                  {/* Background glow */}
                  <circle cx="160" cy="150" r="130" fill="url(#brain-glow)" />

                  {/* Connection lines */}
                  {[
                    [160,150, 80,80],  [160,150, 240,80],  [160,150, 60,170],
                    [160,150, 260,170],[160,150, 100,250],  [160,150, 220,250],
                    [80,80,  60,170],  [240,80, 260,170],   [60,170, 100,250],
                    [260,170,220,250], [80,80,  240,80],
                  ].map(([x1,y1,x2,y2], i) => (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="rgba(99,102,241,0.18)" strokeWidth="1.2"
                      strokeDasharray="4 6"
                    />
                  ))}

                  {/* Outer nodes */}
                  {[
                    { cx: 80,  cy: 80,  r: 22, label: '🎙️', delay: '0s'   },
                    { cx: 240, cy: 80,  r: 22, label: '💬', delay: '0.6s' },
                    { cx: 60,  cy: 170, r: 20, label: '📈', delay: '1.2s' },
                    { cx: 260, cy: 170, r: 20, label: '📱', delay: '1.8s' },
                    { cx: 100, cy: 250, r: 18, label: '✉️', delay: '2.4s' },
                    { cx: 220, cy: 250, r: 18, label: '📊', delay: '3.0s' },
                  ].map((n, i) => (
                    <g key={i} style={{ animation: `proposal-sparkle 3s ease-in-out infinite`, animationDelay: n.delay }}>
                      <circle cx={n.cx} cy={n.cy} r={n.r + 6} fill="rgba(99,102,241,0.08)" />
                      <circle cx={n.cx} cy={n.cy} r={n.r} fill="white"
                        stroke="rgba(99,102,241,0.35)" strokeWidth="1.5"
                        style={{ filter: 'drop-shadow(0 2px 8px rgba(99,102,241,0.20))' }}
                      />
                      <text x={n.cx} y={n.cy + 6} textAnchor="middle" fontSize={n.r * 0.85}>{n.label}</text>
                    </g>
                  ))}

                  {/* Center hub */}
                  <circle cx="160" cy="150" r="44" fill="rgba(99,102,241,0.08)" />
                  <circle cx="160" cy="150" r="36" fill="url(#node-grad)"
                    style={{ filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.55))' }}
                  />
                  <circle cx="160" cy="150" r="28" fill="url(#node-grad2)" opacity="0.6" />
                  {/* E letter in center */}
                  <text x="160" y="157" textAnchor="middle" fontSize="22" fontWeight="700" fill="white" fontFamily="system-ui">E</text>

                  {/* Orbiting dot */}
                  <g style={{ animation: 'logo-orbit 4s linear infinite' }}
                    transform="translate(160,150)">
                    <circle cx="0" cy="-52" r="4" fill="rgba(167,139,250,0.9)"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.8))' }}
                    />
                  </g>

                  {/* Sparkle dots */}
                  <circle cx="155" cy="42" r="3" fill="#a78bfa" opacity="0.5"
                    style={{ animation: 'proposal-sparkle 2.5s ease-in-out infinite' }} />
                  <circle cx="285" cy="130" r="2.5" fill="#6366f1" opacity="0.4"
                    style={{ animation: 'proposal-sparkle 3.2s ease-in-out infinite 1s' }} />
                  <circle cx="38" cy="220" r="2" fill="#8b5cf6" opacity="0.45"
                    style={{ animation: 'proposal-sparkle 2.8s ease-in-out infinite 0.5s' }} />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module list */}
      <div className="relative z-10 px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {modules.map((mod, index) => (
            <div
              key={mod.number}
              className="py-5 grid grid-cols-1 md:grid-cols-[80px_1fr_2fr] gap-4 items-start group -mx-6 px-6 cursor-default border-b border-indigo-100/60 last:border-0"
              style={{
                transition: 'background 0.2s ease, box-shadow 0.2s ease',
                background: index % 2 === 0
                  ? 'transparent'
                  : 'rgba(99,102,241,0.025)',
                borderLeft: '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'rgba(99,102,241,0.06)';
                el.style.borderLeft = '3px solid rgba(99,102,241,0.55)';
                el.style.boxShadow = 'inset 0 0 40px rgba(99,102,241,0.04)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = index % 2 === 0
                  ? 'transparent'
                  : 'rgba(99,102,241,0.025)';
                el.style.borderLeft = '3px solid transparent';
                el.style.boxShadow = '';
              }}
            >
              <span className="text-sm font-mono text-gray-300 pt-0.5 group-hover:text-indigo-400 transition-colors duration-200">
                {mod.number}
              </span>
              <h3 className="text-base font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors duration-200">
                {mod.name}
              </h3>
              <p className="text-gray-500 leading-relaxed text-sm group-hover:text-gray-600 transition-colors duration-200">
                {mod.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
