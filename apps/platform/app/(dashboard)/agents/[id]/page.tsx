"use client";

/**
 * Agent config page — edit targeting, cap, email copy.
 * Also: arm/pause toggle, run-now button, link to live view + sheet.
 */

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Play, PowerOff, Power, Save, Trash2, Activity } from 'lucide-react';
import { SectionHeader, Button } from '../../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL']
  ?? 'https://prospector-production-bc03.up.railway.app';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  dailyCap: number;
  runHourET: number;
  autoRotate: boolean;
  emailSubject: string;
  emailBody: string;
  systemPrompt: string | null;
  toneStyle: string;
  targetCities: string[];
  targetIndustries: string[];
  sheetUrl: string | null;
  sheetProvisioned: boolean;
  lastRunAt: string | null;
}

const INDUSTRIES = ['RESTAURANT', 'SALON', 'FITNESS', 'RETAIL', 'MEDICAL', 'OTHER'];
const CITY_SUGGESTIONS = [
  'Brooklyn, NY', 'Queens, NY', 'Manhattan, NY', 'Bronx, NY', 'Staten Island, NY',
  'Jersey City, NJ', 'Hoboken, NJ', 'Newark, NJ',
  'Philadelphia, PA', 'Boston, MA', 'Miami, FL', 'Austin, TX', 'Chicago, IL',
];

export default function AgentConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`${PROSPECTOR_URL}/agents/${id}`);
    if (res.ok) setAgent(await res.json());
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const update = (changes: Partial<Agent>) => {
    setAgent((prev) => prev ? { ...prev, ...changes } : null);
    setDirty(true);
  };

  const save = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      await fetch(`${PROSPECTOR_URL}/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agent.name,
          description: agent.description,
          targetCities: agent.targetCities,
          targetIndustries: agent.targetIndustries,
          dailyCap: agent.dailyCap,
          runHourET: agent.runHourET,
          autoRotate: agent.autoRotate,
          emailSubject: agent.emailSubject,
          emailBody: agent.emailBody,
          systemPrompt: agent.systemPrompt,
          toneStyle: agent.toneStyle,
        }),
      });
      setDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const togglePower = async () => {
    if (!agent) return;
    const endpoint = agent.active ? 'pause' : 'resume';
    await fetch(`${PROSPECTOR_URL}/agents/${id}/${endpoint}`, { method: 'POST' });
    await load();
  };

  const triggerRun = async () => {
    await fetch(`${PROSPECTOR_URL}/agents/${id}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    router.push(`/agents/${id}/run`);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete agent "${agent?.name}"? This deactivates it and all its campaigns.`)) return;
    await fetch(`${PROSPECTOR_URL}/agents/${id}`, { method: 'DELETE' });
    router.push('/agents');
  };

  if (!agent) {
    return (
      <div className="pt-10 pb-24 px-10 max-w-[1400px] mx-auto">
        <p className="text-[13px] text-paper-3">Loading…</p>
      </div>
    );
  }

  const toggleCity = (c: string) =>
    update({ targetCities: agent.targetCities.includes(c) ? agent.targetCities.filter((x) => x !== c) : [...agent.targetCities, c] });
  const toggleIndustry = (i: string) =>
    update({ targetIndustries: agent.targetIndustries.includes(i) ? agent.targetIndustries.filter((x) => x !== i) : [...agent.targetIndustries, i] });

  return (
    <div className="pt-10 pb-24 px-10 max-w-[1200px] mx-auto space-y-10">
      {/* Back link + title */}
      <section className="pb-6 hairline-b">
        <button onClick={() => router.push('/agents')} className="flex items-center gap-1.5 text-[13px] text-paper-3 hover:text-signal transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All agents</span>
        </button>
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0 flex-1">
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
            <input
              value={agent.name}
              onChange={(e) => update({ name: e.target.value })}
              className="text-paper text-[36px] font-semibold leading-tight tracking-tight bg-transparent w-full focus:outline-none focus:text-signal"
            />
            <input
              value={agent.description ?? ''}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Describe what this agent does…"
              className="text-paper-2 text-[14px] mt-2 w-full bg-transparent focus:outline-none focus:text-paper"
            />
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button variant={agent.active ? 'ghost' : 'primary'} onClick={togglePower}>
              {agent.active ? <><PowerOff className="w-3.5 h-3.5" /><span>Pause</span></> : <><Power className="w-3.5 h-3.5" /><span>Arm</span></>}
            </Button>
            <Button variant="primary" onClick={triggerRun}>
              <Play className="w-3.5 h-3.5" />
              <span>Run now</span>
            </Button>
            <Link href={`/agents/${id}/run`}>
              <Button variant="ghost" className="w-full">
                <Activity className="w-3.5 h-3.5" />
                <span>Live view</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sheet link */}
      {agent.sheetUrl ? (
        <section className="panel p-5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[12px] text-paper-3 mb-1">Google Sheet · system of record</p>
            <p className="text-[12px] text-paper-2 truncate">{agent.sheetUrl}</p>
          </div>
          <a
            href={agent.sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary shrink-0"
          >
            <span>Open sheet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </section>
      ) : (
        <section className="panel p-5 border-amber">
          <p className="text-[13px] text-amber font-medium">
            Sheet not provisioned. Check GOOGLE_SERVICE_ACCOUNT_KEY env var on prospector.
          </p>
        </section>
      )}

      {/* Targeting */}
      <section>
        <SectionHeader numeral="1" title="Targeting" subtitle="Who this agent reaches out to" />
        <div className="mt-6 panel p-6 space-y-5">
          <div>
            <label className="label-sm block mb-2">Industries</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <button
                  key={i}
                  onClick={() => toggleIndustry(i)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    agent.targetIndustries.includes(i)
                      ? 'border-signal bg-signal/10 text-signal'
                      : 'border-rule text-paper-3 hover:text-paper hover:bg-ink-2'
                  }`}
                >
                  {i.charAt(0) + i.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-sm block mb-2">Cities (rotation queue)</label>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...CITY_SUGGESTIONS, ...agent.targetCities])].map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCity(c)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    agent.targetCities.includes(c)
                      ? 'border-signal bg-signal/10 text-signal'
                      : 'border-rule text-paper-3 hover:text-paper hover:bg-ink-2'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dispatch */}
      <section>
        <SectionHeader title="Dispatch" subtitle="How often and how much this agent sends" />
        <div className="mt-4 panel p-6 grid grid-cols-3 gap-6">
          <div>
            <label className="label-sm block mb-2">Daily cap</label>
            <input
              type="number"
              min={1}
              max={500}
              value={agent.dailyCap}
              onChange={(e) => update({ dailyCap: parseInt(e.target.value) || 10 })}
              className="input w-full nums"
            />
            <p className="text-[12px] text-paper-3 mt-1.5">emails per day</p>
          </div>
          <div>
            <label className="label-sm block mb-2">Run hour</label>
            <input
              type="number"
              min={0}
              max={23}
              value={agent.runHourET}
              onChange={(e) => update({ runHourET: parseInt(e.target.value) || 9 })}
              className="input w-full nums"
            />
            <p className="text-[12px] text-paper-3 mt-1.5">Hour (ET), 0–23</p>
          </div>
          <div>
            <label className="label-sm block mb-2">Auto-rotate</label>
            <button
              onClick={() => update({ autoRotate: !agent.autoRotate })}
              className={`input w-full text-[13px] flex items-center justify-between ${
                agent.autoRotate ? 'border-signal text-signal font-medium' : 'text-paper-3'
              }`}
            >
              <span>{agent.autoRotate ? 'Enabled' : 'Disabled'}</span>
              <span className={`w-2 h-2 rounded-full ${agent.autoRotate ? 'bg-signal' : 'bg-paper-4'}`} />
            </button>
            <p className="text-[12px] text-paper-3 mt-1.5">Spawn new campaigns on exhaust</p>
          </div>
        </div>
      </section>

      {/* Email copy */}
      <section>
        <SectionHeader title="Email copy" subtitle="Subject line and body template" />
        <div className="mt-4 panel p-6 space-y-5">
          <div>
            <label className="label-sm block mb-2">Subject</label>
            <input
              value={agent.emailSubject}
              onChange={(e) => update({ emailSubject: e.target.value })}
              className="input w-full"
            />
            <p className="text-[12px] text-paper-3 mt-1.5">
              Variables: &#123;&#123;firstName&#125;&#125; &#123;&#123;shortName&#125;&#125; &#123;&#123;company&#125;&#125; &#123;&#123;city&#125;&#125; &#123;&#123;type&#125;&#125;
            </p>
          </div>
          <div>
            <label className="label-sm block mb-2">Body template (plain text)</label>
            <textarea
              rows={10}
              value={agent.emailBody}
              onChange={(e) => update({ emailBody: e.target.value })}
              className="input w-full resize-y font-mono text-[12px] leading-relaxed"
              placeholder={`Hey {{firstName}},\n\nI'm Jason...`}
            />
          </div>
          <div>
            <label className="label-sm block mb-2">System prompt (optional — guides AI personalization)</label>
            <textarea
              rows={4}
              value={agent.systemPrompt ?? ''}
              onChange={(e) => update({ systemPrompt: e.target.value })}
              className="input w-full resize-y text-[13px] leading-relaxed"
              placeholder="e.g. Focus on how our tool saves them time handling phone orders. Be warm but direct."
            />
          </div>
        </div>
      </section>

      {/* Save bar */}
      <section className={`sticky bottom-6 panel px-6 py-4 flex items-center justify-between transition-opacity ${dirty ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <p className="text-[13px] text-amber font-medium">
          Unsaved changes
        </p>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={load}>Discard</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving…' : justSaved ? 'Saved' : 'Save changes'}</span>
          </Button>
        </div>
      </section>

      {/* Danger */}
      <section className="border-t border-rule pt-6 flex items-center justify-between">
        <span className="text-[12px] text-paper-3">Danger zone</span>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-2 text-[13px] text-ember hover:text-paper font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete agent</span>
        </button>
      </section>
    </div>
  );
}
