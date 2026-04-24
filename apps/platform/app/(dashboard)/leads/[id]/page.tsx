import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LeadActions } from './lead-actions';
import { ComposeReply } from './compose-reply';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface ProspectDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactTitle: string | null;
  contactLinkedIn: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  emailSource: string | null;
  emailVerificationScore: number | null;
  convertedToBusinessId: string | null;
  address: { street?: string; city?: string; state?: string; zip?: string } | null;
  createdAt: string;
  updatedAt: string;
  campaign: {
    id: string;
    name: string;
    targetCity: string;
    targetIndustry: string;
  };
  messages: {
    id: string;
    subject: string | null;
    body: string;
    status: string;
    stepNumber: number | null;
    sentAt: string | null;
    openedAt: string | null;
    repliedAt: string | null;
    replyBody: string | null;
    replyCategory: string | null;
    createdAt: string;
  }[];
}

async function getProspect(id: string): Promise<ProspectDetail | null> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/prospects/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  REPLIED:        { label: 'Replied',        bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/25' },
  MEETING_BOOKED: { label: 'Meeting Booked', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  CONVERTED:      { label: 'Converted',      bg: 'bg-signal-soft',  text: 'text-signal',  border: 'border-signal' },
};

const sentimentConfig: Record<string, { label: string; color: string; bg: string }> = {
  POSITIVE:    { label: 'Positive',    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  NEUTRAL:     { label: 'Neutral',     color: 'text-paper-3',   bg: 'bg-slate-500/10' },
  NEGATIVE:    { label: 'Negative',    color: 'text-red-400',     bg: 'bg-red-500/10' },
  OOO:         { label: 'Out of Office', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  UNSUBSCRIBE: { label: 'Unsubscribe', color: 'text-red-400',     bg: 'bg-red-500/10' },
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await getProspect(id);
  if (!prospect) notFound();

  const cfg = statusConfig[prospect.status] ?? { label: prospect.status, bg: 'bg-slate-500/10', text: 'text-paper-3', border: 'border-slate-500/20' };
  const contactName = [prospect.contactFirstName, prospect.contactLastName].filter(Boolean).join(' ');
  const address = prospect.address;
  const addressStr = address ? [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ') : null;

  // Get the reply message
  const replyMessage = prospect.messages.find((m) => m.replyBody);
  const sentMessages = prospect.messages.filter((m) => m.sentAt && !m.replyBody).sort((a, b) =>
    new Date(a.sentAt!).getTime() - new Date(b.sentAt!).getTime()
  );

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/leads" className="text-paper-4 hover:text-paper transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-paper tracking-tight">{prospect.name}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          {contactName && (
            <p className="text-sm text-paper-3 ml-8">
              {contactName}{prospect.contactTitle ? ` — ${prospect.contactTitle}` : ''}
            </p>
          )}
        </div>

        <LeadActions
          prospectId={prospect.id}
          prospectName={prospect.name}
          status={prospect.status}
          prospectorUrl={PROSPECTOR_URL}
        />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-ink-2 border border-rule rounded-xl p-6">
          <h3 className="text-xs font-semibold text-paper-4 uppercase tracking-widest mb-4">Contact Information</h3>
          <div className="space-y-3">
            {prospect.email && (
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-paper-4 flex-shrink-0">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <a href={`mailto:${prospect.email}`} className="text-sm text-signal hover:text-signal">{prospect.email}</a>
                {prospect.emailSource && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-2 text-paper-4 border border-rule">
                    via {prospect.emailSource}
                  </span>
                )}
              </div>
            )}
            {prospect.phone && (
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-paper-4 flex-shrink-0">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-sm text-paper-2">{prospect.phone}</span>
              </div>
            )}
            {prospect.website && (
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-paper-4 flex-shrink-0">
                  <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16z" clipRule="evenodd" />
                </svg>
                <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-sm text-signal hover:text-signal">{prospect.website}</a>
              </div>
            )}
            {prospect.contactLinkedIn && (
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-paper-4 flex-shrink-0">
                  <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014V8h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.46zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zM6.672 16.338H3.338V8h3.334v8.338zM17.994 1H2.006C1.45 1 1 1.449 1 2.004v15.993C1 18.55 1.45 19 2.006 19h15.988c.557 0 1.006-.449 1.006-1.004V2.004C19 1.449 18.55 1 17.994 1z" clipRule="evenodd" />
                </svg>
                <a href={prospect.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="text-sm text-signal hover:text-signal">LinkedIn Profile</a>
              </div>
            )}
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-ink-2 border border-rule rounded-xl p-6">
          <h3 className="text-xs font-semibold text-paper-4 uppercase tracking-widest mb-4">Business Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {prospect.googleRating && (
              <div>
                <p className="text-[10px] text-paper-4 uppercase tracking-wider">Google Rating</p>
                <p className="text-sm text-amber-400 font-semibold mt-0.5">
                  {prospect.googleRating} <span className="text-paper-4 font-normal">({prospect.googleReviewCount} reviews)</span>
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-paper-4 uppercase tracking-wider">Campaign</p>
              <Link href={`/campaigns/${prospect.campaign.id}`} className="text-sm text-signal hover:text-signal mt-0.5 block">
                {prospect.campaign.name}
              </Link>
            </div>
            <div>
              <p className="text-[10px] text-paper-4 uppercase tracking-wider">Industry</p>
              <p className="text-sm text-paper-2 mt-0.5">{prospect.campaign.targetIndustry}</p>
            </div>
            <div>
              <p className="text-[10px] text-paper-4 uppercase tracking-wider">Location</p>
              <p className="text-sm text-paper-2 mt-0.5">{addressStr ?? prospect.campaign.targetCity}</p>
            </div>
            <div>
              <p className="text-[10px] text-paper-4 uppercase tracking-wider">First Contact</p>
              <p className="text-sm text-paper-3 mt-0.5">{new Date(prospect.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-paper-4 uppercase tracking-wider">Last Activity</p>
              <p className="text-sm text-paper-3 mt-0.5">{new Date(prospect.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reply Section */}
      {replyMessage && (
        <div className="bg-ink-2 border border-rule rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xs font-semibold text-paper-4 uppercase tracking-widest">Their Reply</h3>
            {replyMessage.replyCategory && sentimentConfig[replyMessage.replyCategory] && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sentimentConfig[replyMessage.replyCategory]!.bg} ${sentimentConfig[replyMessage.replyCategory]!.color}`}>
                {sentimentConfig[replyMessage.replyCategory]!.label}
              </span>
            )}
            <span className="text-[10px] text-paper-4 ml-auto">
              {replyMessage.repliedAt ? new Date(replyMessage.repliedAt).toLocaleString() : ''}
            </span>
          </div>
          <div className="bg-ink-1 border border-rule-soft rounded-lg p-4">
            <p className="text-sm text-paper-2 leading-relaxed whitespace-pre-wrap">{replyMessage.replyBody}</p>
          </div>
        </div>
      )}

      {/* Compose Reply */}
      <ComposeReply
        prospectId={prospect.id}
        prospectName={prospect.name}
        prospectEmail={prospect.email}
        prospectorUrl={PROSPECTOR_URL}
      />

      {/* Email History */}
      <div className="bg-ink-2 border border-rule rounded-xl p-6">
        <h3 className="text-xs font-semibold text-paper-4 uppercase tracking-widest mb-4">
          Email History ({prospect.messages.length})
        </h3>
        {prospect.messages.length === 0 ? (
          <p className="text-sm text-paper-4">No emails sent yet.</p>
        ) : (
          <div className="space-y-4">
            {prospect.messages
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((msg) => (
              <div key={msg.id} className="border border-rule-soft rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-ink-1">
                  <div className="flex items-center gap-3">
                    {msg.replyBody ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">Reply</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-500/15 text-paper-3 border border-slate-500/25">
                        Step {msg.stepNumber ?? '?'}
                      </span>
                    )}
                    <span className="text-sm text-paper-2">{msg.subject ?? '(no subject)'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-paper-4">
                    {msg.sentAt && <span>Sent {new Date(msg.sentAt).toLocaleDateString()}</span>}
                    {msg.openedAt && <span className="text-emerald-500">Opened</span>}
                    {msg.repliedAt && <span className="text-blue-400">Replied</span>}
                  </div>
                </div>
                {msg.replyBody ? (
                  <div className="px-4 py-3 border-t border-rule-soft">
                    <p className="text-sm text-paper-2 whitespace-pre-wrap">{msg.replyBody}</p>
                  </div>
                ) : msg.body ? (
                  <div className="px-4 py-3 border-t border-rule-soft">
                    <div className="text-sm text-paper-3 [&_p]:mb-2 [&_a]:text-signal" dangerouslySetInnerHTML={{ __html: msg.body }} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
