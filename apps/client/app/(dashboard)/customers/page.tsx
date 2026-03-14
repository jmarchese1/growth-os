import KpiCard from '../../../components/ui/kpi-card';

export default function CustomersPage() {
  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
        <p className="text-sm text-slate-500 mt-1">Everyone who has interacted with your business — walk-ins, callers, chatters, and more</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Customers" value="0" color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
        <KpiCard label="New This Month" value="0" color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>} />
        <KpiCard label="From QR Scans" value="0" color="amber"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /></svg>} />
        <KpiCard label="In Active Campaign" value="0" color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">How They Found You</h3>
          <div className="space-y-3">
            {['Phone Call', 'Chat Widget', 'QR Code Scan', 'Website Form', 'Survey', 'Manual'].map((source) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{source}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-400 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <span className="text-xs text-slate-400 w-8 text-right">0</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Engagement</h3>
          <div className="space-y-3">
            {[
              { label: 'Received a campaign email', count: 0 },
              { label: 'Completed a survey', count: 0 },
              { label: 'Made a phone reservation', count: 0 },
              { label: 'Chatted with widget', count: 0 },
            ].map(({ label, count }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{label}</span>
                <span className="text-sm font-medium text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">All Customers</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Email</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Phone</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Source</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                  No customers yet. They&apos;ll appear here when they call, chat, scan a QR code, or fill out a form.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
