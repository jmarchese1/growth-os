"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Zap, ArrowUpRight, X, ExternalLink } from 'lucide-react';
import { SectionHeader, Button } from '../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL']
  ?? 'https://prospector-production-bc03.up.railway.app';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  dailyCap: number;
  sheetUrl: string | null;
  lastRunAt: string | null;
  targetCities: string[];
  targetIndustries: string[];
  _count: { campaigns: number; runs: number };
}

const INDUSTRIES = ['RESTAURANT', 'SALON', 'FITNESS', 'RETAIL', 'MEDICAL', 'OTHER'];
const DEFAULT_CITIES = [
  'Brooklyn, NY', 'Queens, NY', 'Manhattan, NY', 'Jersey City, NJ',
  'Philadelphia, PA', 'Boston, MA', 'Miami, FL', 'Austin, TX',
];

export default function AgentsListPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${PROSPECTOR_URL}/agents`);
      if (res.ok) setAgents(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-12">
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">Chapter 01 · Agents</span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {agents.filter((a) => a.active).length} of {agents.length} armed
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[84px]">
            Agents.
          </h1>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-3 h-3" />
            <span>New agent</span>
          </Button>
        </div>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          Each agent is an autonomous outreach worker. Pick target cities + industries,
          a daily send cap, email copy. The agent discovers businesses, sends personalized cold emails,
          logs everything to its own Google Sheet.
        </p>
      </section>

      <section>
        <SectionHeader numeral="1" title="Your agents" />
        <div className="mt-6">
          {loading ? (
            <p className="panel p-12 text-center font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading…</p>
          ) : agents.length === 0 ? (
            <div className="panel p-20 text-center">
              <Zap className="w-8 h-8 text-paper-4 mx-auto mb-4" />
              <p className="font-display italic text-paper-3 text-2xl font-light">No agents yet.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="font-mono text-[11px] tracking-micro uppercase text-signal hover:underline mt-4"
              >
                Create your first agent →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent, idx) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="panel p-6 hover:border-paper-4 transition-colors block group"
                >
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-5 flex items-start gap-4">
                      <span className="font-mono text-[10px] tracking-mega text-paper-4 pt-1.5 shrink-0">
                        №{(idx + 1).toString().padStart(3, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-1.5 h-1.5 shrink-0 relative ${agent.active ? 'bg-signal signal-dot' : 'bg-paper-4'}`} />
                          <span className={`font-mono text-[9px] tracking-mega uppercase ${agent.active ? 'text-signal' : 'text-paper-4'}`}>
                            {agent.active ? 'Armed' : 'Paused'}
                          </span>
                        </div>
                        <h3 className="font-display italic text-paper text-[26px] font-light leading-tight">{agent.name}</h3>
                        {agent.description && (
                          <p className="font-ui text-[12px] text-paper-3 mt-1.5 line-clamp-2">{agent.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="col-span-4 flex flex-wrap gap-1.5 items-start pt-1">
                      {agent.targetIndustries.slice(0, 3).map((ind) => (
                        <span key={ind} className="font-mono text-[9px] tracking-mega uppercase hairline px-2 py-1 text-paper-2">
                          {ind}
                        </span>
                      ))}
                      {agent.targetCities.slice(0, 2).map((city) => (
                        <span key={city} className="font-mono text-[9px] tracking-mega uppercase text-paper-4 px-2 py-1">
                          {city.split(',')[0]}
                        </span>
                      ))}
                    </div>

                    <div className="col-span-2 text-right">
                      <p className="font-display italic font-light text-paper text-2xl nums leading-none">{agent.dailyCap}</p>
                      <p className="font-mono text-[9px] tracking-mega text-paper-4 uppercase mt-1">per day</p>
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <ArrowUpRight className="w-4 h-4 text-paper-4 group-hover:text-signal transition-colors" />
                    </div>
                  </div>

                  <div className="mt-5 pt-4 hairline-t flex items-center justify-between">
                    <div className="flex items-center gap-4 font-mono text-[10px] tracking-micro uppercase text-paper-4">
                      <span>{agent._count.campaigns} campaigns</span>
                      <span>·</span>
                      <span>{agent._count.runs} runs</span>
                      {agent.lastRunAt && (
                        <>
                          <span>·</span>
                          <span>Last: {new Date(agent.lastRunAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })}</span>
                        </>
                      )}
                    </div>
                    {agent.sheetUrl && (
                      <a
                        href={agent.sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono text-[10px] tracking-mega uppercase text-paper-3 hover:text-signal transition-colors"
                      >
                        <span>Open sheet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {showCreate && (
        <CreateAgentModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            void load();
            router.push(`/agents/${id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateAgentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cities, setCities] = useState<string[]>(['Brooklyn, NY']);
  const [industries, setIndustries] = useState<string[]>(['RESTAURANT']);
  const [dailyCap, setDailyCap] = useState(10);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [creating, setCreating] = useState(false);

  const toggleCity = (c: string) => {
    setCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };
  const toggleIndustry = (i: string) => {
    setIndustries((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const handleCreate = async () => {
    if (!name || cities.length === 0 || industries.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch(`${PROSPECTOR_URL}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, targetCities: cities, targetIndustries: industries,
          dailyCap,
          ownerEmail: ownerEmail || undefined,
        }),
      });
      if (res.ok) {
        const agent = await res.json();
        onCreated(agent.id);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-0/80" onClick={onClose} />
      <div className="relative panel-2 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 hairline-b sticky top-0 bg-ink-2 z-10">
          <span className="font-mono text-[11px] tracking-mega uppercase text-paper-2">New agent</span>
          <button onClick={onClose} className="text-paper-4 hover:text-paper transition-colors"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-6 space-y-6">
          <div>
            <label className="label-sm block mb-2">Agent name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NYC Restaurants" className="input w-full" />
          </div>

          <div>
            <label className="label-sm block mb-2">Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cold outreach to borough pizzerias and diners" className="input w-full" />
          </div>

          <div>
            <label className="label-sm block mb-2">Target industries</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  onClick={() => toggleIndustry(ind)}
                  className={`px-3 py-1.5 font-mono text-[10px] tracking-mega uppercase hairline transition-colors ${
                    industries.includes(ind)
                      ? 'border-signal bg-signal-soft text-signal'
                      : 'border-rule text-paper-3 hover:text-paper'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-sm block mb-2">Target cities (rotation)</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCity(c)}
                  className={`px-3 py-1.5 font-mono text-[10px] tracking-micro uppercase hairline transition-colors ${
                    cities.includes(c)
                      ? 'border-signal bg-signal-soft text-signal'
                      : 'border-rule text-paper-3 hover:text-paper'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-paper-4 mt-2 tracking-micro uppercase">
              Agent rotates through city × industry combos when one exhausts
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-sm block mb-2">Daily send cap</label>
              <input
                type="number"
                min={1}
                max={200}
                value={dailyCap}
                onChange={(e) => setDailyCap(parseInt(e.target.value) || 10)}
                className="input w-full nums"
              />
            </div>
            <div>
              <label className="label-sm block mb-2">Share Sheet with email</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="you@embedo.io"
                className="input w-full"
              />
            </div>
          </div>

          <div className="panel p-4 hairline">
            <p className="font-mono text-[10px] tracking-mega uppercase text-paper-3 mb-2">What happens next</p>
            <ol className="font-ui text-[12px] text-paper-2 space-y-1.5 leading-relaxed list-decimal list-inside">
              <li>A new Google Sheet is provisioned with 4 tabs (Prospects · Emails · Daily · Log)</li>
              <li>Agent starts paused — review sheet access, then arm it from the agent page</li>
              <li>When armed, agent picks the first city × industry, discovers prospects, sends emails</li>
              <li>All activity writes to your Sheet in real time</li>
            </ol>
          </div>
        </div>

        <footer className="flex gap-3 px-6 py-4 hairline-t sticky bottom-0 bg-ink-2">
          <Button variant="primary" onClick={handleCreate} disabled={creating || !name || cities.length === 0}>
            {creating ? 'Creating…' : 'Create agent'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </footer>
      </div>
    </div>
  );
}
