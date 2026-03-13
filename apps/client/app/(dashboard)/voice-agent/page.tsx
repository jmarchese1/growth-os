import KpiCard from '../../../components/ui/kpi-card';

export default function VoiceAgentPage() {
  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Voice Agent</h1>
        <p className="text-sm text-slate-500 mt-1">AI receptionist — call logs, transcripts & analytics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Calls" value="0" color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>} />
        <KpiCard label="Avg Duration" value="0:00" color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Leads Captured" value="0" color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Positive Sentiment" value="0%" color="teal"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" /></svg>} />
      </div>

      {/* Intent Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Intent Breakdown</h3>
          <div className="space-y-3">
            {['Reservation', 'Inquiry', 'Complaint', 'General'].map((intent) => (
              <div key={intent} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{intent}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500/40 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <span className="text-xs text-slate-600 w-8 text-right">0</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Sentiment Analysis</h3>
          <div className="space-y-3">
            {[
              { label: 'Positive', color: 'bg-emerald-500/60' },
              { label: 'Neutral', color: 'bg-slate-500/60' },
              { label: 'Negative', color: 'bg-rose-500/60' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: '0%' }} />
                  </div>
                  <span className="text-xs text-slate-600 w-8 text-right">0%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call Log Table */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Recent Calls</h2>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">Caller</th>
                <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">Intent</th>
                <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">Duration</th>
                <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-600">
                  No calls recorded yet. Your voice agent will log calls here once activated.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
