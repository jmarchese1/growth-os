'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  contactedCount: number; // prospects eligible for retroactive requeue
}

const STEP2_BODY = `<div style="font-family: Arial, sans-serif; max-width: 540px; color: #1a1a1a; line-height: 1.65; font-size: 15px;"><p>Hey {{businessName}},</p><p>Wanted to follow up in case my last message got buried. A lot of restaurants in {{city}} are quietly using AI to handle the stuff that slips through the cracks — missed calls, slow follow-ups, re-engaging regulars who went quiet.</p><p>Takes about a week to set up and most places see the difference in the first few days. Happy to walk you through exactly what it'd look like for your spot.</p><p style="margin-top: 20px;"><a href="{{calLink}}" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">Book a 10-min call →</a></p><table style="margin-top: 28px; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0"><tr><td style="padding-right: 12px; vertical-align: middle; width: 56px;"><img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" /></td><td style="vertical-align: middle;"><p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p><p style="margin: 2px 0 0; font-size: 13px; color: #666;">Data Scientist · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p></td></tr></table><p style="margin-top: 32px; font-size: 11px; color: #bbb;"><a href="mailto:{{replyEmail}}?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a></p></div>`;

const STEP3_BODY = `<div style="font-family: Arial, sans-serif; max-width: 540px; color: #1a1a1a; line-height: 1.65; font-size: 15px;"><p>Hey {{businessName}},</p><p>This is my last note — I don't want to keep hitting your inbox if the timing isn't right.</p><p>If things change and you ever want to see what an AI layer could do for your restaurant, just reply to this and I'll pick it up from there. No pitch, just a conversation.</p><p>Either way, good luck with the season. Hope it's a busy one.</p><table style="margin-top: 28px; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0"><tr><td style="padding-right: 12px; vertical-align: middle; width: 56px;"><img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" /></td><td style="vertical-align: middle;"><p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p><p style="margin: 2px 0 0; font-size: 13px; color: #666;">Data Scientist · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p></td></tr></table><p style="margin-top: 32px; font-size: 11px; color: #bbb;"><a href="mailto:{{replyEmail}}?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a></p></div>`;

const DEFAULT_STEPS: Step[] = [
  { stepNumber: 2, delayHours: 72, subject: 'Re: quick question for {{businessName}}', bodyHtml: STEP2_BODY },
  { stepNumber: 3, delayHours: 192, subject: 'closing the loop — {{businessName}}', bodyHtml: STEP3_BODY },
];

export function ManageSequenceButton({ campaignId, currentSteps, prospectorUrl, contactedCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requeueing, setRequeueing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [applyToExisting, setApplyToExisting] = useState(true);

  // Only follow-up steps (step 1 is the cold email, managed via Edit Email)
  const existingFollowUps = (currentSteps ?? []).filter((s) => s.stepNumber > 1);
  const [steps, setSteps] = useState<Step[]>(
    existingFollowUps.length > 0 ? existingFollowUps : DEFAULT_STEPS
  );

  function addStep() {
    const nextNum = steps.length > 0 ? Math.max(...steps.map((s) => s.stepNumber)) + 1 : 2;
    const prevDelay = steps.length > 0 ? steps[steps.length - 1].delayHours : 0;
    const defaultBody = nextNum === 3 ? STEP3_BODY : STEP2_BODY;
    const defaultSubject = nextNum === 3 ? 'closing the loop — {{businessName}}' : 'Re: quick question for {{businessName}}';
    setSteps([...steps, {
      stepNumber: nextNum,
      delayHours: prevDelay + 72,
      subject: defaultSubject,
      bodyHtml: defaultBody,
    }]);
  }

  function removeStep(idx: number) {
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 2 }));
    setSteps(updated);
  }

  function updateStep(idx: number, field: keyof Step, value: string | number) {
    setSteps(steps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Save sequence steps (include step 1 placeholder so array is complete)
      const allSteps = [{ stepNumber: 1, delayHours: 0 }, ...steps];
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequenceSteps: allSteps }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to save steps');
        return;
      }

      // Retroactively apply to existing contacted prospects
      if (applyToExisting && contactedCount > 0 && steps.length > 0) {
        setRequeueing(true);
        const requeueRes = await fetch(`${prospectorUrl}/campaigns/${campaignId}/requeue-followups`, {
          method: 'POST',
        });
        if (requeueRes.ok) {
          const data = (await requeueRes.json()) as { queued: number };
          setSuccess(`Saved. Queued follow-ups for ${data.queued} existing prospect${data.queued !== 1 ? 's' : ''}.`);
        } else {
          setSuccess('Steps saved. (Could not requeue existing prospects — they may already have follow-ups scheduled.)');
        }
        setRequeueing(false);
      } else {
        setSuccess('Sequence steps saved. New prospects will follow this sequence.');
      }

      router.refresh();
    } catch {
      setError('Network error — is the prospector service running?');
    } finally {
      setLoading(false);
      setRequeueing(false);
    }
  }

  const inputCls = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 text-xs font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors"
      >
        Follow-up Sequence
        {steps.length > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 bg-violet-600/30 text-violet-300 rounded text-[10px]">
            {steps.length} step{steps.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-semibold text-white">Follow-up Sequence</h2>
                <p className="text-xs text-slate-500 mt-0.5">Step 1 is the cold email. Add steps 2+ here for automatic follow-ups.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors text-lg leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Step 1 — read-only reference */}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 opacity-50">
                <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-violet-300">1</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">Cold Email — Day 0</p>
                  <p className="text-[10px] text-slate-600">Edit via "Edit Email" button</p>
                </div>
              </div>

              {/* Follow-up steps */}
              {steps.map((step, idx) => (
                <div key={idx} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-indigo-300">{step.stepNumber}</span>
                      </div>
                      <span className="text-sm font-medium text-white">Follow-up {idx + 1}</span>
                    </div>
                    <button
                      onClick={() => removeStep(idx)}
                      className="text-xs text-slate-600 hover:text-red-400 transition-colors px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </div>

                  <div>
                    <label className={labelCls}>Send after (hours from cold email)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={step.delayHours}
                        onChange={(e) => updateStep(idx, 'delayHours', parseInt(e.target.value) || 72)}
                        className="w-28 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <span className="text-xs text-slate-500">
                        = {step.delayHours >= 24 ? `${Math.round(step.delayHours / 24)} days` : `${step.delayHours}h`} after cold email
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Subject (optional — defaults to Re: cold email subject)</label>
                    <input
                      value={step.subject ?? ''}
                      onChange={(e) => updateStep(idx, 'subject', e.target.value)}
                      placeholder="Re: quick question for {{businessName}}"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Body HTML</label>
                    <textarea
                      rows={8}
                      value={step.bodyHtml ?? ''}
                      onChange={(e) => updateStep(idx, 'bodyHtml', e.target.value)}
                      className={inputCls + ' font-mono resize-y text-xs'}
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={addStep}
                className="w-full py-2.5 border border-dashed border-white/10 rounded-xl text-xs text-slate-500 hover:text-violet-400 hover:border-violet-500/40 transition-colors"
              >
                + Add Follow-up Step
              </button>

              {/* Apply to existing */}
              {contactedCount > 0 && steps.length > 0 && (
                <label className="flex items-start gap-3 bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToExisting}
                    onChange={(e) => setApplyToExisting(e.target.checked)}
                    className="mt-0.5 accent-violet-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-violet-300">Apply to existing contacted prospects</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {contactedCount} prospect{contactedCount !== 1 ? 's' : ''} already received the cold email with no follow-up scheduled.
                      Queue follow-up steps for them now, timed from when they were first emailed.
                    </p>
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
                {requeueing ? 'Applying to prospects…' : loading ? 'Saving…' : 'Save Sequence'}
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
