"use client";

import { useEffect, useState, useCallback } from 'react';
import {
  Zap, Play, Pause, Terminal, Power, PowerOff,
  TrendingUp, Mail, Crosshair, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { SectionHeader, HeroMetric, MetricBlock, Panel, Button } from '../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL']
  ?? process.env['PROSPECTOR_URL']
  ?? 'https://prospector-production-bc03.up.railway.app';

interface AgentStatus {
  config: {
    active: boolean;
    runHourET: number;
    globalDailyCap: number;
    autoRotate: boolean;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    nextRunAt: string | null;
  };
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
    agentActive: boolean;
    agentDailyCap: number;
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
  trigger: string;
  startedAt: string;
  completedAt: string | null;
  emailsSent: number;
  emailsFailed: number;
  campaignsTouched: number;
  campaignsSpawned: number;
  durationMs: number | null;
  events: AgentEvent[] | null;
}

export default function AgentPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const [statusRes, runsRes] = await Promise.all([
        fetch(`${PROSPECTOR_URL}/agent/status`),
        fetch(`${PROSPECTOR_URL}/agent/runs?limit=10`),
      ]);
      if (statusRes.ok) {
        const data: AgentStatus = await statusRes.json();
        setStatus(data);

        // If there's a running run or today's run, fetch its events
        if (data.todayRun?.id) {
          const runRes = await fetch(`${PROSPECTOR_URL}/agent/runs/${data.todayRun.id}`);
          if (runRes.ok) setCurrentRun(await runRes.json());
        }
      }
      if (runsRes.ok) {
        const data: { runs: AgentRun[] } = await runsRes.json();
        setRecentRuns(data.runs);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Conditional polling: fast (3s) when agent is running; slow (30s) when idle.
  // After every fetch we reconfigure the interval based on fresh state.
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let cancelled = false;

    const tick = async () => {
      await loadStatus();
      if (cancelled) return;
      // Re-read latest status via state getter by closing over setState
      setStatus((current) => {
        const interval = current?.isRunning ? 3000 : 30000;
        timeout = setTimeout(tick, interval);
        return current;
      });
    };

    tick();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [loadStatus]);

  async function handleTrigger() {
    setTriggering(true);
    try {
      await fetch(`${PROSPECTOR_URL}/agent/trigger`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      await loadStatus();
    } finally {
      setTriggering(false);
    }
  }

  async function handleTogglePower() {
    const endpoint = status?.config.active ? '/agent/pause' : '/agent/resume';
    await fetch(`${PROSPECTOR_URL}${endpoint}`, { method: 'POST' });
    await loadStatus();
  }

  async function toggleCampaignAgent(id: string, newValue: boolean) {
    await fetch(`${PROSPECTOR_URL}/agent/campaign/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentActive: newValue }),
    });
    await loadStatus();
  }

  async function updateCampaignCap(id: string, newCap: number) {
    await fetch(`${PROSPECTOR_URL}/agent/campaign/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentDailyCap: newCap }),
    });
    await loadStatus();
  }

  if (loading || !status) {
    return (
      <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto">
        <section className="pb-10 hairline-b">
          <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading agent…</p>
        </section>
      </div>
    );
  }

  const c = status.config;
  const r = status.todayRun;
  const isLive = status.isRunning;
  const events = currentRun?.events ?? [];

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">
      {/* ── Masthead ── */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 00 · The Agent
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className={`font-mono text-[10px] tracking-mega uppercase flex items-center gap-2 ${c.active ? 'text-signal' : 'text-paper-4'}`}>
            <span className={`w-1.5 h-1.5 relative ${c.active ? 'bg-signal signal-dot' : 'bg-paper-4'}`} />
            {c.active ? (isLive ? 'Running' : 'Armed') : 'Paused'}
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <div>
            <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[72px] lg:text-[84px]">
              The <span className={c.active ? 'text-signal' : 'text-paper-3'}>machine</span>.
            </h1>
            <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
              Autonomous outreach. Wakes up daily, picks the next batch of businesses,
              writes each one a custom cold email, and sends. Rotates domains. Rotates industries.
              Never stops.
            </p>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <div className="flex items-center gap-2">
              <Button
                variant={c.active ? 'ghost' : 'primary'}
                onClick={handleTogglePower}
              >
                {c.active ? <><PowerOff className="w-3 h-3" /><span>Pause</span></> : <><Power className="w-3 h-3" /><span>Arm</span></>}
              </Button>
              <Button variant="primary" onClick={handleTrigger} disabled={triggering || isLive}>
                <Play className="w-3 h-3" />
                <span>{isLive ? 'Running…' : triggering ? 'Starting…' : 'Run now'}</span>
              </Button>
            </div>
            {c.lastRunAt && (
              <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
                Last run {new Date(c.lastRunAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ET
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Live numbers ── */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5">
          <HeroMetric
            label="Sent today"
            value={(r?.emailsSent ?? 0).toString()}
            unit={` / ${c.globalDailyCap}`}
            caption={`${r?.campaignsTouched ?? 0} campaigns touched, ${r?.campaignsSpawned ?? 0} auto-spawned`}
            size="md"
          />
        </div>
        <div className="col-span-12 lg:col-span-7 panel">
          <div className="grid grid-cols-4">
            <MetricBlock
              label="Capacity"
              value={`${status.capacity.remaining}`}
              suffix={`/ ${status.capacity.totalCapacity}`}
              delta="remaining today"
            />
            <MetricBlock
              label="Agent campaigns"
              value={status.campaigns.filter(c => c.agentActive).length}
              delta={`of ${status.campaigns.length} total`}
            />
            <MetricBlock
              label="Ready to send"
              value={status.campaigns.reduce((a, c) => a + (c.agentActive ? c.sendableCount : 0), 0)}
              delta="enriched prospects"
            />
            <MetricBlock
              label="Failed today"
              value={r?.emailsFailed ?? 0}
              trend={(r?.emailsFailed ?? 0) > 0 ? 'down' : 'flat'}
            />
          </div>
        </div>
      </section>

      {/* ── Live terminal + campaigns ── */}
      <section className="grid grid-cols-12 gap-8">
        {/* LEFT — Live event stream */}
        <div className="col-span-12 lg:col-span-7">
          <SectionHeader
            numeral="1"
            title="Live log"
            subtitle={isLive ? 'Agent is sending now — refreshing every 3s' : 'Most recent run'}
            action={
              isLive ? (
                <span className="font-mono text-[10px] tracking-mega uppercase text-signal flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-signal signal-dot relative" />
                  Active
                </span>
              ) : null
            }
          />
          <div className="mt-6 panel">
            <div className="px-5 py-3 hairline-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="w-3.5 h-3.5 text-paper-3" />
                <span className="font-mono text-[10px] tracking-mega uppercase text-paper-3">
                  agent.log
                </span>
              </div>
              <span className="font-mono text-[10px] tracking-mega uppercase text-paper-4">
                {events.length} events
              </span>
            </div>
            <div className="p-5 font-mono text-[11px] max-h-[480px] overflow-y-auto space-y-1 leading-relaxed">
              {events.length === 0 ? (
                <p className="text-paper-4 tracking-micro uppercase">
                  &gt; no events yet — hit <span className="text-signal">Run now</span> to dispatch
                </p>
              ) : (
                events.slice().reverse().map((ev, i) => {
                  const color =
                    ev.level === 'success' ? 'text-signal' :
                    ev.level === 'warn' ? 'text-amber' :
                    ev.level === 'error' ? 'text-ember' : 'text-paper-2';
                  const time = new Date(ev.ts).toLocaleTimeString('en-US', {
                    timeZone: 'America/New_York',
                    hour12: false,
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  });
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

        {/* RIGHT — Config + History */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          <Panel title="Configuration" numeral="2">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between py-2 hairline-b">
                <span className="font-mono text-[11px] tracking-micro uppercase text-paper-3">Global cap</span>
                <span className="font-display italic font-light text-paper text-lg nums">{c.globalDailyCap}/day</span>
              </div>
              <div className="flex items-center justify-between py-2 hairline-b">
                <span className="font-mono text-[11px] tracking-micro uppercase text-paper-3">Run hour</span>
                <span className="font-display italic font-light text-paper text-lg nums">{c.runHourET}:00 ET</span>
              </div>
              <div className="flex items-center justify-between py-2 hairline-b">
                <span className="font-mono text-[11px] tracking-micro uppercase text-paper-3">Auto-rotate</span>
                <span className={`font-mono text-[10px] tracking-mega uppercase ${c.autoRotate ? 'text-signal' : 'text-paper-4'}`}>
                  {c.autoRotate ? 'On' : 'Off'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-mono text-[11px] tracking-micro uppercase text-paper-3">Last run status</span>
                <span className={`font-mono text-[10px] tracking-mega uppercase ${
                  c.lastRunStatus === 'completed' ? 'text-signal' :
                  c.lastRunStatus === 'partial' ? 'text-amber' :
                  c.lastRunStatus === 'failed' ? 'text-ember' : 'text-paper-4'
                }`}>
                  {c.lastRunStatus ?? 'never'}
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Recent runs" numeral="3">
            {recentRuns.length === 0 ? (
              <p className="p-6 text-center font-mono text-[11px] tracking-micro uppercase text-paper-4">
                No runs yet.
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {recentRuns.slice(0, 6).map((run) => {
                  const icon = run.status === 'completed' ? CheckCircle2 :
                    run.status === 'failed' ? AlertTriangle : Zap;
                  const Icon = icon;
                  const iconColor = run.status === 'completed' ? 'text-signal' :
                    run.status === 'failed' ? 'text-ember' : 'text-amber';
                  return (
                    <div key={run.id} className="flex items-center gap-3 p-4">
                      <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-[11px] text-paper tracking-micro uppercase">{run.trigger}</p>
                          <span className="font-mono text-[9px] tracking-mega text-paper-4 uppercase">{run.status}</span>
                        </div>
                        <p className="font-mono text-[10px] text-paper-4 mt-0.5">
                          {new Date(run.startedAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display italic font-light text-paper text-xl nums leading-none">{run.emailsSent}</p>
                        <p className="font-mono text-[9px] tracking-mega text-paper-4 uppercase mt-1">sent</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </section>

      {/* ── Per-campaign control ── */}
      <section>
        <SectionHeader
          numeral="4"
          title="Campaigns under management"
          subtitle="Toggle which campaigns the agent can send from"
          action={
            <span className="font-mono text-[10px] tracking-mega uppercase text-paper-3">
              {status.campaigns.filter(c => c.agentActive).length} / {status.campaigns.length} active
            </span>
          }
        />
        <div className="mt-6 panel overflow-hidden">
          {status.campaigns.length === 0 ? (
            <p className="p-12 text-center font-display italic text-paper-3 text-xl font-light">
              No campaigns yet.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <Th>Campaign</Th>
                  <Th align="right">Prospects</Th>
                  <Th align="right">Sendable</Th>
                  <Th align="right">Daily cap</Th>
                  <Th>Last run</Th>
                  <Th align="right">Agent</Th>
                </tr>
              </thead>
              <tbody>
                {status.campaigns.map((camp, idx) => (
                  <tr key={camp.id} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors">
                    <td className="px-5 py-4 min-w-[220px]">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-paper-4 pt-1 shrink-0">
                          №{(idx + 1).toString().padStart(3, '0')}
                        </span>
                        <div>
                          <p className="font-display italic text-paper text-base font-light leading-tight">
                            {camp.name}
                          </p>
                          <p className="font-mono text-[10px] tracking-micro text-paper-4 uppercase mt-0.5">
                            {camp.targetCity}
                          </p>
                          {camp.agentExhaustedAt && (
                            <span className="font-mono text-[9px] tracking-mega text-amber uppercase mt-1 inline-block">
                              Exhausted
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-paper nums">
                      {camp.prospectCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`font-display italic font-light text-xl nums ${camp.sendableCount > 0 ? 'text-signal' : 'text-paper-4'}`}>
                        {camp.sendableCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <input
                        type="number"
                        defaultValue={camp.agentDailyCap}
                        min={1}
                        max={200}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value);
                          if (v !== camp.agentDailyCap && v > 0) updateCampaignCap(camp.id, v);
                        }}
                        className="input w-16 text-right nums !py-1.5 !px-2 !text-xs"
                      />
                    </td>
                    <td className="px-4 py-4">
                      {camp.agentLastRunAt ? (
                        <span className="font-mono text-[11px] text-paper-3 nums">
                          {new Date(camp.agentLastRunAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-paper-4">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => toggleCampaignAgent(camp.id, !camp.agentActive)}
                        className={`inline-flex items-center gap-2 hairline px-3 py-1.5 font-mono text-[10px] tracking-mega uppercase transition-colors ${
                          camp.agentActive
                            ? 'border-signal bg-signal-soft text-signal'
                            : 'border-rule text-paper-3 hover:text-paper'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 ${camp.agentActive ? 'bg-signal' : 'bg-paper-4'}`} />
                        {camp.agentActive ? 'Armed' : 'Off'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 font-mono text-[9px] tracking-mega uppercase text-paper-4 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}
