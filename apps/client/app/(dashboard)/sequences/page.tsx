'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_CREATED: 'When a new lead is created',
  SURVEY_COMPLETE: 'After completing a survey',
  APPOINTMENT_BOOKED: 'After booking an appointment',
  APPOINTMENT_REMINDER: 'Before an upcoming appointment',
  CALL_COMPLETED: 'After a phone call',
  PROPOSAL_SENT: 'After a proposal is sent',
  CUSTOM: 'Manual enrollment',
};

interface Sequence {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS';
  trigger: string;
  triggerLabel: string;
  stepCount: number;
  active: boolean;
  createdAt: string;
}

export default function SequencesPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'EMAIL' | 'SMS'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'EMAIL' as 'EMAIL' | 'SMS', trigger: 'LEAD_CREATED' });
  const [saving, setSaving] = useState(false);

  const fetchSequences = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/businesses/${business.id}/sequences`);
      const json = await res.json();
      if (json.success) setSequences(json.sequences);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [business?.id]);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  const toggleSequence = async (seq: Sequence) => {
    try {
      await fetch(`${API_URL}/sequences/${seq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !seq.active, type: seq.type }),
      });
      setSequences((prev) => prev.map((s) => s.id === seq.id ? { ...s, active: !s.active } : s));
    } catch { /* ignore */ }
  };

  const deleteSequence = async (seq: Sequence) => {
    try {
      await fetch(`${API_URL}/sequences/${seq.id}?type=${seq.type}`, { method: 'DELETE' });
      setSequences((prev) => prev.filter((s) => s.id !== seq.id));
    } catch { /* ignore */ }
  };

  const createSequence = async () => {
    if (!business?.id || !form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/businesses/${business.id}/sequences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        await fetchSequences();
        setForm({ name: '', type: 'EMAIL', trigger: 'LEAD_CREATED' });
        setShowCreate(false);
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const filtered = filter === 'ALL' ? sequences : sequences.filter((s) => s.type === filter);
  const activeCount = sequences.filter((s) => s.active).length;

  if (bizLoading) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sequences</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated email and SMS sequences for customer engagement
            {sequences.length > 0 && <span className="ml-2 text-violet-600 dark:text-violet-400 font-medium">{activeCount} active</span>}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          {showCreate ? 'Cancel' : 'New Sequence'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sequence Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Welcome series..."
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'EMAIL' | 'SMS' }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white"
              >
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Trigger</label>
              <select
                value={form.trigger}
                onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white"
              >
                {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={createSequence}
              disabled={!form.name.trim() || saving}
              className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Sequence'}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/[0.06] rounded-lg p-0.5 w-fit mb-6">
        {(['ALL', 'EMAIL', 'SMS'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === t
                ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            {t === 'ALL' ? `All (${sequences.length})` : `${t} (${sequences.filter((s) => s.type === t).length})`}
          </button>
        ))}
      </div>

      {/* Sequences list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-violet-600 dark:text-violet-400">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">No sequences yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create automated email or SMS sequences to engage customers</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trigger</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Steps</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((seq) => (
                <tr key={seq.id} className="border-b border-slate-50 dark:border-white/[0.04] last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{seq.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(seq.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      seq.type === 'EMAIL'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                    }`}>
                      {seq.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">{seq.triggerLabel}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300 text-center">{seq.stepCount}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => toggleSequence(seq)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        seq.active ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        seq.active ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => deleteSequence(seq)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                      title="Delete sequence"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
