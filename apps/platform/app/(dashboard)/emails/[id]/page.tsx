import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ComposeEmail } from './compose-email';

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

function stripTrackingPixels(html: string): string {
  return html.replace(/<img[^>]*\/track\/open\/[^>]*>/gi, '');
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

  return (
    <div className="relative p-8 animate-fade-up min-h-screen">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 right-16 w-64 h-64 rounded-full bg-violet-600/8 blur-[90px] animate-float-orb" />
        <div className="absolute bottom-20 right-0 w-48 h-48 rounded-full bg-indigo-600/6 blur-[70px] animate-float-orb-b" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Breadcrumb + header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/" className="hover:text-violet-400 transition-colors flex items-center gap-1">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
              Overview
            </Link>
            <span className="text-slate-700">/</span>
            <Link href="/emails" className="hover:text-violet-400 transition-colors">Emails</Link>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300 truncate max-w-[200px]">{prospect.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{prospect.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={prospect.status} />
                {cityState && <span className="text-sm text-slate-400">{cityState}</span>}
                {prospect.googleRating && (
                  <span className="text-sm text-amber-400">
                    ★ {prospect.googleRating}
                    <span className="text-slate-600 ml-1">({prospect.googleReviewCount ?? 0})</span>
                  </span>
                )}
              </div>
              {isMeetingBooked && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-cyan-400"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                  <span className="text-xs font-semibold text-cyan-400">Cal.com Meeting Booked</span>
                </div>
              )}
            </div>
            <Link
              href={`/campaigns/${prospect.campaign.id}/prospects/${prospect.id}`}
              className="px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              View Full Prospect Detail →
            </Link>
          </div>
        </div>

        {/* Top grid: Contact + Campaign + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Contact Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Contact Info</h3>
            <div className="space-y-2.5">
              {prospect.contactFirstName && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Name</p>
                  <p className="text-sm text-white">{prospect.contactFirstName} {prospect.contactLastName ?? ''}</p>
                  {prospect.contactTitle && <p className="text-xs text-slate-500">{prospect.contactTitle}</p>}
                </div>
              )}
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Email</p>
                {prospect.email ? (
                  <a href={`mailto:${prospect.email}`} className="text-sm text-violet-400 hover:text-violet-300 font-mono">{prospect.email}</a>
                ) : (
                  <p className="text-sm text-slate-600">No email</p>
                )}
                {prospect.emailSource && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-400/60 ml-2">via {prospect.emailSource}</span>
                )}
              </div>
              {prospect.phone && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Phone</p>
                  <a href={`tel:${prospect.phone}`} className="text-sm text-slate-300 font-mono">{prospect.phone}</a>
                </div>
              )}
              {prospect.website && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Website</p>
                  <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:text-violet-300 truncate block">
                    {prospect.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>
              )}
              {prospect.contactLinkedIn && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">LinkedIn</p>
                  <a href={prospect.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate block">
                    {prospect.contactLinkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Campaign Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Campaign</h3>
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Campaign Name</p>
                <Link href={`/campaigns/${prospect.campaign.id}`} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  {prospect.campaign.name}
                </Link>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Target</p>
                <p className="text-sm text-slate-300">{prospect.campaign.targetCity} · {prospect.campaign.targetIndustry}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Sequence Steps</p>
                <p className="text-sm text-slate-300">{sequenceSteps.length > 0 ? `${sequenceSteps.length + 1} steps` : '1 step (cold email only)'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">First Contact</p>
                <p className="text-sm text-slate-400">{fmtFull(prospect.createdAt)}</p>
              </div>
              {prospect.convertedToBusinessId && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Converted To</p>
                  <Link href={`/businesses`} className="text-sm text-green-400 hover:text-green-300 transition-colors">
                    View Business →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Email Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Sent</p>
                <p className="text-xl font-bold text-violet-400">{sentMessages.length}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Opened</p>
                <p className="text-xl font-bold text-amber-400">{sentMessages.filter((m) => m.openedAt).length}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Replied</p>
                <p className="text-xl font-bold text-emerald-400">{replyMsg ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Pending</p>
                <p className="text-xl font-bold text-amber-400">{pendingSteps.length}</p>
              </div>
            </div>
            {replyMsg?.replyCategory && (
              <div className="mt-3 px-3 py-2 bg-white/5 rounded-lg">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Reply Sentiment</p>
                <p className={`text-sm font-semibold ${
                  replyMsg.replyCategory === 'POSITIVE' ? 'text-emerald-400' :
                  replyMsg.replyCategory === 'NEGATIVE' ? 'text-red-400' :
                  replyMsg.replyCategory === 'OOO' ? 'text-amber-400' : 'text-slate-400'
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

        {/* Pending Sequence Steps */}
        {pendingSteps.length > 0 && prospect.nextFollowUpAt && (
          <div className="bg-amber-500/5 backdrop-blur-sm rounded-xl border border-amber-500/20 p-5">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Pending Sequence Messages
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              These follow-up emails are scheduled to send automatically as part of the campaign sequence.
            </p>
            <div className="space-y-2">
              {pendingSteps.map((step) => {
                const fireAt = new Date(new Date(prospect.createdAt).getTime() + step.delayHours * 60 * 60 * 1000);
                const isFuture = fireAt > new Date();
                return (
                  <div key={step.stepNumber} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-lg border border-white/5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isFuture ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/20 text-violet-400'
                    }`}>
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">
                        {step.subject ?? `Follow-up #${step.stepNumber - 1}`}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {step.delayHours}h after first contact · {isFuture ? `Fires ${fmt(fireAt.toISOString())}` : 'Ready to send'}
                      </p>
                    </div>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${isFuture ? 'text-amber-500' : 'text-violet-400'}`}>
                      {isFuture ? 'Scheduled' : 'Sending soon'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Email History */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Email History</h3>
            <p className="text-xs text-slate-500 mt-0.5">{sentMessages.length} email{sentMessages.length !== 1 ? 's' : ''} sent</p>
          </div>

          {sentMessages.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-sm">No emails sent yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {sentMessages.map((msg) => (
                <div key={msg.id} className="p-5">
                  {/* Message header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400">
                        {msg.stepNumber ?? 1}
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
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{fmtFull(msg.sentAt)}</p>
                      <div className="flex items-center gap-3 mt-1 justify-end">
                        {msg.openedAt && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-1">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                            Opened {fmt(msg.openedAt)}
                          </span>
                        )}
                        {msg.repliedAt && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            Replied {fmt(msg.repliedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email body preview */}
                  <div className="bg-white/[0.03] rounded-lg border border-white/5 overflow-hidden">
                    <iframe
                      srcDoc={stripTrackingPixels(msg.body)}
                      className="w-full border-0"
                      style={{ height: '280px' }}
                      title={`Email step ${msg.stepNumber ?? 1}`}
                      sandbox="allow-same-origin"
                    />
                  </div>

                  {/* Reply */}
                  {msg.replyBody && (
                    <div className="mt-3 px-4 py-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-400"><path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                        <span className="text-xs font-semibold text-emerald-400">Reply</span>
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
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{msg.replyBody}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
