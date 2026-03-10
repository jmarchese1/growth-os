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
      <div className="relative z-10 py-20 px-6 pb-10">
        <div className="max-w-7xl mr-auto ml-0 lg:ml-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400 mb-4">
            The System
          </p>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-4">
            One platform.
            <br />
            <span className="text-gray-400">Eight AI modules.</span>
          </h2>
          <p className="text-2xl text-gray-500 max-w-2xl leading-relaxed">
            We deploy a complete AI infrastructure stack — every module
            working together, all connected, live in days.
          </p>
        </div>
      </div>

      {/* Module list */}
      <div className="relative z-10 px-6 pb-20">
        <div className="max-w-7xl mr-auto ml-0 lg:ml-8">
          {modules.map((mod, index) => (
            <div
              key={mod.number}
              className="py-6 grid grid-cols-1 md:grid-cols-[90px_1fr_2fr] gap-4 items-start group -mx-6 px-6 cursor-default border-b border-indigo-100/60 last:border-0"
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
              <span className="text-base font-mono text-gray-300 pt-0.5 group-hover:text-indigo-400 transition-colors duration-200">
                {mod.number}
              </span>
              <h3 className="text-lg font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors duration-200">
                {mod.name}
              </h3>
              <p className="text-gray-500 leading-relaxed text-base group-hover:text-gray-600 transition-colors duration-200">
                {mod.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
