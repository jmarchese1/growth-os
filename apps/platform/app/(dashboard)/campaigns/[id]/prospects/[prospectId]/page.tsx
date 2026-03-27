import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SendButton } from '../../send-button';
import { ConvertButton } from '../../convert-button';
import { SequenceSection } from './sequence-section';
import { WebsiteScore } from '../../website-score';

const PROSPECTOR_URL = process.env.PROSPECTOR_URL ?? 'http://localhost:3009';

/** Strip tracking pixel <img> tags so previewing in the platform doesn't trigger an open event */
function stripTrackingPixels(html: string): string {
  return html.replace(/<img[^>]*\/track\/open\/[^>]*\/?>/gi, '');
}

type ProspectStatus = 'NEW' | 'ENRICHED' | 'CONTACTED' | 'OPENED' | 'REPLIED' | 'CONVERTED' | 'BOUNCED' | 'DEAD' | 'UNSUBSCRIBED';

interface OutreachMessage {
  id: string;
  channel: string;
  subject: string | null;
  body: string;
  status: string;
  stepNumber: number | null;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  replyBody: string | null;
  externalId: string | null;
  createdAt: string;
}

interface ProspectDetail {
  id: string;
  name: string;
  email: string | null;
  emailSource: string | null;
  emailVerificationStatus: string | null;
  emailVerificationScore: number | null;
  emailVerifiedAt: string | null;
  phone: string | null;
  phoneSource: string | null;
  website: string | null;
  address: { formatted?: string; city?: string; state?: string; street?: string; zip?: string } | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactTitle: string | null;
  contactLinkedIn: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  logoUrl: string | null;
  revenue: string | null;
  foundedYear: number | null;
  status: ProspectStatus;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  campaign: {
    id: string;
    name: string;
    targetCity: string;
    targetIndustry: string;
    sequenceSteps: Array<{ stepNumber: number; delayHours: number; subject?: string; bodyHtml?: string }> | null;
  };
  messages: OutreachMessage[];
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const STATUS_MAP: Record<ProspectStatus, { label: string; bg: string; text: string; dot: string }> = {
  NEW:          { label: 'New',       bg: 'bg-slate-500/10',   text: 'text-slate-400',   dot: 'bg-slate-500' },
  ENRICHED:     { label: 'Has Email', bg: 'bg-blue-500/10',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  CONTACTED:    { label: 'Emailed',   bg: 'bg-violet-500/10',  text: 'text-violet-400',  dot: 'bg-violet-400' },
  OPENED:       { label: 'Opened',    bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  REPLIED:      { label: 'Replied',   bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  CONVERTED:    { label: 'Converted', bg: 'bg-green-500/10',   text: 'text-green-400',   dot: 'bg-green-400' },
  BOUNCED:      { label: 'Bounced',   bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400' },
  DEAD:         { label: 'Dead',      bg: 'bg-slate-600/10',   text: 'text-slate-500',   dot: 'bg-slate-600' },
  UNSUBSCRIBED: { label: 'Unsub',     bg: 'bg-orange-500/10',  text: 'text-orange-400',  dot: 'bg-orange-400' },
};

const MSG_STATUS_COLORS: Record<string, string> = {
  SENT:      'text-slate-400',
  DELIVERED: 'text-blue-400',
  OPENED:    'text-amber-400',
  REPLIED:   'text-emerald-400',
  BOUNCED:   'text-red-400',
  FAILED:    'text-red-500',
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  geoapify:      { label: 'Geoapify',  color: 'text-sky-500/50' },
  website_scrape:{ label: 'Website',   color: 'text-emerald-500/50' },
  brave_search:  { label: 'Brave',     color: 'text-orange-400/50' },
  apollo:        { label: 'Apollo.io', color: 'text-purple-400/60' },
  hunter:        { label: 'Hunter.io', color: 'text-purple-400/50' }, // legacy
};

function SourceBadge({ source }: { source: string | null | undefined }) {
  if (!source) return null;
  const s = SOURCE_LABELS[source] ?? { label: source, color: 'text-slate-600' };
  return (
    <span className={`text-[9px] font-semibold uppercase tracking-wider ${s.color}`}>
      via {s.label}
    </span>
  );
}

export default async function ProspectDetailPage({ params }: {
  params: Promise<{ id: string; prospectId: string }>;
}) {
  const { id: campaignId, prospectId } = await params;

  const res = await fetch(`${PROSPECTOR_URL}/prospects/${prospectId}`, { cache: 'no-store' });
  if (!res.ok) notFound();

  const prospect = (await res.json()) as ProspectDetail;
  const s = STATUS_MAP[prospect.status] ?? STATUS_MAP.NEW;
  const addr = prospect.address;
  const cityState = [addr?.city, addr?.state].filter(Boolean).join(', ');

  return (
    <div className="p-8 space-y-6 animate-fade-up max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link href="/campaigns" className="hover:text-violet-400 transition-colors">Campaigns</Link>
        <span>/</span>
        <Link href={`/campaigns/${campaignId}`} className="hover:text-violet-400 transition-colors">
          {prospect.campaign.name}
        </Link>
        <span>/</span>
        <span className="text-slate-400 truncate max-w-[200px]">{prospect.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {prospect.logoUrl && (
              <img src={prospect.logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/5" />
            )}
            <h1 className="text-2xl font-bold text-white tracking-tight">{prospect.name}</h1>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            {cityState && <span className="text-sm text-slate-500">{cityState}</span>}
            {prospect.googleRating && (
              <span className="text-sm text-amber-400/80">★ {prospect.googleRating}
                <span className="text-slate-600 ml-1 text-xs">({prospect.googleReviewCount ?? 0})</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(prospect.status === 'ENRICHED' || prospect.status === 'NEW') && prospect.email && (
            <SendButton prospectId={prospect.id} prospectorUrl={PROSPECTOR_URL} />
          )}
          {prospect.status === 'REPLIED' && (
            <ConvertButton prospectId={prospect.id} prospectorUrl={PROSPECTOR_URL} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Info */}
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5 space-y-4 glow-card">
          <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.16em]">Contact Info</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Email</dt>
              <dd>
                {prospect.email ? (
                  <a href={`mailto:${prospect.email}`} className="text-sm font-mono text-slate-300 hover:text-violet-400 transition-colors">
                    {prospect.email}
                  </a>
                ) : (
                  <span className="text-sm text-slate-700 italic">Not found</span>
                )}
                <div className="mt-0.5">
                  <SourceBadge source={prospect.emailSource} />
                </div>
                {prospect.emailVerificationStatus && (
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">
                    {prospect.emailVerificationStatus}{prospect.emailVerificationScore != null ? ` · ${prospect.emailVerificationScore}` : ''}
                  </div>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Phone</dt>
              <dd>
                {prospect.phone ? (
                  <a href={`tel:${prospect.phone}`} className="text-sm text-slate-300 hover:text-violet-400 transition-colors">
                    {prospect.phone}
                  </a>
                ) : (
                  <span className="text-sm text-slate-700 italic">—</span>
                )}
                <div className="mt-0.5">
                  <SourceBadge source={prospect.phoneSource} />
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">First Name</dt>
              <dd className="text-sm text-slate-300">{prospect.contactFirstName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Last Name</dt>
              <dd className="text-sm text-slate-300">{prospect.contactLastName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Title</dt>
              <dd className="text-sm text-slate-300">{prospect.contactTitle ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">LinkedIn</dt>
              <dd>
                {prospect.contactLinkedIn ? (
                  <a href={prospect.contactLinkedIn} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-violet-400 hover:text-violet-300 hover:underline transition-colors break-all">
                    {prospect.contactLinkedIn}
                  </a>
                ) : (
                  <span className="text-sm text-slate-300">—</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Business Info */}
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5 space-y-4 glow-card">
          <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.16em]">Business Info</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Website</dt>
              <dd>
                {prospect.website ? (
                  <a href={prospect.website} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-violet-400 hover:text-violet-300 hover:underline transition-colors break-all">
                    {prospect.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                ) : (
                  <span className="text-sm text-slate-700 italic">—</span>
                )}
                {prospect.website && (
                  <div className="mt-1.5">
                    <WebsiteScore url={prospect.website} />
                  </div>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Address</dt>
              <dd className="text-sm text-slate-400">
                {addr?.formatted ?? cityState ?? <span className="text-slate-700 italic">—</span>}
              </dd>
              {(addr?.formatted || cityState) && (
                <div className="mt-0.5">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-sky-500/50">via Geoapify</span>
                </div>
              )}
            </div>
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Google Rating</dt>
              <dd className="text-sm text-slate-400">
                {prospect.googleRating
                  ? `★ ${prospect.googleRating} (${prospect.googleReviewCount ?? 0} reviews)`
                  : <span className="text-slate-700 italic">—</span>}
              </dd>
              {prospect.googleRating && (
                <div className="mt-0.5">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-sky-500/50">via Geoapify</span>
                </div>
              )}
            </div>
            {prospect.revenue && (
              <div>
                <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Revenue</dt>
                <dd className="text-sm text-slate-400">{prospect.revenue}</dd>
              </div>
            )}
            {prospect.foundedYear && (
              <div>
                <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Founded</dt>
                <dd className="text-sm text-slate-400">{prospect.foundedYear}</dd>
              </div>
            )}
            {(prospect.linkedinUrl || prospect.facebookUrl || prospect.twitterUrl) && (
              <div>
                <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Social</dt>
                <dd className="flex items-center gap-3">
                  {prospect.linkedinUrl && (
                    <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">LinkedIn</a>
                  )}
                  {prospect.facebookUrl && (
                    <a href={prospect.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Facebook</a>
                  )}
                  {prospect.twitterUrl && (
                    <a href={prospect.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">Twitter</a>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Industry</dt>
              <dd className="text-sm text-slate-400 capitalize">{prospect.campaign.targetIndustry.toLowerCase()}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Campaign</dt>
              <dd>
                <Link href={`/campaigns/${campaignId}`} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  {prospect.campaign.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Added</dt>
              <dd className="text-sm text-slate-500">{fmt(prospect.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5 glow-card">
        <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.16em] mb-4">Activity Timeline</h2>
        <div className="relative pl-6 space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-white/10" />

          {/* Build timeline events */}
          {(() => {
            const events: { date: string; label: string; detail?: string; color: string }[] = [];
            events.push({ date: prospect.createdAt, label: 'Prospect discovered', detail: `Added to ${prospect.campaign.name}`, color: 'bg-slate-500' });
            if (prospect.email) {
              events.push({ date: prospect.updatedAt, label: 'Email found', detail: `${prospect.email}${prospect.emailSource ? ` via ${prospect.emailSource}` : ''}`, color: 'bg-blue-400' });
            }
            for (const msg of prospect.messages) {
              if (msg.sentAt) events.push({ date: msg.sentAt, label: msg.stepNumber === 1 ? 'Cold email sent' : `Follow-up ${(msg.stepNumber ?? 1) - 1} sent`, detail: msg.subject ?? undefined, color: 'bg-violet-400' });
              if (msg.openedAt) events.push({ date: msg.openedAt, label: 'Email opened', color: 'bg-amber-400' });
              if (msg.repliedAt) events.push({ date: msg.repliedAt, label: 'Reply received', detail: msg.replyBody?.slice(0, 80) ?? undefined, color: 'bg-emerald-400' });
            }
            if (prospect.status === 'BOUNCED') events.push({ date: prospect.updatedAt, label: 'Email bounced', color: 'bg-red-400' });
            if (prospect.status === 'CONVERTED') events.push({ date: prospect.updatedAt, label: 'Converted to lead', color: 'bg-green-400' });
            if (prospect.status === 'UNSUBSCRIBED') events.push({ date: prospect.updatedAt, label: 'Unsubscribed', color: 'bg-orange-400' });

            events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return events.map((ev, i) => (
              <div key={i} className="relative flex items-start gap-3 pb-4">
                <div className={`absolute left-[-15px] top-1.5 w-2.5 h-2.5 rounded-full ${ev.color} ring-2 ring-[#0f1117]`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">{ev.label}</span>
                    <span className="text-[10px] text-slate-700">{fmt(ev.date)}</span>
                  </div>
                  {ev.detail && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{ev.detail}</p>}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Sequence Timeline */}
      <SequenceSection
        steps={prospect.campaign.sequenceSteps ?? []}
        sentStepNumbers={prospect.messages.map((m) => m.stepNumber ?? 1)}
        nextFollowUpAt={prospect.nextFollowUpAt}
        prospectName={prospect.name}
        prospectCity={[prospect.address?.city, prospect.address?.state].filter(Boolean).join(', ') || prospect.campaign.targetCity}
        prospectorUrl={PROSPECTOR_URL}
        campaignId={campaignId}
      />

      {/* Email History */}
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] glow-card">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.16em]">
            Email History
            <span className="ml-2 text-slate-700 normal-case font-normal text-xs tracking-normal">{prospect.messages.length} message{prospect.messages.length !== 1 ? 's' : ''}</span>
          </h2>
        </div>

        {prospect.messages.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
            </div>
            <p className="text-sm text-slate-600">No emails sent yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {prospect.messages.map((msg) => (
              <div key={msg.id} className="px-5 py-4 space-y-3">
                {/* Message header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
                        {msg.stepNumber === 1 ? 'Cold Email' : msg.stepNumber ? `Follow-up ${msg.stepNumber - 1}` : 'Email'}
                      </span>
                    </div>
                    {msg.subject && (
                      <p className="text-sm font-medium text-white">{msg.subject}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${MSG_STATUS_COLORS[msg.status] ?? 'text-slate-400'}`}>
                        {msg.status}
                      </span>
                      <span className="text-[10px] text-slate-700 uppercase tracking-wider">{msg.channel}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-nowrap flex-shrink-0">{fmt(msg.createdAt)}</p>
                </div>

                {/* Timeline */}
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {msg.sentAt && (
                    <p className="text-xs text-slate-500">
                      <span className="text-slate-400 font-medium">Sent</span> {fmt(msg.sentAt)}
                    </p>
                  )}
                  {msg.openedAt && (
                    <p className="text-xs text-amber-500/80">
                      <span className="font-medium">Opened</span> {fmt(msg.openedAt)}
                    </p>
                  )}
                  {msg.repliedAt && (
                    <p className="text-xs text-emerald-500/80">
                      <span className="font-medium">Replied</span> {fmt(msg.repliedAt)}
                    </p>
                  )}
                </div>

                {/* Sent email body — expanded by default */}
                {msg.body && (
                  <details className="group" open>
                    <summary className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none hover:text-slate-400 transition-colors list-none flex items-center gap-1.5">
                      <svg className="w-3 h-3 transition-transform group-open:rotate-90 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Sent Email
                    </summary>
                    <div className="mt-2 bg-white rounded-xl overflow-hidden border border-white/10">
                      <iframe
                        srcDoc={stripTrackingPixels(msg.body)}
                        className="w-full border-0"
                        style={{ minHeight: '200px', height: '320px' }}
                        title="Sent email preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </details>
                )}

                {/* Reply body */}
                {msg.replyBody && (
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                    <p className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest mb-2">Their Reply</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{msg.replyBody}</p>
                  </div>
                )}

                {msg.externalId && (
                  <p className="text-[10px] font-mono text-slate-800">ID: {msg.externalId}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
