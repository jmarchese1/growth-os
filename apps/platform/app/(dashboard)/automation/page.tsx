'use client';

import { useState, useEffect, useCallback } from 'react';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface RampStage { week: number; dailyLimit: number; }

interface AutoSenderStatus {
  active: boolean;
  rampSchedule: RampStage[];
  sendWindowStart: number;
  sendWindowEnd: number;
  campaignIds: string[] | null;
  activatedAt: string | null;
  sentToday: number;
  currentDailyLimit: number;
  currentWeek: number;
  totalUnsent: number;
}

interface Campaign { id: string; name: string; targetCity: string; _count: { prospects: number } }

export default function AutomationPage() {
  const [status, setStatus] = useState<AutoSenderStatus | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [active, setActive] = useState(false);
  const [ramp, setRamp] = useState<RampStage[]>([]);
  const [windowStart, setWindowStart] = useState(9);
  const [windowEnd, setWindowEnd] = useState(17);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [useAllCampaigns, setUseAllCampaigns] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, campRes] = await Promise.all([
        fetch(`${PROSPECTOR_URL}/auto-sender/status`),
        fetch(`${PROSPECTOR_URL}/campaigns`),
      ]);
      if (statusRes.ok) {
        const s = await statusRes.json() as AutoSenderStatus;
        setStatus(s);
        setActive(s.active);
        setRamp(s.rampSchedule);
        setWindowStart(s.sendWindowStart);
        setWindowEnd(s.sendWindowEnd);
        setSelectedCampaigns(s.campaignIds ?? []);
        setUseAllCampaigns(!s.campaignIds || s.campaignIds.length === 0);
      }
      if (campRes.ok) {
        const c = await campRes.json();
        setCampaigns(Array.isArray(c) ? c : []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  // Poll status every 30s
  useEffect(() => { const i = setInterval(fetchStatus, 30_000); return () => clearInterval(i); }, [fetchStatus]);

  async function save() {
    setSaving(true);
    await fetch(`${PROSPECTOR_URL}/auto-sender/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active,
        rampSchedule: ramp,
        sendWindowStart: windowStart,
        sendWindowEnd: windowEnd,
        campaignIds: useAllCampaigns ? null : selectedCampaigns,
      }),
    });
    await fetchStatus();
    setSaving(false);
  }

  function addWeek() {
    const lastWeek = ramp[ramp.length - 1]?.week ?? 0;
    const lastLimit = ramp[ramp.length - 1]?.dailyLimit ?? 15;
    setRamp([...ramp, { week: lastWeek + 1, dailyLimit: Math.min(100, lastLimit + 15) }]);
  }

  function removeWeek(idx: number) {
    setRamp(ramp.filter((_, i) => i !== idx));
  }

  function updateWeek(idx: number, field: 'week' | 'dailyLimit', value: number) {
    setRamp(ramp.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function toggleCampaign(id: string) {
    setSelectedCampaigns((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  const inputCls = 'px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors';

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Email Automation</h1>
          <p className="text-sm text-slate-400 mt-1">Configure automatic cold email sending across your campaigns.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Live Status Banner */}
      {status && (
        <div className={`rounded-2xl p-5 mb-6 border ${active ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
              <div>
                <p className="text-sm font-semibold text-white">{active ? 'Auto-sender is running' : 'Auto-sender is paused'}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {active
                    ? `Week ${status.currentWeek} · ${status.sentToday}/${status.currentDailyLimit} sent today · ${status.totalUnsent} prospects remaining`
                    : `${status.totalUnsent} unsent prospects waiting`}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setActive(!active); }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                active
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {active ? 'Pause' : 'Activate'}
            </button>
          </div>

          {/* Today's progress bar */}
          {active && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500">Today&apos;s progress</span>
                <span className="text-[10px] text-slate-400 tabular-nums">{status.sentToday} / {status.currentDailyLimit}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (status.sentToday / status.currentDailyLimit) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ramp Schedule */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 glow-card">
          <h2 className="text-sm font-semibold text-white mb-4">Ramp Schedule</h2>
          <p className="text-xs text-slate-500 mb-4">Gradually increase daily send volume to build sender reputation.</p>

          <div className="space-y-2 mb-4">
            {ramp.map((stage, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-slate-500 w-16">Week</span>
                  <input
                    type="number"
                    min={1}
                    value={stage.week}
                    onChange={(e) => updateWeek(i, 'week', parseInt(e.target.value) || 1)}
                    className={`${inputCls} w-16 text-center`}
                  />
                  <span className="text-xs text-slate-500 w-20 text-right">sends/day</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={stage.dailyLimit}
                    onChange={(e) => updateWeek(i, 'dailyLimit', parseInt(e.target.value) || 1)}
                    className={`${inputCls} w-20 text-center`}
                  />
                </div>
                {ramp.length > 1 && (
                  <button onClick={() => removeWeek(i)} className="text-slate-600 hover:text-red-400 transition-colors text-sm">x</button>
                )}
              </div>
            ))}
          </div>

          <button onClick={addWeek} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
            + Add Week
          </button>

          {/* Visual ramp chart */}
          <div className="mt-5 flex items-end gap-1 h-20">
            {ramp.map((stage, i) => {
              const maxLimit = Math.max(...ramp.map((s) => s.dailyLimit));
              const height = (stage.dailyLimit / maxLimit) * 100;
              const isCurrent = status && status.currentWeek === stage.week;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-500 tabular-nums">{stage.dailyLimit}</span>
                  <div
                    className={`w-full rounded-t transition-all ${isCurrent ? 'bg-emerald-500' : 'bg-violet-500/40'}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[9px] text-slate-600">W{stage.week}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Send Window */}
        <div className="space-y-6">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 glow-card">
            <h2 className="text-sm font-semibold text-white mb-4">Send Window</h2>
            <p className="text-xs text-slate-500 mb-4">Only send emails during business hours (Eastern Time).</p>

            <div className="flex items-center gap-3">
              <select value={windowStart} onChange={(e) => setWindowStart(parseInt(e.target.value))} className={`${inputCls} bg-[#12101f] appearance-none`}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`}</option>
                ))}
              </select>
              <span className="text-xs text-slate-500">to</span>
              <select value={windowEnd} onChange={(e) => setWindowEnd(parseInt(e.target.value))} className={`${inputCls} bg-[#12101f] appearance-none`}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`}</option>
                ))}
              </select>
              <span className="text-xs text-slate-500">ET</span>
            </div>
          </div>

          {/* Campaign Selector */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 glow-card">
            <h2 className="text-sm font-semibold text-white mb-4">Campaigns</h2>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <button
                type="button"
                onClick={() => setUseAllCampaigns(!useAllCampaigns)}
                className={`relative w-8 h-4.5 rounded-full transition-colors ${useAllCampaigns ? 'bg-violet-600' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${useAllCampaigns ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <span className="text-xs text-slate-300">Send from all active campaigns</span>
            </label>

            {!useAllCampaigns && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {campaigns.filter((c) => c._count?.prospects > 0).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCampaign(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors border ${
                      selectedCampaigns.includes(c.id)
                        ? 'bg-violet-600/20 border-violet-500/30 text-white'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/10'
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-slate-600 ml-2">{c.targetCity} · {c._count?.prospects} prospects</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
