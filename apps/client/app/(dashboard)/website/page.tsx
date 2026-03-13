export default function WebsitePage() {
  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Website</h1>
        <p className="text-sm text-slate-500 mt-1">Your auto-generated business website</p>
      </div>

      {/* Website Status Card */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-white">Website Status</h3>
            <p className="text-xs text-slate-600 mt-0.5">Auto-deployed to Vercel</p>
          </div>
          <span className="px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full text-xs font-medium text-slate-500">
            Not Deployed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Live URL</p>
            <p className="text-sm text-slate-500">--</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Template</p>
            <p className="text-sm text-slate-500">--</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Last Deployed</p>
            <p className="text-sm text-slate-500">--</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Website Sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {['Hero', 'About', 'Menu', 'Gallery', 'Testimonials', 'Contact', 'Booking', 'Chatbot Widget'].map((section) => (
            <div key={section} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">{section}</span>
              <div className="w-2 h-2 rounded-full bg-slate-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Traffic (placeholder) */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Traffic Analytics</h2>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-slate-600 text-sm">Deploy your website to start tracking visitor analytics.</p>
        </div>
      </div>
    </div>
  );
}
