import Link from 'next/link';
import { LeadRowActions } from './lead-row-actions';
import { CreateLeadButton } from './seed-button';

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
  campaign: {
    id: string;
    name: string;
    targetCity: string;
  };
  messages: {
    status: string;
    subject: string | null;
    replyBody: string | null;
    repliedAt: string | null;
    replyCategory: string | null;
    sentAt: string | null;
  }[];
}

interface Campaign {
  id: string;
  name: string;
  targetCity: string;
}

async function getLeads(): Promise<{ items: ProspectLead[]; total: number }> {
  try {
    const campaignsRes = await fetch(`${PROSPECTOR_URL}/campaigns`, { cache: 'no-store' });
    if (!campaignsRes.ok) return { items: [], total: 0 };
    const campaigns: Campaign[] = await campaignsRes.json();

    const allLeads: ProspectLead[] = [];
    for (const campaign of campaigns) {
      const res = await fetch(
        `${PROSPECTOR_URL}/campaigns/${campaign.id}/prospects?status=REPLIED,MEETING_BOOKED,CONVERTED&pageSize=100`,
        { cache: 'no-store' },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const items = (data.items ?? []).map((p: ProspectLead) => ({
        ...p,
        campaign: { id: campaign.id, name: campaign.name, targetCity: campaign.targetCity },
      }));
      allLeads.push(...items);
    }

    // Filter out leads that have been converted to businesses
    const activeLeads = allLeads.filter((l) => !l.convertedToBusinessId);
    activeLeads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { items: activeLeads, total: activeLeads.length };
  } catch {
    return { items: [], total: 0 };
  }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  REPLIED:        { label: 'Replied',        color: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  MEETING_BOOKED: { label: 'Meeting Booked', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  CONVERTED:      { label: 'Converted',      color: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
};

const replyCategory: Record<string, { label: string; color: string }> = {
  POSITIVE: { label: 'Positive', color: 'text-emerald-400' },
  NEUTRAL:  { label: 'Neutral',  color: 'text-slate-400' },
  NEGATIVE: { label: 'Negative', color: 'text-red-400' },
  OOO:      { label: 'OOO',      color: 'text-amber-400' },
};

export default async function LeadsPage() {
  const { items, total } = await getLeads();

  const replied = items.filter((l) => l.status === 'REPLIED').length;
  const meetingBooked = items.filter((l) => l.status === 'MEETING_BOOKED').length;
  const converted = items.filter((l) => l.status === 'CONVERTED').length;

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leads</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Prospects who have engaged — your active sales pipeline.
          </p>
        </div>
        <CreateLeadButton prospectorUrl={PROSPECTOR_URL} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Replied</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{replied}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Meeting Booked</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{meetingBooked}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Converted</p>
          <p className="text-2xl font-bold text-violet-400 mt-1">{converted}</p>
        </div>
      </div>

      {/* Lead Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-16 text-center">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-slate-700 mx-auto mb-3">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" />
            </svg>
            <p className="text-slate-500 text-sm">No leads yet.</p>
            <p className="text-slate-600 text-xs mt-2">
              When prospects reply to outbound campaigns, they&apos;ll appear here as leads.
              <br />
              Use the <strong className="text-amber-400">+ Create Lead</strong> button above to add a lead manually.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Lead</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Campaign</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Reply</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Sentiment</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Last Activity</th>
                <th className="text-right px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {items.map((lead) => {
                const latestReply = lead.messages.find((m) => m.replyBody);
                const sentiment = latestReply?.replyCategory;
                const cfg = statusConfig[lead.status] ?? { label: lead.status, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
                const sentimentCfg = sentiment ? replyCategory[sentiment] : null;

                return (
                  <tr key={lead.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-semibold text-white hover:text-violet-300 transition-colors"
                        >
                          {lead.name}
                        </Link>
                        {lead.contactFirstName && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {lead.contactFirstName} {lead.contactLastName ?? ''}{lead.contactTitle ? ` — ${lead.contactTitle}` : ''}
                          </p>
                        )}
                        {lead.email && <p className="text-xs text-slate-600 mt-0.5">{lead.email}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-400">{lead.campaign.name}</p>
                      <p className="text-xs text-slate-600">{lead.campaign.targetCity}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {latestReply?.replyBody ? (
                        <p className="text-sm text-slate-300 truncate" title={latestReply.replyBody}>
                          &ldquo;{latestReply.replyBody.slice(0, 80)}{latestReply.replyBody.length > 80 ? '...' : ''}&rdquo;
                        </p>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {sentimentCfg ? (
                        <span className={`text-xs font-medium ${sentimentCfg.color}`}>
                          {sentimentCfg.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(lead.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <LeadRowActions
                        prospectId={lead.id}
                        prospectName={lead.name}
                        status={lead.status}
                        prospectorUrl={PROSPECTOR_URL}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
