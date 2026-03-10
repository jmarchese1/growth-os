import Image from 'next/image';

// Mini bar chart data (height percentages)
const bars = [42, 68, 55, 80, 63, 91, 74];
const recentLeads = [
  { initials: 'SM', name: 'Sarah M.', source: 'Chatbot', time: '2m ago', color: '#6366F1' },
  { initials: 'JK', name: 'James K.', source: 'Voice AI', time: '7m ago', color: '#8B5CF6' },
  { initials: 'AL', name: 'Amy L.', source: 'Instagram', time: '14m ago', color: '#0866FF' },
];

export default function PhotoSection() {
  return (
    <section className="py-10 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[300px]">

          {/* Voice Agent */}
          <div className="relative rounded-2xl overflow-hidden group">
            <Image
              src="https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=600&q=80"
              alt="AI voice agent"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-xs font-semibold tracking-widest uppercase text-indigo-300 mb-1">AI Voice Agent</p>
              <p className="text-base font-bold leading-snug">Every call answered.<br />Every lead captured.</p>
            </div>
          </div>

          {/* Social Media AI */}
          <div className="relative rounded-2xl overflow-hidden group">
            <Image
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80"
              alt="Social media automation"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-xs font-semibold tracking-widest uppercase text-indigo-300 mb-1">Social Media AI</p>
              <p className="text-base font-bold leading-snug">Always posting.<br />Always engaging.</p>
            </div>
          </div>

          {/* Lead Engine — live dashboard */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-950 flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 to-gray-950" />
            <div className="relative z-10 flex flex-col h-full p-4">

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold tracking-widest uppercase text-indigo-400">Lead Engine</p>
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>

              {/* Big metric */}
              <div className="mb-3">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">47</span>
                  <span className="text-xs text-emerald-400 font-semibold mb-1">↑ 23%</span>
                </div>
                <p className="text-xs text-gray-500">leads captured this week</p>
              </div>

              {/* Mini bar chart */}
              <div className="flex items-end gap-1 h-10 mb-3">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: h + '%',
                      background: i === bars.length - 1
                        ? 'linear-gradient(to top, #6366F1, #818CF8)'
                        : 'rgba(99,102,241,0.3)',
                    }}
                  />
                ))}
              </div>

              {/* Recent leads */}
              <div className="space-y-2 flex-1">
                {recentLeads.map((lead) => (
                  <div key={lead.name} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: lead.color }}
                    >
                      {lead.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium leading-none">{lead.name}</p>
                      <p className="text-xs text-gray-600 leading-none mt-0.5">{lead.source}</p>
                    </div>
                    <span className="text-xs text-gray-600 flex-shrink-0">{lead.time}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
