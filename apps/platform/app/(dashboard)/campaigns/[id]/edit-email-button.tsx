'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { STEP2_SUBJECT, STEP2_BODY, STEP3_SUBJECT, STEP3_BODY } from './templates';
import { EMAIL_STYLES, getStyleById } from './email-styles';

interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  subject?: string;
  bodyHtml?: string;
}

interface Props {
  campaignId: string;
  currentSubject: string;
  currentBodyHtml: string;
  sequenceSteps: SequenceStep[] | null;
  prospectorUrl: string;
}

const PREVIEW_VARS = {
  '{{businessName}}': 'Acme Restaurant',
  '{{city}}': 'New York',
  '{{calLink}}': 'https://cal.com/jason',
  '{{replyEmail}}': 'jason@embedo.io',
};

function applyPreviewVars(html: string) {
  return Object.entries(PREVIEW_VARS).reduce((s, [k, v]) => s.replaceAll(k, v), html);
}

/** Extract the inner content from a styled wrapper, or return as-is */
function extractContent(html: string): string {
  // Try to find the innermost content div — rough heuristic
  // If it contains a signature table, strip it and the unsubscribe
  let content = html;
  // Remove signature block
  content = content.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '');
  // Remove unsubscribe
  content = content.replace(/<p[^>]*>[\s\S]*?Unsubscribe[\s\S]*?<\/p>/gi, '');
  // Remove outer wrappers — keep only paragraph/text content
  const innerMatch = content.match(/<p[\s\S]*$/i);
  if (innerMatch) content = innerMatch[0];
  return content.trim();
}

export function EditEmailButton({ campaignId, currentSubject, currentBodyHtml, sequenceSteps, prospectorUrl }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('classic');
  useEffect(() => { setMounted(true); }, []);

  // Step 1 state
  const [step1Subject, setStep1Subject] = useState(currentSubject);
  const [step1Body, setStep1Body] = useState(currentBodyHtml);

  // Determine active follow-up steps from the campaign's sequenceSteps
  const followUps = (sequenceSteps ?? []).filter((s) => s.stepNumber > 1);
  const totalSteps = 1 + followUps.length;

  // Step 2 state (only relevant if sequence >= 2)
  const step2Data = followUps[0];
  const [step2Subject, setStep2Subject] = useState(step2Data?.subject ?? STEP2_SUBJECT);
  const [step2Body, setStep2Body] = useState(step2Data?.bodyHtml ?? STEP2_BODY);

  // Step 3 state (only relevant if sequence >= 3)
  const step3Data = followUps[1];
  const [step3Subject, setStep3Subject] = useState(step3Data?.subject ?? STEP3_SUBJECT);
  const [step3Body, setStep3Body] = useState(step3Data?.bodyHtml ?? STEP3_BODY);

  function applyStyle(styleId: string) {
    setSelectedStyle(styleId);
    const style = getStyleById(styleId);

    // Re-wrap each step's content in the new style
    const bodies = [step1Body, step2Body, step3Body];
    const setters = [setStep1Body, setStep2Body, setStep3Body];

    bodies.forEach((body, i) => {
      const inner = extractContent(body);
      if (inner) {
        setters[i](style.wrap(inner, {}));
      }
    });
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      // Always update step 1 (emailSubject + emailBodyHtml on Campaign)
      const patch: Record<string, unknown> = {
        emailSubject: step1Subject,
        emailBodyHtml: step1Body,
      };

      // If there are follow-up steps, update their body/subject too
      if (followUps.length > 0) {
        const updatedSteps: SequenceStep[] = [
          { stepNumber: 1, delayHours: 0 },
          ...(followUps[0] ? [{ ...followUps[0], subject: step2Subject, bodyHtml: step2Body }] : []),
          ...(followUps[1] ? [{ ...followUps[1], subject: step3Subject, bodyHtml: step3Body }] : []),
        ];
        patch.sequenceSteps = updatedSteps;
      }

      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to update');
        return;
      }

      router.refresh();
      setOpen(false);
    } catch {
      setError('Network error — is the prospector running?');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors';
  const labelCls = 'block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide';

  const tabs = [
    { label: 'Step 1', sub: 'Cold Email', active: true },
    { label: 'Step 2', sub: 'Follow-up', active: totalSteps >= 2 },
    { label: 'Step 3', sub: 'Break-up', active: totalSteps >= 3 },
  ];

  const currentSubjectValue = [step1Subject, step2Subject, step3Subject][activeTab];
  const currentBodyValue = [step1Body, step2Body, step3Body][activeTab];
  const setCurrentSubject = [setStep1Subject, setStep2Subject, setStep3Subject][activeTab];
  const setCurrentBody = [setStep1Body, setStep2Body, setStep3Body][activeTab];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-lg hover:bg-violet-600/30 hover:text-violet-200 transition-colors"
      >
        Edit Emails
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">Edit Campaign Emails</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {totalSteps === 1 && 'Cold email only — set sequence length to add follow-ups'}
                  {totalSteps === 2 && '2-email sequence — cold email + 1 follow-up'}
                  {totalSteps === 3 && '3-email sequence — cold email + 2 follow-ups'}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  onClick={() => tab.active && setActiveTab(i)}
                  disabled={!tab.active}
                  className={`px-4 py-2 rounded-t-lg text-xs font-semibold border-b-2 transition-colors ${
                    !tab.active
                      ? 'text-slate-700 border-transparent cursor-not-allowed'
                      : activeTab === i
                      ? 'text-white border-violet-500 bg-white/5'
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-[10px] font-normal opacity-60">{tab.sub}</span>
                  {!tab.active && <span className="ml-1.5 text-[10px] text-slate-700">off</span>}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 border-t border-white/10">

              {/* Email Style Picker */}
              <div>
                <label className={labelCls}>Email Style</label>
                <div className="flex gap-2">
                  {EMAIL_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => applyStyle(style.id)}
                      className={`flex-1 group relative px-3 py-2.5 rounded-xl border text-left transition-all ${
                        selectedStyle === style.id
                          ? 'bg-violet-600/15 border-violet-500/40 ring-1 ring-violet-500/30'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          selectedStyle === style.id
                            ? 'bg-violet-500/25 text-violet-300'
                            : 'bg-white/5 text-slate-500 group-hover:text-slate-400'
                        }`}>
                          {style.name.charAt(0)}
                        </span>
                        <div>
                          <p className={`text-xs font-semibold ${selectedStyle === style.id ? 'text-violet-300' : 'text-slate-300'}`}>
                            {style.name}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{style.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Subject
                  <span className="ml-2 text-slate-600 normal-case font-normal tracking-normal">
                    — {'{{businessName}}'} {'{{city}}'}
                  </span>
                </label>
                <input
                  value={currentSubjectValue}
                  onChange={(e) => setCurrentSubject(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Email Body HTML
                  <span className="ml-2 text-slate-600 normal-case font-normal tracking-normal">
                    — {'{{businessName}}'} {'{{city}}'} {'{{calLink}}'} {'{{replyEmail}}'}
                  </span>
                </label>
                <textarea
                  rows={12}
                  value={currentBodyValue}
                  onChange={(e) => setCurrentBody(e.target.value)}
                  className={inputCls + ' font-mono resize-y text-xs leading-relaxed'}
                />
              </div>

              {currentBodyValue && (
                <div>
                  <label className={labelCls}>Preview</label>
                  <div className="bg-white rounded-xl overflow-hidden border border-white/10">
                    <iframe
                      srcDoc={applyPreviewVars(currentBodyValue)}
                      className="w-full border-0"
                      style={{ height: '360px' }}
                      title="Email preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/10 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save All Emails'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2 bg-white/5 text-slate-400 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
