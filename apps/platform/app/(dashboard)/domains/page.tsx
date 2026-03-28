'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app';

interface SendingDomain {
  id: string;
  domain: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string | null;
  verified: boolean;
  active: boolean;
  disabledReason: string | null;
  warmupStage: number;
  warmupStartedAt: string | null;
  warmupComplete: boolean;
  dailyLimit: number;
  sentToday: number;
  totalSent: number;
  bounceCount: number;
  openCount: number;
  bounceRate: number;
  openRate: number;
  healthScore: number;
  createdAt: string;
}

const WARMUP_STAGES = [
  { stage: 1, label: '5/day', limit: 5 },
  { stage: 2, label: '15/day', limit: 15 },
  { stage: 3, label: '30/day', limit: 30 },
  { stage: 4, label: '50/day', limit: 50 },
];

export default function DomainsPage() {
  const [domains, setDomains] = useState<SendingDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sending-domains`);
      if (res.ok) setDomains(await res.json());
    } catch { /* api not running */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  async function handleAdd(data: { domain: string; fromEmail: string; fromName: string; replyToEmail: string }) {
    const res = await fetch(`${API_URL}/sending-domains`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) { setShowAdd(false); await fetchDomains(); }
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`${API_URL}/sending-domains/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    await fetchDomains();
  }

  async function handleVerify(id: string) {
    await fetch(`${API_URL}/sending-domains/${id}/verify`, { method: 'POST' });
    await fetchDomains();
  }

  async function handleStartWarmup(id: string) {
    await fetch(`${API_URL}/sending-domains/${id}/start-warmup`, { method: 'POST' });
    await fetchDomains();
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sending Domains</h1>
          <p className="text-sm text-slate-400 mt-1">Manage email domains, warm-up schedules, and delivery health.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors"
        >
          + Add Domain
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-slate-500"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">No sending domains configured</h3>
          <p className="text-xs text-slate-500 mb-4">Add your first domain to enable inbox rotation and warm-up.</p>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors">
            Add Domain
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {domains.map((d) => (
            <div key={d.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 glow-card">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{d.domain}</h3>
                    {/* Status badge */}
                    {!d.active ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400">Disabled</span>
                    ) : !d.verified ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400">Unverified</span>
                    ) : d.warmupComplete ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">Active</span>
                    ) : d.warmupStartedAt ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400">Warming Up</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400">Ready</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{d.fromEmail}</p>
                </div>
                {/* Health score */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                  d.healthScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                  d.healthScore >= 50 ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {d.healthScore}
                </div>
              </div>

              {/* Warm-up progress */}
              {d.warmupStartedAt && !d.warmupComplete && (
                <div className="mb-4">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Warm-up Progress</p>
                  <div className="flex gap-1">
                    {WARMUP_STAGES.map((s) => (
                      <div key={s.stage} className="flex-1">
                        <div className={`h-1.5 rounded-full ${d.warmupStage >= s.stage ? 'bg-violet-500' : 'bg-white/10'}`} />
                        <p className="text-[9px] text-slate-600 mt-0.5 text-center">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's sends */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500">Today&apos;s sends</span>
                  <span className="text-[10px] text-slate-400 tabular-nums">{d.sentToday} / {d.dailyLimit}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${Math.min(100, (d.sentToday / d.dailyLimit) * 100)}%` }} />
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-white tabular-nums">{d.totalSent}</p>
                  <p className="text-[9px] text-slate-600 uppercase">Total Sent</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                  <p className={`text-sm font-bold tabular-nums ${d.bounceRate > 5 ? 'text-red-400' : d.bounceRate > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{d.bounceRate}%</p>
                  <p className="text-[9px] text-slate-600 uppercase">Bounce Rate</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                  <p className={`text-sm font-bold tabular-nums ${d.openRate > 30 ? 'text-emerald-400' : d.openRate > 15 ? 'text-amber-400' : 'text-slate-400'}`}>{d.openRate}%</p>
                  <p className="text-[9px] text-slate-600 uppercase">Open Rate</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                {!d.verified && (
                  <button onClick={() => handleVerify(d.id)} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    Verify
                  </button>
                )}
                {d.verified && !d.warmupStartedAt && (
                  <button onClick={() => handleStartWarmup(d.id)} className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors">
                    Start Warm-up
                  </button>
                )}
                <button
                  onClick={() => handleToggle(d.id, !d.active)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    d.active
                      ? 'bg-white/5 border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {d.active ? 'Disable' : 'Enable'}
                </button>
                {d.disabledReason && (
                  <span className="text-[10px] text-red-400/60 ml-auto">{d.disabledReason.replace(/_/g, ' ')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Domain Modal */}
      {mounted && showAdd && createPortal(
        <AddDomainModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />,
        document.body,
      )}
    </div>
  );
}

function AddDomainModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: { domain: string; fromEmail: string; fromName: string; replyToEmail: string }) => void }) {
  const [domain, setDomain] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('Jason');
  const [replyToEmail, setReplyToEmail] = useState('');

  const inputCls = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Add Sending Domain</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Domain</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} className={inputCls} placeholder="getembedo.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">From Email</label>
            <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className={inputCls} placeholder="jason@getembedo.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">From Name</label>
            <input value={fromName} onChange={(e) => setFromName(e.target.value)} className={inputCls} placeholder="Jason" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Reply-To Email <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
            <input value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} className={inputCls} placeholder="replies@embedo.io" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={() => onAdd({ domain, fromEmail, fromName, replyToEmail })}
            disabled={!domain || !fromEmail}
            className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            Add Domain
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-white/5 text-slate-400 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
