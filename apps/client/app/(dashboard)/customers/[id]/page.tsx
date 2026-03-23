'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { EmailStylePicker } from '@/components/ui/email-style-picker';
import { getStyleById, buildAttachmentsHtml } from '@/lib/email-styles';
import type { EmailStyleOptions, EmailAttachment } from '@/lib/email-styles';
import { useBusiness } from '../../../../components/auth/business-provider';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';
const CLIENT_URL = typeof window !== 'undefined' ? window.location.origin : 'https://app.embedo.io';

type LeadSource = 'VOICE' | 'CHATBOT' | 'SURVEY' | 'SOCIAL' | 'WEBSITE' | 'MANUAL' | 'CALENDLY' | 'OUTBOUND' | 'QR_CODE';
type ContactStatus = 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'CHURNED';
type ActivityType = 'CALL' | 'CHAT' | 'EMAIL' | 'SMS' | 'APPOINTMENT' | 'SURVEY_RESPONSE' | 'NOTE' | 'LEAD_CREATED' | 'STATUS_CHANGE';
type QrPurpose = 'SURVEY' | 'DISCOUNT' | 'SPIN_WHEEL' | 'SIGNUP' | 'MENU' | 'REVIEW' | 'CUSTOM';

interface Activity { id: string; type: ActivityType; title: string; description: string | null; createdAt: string; }
interface SurveyResponse { id: string; score: number | null; createdAt: string; survey: { id: string; title: string } | null; }
interface QrScan { id: string; outcome: string | null; createdAt: string; qrCode: { id: string; label: string; purpose: QrPurpose } | null; }
interface Appointment { id: string; title: string; startTime: string; endTime: string; status: string; }
interface ChatSession { id: string; channel: string; leadCaptured: boolean; createdAt: string; }
interface CallLog { id: string; direction: string; duration: number | null; intent: string; sentiment: string | null; summary: string | null; createdAt: string; }
interface SurveyOption { id: string; title: string; slug: string; }

interface EmailStep { stepNumber: number; delayHours: number; subject: string; body: string; }
interface Sequence {
  id: string; name: string; type: 'EMAIL'; trigger: string; triggerLabel: string;
  stepCount: number; active: boolean; createdAt: string;
  steps?: EmailStep[];
}

interface ContactDetail {
  id: string; businessId: string; firstName: string | null; lastName: string | null;
  email: string | null; phone: string | null; source: LeadSource; status: ContactStatus;
  leadScore: number | null; tags: string[]; notes: string | null; createdAt: string;
  activities: Activity[]; surveyResponses: SurveyResponse[]; qrScans: QrScan[];
  appointments: Appointment[]; chatSessions: ChatSession[]; callLogs: CallLog[];
}

const STATUS_CONFIG: Record<ContactStatus, { label: string; color: string }> = {
  CUSTOMER: { label: 'Customer', color: 'bg-emerald-100 text-emerald-700' },
  PROSPECT: { label: 'Prospect', color: 'bg-violet-100 text-violet-700' },
  LEAD: { label: 'Lead', color: 'bg-amber-100 text-amber-700' },
  CHURNED: { label: 'Churned', color: 'bg-slate-100 text-slate-500' },
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  VOICE: 'Voice Call', CHATBOT: 'Chatbot', SURVEY: 'Survey', SOCIAL: 'Social',
  WEBSITE: 'Website', MANUAL: 'Manual', CALENDLY: 'Cal.com', OUTBOUND: 'Outreach', QR_CODE: 'QR Code',
};

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  CALL: '📞', CHAT: '💬', EMAIL: '✉️', SMS: '📱', APPOINTMENT: '📅',
  SURVEY_RESPONSE: '📋', NOTE: '📝', LEAD_CREATED: '✨', STATUS_CHANGE: '🔄',
};

const QR_PURPOSE_LABELS: Record<QrPurpose, string> = {
  SURVEY: 'Survey', DISCOUNT: 'Discount', SPIN_WHEEL: 'Spin to Win',
  SIGNUP: 'Sign-up', MENU: 'Menu', REVIEW: 'Review', CUSTOM: 'Custom',
};

const TRIGGERS = [
  { value: 'CUSTOM', label: 'Manual enrollment' },
  { value: 'LEAD_CREATED', label: 'New lead created' },
  { value: 'SURVEY_COMPLETE', label: 'Survey completed' },
  { value: 'APPOINTMENT_BOOKED', label: 'Appointment booked' },
  { value: 'CALL_COMPLETED', label: 'Call completed' },
];

function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function formatDateTime(iso: string) { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function fullName(c: Pick<ContactDetail, 'firstName' | 'lastName' | 'email'>) { return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unknown'; }
function initials(c: Pick<ContactDetail, 'firstName' | 'lastName' | 'email'>) { if (c.firstName) return (c.firstName[0] ?? '') + (c.lastName?.[0] ?? ''); return (c.email?.[0] ?? '?').toUpperCase(); }
function delayLabel(h: number) { if (h === 0) return 'Immediately'; if (h < 24) return `${h}h later`; const d = Math.round(h / 24); return `${d} day${d > 1 ? 's' : ''} later`; }

const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300';

/* ─── Modal Backdrop ─────────────────────────────────────────────────────── */

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ─── Compose Email Modal ────────────────────────────────────────────────── */

function ComposeEmailModal({ contact, onDone, onClose }: { contact: ContactDetail; onDone: () => void; onClose: () => void }) {
  const { business } = useBusiness();
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [purpose, setPurpose] = useState('follow-up to keep them coming back');
  const [selectedStyle, setSelectedStyle] = useState('classic');
  const [styleOptions, setStyleOptions] = useState<EmailStyleOptions>({ color: '#7c3aed' });
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);

  async function handleAiGenerate() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/sequences/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: contact.businessId, purpose }),
      });
      const data = (await res.json()) as { success: boolean; subject?: string; body?: string; error?: string };
      if (data.success && data.subject && data.body) {
        setSubject(data.subject);
        setEmailBody(data.body);
      } else {
        setError(data.error ?? 'AI generation failed');
      }
    } catch { setError('AI generation failed'); } finally { setGenerating(false); }
  }

  function handlePreview() {
    const style = getStyleById(selectedStyle);
    const html = style.wrap(emailBody + buildAttachmentsHtml(attachments, styleOptions), styleOptions);
    setPreviewHtml(html);
    setShowPreview(true);
  }

  async function handleSend() {
    if (!subject.trim() || !emailBody.trim()) { setError('Subject and body are required'); return; }
    setSending(true);
    setError('');
    try {
      const style = getStyleById(selectedStyle);
      const styledBody = style.wrap(emailBody + buildAttachmentsHtml(attachments, styleOptions), styleOptions);
      const res = await fetch(`${API_URL}/contacts/${contact.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, emailBody: styledBody }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!data.success) { setError(data.error ?? 'Send failed'); return; }
      onDone();
      onClose();
    } catch { setError('Send failed'); } finally { setSending(false); }
  }

  if (showPreview && previewHtml) {
    return (
      <ModalBackdrop onClose={() => setShowPreview(false)}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Email Preview</h3>
          <button onClick={() => setShowPreview(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
        </div>
        <div className="flex-1 overflow-auto">
          <iframe srcDoc={previewHtml} className="w-full h-[500px] border-0" title="Email preview" />
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Back to editor</button>
        </div>
      </ModalBackdrop>
    );
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Send Email</h3>
          <p className="text-xs text-slate-400 mt-0.5">To: {contact.email ?? 'no email'}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
      </div>
      <div className="px-5 py-4 space-y-3 overflow-y-auto">
        {/* AI Generate */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
          <label className="block text-xs font-medium text-violet-700 mb-1.5">AI Draft</label>
          <div className="flex gap-2">
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. win-back offer, new menu item, thank you..."
              className="flex-1 px-3 py-1.5 border border-violet-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
            <button onClick={handleAiGenerate} disabled={generating}
              className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 flex items-center gap-1">
              {generating ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>}
              Generate
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line..." className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Body</label>
          <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={6} placeholder="<p>Hi {{firstName}},</p><p>Your email content here...</p>" className={inputClass} />
          <p className="text-[10px] text-slate-400 mt-1">Use {'{{firstName}}'} and {'{{business}}'} as variables. HTML supported.</p>
        </div>
        {/* Email Style — below body so dropdowns open downward */}
        <EmailStylePicker
          selectedStyle={selectedStyle}
          onStyleChange={setSelectedStyle}
          options={styleOptions}
          onOptionsChange={setStyleOptions}
          businessId={contact.businessId}
          businessName={business?.name}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex gap-2 justify-between">
        <button onClick={handlePreview} disabled={!emailBody.trim()} className="px-3 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors">Preview</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
          <button onClick={handleSend} disabled={sending || !contact.email || !subject.trim() || !emailBody.trim()}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2">
            {sending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

/* ─── Sequence Builder Modal (Email only) ──────────────────────────────── */

function SequenceBuilderModal({ businessId, existingSequence, onDone, onClose }: {
  businessId: string;
  existingSequence?: Sequence | null;
  onDone: () => void;
  onClose: () => void;
}) {
  const isEdit = !!existingSequence;
  const [name, setName] = useState(existingSequence?.name ?? '');
  const [trigger, setTrigger] = useState(existingSequence?.trigger ?? 'CUSTOM');
  const [emailSteps, setEmailSteps] = useState<EmailStep[]>(
    isEdit && Array.isArray(existingSequence?.steps)
      ? existingSequence.steps as EmailStep[]
      : [{ stepNumber: 1, delayHours: 0, subject: '', body: '' }],
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewStep, setPreviewStep] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);

  function addStep() {
    const lastDelay = emailSteps.length > 0 ? emailSteps[emailSteps.length - 1]!.delayHours : 0;
    setEmailSteps([...emailSteps, { stepNumber: emailSteps.length + 1, delayHours: lastDelay + 48, subject: '', body: '' }]);
    setActiveStep(emailSteps.length);
  }

  function removeStep(idx: number) {
    const updated = emailSteps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setEmailSteps(updated);
    setActiveStep(Math.max(0, activeStep - 1));
  }

  function updateStep(idx: number, field: keyof EmailStep, value: string | number) {
    setEmailSteps(emailSteps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  async function handleAiGenerate(idx: number) {
    setGenerating(idx);
    try {
      const res = await fetch(`${API_URL}/sequences/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, purpose: name || 'customer retention', stepNumber: idx + 1 }),
      });
      const data = (await res.json()) as { success: boolean; subject?: string; body?: string };
      if (data.subject && data.body) {
        updateStep(idx, 'subject', data.subject);
        updateStep(idx, 'body', data.body);
      }
    } catch { /* ignore */ } finally { setGenerating(null); }
  }

  async function handlePreview(idx: number) {
    const step = emailSteps[idx];
    if (!step) return;
    try {
      const res = await fetch(`${API_URL}/sequences/preview-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, subject: step.subject, emailBody: step.body, recipientName: 'John' }),
      });
      const data = (await res.json()) as { success: boolean; html?: string };
      if (data.html) { setPreviewHtml(data.html); setPreviewStep(idx); }
    } catch { /* ignore */ }
  }

  async function handleSave() {
    if (!name.trim()) { setError('Sequence name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const url = isEdit
        ? `${API_URL}/sequences/${existingSequence!.id}`
        : `${API_URL}/businesses/${businessId}/sequences`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'EMAIL', trigger, steps: emailSteps }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!data.success) { setError(data.error ?? 'Save failed'); return; }
      onDone();
      onClose();
    } catch { setError('Save failed'); } finally { setSaving(false); }
  }

  // Email preview overlay
  if (previewStep !== null && previewHtml) {
    return (
      <ModalBackdrop onClose={() => setPreviewStep(null)}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Step {previewStep + 1} Preview</h3>
          <button onClick={() => setPreviewStep(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
        </div>
        <div className="flex-1 overflow-auto"><iframe srcDoc={previewHtml} className="w-full h-[500px] border-0" title="Email preview" /></div>
        <div className="px-5 py-3 bg-slate-50 border-t flex justify-end">
          <button onClick={() => setPreviewStep(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Back to editor</button>
        </div>
      </ModalBackdrop>
    );
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{isEdit ? 'Edit' : 'Create'} Email Sequence</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
      </div>
      <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Sequence Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome series, Win-back, Post-visit..." className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Trigger</label>
            <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className={inputClass}>
              {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Step tabs */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-medium text-slate-500">Steps</label>
            <button onClick={addStep}
              className="px-2 py-0.5 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100">+ Add Step</button>
          </div>
          <div className="flex gap-1 mb-3 overflow-x-auto">
            {emailSteps.map((_, idx) => (
              <button key={idx} onClick={() => setActiveStep(idx)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-colors ${activeStep === idx ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                Step {idx + 1}
                <span className="ml-1 text-[10px] opacity-70">{delayLabel(emailSteps[idx]?.delayHours ?? 0)}</span>
              </button>
            ))}
          </div>

          {emailSteps[activeStep] && (
            <div className="border border-slate-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-500">Delay</label>
                  <select value={emailSteps[activeStep]!.delayHours} onChange={(e) => updateStep(activeStep, 'delayHours', Number(e.target.value))}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none">
                    <option value={0}>Immediately</option>
                    <option value={1}>1 hour</option>
                    <option value={4}>4 hours</option>
                    <option value={24}>1 day</option>
                    <option value={48}>2 days</option>
                    <option value={72}>3 days</option>
                    <option value={120}>5 days</option>
                    <option value={168}>1 week</option>
                    <option value={336}>2 weeks</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleAiGenerate(activeStep)} disabled={generating === activeStep}
                    className="px-2 py-1 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 flex items-center gap-1">
                    {generating === activeStep ? <div className="w-2.5 h-2.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> : null}
                    AI Write
                  </button>
                  <button onClick={() => handlePreview(activeStep)} disabled={!emailSteps[activeStep]?.body}
                    className="px-2 py-1 text-[10px] font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40">Preview</button>
                  {emailSteps.length > 1 && (
                    <button onClick={() => removeStep(activeStep)} className="px-2 py-1 text-[10px] font-medium text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">Remove</button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Subject</label>
                <input value={emailSteps[activeStep]!.subject} onChange={(e) => updateStep(activeStep, 'subject', e.target.value)} placeholder="Email subject..." className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Body (HTML)</label>
                <textarea value={emailSteps[activeStep]!.body} onChange={(e) => updateStep(activeStep, 'body', e.target.value)} rows={5} placeholder="<p>Hi {{firstName}},</p>..." className={inputClass} />
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2">
          {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Sequence'}
        </button>
      </div>
    </ModalBackdrop>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit contact modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Status change
  const [statusSaving, setStatusSaving] = useState(false);

  // Tags
  const [tagInput, setTagInput] = useState('');
  const [tagSaving, setTagSaving] = useState(false);

  // Notes
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // Survey modal
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [surveyChannel, setSurveyChannel] = useState<'email' | 'sms'>('email');
  const [surveySending, setSurveySending] = useState(false);
  const [surveyError, setSurveyError] = useState('');
  const [surveySuccess, setSurveySuccess] = useState(false);

  // Outreach modals
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [showSequenceBuilder, setShowSequenceBuilder] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);

  // Sequences
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [sequencesLoading, setSequencesLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/contacts/${id}`)
      .then((r) => r.json())
      .then((data: { success: boolean; contact?: ContactDetail; error?: string }) => {
        if (!data.success || !data.contact) setError(data.error ?? 'Contact not found');
        else {
          setContact(data.contact);
          setEditForm({
            firstName: data.contact.firstName ?? '', lastName: data.contact.lastName ?? '',
            email: data.contact.email ?? '', phone: data.contact.phone ?? '', notes: data.contact.notes ?? '',
          });
        }
      })
      .catch(() => setError('Failed to load contact'))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchSequences = useCallback(async () => {
    if (!contact?.businessId) return;
    setSequencesLoading(true);
    try {
      const res = await fetch(`${API_URL}/businesses/${contact.businessId}/sequences?type=EMAIL`);
      const data = (await res.json()) as { success: boolean; sequences?: Sequence[] };
      if (data.sequences) setSequences(data.sequences);
    } catch { /* ignore */ } finally { setSequencesLoading(false); }
  }, [contact?.businessId]);

  useEffect(() => { if (contact?.businessId) fetchSequences(); }, [contact?.businessId, fetchSequences]);

  function refreshContact() {
    fetch(`${API_URL}/contacts/${id}`)
      .then((r) => r.json())
      .then((data: { success: boolean; contact?: ContactDetail }) => {
        if (data.success && data.contact) setContact(data.contact);
      })
      .catch(() => {});
  }

  function openSurveyModal() {
    if (!contact) return;
    setShowSurvey(true); setSurveyError(''); setSurveySuccess(false);
    if (surveys.length === 0) {
      fetch(`${API_URL}/surveys?businessId=${contact.businessId}`)
        .then((r) => r.json())
        .then((data: { success: boolean; surveys?: SurveyOption[] }) => {
          if (data.success && data.surveys) { setSurveys(data.surveys); if (data.surveys[0]) setSelectedSurveyId(data.surveys[0].id); }
        }).catch(() => {});
    }
  }

  async function handleEditSave() {
    if (!contact) return;
    setEditSaving(true); setEditError('');
    try {
      const res = await fetch(`${API_URL}/contacts/${contact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const data = await res.json() as { success: boolean; contact?: ContactDetail; error?: string };
      if (!data.success) { setEditError(data.error ?? 'Failed to save'); return; }
      setContact((prev) => prev ? { ...prev, ...data.contact } : prev);
      setShowEdit(false);
    } catch { setEditError('Failed to save'); } finally { setEditSaving(false); }
  }

  async function handleSendSurvey() {
    if (!contact || !selectedSurveyId) return;
    const survey = surveys.find((s) => s.id === selectedSurveyId);
    if (!survey) return;
    setSurveySending(true); setSurveyError('');
    const surveyUrl = `${CLIENT_URL}/s/${survey.slug}`;
    try {
      const res = await fetch(`${API_URL}/contacts/${contact.id}/send-survey`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ surveyId: selectedSurveyId, channel: surveyChannel, surveyUrl }) });
      const data = await res.json() as { success: boolean; error?: string };
      if (!data.success) { setSurveyError(data.error ?? 'Failed to send'); return; }
      setSurveySuccess(true);
      setTimeout(() => setShowSurvey(false), 1500);
    } catch { setSurveyError('Failed to send'); } finally { setSurveySending(false); }
  }

  async function handleStatusChange(newStatus: string) {
    if (!contact || newStatus === contact.status) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`${API_URL}/contacts/${contact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      const data = await res.json() as { success: boolean; contact?: ContactDetail };
      if (data.success && data.contact) setContact((prev) => prev ? { ...prev, status: data.contact!.status } : prev);
    } finally { setStatusSaving(false); }
  }

  async function handleAddTag() {
    if (!contact || !tagInput.trim()) return;
    const newTag = tagInput.trim();
    if (contact.tags.includes(newTag)) { setTagInput(''); return; }
    setTagSaving(true);
    try {
      const res = await fetch(`${API_URL}/contacts/${contact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: [...contact.tags, newTag] }) });
      const data = await res.json() as { success: boolean; contact?: ContactDetail };
      if (data.success && data.contact) { setContact((prev) => prev ? { ...prev, tags: data.contact!.tags } : prev); setTagInput(''); }
    } finally { setTagSaving(false); }
  }

  async function handleRemoveTag(tag: string) {
    if (!contact) return;
    const newTags = contact.tags.filter((t) => t !== tag);
    await fetch(`${API_URL}/contacts/${contact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: newTags }) });
    setContact((prev) => prev ? { ...prev, tags: newTags } : prev);
  }

  async function handleAddNote() {
    if (!contact || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`${API_URL}/contacts/${contact.id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: noteText.trim() }) });
      const data = await res.json() as { success: boolean; activity?: Activity };
      if (data.success && data.activity) { setContact((prev) => prev ? { ...prev, activities: [data.activity!, ...prev.activities] } : prev); setNoteText(''); }
    } finally { setNoteSaving(false); }
  }

  async function handleToggleSequence(seq: Sequence) {
    await fetch(`${API_URL}/sequences/${seq.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'EMAIL', active: !seq.active }),
    });
    await fetchSequences();
  }

  async function handleDeleteSequence(seq: Sequence) {
    if (!confirm(`Delete "${seq.name}"?`)) return;
    await fetch(`${API_URL}/sequences/${seq.id}?type=EMAIL`, { method: 'DELETE' });
    await fetchSequences();
  }

  async function handleEditSequence(seq: Sequence) {
    try {
      const res = await fetch(`${API_URL}/sequences/${seq.id}?type=EMAIL`);
      const data = (await res.json()) as { success: boolean; sequence?: Sequence };
      if (data.sequence) { setEditingSequence({ ...data.sequence, type: 'EMAIL' }); setShowSequenceBuilder(true); }
    } catch { /* ignore */ }
  }

  if (loading) return <div className="p-8 flex justify-center items-center min-h-[400px]"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (error || !contact) return <div className="p-8 text-slate-500">{error || 'Not found'}</div>;

  const statusCfg = STATUS_CONFIG[contact.status];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Modals */}
      {showEdit && (
        <ModalBackdrop onClose={() => setShowEdit(false)}>
          <div className="px-5 py-3 border-b border-slate-200"><h2 className="text-sm font-semibold text-slate-900">Edit Contact</h2></div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(['firstName', 'lastName'] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs text-slate-500 font-medium">{f === 'firstName' ? 'First name' : 'Last name'}</label>
                  <input value={editForm[f]} onChange={(e) => setEditForm((p) => ({ ...p, [f]: e.target.value }))} className={`mt-1 ${inputClass}`} />
                </div>
              ))}
            </div>
            <div><label className="text-xs text-slate-500 font-medium">Email</label><input value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className={`mt-1 ${inputClass}`} /></div>
            <div><label className="text-xs text-slate-500 font-medium">Phone</label><input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className={`mt-1 ${inputClass}`} /></div>
            <div><label className="text-xs text-slate-500 font-medium">Notes</label><textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className={`mt-1 ${inputClass} resize-none`} /></div>
            {editError && <p className="text-sm text-red-500">{editError}</p>}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t flex gap-3">
            <button onClick={() => setShowEdit(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={() => void handleEditSave()} disabled={editSaving} className="flex-1 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60">{editSaving ? 'Saving...' : 'Save'}</button>
          </div>
        </ModalBackdrop>
      )}

      {showSurvey && (
        <ModalBackdrop onClose={() => setShowSurvey(false)}>
          <div className="px-5 py-3 border-b border-slate-200"><h2 className="text-sm font-semibold text-slate-900">Send Survey</h2></div>
          <div className="px-5 py-4 space-y-3">
            {surveySuccess ? (
              <div className="text-center py-6"><div className="text-4xl mb-2">✓</div><p className="text-slate-700 font-medium">Survey sent successfully</p></div>
            ) : (<>
              <div>
                <label className="text-xs text-slate-500 font-medium">Survey</label>
                {surveys.length === 0 ? <p className="mt-2 text-sm text-slate-400">Loading surveys...</p> : (
                  <select value={selectedSurveyId} onChange={(e) => setSelectedSurveyId(e.target.value)} className={`mt-1 ${inputClass}`}>
                    {surveys.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Send via</label>
                <div className="mt-1">
                  <button className="w-full py-2 rounded-lg border border-violet-500 bg-violet-50 text-violet-700 text-sm font-medium">Email</button>
                </div>
                {!contact?.email && <p className="text-xs text-amber-600 mt-1">Contact has no email address</p>}
              </div>
              {surveyError && <p className="text-sm text-red-500">{surveyError}</p>}
            </>)}
          </div>
          {!surveySuccess && (
            <div className="px-5 py-3 bg-slate-50 border-t flex gap-3">
              <button onClick={() => setShowSurvey(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => void handleSendSurvey()} disabled={surveySending || surveys.length === 0 || !contact?.email}
                className="flex-1 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60">{surveySending ? 'Sending...' : 'Send Survey'}</button>
            </div>
          )}
        </ModalBackdrop>
      )}

      {showComposeEmail && contact && <ComposeEmailModal contact={contact} onDone={refreshContact} onClose={() => setShowComposeEmail(false)} />}
      {showSequenceBuilder && contact && (
        <SequenceBuilderModal businessId={contact.businessId} existingSequence={editingSequence} onDone={fetchSequences} onClose={() => { setShowSequenceBuilder(false); setEditingSequence(null); }} />
      )}

      {/* Back */}
      <button onClick={() => router.push('/customers')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        Back to Customers
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex gap-5 items-start">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xl shrink-0">
          {initials(contact).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{fullName(contact)}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <select value={contact.status} onChange={(e) => void handleStatusChange(e.target.value)} disabled={statusSaving}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60 ${statusCfg.color}`}>
                  <option value="LEAD">Lead</option><option value="PROSPECT">Prospect</option><option value="CUSTOMER">Customer</option><option value="CHURNED">Churned</option>
                </select>
                <span className="text-xs text-slate-400">{SOURCE_LABELS[contact.source]}</span>
                {contact.leadScore !== null && <span className="text-xs text-slate-400">Score: <span className="font-medium text-slate-700">{contact.leadScore}</span></span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Added {formatDate(contact.createdAt)}</span>
              <button onClick={() => setShowComposeEmail(true)} disabled={!contact.email} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Send Email</button>
              <button onClick={openSurveyModal} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">Send Survey</button>
              <button onClick={() => setShowEdit(true)} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors">Edit</button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            {contact.email && <div className="text-slate-500">Email <a href={`mailto:${contact.email}`} className="text-slate-800 font-medium hover:text-violet-600">{contact.email}</a></div>}
            {contact.phone && <div className="text-slate-500">Phone <a href={`tel:${contact.phone}`} className="text-slate-800 font-medium hover:text-violet-600">{contact.phone}</a></div>}
            <div className="col-span-2 mt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {contact.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                    {t}<button onClick={() => void handleRemoveTag(t)} className="hover:text-red-500 transition-colors leading-none">×</button>
                  </span>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); void handleAddTag(); }} className="flex items-center gap-1">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag..." className="text-[11px] px-2 py-0.5 border border-dashed border-slate-300 rounded-full focus:outline-none focus:border-violet-400 w-20 placeholder-slate-400" />
                  {tagInput.trim() && <button type="submit" disabled={tagSaving} className="text-[11px] px-2 py-0.5 bg-violet-600 text-white rounded-full hover:bg-violet-700 disabled:opacity-50">{tagSaving ? '...' : '+'}</button>}
                </form>
              </div>
            </div>
            {contact.notes && <div className="col-span-2 text-slate-500 text-xs mt-1 italic">{contact.notes}</div>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Activities', value: contact.activities.length },
          { label: 'Survey Responses', value: contact.surveyResponses.length },
          { label: 'QR Scans', value: contact.qrScans.length },
          { label: 'Appointments', value: contact.appointments.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ─── Email Sequences ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Email Sequences</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Automated multi-step email campaigns to keep customers engaged</p>
          </div>
        </div>

        {sequencesLoading ? (
          <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : sequences.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400 mb-1">No sequences yet</p>
            <p className="text-xs text-slate-400">Create automated email sequences to re-engage customers</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sequences.map((seq) => (
              <div key={seq.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-violet-100 text-violet-600">
                    ✉️
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{seq.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{seq.stepCount} step{seq.stepCount !== 1 ? 's' : ''}</span>
                      <span className="text-[10px] text-slate-400">{seq.triggerLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => void handleToggleSequence(seq)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-lg transition-colors ${seq.active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                    {seq.active ? 'Active' : 'Paused'}
                  </button>
                  <button onClick={() => void handleEditSequence(seq)}
                    className="px-2 py-1 text-[10px] font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Edit</button>
                  <button onClick={() => void handleDeleteSequence(seq)}
                    className="px-2 py-1 text-[10px] font-medium text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Activity Timeline</h2>
          <div className="flex gap-2 mb-4">
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddNote(); } }}
              placeholder="Add a note..." className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <button onClick={() => void handleAddNote()} disabled={noteSaving || !noteText.trim()}
              className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">{noteSaving ? '...' : 'Add'}</button>
          </div>
          {contact.activities.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No activity recorded yet</p>
          ) : (
            <div className="space-y-3">
              {contact.activities.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="text-base shrink-0 mt-0.5">{ACTIVITY_ICONS[a.type] ?? '•'}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.type === 'NOTE' ? a.description : a.title}</p>
                    {a.type !== 'NOTE' && a.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.description}</p>}
                    <p className="text-[10px] text-slate-300 mt-0.5">{formatDateTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Appointments</h2>
          {contact.appointments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No appointments</p>
          ) : (
            <div className="space-y-2">
              {contact.appointments.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(a.startTime)}</p>
                  <span className={`inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${a.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : a.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{a.status.toLowerCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Survey responses */}
        {contact.surveyResponses.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Survey Responses</h2>
            <div className="space-y-2">
              {contact.surveyResponses.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.survey?.title ?? 'Survey'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(r.createdAt)}</p>
                  </div>
                  {r.score !== null && (
                    <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <span key={s} className={`text-sm ${s <= r.score! ? 'text-amber-400' : 'text-slate-200'}`}>★</span>)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR scans */}
        {contact.qrScans.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">QR Code Scans</h2>
            <div className="space-y-2">
              {contact.qrScans.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.qrCode?.label ?? 'QR Code'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.qrCode ? QR_PURPOSE_LABELS[s.qrCode.purpose] : ''} · {formatDateTime(s.createdAt)}</p>
                  </div>
                  {s.outcome && <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s.outcome}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call logs */}
        {contact.callLogs.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Call History</h2>
            <div className="space-y-2">
              {contact.callLogs.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800 capitalize">{c.direction.toLowerCase()} · {c.intent.toLowerCase()}</span>
                    {c.duration && <span className="text-xs text-slate-400">{Math.round(c.duration / 60)}m</span>}
                  </div>
                  {c.summary && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.summary}</p>}
                  {c.sentiment && <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full ${c.sentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' : c.sentiment === 'NEGATIVE' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{c.sentiment.toLowerCase()}</span>}
                  <p className="text-[10px] text-slate-300 mt-1">{formatDateTime(c.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat sessions */}
        {contact.chatSessions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Chat Sessions</h2>
            <div className="space-y-2">
              {contact.chatSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800 capitalize">{s.channel.toLowerCase()} chat</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(s.createdAt)}</p>
                  </div>
                  {s.leadCaptured && <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Lead captured</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
