'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Globe, X } from 'lucide-react';
import { SectionHeader, HeroMetric, MetricBlock, Panel, Button } from '../../../components/ui/primitives';

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
  { stage: 1, limit: 5 },
  { stage: 2, limit: 15 },
  { stage: 3, limit: 30 },
  { stage: 4, limit: 50 },
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
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }),
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

  const totalCapacity = domains.filter(d => d.active && d.verified).reduce((a, d) => a + d.dailyLimit, 0);
  const totalSentToday = domains.reduce((a, d) => a + d.sentToday, 0);
  const activeCount = domains.filter(d => d.active && d.verified).length;

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">

      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 05 · Infrastructure
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {activeCount} active
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
            Sending domains.
          </h1>
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-3 h-3" />
            <span>Add domain</span>
          </Button>
        </div>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          Round-robin inbox rotation with warm-up ramping from 5 to 50 sends per day.
          Bounce rate auto-disables at 10%+.
        </p>
      </section>

      {/* Summary */}
      {domains.length > 0 && (
        <section className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <HeroMetric
              label="Today's capacity"
              value={totalSentToday}
              unit={`/ ${totalCapacity}`}
              caption={`${totalCapacity - totalSentToday} sends remaining before midnight ET`}
              size="md"
            />
          </div>
          <div className="col-span-12 lg:col-span-7 panel">
            <div className="grid grid-cols-3">
              <MetricBlock label="Domains" value={domains.length} delta={`${activeCount} active`} />
              <MetricBlock label="Total sent" value={domains.reduce((a, d) => a + d.totalSent, 0).toLocaleString()} delta="all-time" />
              <MetricBlock label="Avg health" value={Math.round(domains.reduce((a, d) => a + d.healthScore, 0) / (domains.length || 1))} delta="out of 100" trend="up" />
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHeader numeral="1" title="The fleet" subtitle={`${domains.length} sending domains in rotation`} />

        <div className="mt-6">
          {loading ? (
            <div className="panel p-16 text-center">
              <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading…</p>
            </div>
          ) : domains.length === 0 ? (
            <div className="panel p-20 text-center">
              <Globe className="w-8 h-8 text-paper-4 mx-auto mb-4" />
              <p className="font-display italic text-paper-3 text-2xl font-light">No domains in rotation.</p>
              <button onClick={() => setShowAdd(true)} className="font-mono text-[11px] tracking-micro uppercase text-signal hover:underline mt-4 inline-block">
                Add the first domain →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {domains.map((d) => {
                const statusLabel = !d.active ? 'Disabled' : !d.verified ? 'Unverified' : d.warmupComplete ? 'Active' : d.warmupStartedAt ? 'Warming' : 'Ready';
                const statusClass = !d.active ? 'text-ember' : !d.verified ? 'text-paper-3' : d.warmupComplete ? 'text-signal' : d.warmupStartedAt ? 'text-amber' : 'text-paper-2';
                const sendPct = Math.min(100, (d.sentToday / d.dailyLimit) * 100);

                return (
                  <article key={d.id} className="panel p-6 hover:border-paper-4 transition-colors">
                    <div className="flex items-start justify-between mb-5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 shrink-0 relative ${d.active && d.verified ? 'bg-signal signal-dot' : 'bg-paper-4'}`} />
                          <span className={`font-mono text-[9px] tracking-mega uppercase ${statusClass}`}>{statusLabel}</span>
                        </div>
                        <h3 className="font-display italic text-paper text-[28px] font-light leading-none">{d.domain}</h3>
                        <p className="font-mono text-[10px] text-paper-4 mt-2 truncate">{d.fromEmail}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="label-sm mb-1">Health</p>
                        <p className={`font-display italic font-light text-[32px] leading-none nums ${
                          d.healthScore >= 80 ? 'text-signal' : d.healthScore >= 50 ? 'text-amber' : 'text-ember'
                        }`}>{d.healthScore}</p>
                      </div>
                    </div>

                    {/* Warmup bar */}
                    {d.warmupStartedAt && !d.warmupComplete && (
                      <div className="mb-5">
                        <p className="label-sm mb-2">Warm-up progression</p>
                        <div className="flex gap-1">
                          {WARMUP_STAGES.map((s) => (
                            <div key={s.stage} className="flex-1">
                              <div className={`h-[3px] ${d.warmupStage >= s.stage ? 'bg-signal' : 'bg-rule'}`} />
                              <p className="font-mono text-[9px] tracking-micro text-paper-4 mt-1 text-center">{s.limit}/d</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Today's sends */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="label-sm">Today</span>
                        <span className="font-mono text-xs text-paper nums">{d.sentToday} / {d.dailyLimit}</span>
                      </div>
                      <div className="h-[3px] bg-rule overflow-hidden">
                        <div className="h-full bg-signal transition-all" style={{ width: `${sendPct}%` }} />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-0 hairline border-t border-b mb-5">
                      <div className="px-3 py-3 hairline-r">
                        <p className="label-sm">Total</p>
                        <p className="font-display italic font-light text-paper text-2xl nums leading-none mt-1">{d.totalSent.toLocaleString()}</p>
                      </div>
                      <div className="px-3 py-3 hairline-r">
                        <p className="label-sm">Bounce</p>
                        <p className={`font-display italic font-light text-2xl nums leading-none mt-1 ${d.bounceRate > 5 ? 'text-ember' : d.bounceRate > 2 ? 'text-amber' : 'text-paper'}`}>{d.bounceRate}%</p>
                      </div>
                      <div className="px-3 py-3">
                        <p className="label-sm">Open</p>
                        <p className={`font-display italic font-light text-2xl nums leading-none mt-1 ${d.openRate > 30 ? 'text-signal' : 'text-paper'}`}>{d.openRate}%</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!d.verified && (
                        <Button size="sm" onClick={() => handleVerify(d.id)}>Verify</Button>
                      )}
                      {d.verified && !d.warmupStartedAt && (
                        <Button size="sm" onClick={() => handleStartWarmup(d.id)}>Start warm-up</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleToggle(d.id, !d.active)}>
                        {d.active ? 'Disable' : 'Enable'}
                      </Button>
                      {d.disabledReason && (
                        <span className="ml-auto font-mono text-[9px] text-ember uppercase tracking-micro">{d.disabledReason.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Add modal */}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-0/80" onClick={onClose} />
      <div className="relative panel-2 w-full max-w-md">
        <header className="flex items-center justify-between px-6 py-4 hairline-b">
          <span className="font-mono text-[11px] tracking-mega uppercase text-paper-2">Add sending domain</span>
          <button onClick={onClose} className="text-paper-4 hover:text-paper transition"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-6 space-y-5">
          <Field label="Domain" value={domain} onChange={setDomain} placeholder="getembedo.com" />
          <Field label="From email" value={fromEmail} onChange={setFromEmail} placeholder="jason@getembedo.com" />
          <Field label="From name" value={fromName} onChange={setFromName} placeholder="Jason" />
          <Field label="Reply-to (optional)" value={replyToEmail} onChange={setReplyToEmail} placeholder="replies@embedo.io" />
        </div>
        <footer className="flex gap-3 px-6 py-4 hairline-t">
          <Button variant="primary" onClick={() => onAdd({ domain, fromEmail, fromName, replyToEmail })} disabled={!domain || !fromEmail}>
            Add domain
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="label-sm block mb-2">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input w-full" />
    </div>
  );
}
