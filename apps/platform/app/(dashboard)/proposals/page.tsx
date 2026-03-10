export default function ProposalsPage() {
  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Proposals</h1>
        <p className="text-slate-400 mt-1 text-sm">AI-generated proposals sent to prospects.</p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
        <p className="text-slate-400 text-sm mb-5">
          Generate and manage proposals for potential clients. Proposals are created from the public landing page.
        </p>
        <a
          href={`${process.env['NEXT_PUBLIC_WEB_URL'] ?? 'http://localhost:3010'}#proposal`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors"
        >
          Generate New Proposal →
        </a>
      </div>
    </div>
  );
}
