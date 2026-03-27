const integrations = [
  {
    name: 'SendGrid',
    description: 'Transactional email sending for campaigns and sequences.',
    status: process.env['SENDGRID_API_KEY'] ? 'connected' : 'not_configured',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
        <rect width="24" height="24" rx="4" fill="#1A82E2" />
        <path d="M7 7h4v4H7V7zm6 0h4v4h-4V7zM7 13h4v4H7v-4zm6 0h4v4h-4v-4z" fill="white" fillOpacity="0.9" />
      </svg>
    ),
    envKey: 'SENDGRID_API_KEY',
    docs: 'https://docs.sendgrid.com',
    features: ['Campaign emails', 'Follow-up sequences', 'Inbound parse (replies)', 'Event webhooks (opens/bounces)'],
  },
  {
    name: 'Apollo.io',
    description: 'Prospect discovery and email enrichment for outbound campaigns.',
    status: process.env['APOLLO_API_KEY'] ? 'connected' : 'not_configured',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
        <rect width="24" height="24" rx="4" fill="#6C3FEE" />
        <path d="M12 5l6 14H6l6-14z" fill="white" fillOpacity="0.9" />
      </svg>
    ),
    envKey: 'APOLLO_API_KEY',
    docs: 'https://apolloio.github.io/apollo-api-docs',
    features: ['Prospect email lookup', 'Contact enrichment (name, title, LinkedIn)', 'Company data'],
  },
  {
    name: 'Anthropic (Claude)',
    description: 'AI-powered email personalization, daily reports, and chatbot.',
    status: process.env['ANTHROPIC_API_KEY'] ? 'connected' : 'not_configured',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
        <rect width="24" height="24" rx="4" fill="#D4A574" />
        <path d="M8 16l4-12 4 12M9.5 13h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    envKey: 'ANTHROPIC_API_KEY',
    docs: 'https://docs.anthropic.com',
    features: ['AI email personalization', 'Daily report generation', 'Chatbot conversations', 'Proposal content'],
  },
  {
    name: 'Cal.com',
    description: 'Scheduling and calendar management for prospect meetings.',
    status: process.env['CAL_COM_API_KEY'] ? 'connected' : process.env['CAL_LINK'] ? 'partial' : 'not_configured',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
        <rect width="24" height="24" rx="4" fill="#292929" />
        <path d="M7 8h10M7 12h6M7 16h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    envKey: 'CAL_COM_API_KEY',
    docs: 'https://cal.com/docs',
    features: ['Meeting booking via webhook', 'Prospect-to-lead bridge', 'Full calendar sync via API', 'SMS notifications'],
  },
  {
    name: 'ElevenLabs',
    description: 'Voice AI agent for inbound phone calls and lead capture.',
    status: process.env['ELEVENLABS_API_KEY'] ? 'connected' : 'not_configured',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
        <rect width="24" height="24" rx="4" fill="#000000" />
        <rect x="8" y="5" width="2" height="14" rx="1" fill="white" />
        <rect x="14" y="5" width="2" height="14" rx="1" fill="white" />
      </svg>
    ),
    envKey: 'ELEVENLABS_API_KEY',
    docs: 'https://docs.elevenlabs.io',
    features: ['Voice agent provisioning', 'Call handling', 'Transcript analysis', 'Lead capture from calls'],
  },
  {
    name: 'Twilio',
    description: 'SMS notifications and phone number provisioning.',
    status: process.env['TWILIO_ACCOUNT_SID'] ? 'connected' : 'not_configured',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
        <rect width="24" height="24" rx="4" fill="#F22F46" />
        <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="10" cy="10.5" r="1.2" fill="white" />
        <circle cx="14" cy="10.5" r="1.2" fill="white" />
        <circle cx="10" cy="13.5" r="1.2" fill="white" />
        <circle cx="14" cy="13.5" r="1.2" fill="white" />
      </svg>
    ),
    envKey: 'TWILIO_ACCOUNT_SID',
    docs: 'https://www.twilio.com/docs',
    features: ['SMS alerts for new bookings', 'Phone number provisioning', 'Voice call routing'],
  },
];

function statusBadge(status: string) {
  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Connected
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-400">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        Webhook only
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
      Not configured
    </span>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Integrations</h1>
        <p className="text-slate-400 mt-1 text-sm">Connected services and API configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integ) => (
          <div
            key={integ.name}
            className={`bg-white/5 rounded-2xl border p-5 transition-colors ${
              integ.status === 'connected'
                ? 'border-emerald-500/20 hover:border-emerald-500/30'
                : 'border-white/10 hover:border-white/15'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">{integ.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{integ.name}</h3>
                  {statusBadge(integ.status)}
                </div>
                <p className="text-xs text-slate-500 mt-1">{integ.description}</p>

                <div className="mt-3 space-y-1">
                  {integ.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[11px] text-slate-400">
                      <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 text-violet-400/60 flex-shrink-0">
                        <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-600">{integ.envKey}</span>
                  <a
                    href={integ.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-violet-400 hover:text-violet-300"
                  >
                    Docs
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white mb-2">Adding Integrations</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Integrations are configured via environment variables in <code className="text-violet-400">.env.local</code>.
          Add the API key for any service above, restart the platform, and the status will update automatically.
          Webhook endpoints are registered in the API gateway at <code className="text-violet-400">apps/api/src/routes/webhooks/</code>.
        </p>
      </div>
    </div>
  );
}
