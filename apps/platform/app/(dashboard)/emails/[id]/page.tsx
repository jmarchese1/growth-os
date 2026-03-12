import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ComposeEmail } from './compose-email';
import { PendingSequence } from './pending-sequence';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  subject?: string;
  bodyHtml?: string;
}

interface Campaign {
  id: string;
  name: string;
  targetCity: string;
  targetIndustry: string;
  sequenceSteps: SequenceStep[] | null;
}

interface Message {
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
  replyCategory: string | null;
  trackingPixelId: string | null;
  createdAt: string;
}

interface Prospect {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: { city?: string; state?: string; formatted?: string } | null;
  status: string;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactTitle: string | null;
  contactLinkedIn: string | null;
  emailSource: string | null;
  emailVerificationStatus: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  nextFollowUpAt: string | null;
  convertedToBusinessId: string | null;
  createdAt: string;
  updatedAt: string;
  campaign: Campaign;
  messages: Message[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtFull(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string; bg: string; text: string }> = {
    NEW:            { dot: 'bg-slate-500',   label: 'New',             bg: 'bg-slate-500/10',   text: 'text-slate-400' },
    ENRICHED:       { dot: 'bg-blue-400',    label: 'Has Email',       bg: 'bg-blue-500/10',    text: 'text-blue-400' },
    CONTACTED:      { dot: 'bg-violet-400',  label: 'Emailed',         bg: 'bg-violet-500/10',  text: 'text-violet-400' },
    OPENED:         { dot: 'bg-amber-400',   label: 'Opened',          bg: 'bg-amber-500/10',   text: 'text-amber-400' },
    REPLIED:        { dot: 'bg-emerald-400', label: 'Replied',         bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    MEETING_BOOKED: { dot: 'bg-cyan-400',    label: 'Meeting Booked',  bg: 'bg-cyan-500/10',    text: 'text-cyan-400' },
    CONVERTED:      { dot: 'bg-green-400',   label: 'Converted',       bg: 'bg-green-500/10',   text: 'text-green-400' },
    BOUNCED:        { dot: 'bg-red-400',     label: 'Bounced',         bg: 'bg-red-500/10',     text: 'text-red-400' },
    DEAD:           { dot: 'bg-slate-600',   label: 'Dead',            bg: 'bg-slate-600/10',   text: 'text-slate-500' },
    UNSUBSCRIBED:   { dot: 'bg-orange-400',  label: 'Unsub',           bg: 'bg-orange-500/10',  text: 'text-orange-400' },
  };
  const cfg = map[status] ?? { dot: 'bg-slate-500', label: status, bg: 'bg-slate-500/10', text: 'text-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}

function MessageStatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    QUEUED:    { color: 'text-slate-500',   label: 'Queued' },
    SENT:      { color: 'text-violet-400',  label: 'Sent' },
    DELIVERED: { color: 'text-blue-400',    label: 'Delivered' },
    OPENED:    { color: 'text-amber-400',   label: 'Opened' },
    REPLIED:   { color: 'text-emerald-400', label: 'Replied' },
    BOUNCED:   { color: 'text-red-400',     label: 'Bounced' },
    FAILED:    { color: 'text-red-500',     label: 'Failed' },
  };
  const cfg = map[status] ?? { color: 'text-slate-400', label: status };
  return <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>;
}

/** Strip tracking pixels AND inject white background so text is visible in dark UI */
function prepareEmailHtml(html: string): string {
  const stripped = html.replace(/<img[^>]*\/track\/open\/[^>]*>/gi, '');
  // Wrap in a full HTML doc with white background so the iframe content is readable
  return `<!DOCTYPE html>
<html>
<head><style>
  body { background: #ffffff !important; color: #1a1a1a !important; margin: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; }
  a { color: #6d28d9; }
  img { max-width: 100%; height: auto; }
  p { margin: 0 0 8px 0; }
</style></head>
<body>${stripped}</body>
</html>`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EmailDetailPage({ params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let prospect: Prospect;
  try {
    const res = await fetch(`${PROSPECTOR_URL}/prospects/${id}`, { cache: 'no-store' });
    if (!res.ok) notFound();
    prospect = await res.json();
  } catch {
    notFound();
  }

  const sentMessages = prospect.messages
    .filter((m) => m.sentAt)
    .sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime());

  const replyMsg = prospect.messages.find((m) => m.replyBody);
  const cityState = [prospect.address?.city, prospect.address?.state].filter(Boolean).join(', ');
  const isMeetingBooked = prospect.status === 'MEETING_BOOKED';
  const sequenceSteps = prospect.campaign.sequenceSteps ?? [];
  const maxStepSent = Math.max(0, ...sentMessages.map((m) => m.stepNumber ?? 0));
  const pendingSteps = sequenceSteps.filter((s) => s.stepNumber > maxStepSent);

  /** Replace all template variables with actual prospect data */
  function fillTemplate(text: string): string {
    return text
      .replace(/\{\{businessName\}\}/g, prospect.name)
      .replace(/\{\{city\}\}/g, prospect.address?.city ?? prospect.campaign.targetCity ?? '')
      .replace(/\{\{calLink\}\}/g, 'https://cal.com/embedo')
      .replace(/\{\{replyEmail\}\}/g, 'jason@embedo.io');
  }

  return (
    <div className="relative p-8 animate-fade-up min-h-screen">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 right-[10%] w-[380px] h-[380px] opacity-[0.05]">
          <div className="absolute inset-0 rounded-full border border-violet-400 animate-orbital-slow" />
          <div className="absolute inset-[80px] rounded-full border border-indigo-400 animate-orbital-reverse" />
        </div>
        <div className="absolute top-10 right-16 w-64 h-64 rounded-full bg-violet-600/8 blur-[90px] animate-float-orb" />
        <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-indigo-600/6 blur-[70px] animate-float-orb-b" />
      </div>

      <div className="relative z-10 space-y-6 max-w-6xl">
        {/* Breadcrumb + header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/" className="hover:text-violet-400 transition-colors flex items-center gap-1">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
              Overview
            </Link>
            <span className="text-slate-700">/</span>
            <Link href="/emails" className="hover:text-violet-400 transition-colors">Emails</Link>
            <span className="text-slate-700">/</span>
            <span className="text-white font-medium truncate max-w-[250px]">{prospect.name}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{prospect.name}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <StatusBadge status={prospect.status} />
                {cityState && <span className="text-sm text-slate-300">{cityState}</span>}
                {prospect.googleRating && (
                  <span className="text-sm text-amber-400">
                    ★ {prospect.googleRating}
                    <span className="text-slate-500 ml-1">({prospect.googleReviewCount ?? 0})</span>
                  </span>
                )}
                {isMeetingBooked && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                    Cal.com Booking
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/campaigns/${prospect.campaign.id}/prospects/${prospect.id}`}
              className="flex-shrink-0 px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              View Full Prospect →
            </Link>
          </div>
        </div>

        {/* Top grid: Contact + Campaign + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Contact Info */}
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/10 p-5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-400/60"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
              Contact Info
            </h3>
            <div className="space-y-3">
              {prospect.contactFirstName && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Name</p>
                  <p className="text-sm text-white font-medium">{prospect.contactFirstName} {prospect.contactLastName ?? ''}</p>
                  {prospect.contactTitle && <p className="text-xs text-slate-400">{prospect.contactTitle}</p>}
                </div>
              )}
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Email</p>
                {prospect.email ? (
                  <div className="flex items-center gap-2">
                    <a href={`mailto:${prospect.email}`} className="text-sm text-violet-400 hover:text-violet-300 font-mono transition-colors">{prospect.email}</a>
                    {prospect.emailSource && (
                      <span className="text-[8px] font-bold uppercase tracking-wider text-purple-400/50 bg-purple-400/5 px-1.5 py-0.5 rounded">via {prospect.emailSource}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 italic">No email found</p>
                )}
              </div>
              {prospect.phone && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Phone</p>
                  <a href={`tel:${prospect.phone}`} className="text-sm text-slate-200 font-mono">{prospect.phone}</a>
                </div>
              )}
              {prospect.website && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Website</p>
                  <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:text-violet-300 truncate block transition-colors">
                    {prospect.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>
              )}
              {prospect.contactLinkedIn && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">LinkedIn</p>
                  <a href={prospect.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate block transition-colors">
                    {prospect.contactLinkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Campaign Info */}
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/10 p-5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-400/60"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
              Campaign
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Campaign</p>
                <Link href={`/campaigns/${prospect.campaign.id}`} className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">
                  {prospect.campaign.name}
                </Link>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Target</p>
                <p className="text-sm text-slate-200">{prospect.campaign.targetCity} · {prospect.campaign.targetIndustry}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Sequence</p>
                <p className="text-sm text-slate-200">{sequenceSteps.length > 0 ? `${sequenceSteps.length + 1} steps` : '1 step (cold email only)'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">First Contact</p>
                <p className="text-sm text-slate-300">{fmtFull(prospect.createdAt)}</p>
              </div>
              {prospect.convertedToBusinessId && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Converted To</p>
                  <Link href="/businesses" className="text-sm text-green-400 hover:text-green-300 transition-colors font-medium">
                    View Business →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/10 p-5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-400/60"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
              Email Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-violet-500/5 rounded-lg p-3 border border-violet-500/10">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Sent</p>
                <p className="text-2xl font-bold text-violet-400">{sentMessages.length}</p>
              </div>
              <div className={`rounded-lg p-3 border ${sentMessages.filter((m) => m.openedAt).length > 0 ? 'bg-teal-500/5 border-teal-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Opened</p>
                <p className={`text-2xl font-bold ${sentMessages.filter((m) => m.openedAt).length > 0 ? 'text-teal-400' : 'text-amber-400'}`}>{sentMessages.filter((m) => m.openedAt).length}</p>
              </div>
              <div className={`rounded-lg p-3 border ${replyMsg ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-orange-500/5 border-orange-500/10'}`}>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Replied</p>
                <p className={`text-2xl font-bold ${replyMsg ? 'text-emerald-400' : 'text-orange-400'}`}>{replyMsg ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-sky-500/5 rounded-lg p-3 border border-sky-500/10">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Pending</p>
                <p className="text-2xl font-bold text-sky-400">{pendingSteps.length}</p>
              </div>
            </div>
            {replyMsg?.replyCategory && (
              <div className="mt-3 px-3 py-2.5 bg-white/[0.03] rounded-lg border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Reply Sentiment</p>
                <p className={`text-sm font-bold mt-0.5 ${
                  replyMsg.replyCategory === 'POSITIVE' ? 'text-emerald-400' :
                  replyMsg.replyCategory === 'NEGATIVE' ? 'text-red-400' :
                  replyMsg.replyCategory === 'OOO' ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {replyMsg.replyCategory}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Compose Email */}
        {prospect.email && (
          <ComposeEmail
            prospectId={prospect.id}
            prospectName={prospect.name}
            prospectEmail={prospect.email}
            prospectorUrl={PROSPECTOR_URL}
          />
        )}

        {/* Pending Sequence Steps (interactive client component) */}
        {pendingSteps.length > 0 && prospect.nextFollowUpAt && (
          <PendingSequence
            prospectId={prospect.id}
            prospectName={prospect.name}
            campaignId={prospect.campaign.id}
            campaignName={prospect.campaign.name}
            prospectCreatedAt={prospect.createdAt}
            nextFollowUpAt={prospect.nextFollowUpAt}
            steps={pendingSteps}
            prospectorUrl={PROSPECTOR_URL}
          />
        )}

        {/* Email History */}
        <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Email History</h3>
              <p className="text-xs text-slate-500 mt-0.5">{sentMessages.length} email{sentMessages.length !== 1 ? 's' : ''} sent to this business</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> Sent
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Opened
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Replied
              </span>
              {pendingSteps.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Scheduled
                </span>
              )}
            </div>
          </div>

          {sentMessages.length === 0 && pendingSteps.length === 0 ? (
            <div className="p-12 text-center">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-slate-700 mx-auto mb-3">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <p className="text-slate-500 text-sm">No emails sent yet.</p>
              <p className="text-slate-600 text-xs mt-1">Use the compose form above to send the first email.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Sent messages */}
              {sentMessages.map((msg, idx) => (
                <div key={msg.id} className={`p-5 ${idx === 0 ? 'bg-white/[0.01]' : ''}`}>
                  {/* Message header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Step circle with status ring */}
                      <div className="relative">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                          msg.repliedAt
                            ? 'bg-emerald-600/20 border-2 border-emerald-500/40 text-emerald-400'
                            : msg.openedAt
                              ? 'bg-amber-600/20 border-2 border-amber-500/40 text-amber-400'
                              : 'bg-violet-600/20 border-2 border-violet-500/30 text-violet-400'
                        }`}>
                          {msg.stepNumber ?? 1}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{msg.subject ?? '(no subject)'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <MessageStatusBadge status={msg.status} />
                          <span className="text-[10px] text-slate-600">
                            Step {msg.stepNumber ?? 1}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">{fmtFull(msg.sentAt)}</p>
                      <div className="flex items-center gap-3 mt-1.5 justify-end">
                        {msg.openedAt && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-1 bg-amber-500/5 px-2 py-0.5 rounded-full">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                            {fmt(msg.openedAt)}
                          </span>
                        )}
                        {msg.repliedAt && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/5 px-2 py-0.5 rounded-full">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            {fmt(msg.repliedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email body preview — white background for readability */}
                  <div className="rounded-lg border border-white/10 overflow-hidden shadow-lg">
                    <iframe
                      srcDoc={prepareEmailHtml(msg.body)}
                      className="w-full border-0 rounded-lg"
                      style={{ height: '300px', background: '#ffffff' }}
                      title={`Email step ${msg.stepNumber ?? 1}`}
                      sandbox="allow-same-origin"
                    />
                  </div>

                  {/* Reply */}
                  {msg.replyBody && (
                    <div className="mt-3 px-4 py-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-400"><path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                        <span className="text-xs font-semibold text-emerald-400">Their Reply</span>
                        {msg.replyCategory && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            msg.replyCategory === 'POSITIVE' ? 'bg-emerald-500/15 text-emerald-400' :
                            msg.replyCategory === 'NEGATIVE' ? 'bg-red-500/15 text-red-400' :
                            msg.replyCategory === 'OOO' ? 'bg-amber-500/15 text-amber-400' :
                            'bg-slate-500/15 text-slate-400'
                          }`}>
                            {msg.replyCategory}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-600 ml-auto">{fmt(msg.repliedAt)}</span>
                      </div>
                      <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{msg.replyBody}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Pending scheduled emails */}
              {pendingSteps.map((step) => {
                const fireAt = new Date(new Date(prospect.createdAt).getTime() + step.delayHours * 60 * 60 * 1000);
                return (
                  <div key={`pending-${step.stepNumber}`} className="p-5 relative">
                    {/* Scheduled overlay bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500/40 via-sky-400/20 to-transparent" />

                    {/* Message header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-sky-600/20 border-2 border-sky-500/30 text-sky-400 border-dashed">
                            {step.stepNumber}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-slate-300 font-medium">
                            {step.subject ? fillTemplate(step.subject) : undefined ?? `Follow-up #${step.stepNumber - 1}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">Scheduled</span>
                            <span className="text-[10px] text-slate-600">
                              Step {step.stepNumber}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-500">{fmtFull(fireAt.toISOString())}</p>
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-sky-400 bg-sky-500/5 px-2 py-0.5 rounded-full">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          {step.delayHours}h after first contact
                        </span>
                      </div>
                    </div>

                    {/* Email body preview */}
                    {step.bodyHtml ? (
                      <div className="rounded-lg border border-sky-500/15 overflow-hidden shadow-lg opacity-80">
                        <iframe
                          srcDoc={prepareEmailHtml(step.bodyHtml.replace(/\{\{businessName\}\}/g, prospect.name))}
                          className="w-full border-0 rounded-lg"
                          style={{ height: '250px', background: '#ffffff' }}
                          title={`Pending step ${step.stepNumber}`}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-sky-500/15 bg-sky-500/[0.03] p-6 text-center">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-sky-500/40 mx-auto mb-2">
                          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs text-slate-500">AI-generated at send time</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">Content will be personalized using the template when this step fires</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
