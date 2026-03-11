'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { STEP2_SUBJECT, STEP2_BODY, STEP3_SUBJECT, STEP3_BODY } from './templates';

interface Step {
  stepNumber: number;
  delayHours: number;
  subject?: string;
  bodyHtml?: string;
}

interface Props {
  campaignId: string;
  currentSteps: Step[] | null;
  prospectorUrl: string;
  contactedCount: number;
}

const DEFAULT_FOLLOW_UPS: Step[] = [
  { stepNumber: 2, delayHours: 72,  subject: STEP2_SUBJECT, bodyHtml: STEP2_BODY },
  { stepNumber: 3, delayHours: 192, subject: STEP3_SUBJECT, bodyHtml: STEP3_BODY },
];

export function ManageSequenceButton({ campaignId, currentSteps, prospectorUrl, contactedCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requeueing, setRequeueing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [applyToExisting, setApplyToExisting] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const existingFollowUps = (currentSteps ?? []).filter((s) => s.stepNumber > 1);
  const initialLength = existingFollowUps.length > 0 ? existingFollowUps.length + 1 : 1;

  const [sequenceLength, setSequenceLength] = useState<1 | 2 | 3>(
    Math.min(3, Math.max(1, initialLength)) as 1 | 2 | 3
  );

  // Preserve existing delay/subject/body if already set, otherwise use defaults
  const [followUps, setFollowUps] = useState<Step[]>([
    existingFollowUps[0] ?? DEFAULT_FOLLOW_UPS[0],
    existingFollowUps[1] ?? DEFAULT_FOLLOW_UPS[1],
  ]);

  function updateDelay(idx: number, hours: number) {
    setFollowUps((prev) => prev.map((s, i) => i === idx ? { ...s, delayHours: hours } : s));
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const activeFollowUps = followUps.slice(0, sequenceLength - 1);
      const allSteps: Step[] = [{ stepNumber: 1, delayHours: 0 }, ...activeFollowUps];

      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequenceSteps: allSteps }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to save');
        return;
      }

      if (applyToExisting && contactedCount > 0 && sequenceLength > 1) {
        setRequeueing(true);
        const reqRes = await fetch(`${prospectorUrl}/campaigns/${campaignId}/requeue-followups`, { method: 'POST' });
        if (reqRes.ok) {
          const data = (await reqRes.json()) as { queued: number };
          setSuccess(`Saved. Queued follow-ups for ${data.queued} prospect${data.queued !== 1 ? 's' : ''}.`);
        } else {
          setSuccess('Saved. (Could not requeue existing prospects.)');
        }
        setRequeueing(false);
      } else {
        setSuccess('Sequence saved.');
      }

      router.refresh();
    } catch {
      setError('Network error — is the prospector running?');
    } finally {
      setLoading(false);
      setRequeueing(false);
    }
  }

  const activeFollowUps = followUps.slice(0, sequenceLength - 1);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 text-xs font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors"
      >
        Sequence
        <span className="ml-1.5 px-1.5 py-0.5 bg-violet-600/30 text-violet-300 rounded text-[10px]">
          {sequenceLength} email{sequenceLength !== 1 ? 's' : ''}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-semibold text-white">Follow-up Sequence</h2>
                <p className="text-xs text-slate-500 mt-0.5">Set length and timing. Edit email copy via "Edit Emails".</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>

            <div className="p-6 space-y-6">

              {/* Length picker */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Sequence Length</p>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setSequenceLength(n)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                        sequenceLength === n
                          ? 'bg-violet-600/30 border-violet-500/50 text-violet-200'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {n}
                      <span className="block text-[10px] font-normal mt-0.5 opacity-60">
                        {n === 1 ? 'cold email only' : n === 2 ? '+ 1 follow-up' : '+ 2 follow-ups'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timing per step */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Timing</p>

                <div className="flex items-center justify-between py-2.5 px-3 bg-white/[0.03] rounded-lg border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-violet-300">1</span>
                    </div>
                    <p className="text-xs font-medium text-slate-300">Cold Email</p>
                  </div>
                  <span className="text-xs text-slate-600">Day 0 — immediate</span>
                </div>

                {activeFollowUps.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 px-3 bg-white/[0.03] rounded-lg border border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-indigo-300">{step.stepNumber}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-300">{idx === 0 ? 'Follow-up' : 'Break-up'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        value={step.delayHours}
                        onChange={(e) => updateDelay(idx, parseInt(e.target.value) || 72)}
                        className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <span className="text-[10px] text-slate-500">hrs</span>
                      <span className="text-[10px] text-slate-600 ml-1">
                        (Day {Math.round(step.delayHours / 24)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Apply to existing */}
              {contactedCount > 0 && sequenceLength > 1 && (
                <label className="flex items-start gap-3 bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToExisting}
                    onChange={(e) => setApplyToExisting(e.target.checked)}
                    className="mt-0.5 accent-violet-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-violet-300">Apply to {contactedCount} existing prospects</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Queue follow-ups for prospects who already received the cold email.</p>
                  </div>
                </label>
              )}

              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              {success && <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{success}</p>}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={loading || requeueing}
                className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {requeueing ? 'Applying…' : loading ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2 bg-white/5 text-slate-400 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
