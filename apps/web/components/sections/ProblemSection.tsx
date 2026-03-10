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

      </div>
    </section>
  );
}
