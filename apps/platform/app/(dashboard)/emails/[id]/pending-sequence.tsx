'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  subject?: string;
  bodyHtml?: string;
}

export function PendingSequence({
  prospectId,
  prospectName,
  campaignId,
  campaignName,
  prospectCreatedAt,
  nextFollowUpAt,
  steps,
  prospectorUrl,
}: {
  prospectId: string;
  prospectName: string;
  campaignId: string;
  campaignName: string;
  prospectCreatedAt: string;
  nextFollowUpAt: string;
  steps: SequenceStep[];
  prospectorUrl: string;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editDelay, setEditDelay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingStep, setDeletingStep] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  async function handleCancelAll() {
    if (!confirm(`Cancel all pending follow-ups for ${prospectName}? This cannot be undone.`)) return;
    setCancelling(true);
    try {
      const res = await fetch(`${prospectorUrl}/prospects/${prospectId}/cancel-followups`, { method: 'PATCH' });
      if (res.ok) {
        setCancelled(true);
        setTimeout(() => router.refresh(), 1000);
      } else {
        const data = await res.json();
        setFeedback({ ok: false, msg: data.error ?? 'Failed to cancel' });
      }
    } catch {
      setFeedback({ ok: false, msg: 'Network error' });
    } finally {
      setCancelling(false);
    }
  }

  async function handleAiRewrite() {
    if (!editingStep) return;
    setAiGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch(`${prospectorUrl}/ai/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt || undefined,
          type: 'rewrite' as const,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { subject: string; bodyText: string; bodyHtml?: string };
        setEditSubject(data.subject);
        setEditBody(data.bodyHtml ?? data.bodyText);
        setAiPrompt('');
        setFeedback({ ok: true, msg: 'AI draft generated — review and save' });
      } else {
        const data = await res.json();
        setFeedback({ ok: false, msg: data.error ?? 'AI generation failed' });
      }
    } catch {
      setFeedback({ ok: false, msg: 'Network error — is the prospector service running?' });
    } finally {
      setAiGenerating(false);
    }
  }

  function openEdit(step: SequenceStep) {
    setEditingStep(step);
    setEditSubject(step.subject ?? '');
    setEditBody(step.bodyHtml ?? '');
    setEditDelay(step.delayHours);
    setFeedback(null);
  }

  async function handleSaveEdit() {
    if (!editingStep) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}/sequence-step`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: editingStep.stepNumber,
          subject: editSubject || undefined,
          bodyHtml: editBody || undefined,
          delayHours: editDelay,
        }),
      });
      if (res.ok) {
        setFeedback({ ok: true, msg: 'Step updated' });
        setTimeout(() => {
          setEditingStep(null);
          setFeedback(null);
          router.refresh();
        }, 1200);
      } else {
        const data = await res.json();
        setFeedback({ ok: false, msg: data.error ?? 'Failed to save' });
      }
    } catch {
      setFeedback({ ok: false, msg: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStep(stepNumber: number) {
    if (!confirm(`Remove step ${stepNumber} from the sequence? This affects all prospects in "${campaignName}".`)) return;
    setDeletingStep(stepNumber);
    try {
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}/sequence-step/${stepNumber}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ ok: true, msg: `Step ${stepNumber} removed` });
        setTimeout(() => {
          setFeedback(null);
          router.refresh();
        }, 1200);
      } else {
        const data = await res.json();
        setFeedback({ ok: false, msg: data.error ?? 'Failed to remove step' });
      }
    } catch {
      setFeedback({ ok: false, msg: 'Network error' });
    } finally {
      setDeletingStep(null);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  if (cancelled) {
    return (
      <div className="bg-emerald-500/5 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-5">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold text-emerald-400">Follow-up sequence cancelled</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 backdrop-blur-sm rounded-xl border border-amber-500/20 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-white">Pending Sequence Messages</h3>
            <span className="text-xs text-amber-400/60 font-mono">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={handleCancelAll}
            disabled={cancelling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {cancelling ? (
              <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            Cancel All Follow-ups
          </button>
        </div>

        <div className="p-4 space-y-1">
          <p className="text-xs text-slate-400 mb-3">
            These emails will send automatically. Editing a step updates it for all prospects in <span className="text-violet-400 font-medium">{campaignName}</span>.
          </p>

          {feedback && !editingStep && (
            <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${feedback.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {feedback.msg}
            </div>
          )}

          {steps.map((step) => {
            const fireAt = new Date(new Date(prospectCreatedAt).getTime() + step.delayHours * 60 * 60 * 1000);
            const isFuture = fireAt > new Date();
            const isDeleting = deletingStep === step.stepNumber;

            return (
              <div
                key={step.stepNumber}
                className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg border border-white/5 transition-colors group"
              >
                {/* Step number */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isFuture ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                }`}>
                  {step.stepNumber}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {step.subject ?? `Follow-up #${step.stepNumber - 1}`}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-slate-500">
                      {step.delayHours}h after first contact
                    </span>
                    <span className="text-[10px] text-slate-600">|</span>
                    <span className={`text-[10px] font-medium ${isFuture ? 'text-amber-400' : 'text-violet-400'}`}>
                      {isFuture ? `Fires ${fmtDate(fireAt.toISOString())}` : 'Sending soon'}
                    </span>
                  </div>
                </div>

                {/* Status label */}
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${
                  isFuture
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse'
                }`}>
                  {isFuture ? 'Scheduled' : 'Sending'}
                </span>

                {/* Action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => openEdit(step)}
                    className="p-1.5 rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/30 transition-colors"
                    title="Edit step"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteStep(step.stepNumber)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors disabled:opacity-50"
                    title="Remove step"
                  >
                    {isDeleting ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingStep(null)} />
          <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">
                Edit Step {editingStep.stepNumber}
              </h3>
              <button onClick={() => setEditingStep(null)} className="text-slate-500 hover:text-white transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="px-3 py-2 bg-amber-500/5 rounded-lg border border-amber-500/20">
                <p className="text-[10px] text-amber-400 font-medium">
                  Changes apply to all prospects in &ldquo;{campaignName}&rdquo;
                </p>
              </div>

              {/* AI Rewrite */}
              <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/15">
                <div className="flex items-center gap-2 mb-2">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-400 flex-shrink-0">
                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-indigo-400">Rewrite with Claude AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. make it shorter, add urgency, mention a case study..."
                    className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAiRewrite(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleAiRewrite}
                    disabled={aiGenerating}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {aiGenerating ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                      </svg>
                    )}
                    {aiGenerating ? 'Generating...' : 'Rewrite'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">Claude will rewrite the subject and body based on your instructions</p>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Follow-up subject..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  Use {'{{businessName}}'} for the prospect&apos;s name
                </p>
              </div>

              {/* Delay */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Delay (hours after first contact)</label>
                <input
                  type="number"
                  value={editDelay}
                  onChange={(e) => setEditDelay(Number(e.target.value))}
                  min={0}
                  className="w-32 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              {/* Body HTML */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Body (HTML)</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={8}
                  placeholder="<p>Hi {{businessName}},</p>..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono resize-y"
                />
              </div>

              {feedback && (
                <div className={`px-3 py-2 rounded-lg text-xs font-medium ${feedback.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {feedback.msg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10">
              <button
                onClick={() => setEditingStep(null)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
