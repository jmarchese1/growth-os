import Link from 'next/link';
import { SessionSetup } from './session-setup';
import { DmComposer } from './dm-composer';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface Session {
  id: string;
  username: string;
  status: string;
  dailyLimit: number;
  sentToday: number;
  totalSent: number;
  lastUsedAt: string | null;
  lastError: string | null;
  _count: { messages: number };
}

interface DmRecord {
  id: string;
  body: string;
  status: string;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
  prospect: { id: string; name: string; instagramHandle: string | null; shortName: string | null };
  session: { username: string };
}

interface Campaign {
  id: string;
  name: string;
  targetCity: string;
  instagramDmEnabled: boolean;
  instagramDmBody: string | null;
  _count: { prospects: number };
}

async function getSessions(): Promise<Session[]> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/instagram/sessions`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function getSentDms(): Promise<{ items: DmRecord[]; total: number }> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/instagram/dm/sent?pageSize=50`, { cache: 'no-store' });
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  } catch { return { items: [], total: 0 }; }
}

async function getQuota(): Promise<{ totalLimit: number; totalSent: number; remaining: number }> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/instagram/dm/quota`, { cache: 'no-store' });
    if (!res.ok) return { totalLimit: 0, totalSent: 0, remaining: 0 };
    return res.json();
  } catch { return { totalLimit: 0, totalSent: 0, remaining: 0 }; }
}

async function getCampaigns(): Promise<Campaign[]> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/campaigns`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  QUEUED: { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-500' },
  SENT: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  FAILED: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  REPLIED: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' },
};

export default async function InstagramPage() {
  const [sessions, { items: dms, total }, quota, campaigns] = await Promise.all([
    getSessions(),
    getSentDms(),
    getQuota(),
    getCampaigns(),
  ]);

  return (
    <div className="relative p-8 animate-fade-up min-h-screen">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 right-[5%] w-[440px] h-[440px] opacity-[0.06]">
          <div className="absolute inset-0 rounded-full border border-pink-400 animate-orbital-slow" />
          <div className="absolute inset-[70px] rounded-full border border-purple-400 animate-orbital-reverse" />
        </div>
        <div className="absolute top-10 right-16 w-64 h-64 rounded-full bg-pink-600/8 blur-[90px] animate-float-orb" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/" className="hover:text-violet-400 transition-colors flex items-center gap-1">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
              Overview
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300">Instagram</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Instagram DM Outreach</h1>
              <p className="text-sm text-slate-400 mt-0.5">Send personalized DMs to restaurant owners via Instagram</p>
            </div>
          </div>
        </div>

        {/* Quota stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Today&apos;s DMs</p>
            <p className="text-2xl font-bold text-white">{quota.totalSent} <span className="text-sm font-normal text-slate-500">/ {quota.totalLimit}</span></p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Remaining</p>
            <p className={`text-2xl font-bold ${quota.remaining > 10 ? 'text-emerald-400' : quota.remaining > 0 ? 'text-amber-400' : 'text-red-400'}`}>{quota.remaining}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Accounts</p>
            <p className="text-2xl font-bold text-violet-400">{sessions.filter(s => s.status === 'ACTIVE').length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Sessions + Composer */}
          <div className="space-y-6">
            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5">
              <SessionSetup prospectorUrl={PROSPECTOR_URL} sessions={sessions} />
            </div>
            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5">
              <DmComposer prospectorUrl={PROSPECTOR_URL} campaigns={campaigns} />
            </div>
          </div>

          {/* Right: Sent DMs */}
          <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Sent DMs <span className="text-slate-600 font-normal ml-1">{total}</span></h2>

            {dms.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm">
                No DMs sent yet. Connect an account and send your first campaign.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {dms.map(dm => {
                  const sc = STATUS_COLORS[dm.status] ?? STATUS_COLORS['QUEUED']!;
                  return (
                    <div key={dm.id} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{dm.prospect.shortName ?? dm.prospect.name}</span>
                          {dm.prospect.instagramHandle && (
                            <a
                              href={`https://instagram.com/${dm.prospect.instagramHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-pink-400/60 hover:text-pink-400 transition-colors"
                            >
                              @{dm.prospect.instagramHandle}
                            </a>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {dm.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{dm.body}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-600">
                        {dm.sentAt && <span>{fmt(dm.sentAt)}</span>}
                        <span>via @{dm.session.username}</span>
                        {dm.failureReason && <span className="text-red-400/60">{dm.failureReason}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
