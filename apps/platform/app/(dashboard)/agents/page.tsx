"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Zap, ArrowUpRight, X } from 'lucide-react';
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
    <div className="pt-10 pb-24 px-10 max-w-[1400px] mx-auto space-y-10">
      <section className="pb-8 hairline-b flex items-end justify-between gap-8">
        <div>
          <p className="text-[12px] text-paper-3 mb-2">
            {agents.filter((a) => a.active).length} of {agents.length} armed
          </p>
          <h1 className="text-paper text-[36px] font-semibold leading-tight tracking-tight">
            Agents
          </h1>
          <p className="text-paper-2 text-[14px] mt-3 max-w-xl leading-relaxed">
            Each agent is an autonomous outreach worker. Pick target cities and industries,
            a daily send cap, and email copy. The agent discovers businesses, sends personalized
            cold emails, and tracks every send in the Data tab.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" />
          <span>New agent</span>
        </Button>
      </section>

      <section>
        <SectionHeader numeral="1" title="Your agents" />
        <div className="mt-6">
          {loading ? (
            <p className="panel p-12 text-center text-[13px] text-paper-3">Loading…</p>
          ) : agents.length === 0 ? (
            <div className="panel p-16 text-center">
              <Zap className="w-7 h-7 text-paper-4 mx-auto mb-4" />
              <p className="text-paper text-[18px] font-medium">No agents yet</p>
              <button
                onClick={() => setShowCreate(true)}
                className="text-[13px] text-signal hover:underline mt-3 font-medium"
              >
                Create your first agent →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="panel p-6 hover:shadow-card-hover hover:border-paper-4 transition-all block group"
                >
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-5 min-w-0">
                      <div className="mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            agent.active ? 'bg-signal/10 text-signal' : 'bg-ink-2 text-paper-3'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.active ? 'bg-signal' : 'bg-paper-4'}`} />
                          {agent.active ? 'Armed' : 'Paused'}
                        </span>
                      </div>
                      <h3 className="text-paper text-[18px] font-semibold tracking-tight leading-tight">{agent.name}</h3>
                      {agent.description && (
                        <p className="text-[13px] text-paper-3 mt-1.5 line-clamp-2 leading-snug">{agent.description}</p>
                      )}
                    </div>

                    <div className="col-span-4 flex flex-wrap gap-1.5 items-start pt-1">
                      {agent.targetIndustries.slice(0, 3).map((ind) => (
                        <span key={ind} className="px-2 py-0.5 rounded-full bg-ink-2 text-[11px] text-paper-2 font-medium">
                          {ind.charAt(0) + ind.slice(1).toLowerCase()}
                        </span>
                      ))}
                      {agent.targetCities.slice(0, 2).map((city) => (
                        <span key={city} className="px-2 py-0.5 text-[11px] text-paper-3">
                          {city.split(',')[0]}
                        </span>
                      ))}
                    </div>

                    <div className="col-span-2 text-right">
                      <p className="text-paper text-[22px] nums font-semibold leading-none tracking-tight">{agent.dailyCap}</p>
                      <p className="text-[11px] text-paper-3 mt-1.5">per day</p>
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <ArrowUpRight className="w-4 h-4 text-paper-4 group-hover:text-signal transition-colors" />
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-rule flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[12px] text-paper-3">
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
                    <span className="inline-flex items-center gap-1 text-[12px] text-paper-3 font-medium">
                      View in Data →
                    </span>
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
      <div className="absolute inset-0 bg-paper/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-apple-lg">
        <header className="flex items-center justify-between px-6 py-4 border-b border-rule sticky top-0 bg-ink-0 z-10">
          <span className="text-paper text-[16px] font-semibold tracking-tight">New agent</span>
          <button onClick={onClose} className="text-paper-3 hover:text-paper transition-colors"><X className="w-4 h-4" /></button>
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
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    industries.includes(ind)
                      ? 'border-signal bg-signal/10 text-signal'
                      : 'border-rule text-paper-3 hover:text-paper hover:bg-ink-2'
                  }`}
                >
                  {ind.charAt(0) + ind.slice(1).toLowerCase()}
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
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    cities.includes(c)
                      ? 'border-signal bg-signal/10 text-signal'
                      : 'border-rule text-paper-3 hover:text-paper hover:bg-ink-2'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-paper-3 mt-2">
              Agent rotates through city × industry combos when one exhausts.
            </p>
          </div>

          <div>
            <label className="label-sm block mb-2">Daily send cap</label>
            <input
              type="number"
              min={1}
              max={200}
              value={dailyCap}
              onChange={(e) => setDailyCap(parseInt(e.target.value) || 10)}
              className="input w-full nums max-w-[180px]"
            />
            <p className="text-[12px] text-paper-3 mt-1.5">Emails per day across this agent.</p>
          </div>

          <div className="rounded-apple bg-ink-2 p-4">
            <p className="text-[12px] font-medium text-paper mb-2">What happens next</p>
            <ol className="text-[13px] text-paper-2 space-y-1.5 leading-relaxed list-decimal list-inside">
              <li>Agent starts paused — review the config, then arm it from the agent page.</li>
              <li>When armed, agent picks the first city × industry, discovers prospects, sends emails.</li>
              <li>All sends, opens, replies, and bounces appear in the Data tab in real time.</li>
            </ol>
          </div>
        </div>

        <footer className="flex gap-3 px-6 py-4 border-t border-rule sticky bottom-0 bg-ink-0">
          <Button variant="primary" onClick={handleCreate} disabled={creating || !name || cities.length === 0}>
            {creating ? 'Creating…' : 'Create agent'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </footer>
      </div>
    </div>
  );
}
