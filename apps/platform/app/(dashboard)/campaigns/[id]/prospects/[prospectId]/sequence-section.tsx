'use client';

import { useState, useEffect } from 'react';

interface Step {
  stepNumber: number;
  delayHours: number;
  subject?: string;
  bodyHtml?: string;
}

interface Props {
  steps: Step[];
  sentStepNumbers: number[];
  nextFollowUpAt: string | null;
  prospectName: string;
  prospectCity: string;
  prospectorUrl: string;
  campaignId: string;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Sending soon…';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fillTemplate(html: string, name: string, city: string): string {
  return html
    .replace(/\{\{businessName\}\}/g, name)
    .replace(/\{\{city\}\}/g, city)
    .replace(/\{\{calLink\}\}/g, 'https://cal.com/jason')
    .replace(/\{\{replyEmail\}\}/g, 'jason@embedo.io');
}

function Countdown({ scheduledAt }: { scheduledAt: string }) {
  const [ms, setMs] = useState(() => new Date(scheduledAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setMs(new Date(scheduledAt).getTime() - Date.now()), 10_000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  const past = ms <= 0;
  return (
    <span className={`text-xs font-mono font-semibold ${past ? 'text-violet-400 animate-pulse' : 'text-amber-400'}`}>
      {past ? 'Sending soon…' : `in ${formatCountdown(ms)}`}
    </span>
  );
}

function EditStepModal({
  step, onSave, onClose, prospectorUrl, campaignId, prospectName, prospectCity,
}: {
  step: Step;
  onSave: (updated: Step) => void;
  onClose: () => void;
  prospectorUrl: string;
  campaignId: string;
  prospectName: string;
  prospectCity: string;
}) {
  const [subject, setSubject] = useState(step.subject ?? '');
  const [bodyHtml, setBodyHtml] = useState(step.bodyHtml ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequenceSteps: [{ stepNumber: step.stepNumber, delayHours: step.delayHours, subject, bodyHtml }],
        }),
      });
      if (!res.ok) {
        setError('Failed to save — try again');
        return;
      }
      onSave({ ...step, subject, bodyHtml });
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">
              {step.stepNumber === 2 ? 'Follow-up 1' : `Follow-up ${step.stepNumber - 1}`} — Step {step.stepNumber}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sends {step.delayHours >= 24 ? `${Math.round(step.delayHours / 24)} days` : `${step.delayHours}h`} after cold email · applies to all future prospects in this campaign
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pt-4">
          {(['edit', 'preview'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === t ? 'bg-violet-600/30 text-white border border-violet-500/40' : 'text-slate-500 hover:text-slate-300'}`}>
              {t === 'edit' ? 'Edit' : 'Preview'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'edit' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Subject <span className="text-slate-600 normal-case font-normal tracking-normal">— &#123;&#123;businessName&#125;&#125;</span>
                </label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Body HTML <span className="text-slate-600 normal-case font-normal tracking-normal">— &#123;&#123;businessName&#125;&#125;, &#123;&#123;city&#125;&#125;, &#123;&#123;calLink&#125;&#125;</span>
                </label>
                <textarea rows={12} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)}
                  className={inputCls + ' font-mono resize-y text-xs'} />
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden border border-white/10">
              <iframe
                srcDoc={fillTemplate(bodyHtml, prospectName, prospectCity)}
                className="w-full border-0"
                style={{ height: '340px' }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          )}
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/10">
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2 bg-white/5 text-slate-400 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function SequenceSection({ steps, sentStepNumbers, nextFollowUpAt, prospectName, prospectCity, prospectorUrl, campaignId }: Props) {
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [localSteps, setLocalSteps] = useState<Step[]>(steps);
  const [previewStep, setPreviewStep] = useState<number | null>(null);

  const sentSet = new Set(sentStepNumbers);
  const allSteps = [
    { stepNumber: 1, delayHours: 0, subject: undefined, bodyHtml: undefined },
    ...localSteps.filter((s) => s.stepNumber > 1),
  ];

  // The "next" step is simply the first unsent one
  const firstUnsentStep = allSteps.find((s) => !sentSet.has(s.stepNumber));

  if (allSteps.length <= 1 && sentSet.has(1)) return null;

  return (
    <>
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5 glow-card">
        <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.16em] mb-5">
          Sequence
          <span className="ml-2 normal-case font-normal text-xs tracking-normal text-slate-700">
            {allSteps.length} step{allSteps.length !== 1 ? 's' : ''}
          </span>
        </h2>

        <div className="space-y-3">
          {allSteps.map((step, i) => {
            const sent = sentSet.has(step.stepNumber);
            const isNext = step.stepNumber === firstUnsentStep?.stepNumber;
            const isFuture = !sent && !isNext;
            const isPreviewing = previewStep === step.stepNumber;
            const stepLabel = step.stepNumber === 1 ? 'Cold Email' : `Follow-up ${step.stepNumber - 1}`;
            const delayLabel = step.stepNumber === 1 ? 'Day 0'
              : step.delayHours >= 24 ? `Day ${Math.round(step.delayHours / 24)}`
              : `+${step.delayHours}h`;

            return (
              <div key={step.stepNumber}>
                {/* Connector line */}
                {i > 0 && (
                  <div className={`ml-[11px] w-px h-3 mb-0 ${sent ? 'bg-violet-500/30' : 'bg-white/5'}`} />
                )}

                <div className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  isNext ? 'bg-amber-500/5 border border-amber-500/15' :
                  sent ? 'bg-violet-500/5 border border-violet-500/10' :
                  'border border-transparent'
                }`}>
                  {/* Step circle */}
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold border mt-0.5 ${
                    sent ? 'bg-violet-600/40 border-violet-500/50 text-violet-300' :
                    isNext ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse' :
                    'bg-white/5 border-white/10 text-slate-600'
                  }`}>
                    {sent ? '✓' : step.stepNumber}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className={`text-xs font-semibold ${sent ? 'text-violet-300' : isNext ? 'text-amber-400' : 'text-slate-500'}`}>
                          {stepLabel}
                        </span>
                        <span className="ml-2 text-[10px] text-slate-700">{delayLabel}</span>
                        {step.subject && (
                          <p className="text-[10px] text-slate-600 mt-0.5 truncate">{step.subject.replace(/\{\{[^}]+\}\}/g, '…')}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {sent && <span className="text-[9px] text-slate-600 uppercase tracking-wider">Sent</span>}
                        {isNext && nextFollowUpAt && <Countdown scheduledAt={nextFollowUpAt} />}
                        {isFuture && (
                          <span className="text-[9px] text-slate-700">
                            {step.delayHours >= 24 ? `in ~${Math.round(step.delayHours / 24)} days` : `+${step.delayHours}h`}
                          </span>
                        )}
                        {/* Preview / Edit buttons for follow-up steps */}
                        {step.stepNumber > 1 && step.bodyHtml && (
                          <button
                            onClick={() => setPreviewStep(isPreviewing ? null : step.stepNumber)}
                            className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            {isPreviewing ? 'Hide' : 'Preview'}
                          </button>
                        )}
                        {step.stepNumber > 1 && (
                          <button
                            onClick={() => setEditingStep(step)}
                            className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline email preview */}
                    {isPreviewing && step.bodyHtml && (
                      <div className="mt-2 bg-white rounded-lg overflow-hidden border border-white/10">
                        <iframe
                          srcDoc={fillTemplate(step.bodyHtml, prospectName, prospectCity)}
                          className="w-full border-0"
                          style={{ height: '280px' }}
                          title={`Step ${step.stepNumber} preview`}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingStep && (
        <EditStepModal
          step={editingStep}
          prospectorUrl={prospectorUrl}
          campaignId={campaignId}
          prospectName={prospectName}
          prospectCity={prospectCity}
          onSave={(updated) => {
            setLocalSteps((prev) => prev.map((s) => s.stepNumber === updated.stepNumber ? updated : s));
            setEditingStep(null);
          }}
          onClose={() => setEditingStep(null)}
        />
      )}
    </>
  );
}
