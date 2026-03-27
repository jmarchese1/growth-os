import Link from 'next/link';

const settings = [
  {
    section: 'Profile',
    items: [
      { label: 'Owner Email', value: process.env['OWNER_EMAIL'] ?? 'Not set', envKey: 'OWNER_EMAIL' },
      { label: 'Owner Phone', value: process.env['OWNER_PHONE'] ?? 'Not set', envKey: 'OWNER_PHONE' },
      { label: 'Cal.com Link', value: process.env['CAL_LINK'] ?? 'Not set', envKey: 'CAL_LINK' },
    ],
  },
  {
    section: 'Email',
    items: [
      { label: 'SendGrid From', value: process.env['SENDGRID_FROM_EMAIL'] ?? 'Not set', envKey: 'SENDGRID_FROM_EMAIL' },
      { label: 'Sender Name', value: process.env['SENDGRID_FROM_NAME'] ?? 'Not set', envKey: 'SENDGRID_FROM_NAME' },
    ],
  },
  {
    section: 'Platform',
    items: [
      { label: 'Prospector URL', value: process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009', envKey: 'PROSPECTOR_URL' },
      { label: 'API Gateway URL', value: process.env['API_GATEWAY_URL'] ?? process.env['API_URL'] ?? 'http://localhost:3000', envKey: 'API_URL' },
    ],
  },
];

function maskKey(val: string): string {
  if (val.length <= 8) return val;
  return val.slice(0, 6) + '...' + val.slice(-4);
}

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Platform configuration and environment overview.</p>
      </div>

      {settings.map((group) => (
        <div key={group.section} className="bg-white/5 rounded-2xl border border-white/10">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">{group.section}</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {group.items.map((item) => (
              <div key={item.label} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">{item.label}</p>
                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">{item.envKey}</p>
                </div>
                <span className="text-sm text-slate-400 font-mono bg-white/[0.04] px-3 py-1.5 rounded-lg">
                  {item.value === 'Not set' ? (
                    <span className="text-red-400">Not set</span>
                  ) : (
                    maskKey(item.value)
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white mb-2">Environment</h2>
        <p className="text-xs text-slate-500 mb-4">
          Settings are configured via environment variables in <code className="text-violet-400">.env.local</code>.
          Changes require a service restart.
        </p>
        <div className="flex gap-3">
          <Link
            href="/integrations"
            className="px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/20 text-sm font-medium text-violet-300 hover:bg-violet-600/30 transition-colors"
          >
            Manage Integrations
          </Link>
        </div>
      </div>
    </div>
  );
}
