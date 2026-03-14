import KpiCard from '../../../components/ui/kpi-card';

export default function QrCodesPage() {
  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QR Codes</h1>
          <p className="text-sm text-slate-500 mt-1">Generate scannable cards for tables, menus, and the front desk — customers scan to join promos and enter your database</p>
        </div>
        <button className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
          Create QR Code
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Active QR Codes" value="0" color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Total Scans" value="0" color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
        <KpiCard label="New Customers" value="0" color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>} />
        <KpiCard label="This Week" value="0" color="amber"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
      </div>

      {/* What are QR codes explainer */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-violet-800 mb-2">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {[
            { step: '1', title: 'Create a QR code', desc: 'Choose a promo (e.g. "Spin to win 10% off") or just a sign-up form' },
            { step: '2', title: 'Print & place it', desc: 'Download a print-ready card to put on tables, menus, or the host desk' },
            { step: '3', title: 'Customers scan it', desc: 'They enter their name, email, or phone — instantly added to your customer list' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</div>
              <div>
                <p className="text-sm font-semibold text-violet-900">{title}</p>
                <p className="text-xs text-violet-700 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Your QR Codes</h2>
        </div>
        <div className="px-5 py-12 text-center text-sm text-slate-400">
          No QR codes yet. Create one and place it in your restaurant to start building your customer list.
        </div>
      </div>
    </div>
  );
}
