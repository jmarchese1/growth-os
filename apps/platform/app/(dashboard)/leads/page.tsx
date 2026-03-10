export default function LeadsPage() {
  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Leads</h1>
        <p className="text-slate-400 mt-1 text-sm">All leads from all sources and businesses.</p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
        <p className="text-slate-400 text-sm mb-5">
          Lead data is available via the CRM API. Select a business to view its contacts and leads.
        </p>
        <a
          href="/businesses"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10"
        >
          View businesses →
        </a>
      </div>
    </div>
  );
}
