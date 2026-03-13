import KpiCard from '../../../components/ui/kpi-card';

export default function ChatbotPage() {
  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Chatbot</h1>
        <p className="text-sm text-slate-500 mt-1">AI conversations across web, Instagram & Facebook</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Conversations" value="0" color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Leads Captured" value="0" color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Appointments Made" value="0" color="amber"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Avg Response Time" value="--" color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>} />
      </div>

      {/* Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {[
          { channel: 'Web Widget', count: 0, color: 'violet' },
          { channel: 'Instagram DMs', count: 0, color: 'rose' },
          { channel: 'Facebook Messenger', count: 0, color: 'sky' },
        ].map(({ channel, count, color }) => (
          <div key={channel} className={`bg-${color}-500/5 border border-${color}-500/10 rounded-xl p-5`}>
            <p className="text-xs text-slate-500">{channel}</p>
            <p className={`text-xl font-bold text-${color}-400 mt-1`}>{count}</p>
            <p className="text-[10px] text-slate-600 mt-1">conversations</p>
          </div>
        ))}
      </div>

      {/* Conversations Table */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Recent Conversations</h2>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">Channel</th>
                <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">Messages</th>
                <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">Lead Captured</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-600">
                  No conversations yet. Deploy your chatbot to start capturing leads.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
