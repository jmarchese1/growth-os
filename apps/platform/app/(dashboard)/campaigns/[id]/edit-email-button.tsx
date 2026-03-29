'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { STEP2_SUBJECT, STEP2_BODY, STEP3_SUBJECT, STEP3_BODY } from './templates';

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
  apolloConfig?: { appendSignature?: boolean; aiPersonalization?: boolean } | null;
}

const TEMPLATE_VARS = [
  { key: '{{firstName}}', label: 'First Name', desc: 'Contact first name (falls back to "there")' },
  { key: '{{lastName}}', label: 'Last Name', desc: 'Contact last name' },
  { key: '{{company}}', label: 'Company', desc: 'Full business name in Title Case' },
  { key: '{{shortName}}', label: 'Short Name', desc: 'Casual name — "Mario\'s" instead of "Mario\'s Pizzeria"' },
  { key: '{{city}}', label: 'City', desc: 'Target city' },
  { key: '{{calLink}}', label: 'Cal Link', desc: 'Booking link (best for follow-ups)' },
];

const PREVIEW_VARS: Record<string, string> = {
  '{{firstName}}': 'Michael',
  '{{lastName}}': 'Chen',
  '{{company}}': 'Golden Dragon Kitchen',
  '{{shortName}}': 'Golden Dragon',
  '{{businessName}}': 'Golden Dragon Kitchen',
  '{{city}}': 'New York',
  '{{calLink}}': 'https://cal.com/jason-marchese-mkfkwl/30min',
  '{{replyEmail}}': 'jason@embedo.io',
};

function applyPreviewVars(text: string) {
  return Object.entries(PREVIEW_VARS).reduce((s, [k, v]) => s.replaceAll(k, v), text);
}

const SIGNATURE_HTML = `<table style="margin-top: 28px; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0"><tr><td style="padding-right: 12px; vertical-align: middle; width: 56px;"><img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" /></td><td style="vertical-align: middle;"><p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p><p style="margin: 2px 0 0; font-size: 13px; color: #666;">Founder · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p></td></tr></table>`;

const UNSUB_HTML = `<p style="margin-top: 32px; font-size: 11px; color: #bbb;">Not interested? <a href="mailto:jason@embedo.io?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a></p>`;

/** Convert plain text to simple HTML for preview */
function textToHtml(text: string, showSignature = true): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin: 0 0 16px; color: #222;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');

  return `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 580px; color: #222; line-height: 1.7; font-size: 14px; padding: 20px;">
  ${paragraphs}
  ${showSignature ? SIGNATURE_HTML : ''}
  ${UNSUB_HTML}
</div>`;
}

/** Strip HTML to extract plain text (for migrating old HTML templates) */
function htmlToPlainText(html: string): string {
  // If it doesn't contain HTML tags, it's already plain text
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  // Strip tags, decode entities, clean up whitespace
  return html
    .replace(/<table[\s\S]*?<\/table>/gi, '') // remove signature
    .replace(/<p[^>]*>[\s\S]*?Unsubscribe[\s\S]*?<\/p>/gi, '') // remove unsub
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function insertVar(textareaId: string, varKey: string, currentValue: string, setter: (v: string) => void) {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = currentValue.slice(0, start) + varKey + currentValue.slice(end);
    setter(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  } else {
    setter(currentValue + varKey);
  }
}

export function EditEmailButton({ campaignId, currentSubject, currentBodyHtml, sequenceSteps, prospectorUrl, apolloConfig }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Step 1 state — convert HTML to plain text if needed
  const [step1Subject, setStep1Subject] = useState(currentSubject);
  const [step1Body, setStep1Body] = useState(htmlToPlainText(currentBodyHtml));
  const [showSignature, setShowSignature] = useState(apolloConfig?.appendSignature !== false);
  const [aiPersonalization, setAiPersonalization] = useState(apolloConfig?.aiPersonalization !== false);

  // Determine active follow-up steps from the campaign's sequenceSteps
  const followUps = (sequenceSteps ?? []).filter((s) => s.stepNumber > 1);
  const totalSteps = 1 + followUps.length;

  // Step 2 state
  const step2Data = followUps[0];
  const [step2Subject, setStep2Subject] = useState(step2Data?.subject ?? STEP2_SUBJECT);
  const [step2Body, setStep2Body] = useState(htmlToPlainText(step2Data?.bodyHtml ?? STEP2_BODY));

  // Step 3 state
  const step3Data = followUps[1];
  const [step3Subject, setStep3Subject] = useState(step3Data?.subject ?? STEP3_SUBJECT);
  const [step3Body, setStep3Body] = useState(htmlToPlainText(step3Data?.bodyHtml ?? STEP3_BODY));

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const patch: Record<string, unknown> = {
        emailSubject: step1Subject,
        emailBodyHtml: step1Body, // stored as plain text now, rendered at send time
        apolloConfig: { appendSignature: showSignature, aiPersonalization }, // piggyback on existing JSON field for email settings
      };

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
  const textareaId = `edit-email-body-${activeTab}`;

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
                  Plain text with variables — signature and unsubscribe added automatically
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

              <div>
                <label className={labelCls}>Subject</label>
                <input
                  value={currentSubjectValue}
                  onChange={(e) => setCurrentSubject(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Email Body</label>
                {/* Variable insert buttons */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TEMPLATE_VARS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      title={v.desc}
                      onClick={() => insertVar(textareaId, v.key, currentBodyValue, setCurrentBody)}
                      className="px-2 py-1 text-[10px] font-semibold rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <textarea
                  id={textareaId}
                  rows={12}
                  value={currentBodyValue}
                  onChange={(e) => setCurrentBody(e.target.value)}
                  className={inputCls + ' resize-y leading-relaxed'}
                />
                <div className="flex items-center justify-between mt-2 gap-4">
                  <p className="text-[10px] text-slate-600">
                    Plain text — unsubscribe link added automatically at send time.
                  </p>
                  <div className="flex items-center gap-5 flex-shrink-0">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <span className={`text-xs font-medium ${aiPersonalization ? 'text-emerald-400' : 'text-red-400'}`}>AI rewrite</span>
                      <button
                        type="button"
                        onClick={() => setAiPersonalization(!aiPersonalization)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${aiPersonalization ? 'bg-emerald-500' : 'bg-red-500/60'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${aiPersonalization ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <span className={`text-xs font-medium ${showSignature ? 'text-emerald-400' : 'text-red-400'}`}>Sign-off</span>
                      <button
                        type="button"
                        onClick={() => setShowSignature(!showSignature)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${showSignature ? 'bg-emerald-500' : 'bg-red-500/60'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showSignature ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </label>
                  </div>
                </div>
              </div>

              {currentBodyValue && (
                <div>
                  <label className={labelCls}>Preview</label>
                  <div className="bg-white rounded-xl overflow-hidden border border-white/10">
                    <iframe
                      srcDoc={textToHtml(applyPreviewVars(currentBodyValue), showSignature)}
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
