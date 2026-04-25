import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeader, Button } from '../../../components/ui/primitives';

const settings = [
  {
    section: 'Profile',
    items: [
      { label: 'Owner Email', value: process.env['OWNER_EMAIL'] ?? '', envKey: 'OWNER_EMAIL' },
      { label: 'Owner Phone', value: process.env['OWNER_PHONE'] ?? '', envKey: 'OWNER_PHONE' },
      { label: 'Cal.com Link', value: process.env['CAL_LINK'] ?? '', envKey: 'CAL_LINK' },
    ],
  },
  {
    section: 'Email',
    items: [
      { label: 'SendGrid From', value: process.env['SENDGRID_FROM_EMAIL'] ?? '', envKey: 'SENDGRID_FROM_EMAIL' },
      { label: 'Sender Name', value: process.env['SENDGRID_FROM_NAME'] ?? '', envKey: 'SENDGRID_FROM_NAME' },
    ],
  },
  {
    section: 'Platform',
    items: [
      { label: 'Prospector URL', value: process.env['PROSPECTOR_URL'] ?? '', envKey: 'PROSPECTOR_URL' },
      { label: 'API Gateway URL', value: process.env['API_GATEWAY_URL'] ?? process.env['API_URL'] ?? '', envKey: 'API_URL' },
    ],
  },
];

function maskKey(val: string): string {
  if (!val) return '';
  if (val.length <= 10) return val;
  return val.slice(0, 6) + '…' + val.slice(-4);
}

export default function SettingsPage() {
  return (
    <div className="pt-10 pb-24 px-10 max-w-[1400px] mx-auto space-y-10">
      {/* Header */}
      <section className="pb-8 hairline-b">
        <h1 className="text-paper text-[36px] font-semibold leading-tight tracking-tight">
          Settings
        </h1>
        <p className="text-paper-2 text-[14px] mt-3 max-w-xl leading-relaxed">
          Environment variables driving the platform. Configured in <code className="px-1.5 py-0.5 rounded-md bg-ink-2 text-signal text-[12px]">.env.local</code>,
          require a service restart to take effect.
        </p>
      </section>

      {settings.map((group) => (
        <section key={group.section}>
          <SectionHeader title={group.section} />
          <div className="mt-4 panel">
            {group.items.map((item) => (
              <div key={item.label} className="px-6 py-5 border-b border-rule last:border-0 flex items-center justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-[14px] text-paper font-medium">{item.label}</p>
                  <p className="text-[11px] text-paper-3 mt-1 font-mono">{item.envKey}</p>
                </div>
                <span className="font-mono text-[12px] px-3 py-1.5 rounded-md border border-rule bg-ink-1 shrink-0">
                  {item.value ? (
                    <span className="text-paper">{maskKey(item.value)}</span>
                  ) : (
                    <span className="text-ember">Not set</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section>
        <div className="panel p-6 flex items-center justify-between">
          <div>
            <p className="text-paper text-[16px] font-semibold tracking-tight">Managing integrations</p>
            <p className="text-[13px] text-paper-3 mt-1">
              Edit .env.local, restart the service, then check status.
            </p>
          </div>
          <Link href="/integrations">
            <Button>
              <span>Integrations</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
