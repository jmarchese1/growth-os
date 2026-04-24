import { ArrowUpRight, Check, Circle } from 'lucide-react';
import { SectionHeader } from '../../../components/ui/primitives';

const integrations = [
  {
    name: 'SendGrid',
    description: 'Transactional email sending for campaigns and sequences.',
    status: process.env['SENDGRID_API_KEY'] ? 'connected' : 'not_configured',
    envKey: 'SENDGRID_API_KEY',
    docs: 'https://docs.sendgrid.com',
    features: ['Campaign emails', 'Follow-up sequences', 'Inbound parse', 'Event webhooks'],
  },
  {
    name: 'Apollo.io',
    description: 'Prospect discovery and email enrichment for outbound campaigns.',
    status: process.env['APOLLO_API_KEY'] ? 'connected' : 'not_configured',
    envKey: 'APOLLO_API_KEY',
    docs: 'https://apolloio.github.io/apollo-api-docs',
    features: ['Prospect email lookup', 'Contact enrichment', 'Company data'],
  },
  {
    name: 'Geoapify',
    description: 'Geocoding + Places API for business discovery by city and category.',
    status: process.env['GEOAPIFY_API_KEY'] ? 'connected' : 'not_configured',
    envKey: 'GEOAPIFY_API_KEY',
    docs: 'https://apidocs.geoapify.com',
    features: ['City geocoding', 'Business discovery', 'Bounding box search', 'OSM contact data'],
  },
  {
    name: 'Anthropic',
    description: 'Claude Sonnet + Haiku for personalization, analysis, reports.',
    status: process.env['ANTHROPIC_API_KEY'] ? 'connected' : 'not_configured',
    envKey: 'ANTHROPIC_API_KEY',
    docs: 'https://docs.anthropic.com',
    features: ['Email personalization', 'Website analysis', 'Daily reports', 'Proposal content'],
  },
  {
    name: 'Cal.com',
    description: 'Scheduling and calendar management for prospect meetings.',
    status: process.env['CAL_COM_API_KEY']
      ? 'connected'
      : process.env['CAL_LINK']
      ? 'partial'
      : 'not_configured',
    envKey: 'CAL_COM_API_KEY',
    docs: 'https://cal.com/docs',
    features: ['Meeting booking webhook', 'Prospect-to-lead bridge', 'Full calendar sync', 'SMS notifications'],
  },
  {
    name: 'ElevenLabs',
    description: 'Voice AI agent for inbound phone calls and lead capture.',
    status: process.env['ELEVENLABS_API_KEY'] ? 'connected' : 'not_configured',
    envKey: 'ELEVENLABS_API_KEY',
    docs: 'https://docs.elevenlabs.io',
    features: ['Voice agent provisioning', 'Call handling', 'Transcript analysis', 'Lead capture'],
  },
  {
    name: 'Twilio',
    description: 'SMS notifications and phone number provisioning.',
    status: process.env['TWILIO_ACCOUNT_SID'] ? 'connected' : 'not_configured',
    envKey: 'TWILIO_ACCOUNT_SID',
    docs: 'https://www.twilio.com/docs',
    features: ['SMS alerts', 'Phone provisioning', 'Voice routing'],
  },
];

function statusLabel(status: string) {
  if (status === 'connected') return 'Connected';
  if (status === 'partial') return 'Webhook only';
  return 'Not configured';
}

function statusColor(status: string) {
  if (status === 'connected') return 'text-signal';
  if (status === 'partial') return 'text-amber';
  return 'text-paper-4';
}

export default function IntegrationsPage() {
  const connectedCount = integrations.filter((i) => i.status === 'connected').length;

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">
      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 11 · Integrations
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {connectedCount} of {integrations.length} connected
          </span>
        </div>
        <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
          Connected systems.
        </h1>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          Every external dependency, at a glance. Add API keys to <code className="font-mono text-signal">.env.local</code>;
          restart to activate.
        </p>
      </section>

      <section>
        <SectionHeader numeral="1" title="Services" />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integ) => (
            <article key={integ.name} className="panel p-5 hover:border-paper-4 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display italic text-paper text-2xl font-light leading-none">{integ.name}</h3>
                  <p className="font-mono text-[10px] tracking-micro uppercase text-paper-4 mt-2">{integ.envKey}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-mega uppercase ${statusColor(integ.status)}`}>
                  {integ.status === 'connected' ? <Check className="w-3 h-3" /> : <Circle className="w-2 h-2 fill-current" />}
                  {statusLabel(integ.status)}
                </span>
              </div>

              <p className="font-ui text-[13px] text-paper-2 leading-relaxed mb-4">{integ.description}</p>

              <div className="hairline-t pt-3 space-y-1">
                {integ.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 font-mono text-[10px] tracking-micro text-paper-3">
                    <span className="w-1 h-1 bg-signal shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 hairline-t flex items-center justify-end">
                <a
                  href={integ.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] tracking-mega uppercase text-paper-3 hover:text-signal transition-colors"
                >
                  <span>Docs</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
