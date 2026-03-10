import AnimatedStat from '@/components/ui/AnimatedStat';
import LogoDisplay from '@/components/ui/LogoDisplay';

export default function ProblemSection() {
  const problems = [
    { stat: '73%', text: 'of inbound calls to local businesses go unanswered during peak hours' },
    { stat: '68%', text: 'of website visitors leave without ever making contact' },
    { stat: '4x', text: 'more revenue from leads who receive a follow-up within 5 minutes' },
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Top row: text + logo display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-4">
              The Problem
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-5">
              Most leads go cold
              <br />
              <span className="text-gray-400">before you even know.</span>
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              Every missed call, unanswered DM, and delayed follow-up is{' '}
              <span className="text-gray-900 font-semibold">revenue walking out the door</span>.
              Local businesses run on relationships — but they can&apos;t scale relationships without AI.
            </p>
          </div>

          {/* Glowing rotating logo instead of a photo */}
          <div className="h-80 lg:h-[400px] rounded-3xl overflow-hidden bg-gray-950 relative">
            <LogoDisplay />
          </div>
        </div>

        {/* Animated stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {problems.map((p) => (
            <AnimatedStat key={p.stat} value={p.stat} label={p.text} />
          ))}
        </div>

        {/* Quote block */}
        <div className="mt-6 p-10 bg-black text-white rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-900 opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-900 opacity-15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4 relative z-10">Heard on a discovery call</p>
          <p className="text-2xl md:text-3xl font-semibold leading-snug max-w-3xl relative z-10">
            &ldquo;I spent four hours every Sunday
            scheduling Instagram posts, writing captions, replying to DMs.
            Four hours — every single week. When you showed me it could all just{' '}
            <span className="text-indigo-400">run on its own</span>...
            I actually cried. Not because of the time.
            Because that was{' '}
            <span className="text-white">Sunday mornings with my kids</span>
            {' '}I was never getting back.&rdquo;
          </p>
          <p className="mt-6 text-gray-500 text-sm leading-relaxed max-w-xl relative z-10">
            This is what AI infrastructure actually means for local business owners.
            Not robots. Not complexity. Just{' '}
            <span className="text-gray-300">time back</span> and{' '}
            <span className="text-gray-300">leads that don&apos;t slip through</span>.
          </p>
          <p className="mt-4 text-embedo-accent-light text-sm relative z-10">— Salon owner, Chicago · Embedo customer since day one</p>
        </div>
      </div>
    </section>
  );
}
