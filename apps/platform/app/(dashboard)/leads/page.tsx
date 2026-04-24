import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LeadRowActions } from './lead-row-actions';
import { CreateLeadButton } from './seed-button';
import { SectionHeader, HeroMetric, MetricBlock, Panel } from '../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface ProspectLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactTitle: string | null;
  convertedToBusinessId: string | null;
  createdAt: string;
  updatedAt: string;
  campaign: { id: string; name: string; targetCity: string };
  messages: {
    status: string;
    subject: string | null;
    replyBody: string | null;
    repliedAt: string | null;
    replyCategory: string | null;
    sentAt: string | null;
  }[];
}

interface Campaign { id: string; name: string; targetCity: string; }

async function getLeads(): Promise<{ items: ProspectLead[]; total: number }> {
  try {
    const campaignsRes = await fetch(`${PROSPECTOR_URL}/campaigns`, { next: { revalidate: 30 } });
    if (!campaignsRes.ok) return { items: [], total: 0 };
    const campaigns: Campaign[] = await campaignsRes.json();

    // Parallel fetch all campaign prospects
    const results = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const res = await fetch(
            `${PROSPECTOR_URL}/campaigns/${campaign.id}/prospects?status=REPLIED,MEETING_BOOKED,CONVERTED&pageSize=100`,
            { next: { revalidate: 30 } },
          );
          if (!res.ok) return [];
          const data = await res.json();
          return (data.items ?? []).map((p: ProspectLead) => ({
            ...p,
            campaign: { id: campaign.id, name: campaign.name, targetCity: campaign.targetCity },
          }));
        } catch {
          return [];
        }
      }),
    );

    const allLeads = results.flat();
    const activeLeads = allLeads.filter((l) => !l.convertedToBusinessId);
    activeLeads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { items: activeLeads, total: activeLeads.length };
  } catch {
    return { items: [], total: 0 };
  }
}

const statusDot: Record<string, string> = {
  REPLIED:        'bg-[#63b7ff]',
  MEETING_BOOKED: 'bg-signal',
  CONVERTED:      'bg-amber',
};

const sentimentColor: Record<string, string> = {
  POSITIVE: 'text-signal',
  NEUTRAL:  'text-paper-3',
  NEGATIVE: 'text-ember',
  OOO:      'text-amber',
  UNSUBSCRIBE: 'text-paper-4',
};

export default async function LeadsPage() {
  const { items, total } = await getLeads();

  const replied = items.filter((l) => l.status === 'REPLIED').length;
  const meetingBooked = items.filter((l) => l.status === 'MEETING_BOOKED').length;
  const converted = items.filter((l) => l.status === 'CONVERTED').length;

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">

      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 03 · Leads
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {total} on the wire
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
            Prospects who <br />
            <span className="text-signal not-italic" style={{ fontFamily: 'var(--font-mono)' }}>replied</span>.
          </h1>
          <CreateLeadButton prospectorUrl={PROSPECTOR_URL} />
        </div>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          The moment a cold prospect turns warm. Reply category, sentiment, last activity, at a glance.
        </p>
      </section>

      {/* Summary numbers */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5">
          <HeroMetric label="Warm pipeline" value={total.toLocaleString()} caption={`${converted} already converted to clients`} size="md" />
        </div>
        <div className="col-span-12 lg:col-span-7 panel">
          <div className="grid grid-cols-3">
            <MetricBlock label="Replied" value={replied} delta="awaiting follow-up" />
            <MetricBlock label="Meeting booked" value={meetingBooked} delta="in the calendar" trend={meetingBooked > 0 ? 'up' : 'flat'} />
            <MetricBlock label="Converted" value={converted} delta="signed clients" trend={converted > 0 ? 'up' : 'flat'} />
          </div>
        </div>
      </section>

      {/* Ledger */}
      <section>
        <SectionHeader numeral="1" title="The wire" subtitle={`${total} leads, sorted by recent activity`} />
        <div className="mt-6 panel overflow-hidden">
          {items.length === 0 ? (
            <div className="p-20 text-center">
              <p className="font-display italic text-paper-3 text-2xl font-light">
                No replies yet. Stay patient.
              </p>
              <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4 mt-3">
                When prospects reply, they'll surface here.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <Th>Lead</Th>
                  <Th>Campaign</Th>
                  <Th>Status</Th>
                  <Th>Reply excerpt</Th>
                  <Th>Sentiment</Th>
                  <Th align="right">Last activity</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {items.map((lead) => {
                  const latestReply = lead.messages.find((m) => m.replyBody);
                  const sentiment = latestReply?.replyCategory;
                  return (
                    <tr key={lead.id} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors group">
                      <td className="px-5 py-4 min-w-[220px]">
                        <div className="flex items-start gap-3">
                          <span className={`w-1.5 h-1.5 mt-2 shrink-0 relative ${statusDot[lead.status] ?? 'bg-paper-4'}`} />
                          <div className="min-w-0">
                            <Link href={`/leads/${lead.id}`} className="font-display italic text-paper text-lg font-light hover:text-signal transition-colors block leading-tight">
                              {lead.name}
                            </Link>
                            {lead.contactFirstName && (
                              <p className="font-mono text-[10px] tracking-micro text-paper-3 mt-0.5 uppercase">
                                {lead.contactFirstName} {lead.contactLastName ?? ''}{lead.contactTitle ? ` · ${lead.contactTitle}` : ''}
                              </p>
                            )}
                            {lead.email && <p className="font-mono text-[10px] text-paper-4 mt-0.5 truncate">{lead.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-ui text-sm text-paper">{lead.campaign.name}</p>
                        <p className="font-mono text-[10px] tracking-micro text-paper-4 uppercase mt-0.5">{lead.campaign.targetCity}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-[10px] tracking-micro text-paper-2 uppercase hairline px-2 py-1">
                          {lead.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        {latestReply?.replyBody ? (
                          <p className="font-display italic text-paper-2 text-[13px] leading-snug truncate" title={latestReply.replyBody}>
                            "{latestReply.replyBody.slice(0, 90)}{latestReply.replyBody.length > 90 ? '…' : ''}"
                          </p>
                        ) : (
                          <span className="font-mono text-[10px] text-paper-4">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {sentiment ? (
                          <span className={`font-mono text-[10px] tracking-micro uppercase ${sentimentColor[sentiment] ?? 'text-paper-3'}`}>
                            {sentiment.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-paper-4">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-[11px] text-paper-3 nums">
                        {new Date(lead.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <LeadRowActions prospectId={lead.id} prospectName={lead.name} status={lead.status} prospectorUrl={PROSPECTOR_URL} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 font-mono text-[9px] tracking-mega uppercase text-paper-4 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}
