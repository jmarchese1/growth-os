"use client";

/**
 * Live view — watches an agent run in real time.
 */

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Terminal, ExternalLink, Play, PowerOff, Power, Settings as SettingsIcon } from 'lucide-react';
import { SectionHeader, HeroMetric, MetricBlock, Panel, Button } from '../../../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL']
  ?? 'https://prospector-production-bc03.up.railway.app';

interface AgentStatus {
  agent: {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    dailyCap: number;
    autoRotate: boolean;
    sheetUrl: string | null;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    targetCities: string[];
    targetIndustries: string[];
  };
  inventoryCount: number;
  todayRun: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    emailsSent: number;
    emailsFailed: number;
    campaignsTouched: number;
    campaignsSpawned: number;
  } | null;
  isRunning: boolean;
  campaigns: Array<{
    id: string;
    name: string;
    targetCity: string;
    targetIndustry: string;
    agentLastRunAt: string | null;
    agentExhaustedAt: string | null;
    prospectCount: number;
    sendableCount: number;
  }>;
  capacity: {
    totalCapacity: number;
    totalSentToday: number;
    remaining: number;
  };
}

interface AgentEvent {
  ts: string;
  level: 'info' | 'success' | 'warn' | 'error';
  msg: string;
  campaignName?: string;
  prospectName?: string;
}

interface AgentRun {
  id: string;
  status: string;
  events: AgentEvent[] | null;
}

export default function AgentRunLiveView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);

  const load = useCallback(async () => {
    try {
      const statusRes = await fetch(`${PROSPECTOR_URL}/agents/${id}/status`);
      if (!statusRes.ok) return;
      const data: AgentStatus = await statusRes.json();
      setStatus(data);
      if (data.todayRun?.id) {
        const runRes = await fetch(`${PROSPECTOR_URL}/agents/${id}/runs/${data.todayRun.id}`);
        if (runRes.ok) setCurrentRun(await runRes.json());
      }
    } catch { /* silent */ }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    let timeout: NodeJS.Timeout;
    const tick = async () => {
      await load();
      if (cancelled) return;
      setStatus((current) => {
        const interval = current?.isRunning ? 3000 : 30000;
        timeout = setTimeout(tick, interval);
        return current;
      });
    };
    tick();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [load]);

  const triggerRun = async () => {
    await fetch(`${PROSPECTOR_URL}/agents/${id}/trigger`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    await load();
  };
  const togglePower = async () => {
    if (!status) return;
    const endpoint = status.agent.active ? 'pause' : 'resume';
    await fetch(`${PROSPECTOR_URL}/agents/${id}/${endpoint}`, { method: 'POST' });
    await load();
  };

  if (!status) {
    return (
      <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto">
        <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading agent…</p>
      </div>
    );
  }

  const { agent, todayRun: r, isRunning, capacity, campaigns } = status;
  const events = currentRun?.events ?? [];

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-12">
      {/* Masthead */}
      <section className="pb-8 hairline-b">
        <Link href="/agents" className="flex items-center gap-2 font-mono text-[10px] tracking-mega uppercase text-paper-4 hover:text-signal transition-colors mb-4">
          <ArrowLeft className="w-3 h-3" />
          <span>All agents</span>
        </Link>
        <div className="flex items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-1.5 h-1.5 shrink-0 relative ${agent.active ? (isRunning ? 'bg-signal signal-dot' : 'bg-signal') : 'bg-paper-4'}`} />
              <span className={`font-mono text-[10px] tracking-mega uppercase ${agent.active ? 'text-signal' : 'text-paper-4'}`}>
                {agent.active ? (isRunning ? 'Running now' : 'Armed, idle') : 'Paused'}
              </span>
            </div>
            <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[60px] lg:text-[76px]">
              {agent.name}
            </h1>
            {agent.description && (
              <p className="font-ui text-paper-2 text-[14px] mt-3 max-w-xl">{agent.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0 items-end">
            <div className="flex gap-2">
              <Button variant={agent.active ? 'ghost' : 'primary'} onClick={togglePower}>
                {agent.active ? <><PowerOff className="w-3 h-3" /><span>Pause</span></> : <><Power className="w-3 h-3" /><span>Arm</span></>}
              </Button>
              <Button variant="primary" onClick={triggerRun} disabled={isRunning}>
                <Play className="w-3 h-3" />
                <span>{isRunning ? 'Running…' : 'Run now'}</span>
              </Button>
            </div>
            <Link href={`/agents/${id}`} className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-mega uppercase text-paper-3 hover:text-signal transition-colors mt-1">
              <SettingsIcon className="w-3 h-3" />
              <span>Edit config</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Live numbers */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5">
          <HeroMetric
            label="Sent today"
            value={(r?.emailsSent ?? 0).toString()}
            unit={` / ${agent.dailyCap}`}
            caption={`${r?.campaignsTouched ?? 0} campaigns touched · ${r?.campaignsSpawned ?? 0} auto-spawned`}
            size="md"
          />
        </div>
        <div className="col-span-12 lg:col-span-7 panel">
          <div className="grid grid-cols-4">
            <MetricBlock label="Sent" value={r?.emailsSent ?? 0} />
            <MetricBlock label="Failed" value={r?.emailsFailed ?? 0} trend={(r?.emailsFailed ?? 0) > 0 ? 'down' : 'flat'} />
            <MetricBlock label="Capacity" value={capacity.remaining} delta={`of ${capacity.totalCapacity}`} />
            <MetricBlock label="Inventory" value={status.inventoryCount} delta="enriched prospects across all campaigns" trend={status.inventoryCount > 0 ? 'up' : 'flat'} />
          </div>
        </div>
      </section>

      {/* Sheet link */}
      {agent.sheetUrl && (
        <section className="panel p-5 flex items-center justify-between">
          <div>
            <p className="label-sm mb-1">Google Sheet</p>
            <p className="font-mono text-xs text-paper-2 truncate">Every prospect · every email · every event logged live</p>
          </div>
          <a href={agent.sheetUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <span>Open sheet</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </section>
      )}

      {/* Live terminal + current campaign */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
          <SectionHeader
            numeral="1"
            title="Live log"
            subtitle={isRunning ? 'Refreshing every 3s' : 'Most recent run'}
            action={isRunning ? (
              <span className="font-mono text-[10px] tracking-mega uppercase text-signal flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-signal signal-dot relative" />
                Live
              </span>
            ) : null}
          />
          <div className="mt-6 panel">
            <div className="px-5 py-3 hairline-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="w-3.5 h-3.5 text-paper-3" />
                <span className="font-mono text-[10px] tracking-mega uppercase text-paper-3">agent.log</span>
              </div>
              <span className="font-mono text-[10px] tracking-mega uppercase text-paper-4">{events.length} events</span>
            </div>
            <div className="p-5 font-mono text-[11px] max-h-[480px] overflow-y-auto space-y-1 leading-relaxed">
              {events.length === 0 ? (
                <p className="text-paper-4 tracking-micro uppercase">&gt; no events yet — hit Run now to dispatch</p>
              ) : (
                events.slice().reverse().map((ev, i) => {
                  const color = ev.level === 'success' ? 'text-signal' : ev.level === 'warn' ? 'text-amber' : ev.level === 'error' ? 'text-ember' : 'text-paper-2';
                  const time = new Date(ev.ts).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <div key={i} className="flex gap-3">
                      <span className="text-paper-4 nums shrink-0">{time}</span>
                      <span className={`shrink-0 ${color}`}>{ev.level === 'success' ? '✓' : ev.level === 'error' ? '✗' : ev.level === 'warn' ? '!' : '·'}</span>
                      <span className={color}>
                        {ev.msg}
                        {ev.campaignName && <span className="text-paper-4"> · {ev.campaignName}</span>}
                        {ev.prospectName && <span className="text-paper-4"> · {ev.prospectName}</span>}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Panel title="Current campaigns" numeral="2">
            {campaigns.length === 0 ? (
              <p className="p-6 text-center font-display italic text-paper-3 text-lg font-light">
                No active campaigns.
                <br /><span className="font-mono text-[10px] tracking-micro uppercase text-paper-4 block mt-2 not-italic">Auto-rotate will spawn one</span>
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {campaigns.map((c) => (
                  <div key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-display italic text-paper text-base font-light leading-tight">{c.name}</p>
                        <p className="font-mono text-[10px] tracking-micro uppercase text-paper-4 mt-0.5">
                          {c.targetCity} · {c.targetIndustry}
                        </p>
                        {c.agentExhaustedAt && (
                          <span className="inline-block mt-1 font-mono text-[9px] tracking-mega uppercase text-amber">Exhausted</span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-display italic font-light nums text-2xl leading-none ${c.sendableCount > 0 ? 'text-signal' : 'text-paper-4'}`}>
                          {c.sendableCount}
                        </p>
                        <p className="font-mono text-[9px] tracking-mega uppercase text-paper-4 mt-1">ready</p>
                      </div>
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-paper-4 tracking-micro">
                      {c.prospectCount} total prospects
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}
