export default function WebsitePage() {
  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Website</h1>
        <p className="text-sm text-slate-500 mt-1">Your auto-generated business website</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Website Status</h3>
            <p className="text-xs text-slate-400 mt-0.5">Auto-deployed to Vercel</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-500">Not Deployed</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Live URL', value: '--' },
            { label: 'Template', value: '--' },
            { label: 'Last Deployed', value: '--' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 border border-slate-200/60 rounded-lg p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm text-slate-500">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Website Sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {['Hero', 'About', 'Menu', 'Gallery', 'Testimonials', 'Contact', 'Booking', 'Chatbot Widget'].map((section) => (
            <div key={section} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-slate-600">{section}</span>
              <div className="w-2 h-2 rounded-full bg-slate-300" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Traffic Analytics</h2>
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">Deploy your website to start tracking visitor analytics.</p>
        </div>
      </div>
    </div>
  );
}
