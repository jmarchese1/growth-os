import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeader, Panel, Button } from '../../../components/ui/primitives';

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
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">
      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 10 · Configuration
          </span>
          <span className="h-px w-16 bg-rule" />
        </div>
        <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
          The wiring.
        </h1>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          Environment variables driving the platform. Configured in <code className="font-mono text-signal">.env.local</code>,
          require a service restart to take effect.
        </p>
      </section>

      {settings.map((group, idx) => (
        <section key={group.section}>
          <SectionHeader numeral={(idx + 1).toString()} title={group.section} />
          <div className="mt-6 panel">
            {group.items.map((item) => (
              <div key={item.label} className="px-6 py-5 hairline-b last:border-0 flex items-center justify-between gap-6">
                <div className="min-w-0">
                  <p className="font-ui text-[15px] text-paper">{item.label}</p>
                  <p className="font-mono text-[10px] tracking-micro uppercase text-paper-4 mt-1">{item.envKey}</p>
                </div>
                <span className="font-mono text-[12px] hairline px-3 py-1.5 shrink-0">
                  {item.value ? (
                    <span className="text-paper">{maskKey(item.value)}</span>
                  ) : (
                    <span className="text-ember tracking-micro uppercase">Not set</span>
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
            <p className="font-display italic text-paper text-xl font-light">Managing integrations</p>
            <p className="font-mono text-[11px] tracking-micro uppercase text-paper-3 mt-1">
              Edit .env.local · restart the service · check status
            </p>
          </div>
          <Link href="/integrations">
            <Button>
              <span>Integrations</span>
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
