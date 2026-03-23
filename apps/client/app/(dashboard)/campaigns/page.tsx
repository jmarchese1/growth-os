'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import KpiCard from '../../../components/ui/kpi-card';
import { useBusiness } from '../../../components/auth/business-provider';
import { EmailStylePicker } from '@/components/ui/email-style-picker';
import { getStyleById, buildAttachmentsHtml } from '@/lib/email-styles';
import type { EmailStyleOptions, EmailAttachment } from '@/lib/email-styles';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Campaign {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS';
  subject: string | null;
  body: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  sentCount: number;
  openCount: number;
  createdAt: string;
}

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
}

interface EmailStep {
  stepNumber: number;
  delayHours: number;
  subject: string;
  body: string;
  styleId: string;
  styleOptions: EmailStyleOptions;
  attachments: EmailAttachment[];
}

const TYPE_BADGES: Record<string, string> = {
  EMAIL: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  SMS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
  SCHEDULED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

const STATUS_COLORS: Record<string, string> = {
  LEAD: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  PROSPECT: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  CUSTOMER: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  CHURNED: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
};

const inputClass = 'w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300';

function delayLabel(h: number) { if (h === 0) return 'Immediately'; if (h < 24) return `${h}h later`; const d = Math.round(h / 24); return `${d} day${d > 1 ? 's' : ''} later`; }

function ModalBackdrop({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`bg-white dark:bg-[#1a1730] rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-hidden max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ── Create Campaign Modal (full-featured, matches Contacts page) ──────── */
function CreateCampaignModal({ businessId, onClose, onDone }: {
  businessId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { business: biz } = useBusiness();
  type CampaignMode = 'single' | 'sequence';

  const [campaignMode, setCampaignMode] = useState<CampaignMode>('single');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [sendToAll, setSendToAll] = useState(true);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [recipientSearch, setRecipientSearch] = useState('');

  // Single email state
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Sequence state
  const [seqName, setSeqName] = useState('');
  const defaultStepStyle = (): Pick<EmailStep, 'styleId' | 'styleOptions' | 'attachments'> => ({
    styleId: 'clean', styleOptions: { color: '#7c3aed', businessName: biz?.name }, attachments: [],
  });
  const [steps, setSteps] = useState<EmailStep[]>([{ stepNumber: 1, delayHours: 0, subject: '', body: '', ...defaultStepStyle() }]);
  const [activeStep, setActiveStep] = useState(0);

  // Email style (single mode)
  const [selectedStyle, setSelectedStyle] = useState('clean');
  const [styleOptions, setStyleOptions] = useState<EmailStyleOptions>({ color: '#7c3aed' });
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);

  // Shared state
  const [generating, setGenerating] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ sent: number; skipped: number; mode: CampaignMode } | null>(null);
  const [purpose, setPurpose] = useState('bring customers back with a special offer');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Fetch contacts on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/contacts?businessId=${businessId}&pageSize=500`);
        const data = await res.json() as { items?: Contact[] };
        setContacts(data.items ?? []);
      } catch { /* silent */ }
      setContactsLoading(false);
    }
    load();
  }, [businessId]);

  const recipients = sendToAll
    ? contacts.filter((c) => c.email)
    : contacts.filter((c) => pickedIds.has(c.id) && c.email);

  const filteredContacts = recipientSearch
    ? contacts.filter((c) => {
        const q = recipientSearch.toLowerCase();
        return (c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
      })
    : contacts;

  function togglePick(id: string) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addStep() {
    const lastDelay = steps.length > 0 ? steps[steps.length - 1]!.delayHours : 0;
    setSteps([...steps, { stepNumber: steps.length + 1, delayHours: lastDelay + 48, subject: '', body: '', ...defaultStepStyle() }]);
    setActiveStep(steps.length);
  }

  function removeStep(idx: number) {
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
    setActiveStep(Math.max(0, activeStep - 1));
  }

  function updateStep(idx: number, field: keyof EmailStep, value: string | number | EmailStyleOptions | EmailAttachment[]) {
    setSteps(steps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  async function handleAiGenerate(stepIdx?: number) {
    const idx = stepIdx ?? -1;
    setGenerating(idx);
    setError('');
    try {
      const res = await fetch(`${API_URL}/sequences/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, purpose, stepNumber: idx >= 0 ? idx + 1 : undefined }),
      });
      const data = (await res.json()) as { success: boolean; subject?: string; body?: string; error?: string };
      if (data.success && data.subject && data.body) {
        if (campaignMode === 'single') {
          setSubject(data.subject);
          setEmailBody(data.body);
        } else if (idx >= 0) {
          updateStep(idx, 'subject', data.subject);
          updateStep(idx, 'body', data.body);
        }
      } else {
        setError(data.error ?? 'AI generation failed');
      }
    } catch { setError('AI generation failed'); } finally { setGenerating(null); }
  }

  function handlePreview(stepIdx?: number) {
    if (campaignMode === 'single') {
      if (!emailBody) return;
      const style = getStyleById(selectedStyle);
      const html = style.wrap(emailBody + buildAttachmentsHtml(attachments, styleOptions), styleOptions);
      setPreviewHtml(html);
    } else {
      const step = stepIdx !== undefined ? steps[stepIdx] : undefined;
      if (!step?.body) return;
      const style = getStyleById(step.styleId);
      const html = style.wrap(step.body + buildAttachmentsHtml(step.attachments, step.styleOptions), step.styleOptions);
      setPreviewHtml(html);
    }
    setShowPreview(true);
  }

  async function handleSend() {
    if (recipients.length === 0) { setError('No recipients with email addresses'); return; }

    if (campaignMode === 'single') {
      if (!subject.trim() || !emailBody.trim()) { setError('Subject and body are required'); return; }
      const confirmed = confirm(`Send this email to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}?`);
      if (!confirmed) return;

      setSending(true);
      setError('');
      let sent = 0;
      let skipped = 0;
      setProgress({ current: 0, total: recipients.length });

      const style = getStyleById(selectedStyle);
      const styledBody = style.wrap(emailBody + buildAttachmentsHtml(attachments, styleOptions), styleOptions);

      for (const contact of recipients) {
        try {
          const res = await fetch(`${API_URL}/contacts/${contact.id}/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, emailBody: styledBody }),
          });
          const data = (await res.json()) as { success: boolean };
          if (data.success) sent++;
          else skipped++;
        } catch { skipped++; }
        setProgress({ current: sent + skipped, total: recipients.length });
      }

      setProgress(null);
      setSending(false);
      setSuccess({ sent, skipped, mode: 'single' });
    } else {
      if (!seqName.trim()) { setError('Sequence name is required'); return; }
      const hasContent = steps.every((s) => s.subject.trim() && s.body.trim());
      if (!hasContent) { setError('All steps need a subject and body'); return; }

      const confirmed = confirm(`Send Step 1 now to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}, then auto-send ${steps.length - 1} follow-up${steps.length > 2 ? 's' : ''} on schedule?`);
      if (!confirmed) return;

      setSending(true);
      setError('');

      try {
        const seqRes = await fetch(`${API_URL}/businesses/${businessId}/sequences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: seqName, type: 'EMAIL', trigger: 'CUSTOM', steps }),
        });
        const seqData = (await seqRes.json()) as { success: boolean; error?: string };
        if (!seqData.success) { setError(seqData.error ?? 'Failed to save sequence'); setSending(false); return; }
      } catch { setError('Failed to save sequence'); setSending(false); return; }

      let sent = 0;
      let skipped = 0;
      setProgress({ current: 0, total: recipients.length });

      const step1 = steps[0]!;
      const step1Style = getStyleById(step1.styleId);
      const step1Styled = step1Style.wrap(step1.body + buildAttachmentsHtml(step1.attachments, step1.styleOptions), step1.styleOptions);
      for (const contact of recipients) {
        try {
          const res = await fetch(`${API_URL}/contacts/${contact.id}/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject: step1.subject, emailBody: step1Styled }),
          });
          const data = (await res.json()) as { success: boolean };
          if (data.success) sent++;
          else skipped++;
        } catch { skipped++; }
        setProgress({ current: sent + skipped, total: recipients.length });
      }

      setProgress(null);
      setSending(false);
      setSuccess({ sent, skipped, mode: 'sequence' });
    }
  }

  if (success) {
    return (
      <ModalBackdrop onClose={() => { onDone(); onClose(); }} wide>
        <div className="px-6 py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-emerald-600 dark:text-emerald-400"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            {success.mode === 'single' ? 'Campaign Sent' : 'Sequence Launched'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            {success.sent} email{success.sent !== 1 ? 's' : ''} sent successfully
            {success.skipped > 0 && <>, {success.skipped} skipped</>}
          </p>
          {success.mode === 'sequence' && steps.length > 1 && (
            <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">{steps.length - 1} follow-up{steps.length > 2 ? 's' : ''} scheduled</p>
          )}
          <button onClick={() => { onDone(); onClose(); }} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 transition-colors mt-2">Done</button>
        </div>
      </ModalBackdrop>
    );
  }

  if (showPreview && previewHtml) {
    return (
      <ModalBackdrop onClose={() => setShowPreview(false)} wide>
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Email Preview</h3>
          <button onClick={() => setShowPreview(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-400">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <iframe srcDoc={previewHtml} className="w-full h-[500px] border-0" title="Email preview" />
        </div>
        <div className="px-5 py-3 bg-slate-50 dark:bg-white/[0.04] border-t border-slate-200 dark:border-white/[0.08] flex justify-end">
          <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white">Back to editor</button>
        </div>
      </ModalBackdrop>
    );
  }

  return (
    <ModalBackdrop onClose={onClose} wide>
      <div className="px-5 py-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">New Email Campaign</h3>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Send a one-off email or build a multi-step sequence</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-400">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </button>
      </div>
      <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
        {/* Campaign Mode Toggle */}
        <div className="flex gap-2">
          <button onClick={() => setCampaignMode('single')}
            className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${campaignMode === 'single' ? 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:border-violet-500/30 dark:text-violet-400' : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
            Single Email
          </button>
          <button onClick={() => setCampaignMode('sequence')}
            className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${campaignMode === 'sequence' ? 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:border-violet-500/30 dark:text-violet-400' : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
            Email Sequence
          </button>
        </div>

        {/* Recipients */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Recipients</label>
          {contactsLoading ? (
            <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setSendToAll(true)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-colors ${sendToAll ? 'border-violet-300 bg-violet-50 dark:bg-violet-500/15 dark:border-violet-500/30' : 'border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
                  <p className={`text-xs font-medium ${sendToAll ? 'text-violet-700 dark:text-violet-400' : 'text-slate-600 dark:text-slate-300'}`}>All with email</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{contacts.filter((c) => c.email).length}</p>
                </button>
                <button onClick={() => setSendToAll(false)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-colors ${!sendToAll ? 'border-violet-300 bg-violet-50 dark:bg-violet-500/15 dark:border-violet-500/30' : 'border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
                  <p className={`text-xs font-medium ${!sendToAll ? 'text-violet-700 dark:text-violet-400' : 'text-slate-600 dark:text-slate-300'}`}>Select individually</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{pickedIds.size > 0 ? contacts.filter((c) => pickedIds.has(c.id) && c.email).length : '—'}</p>
                </button>
              </div>

              {!sendToAll && (
                <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 dark:bg-white/[0.06] border-b border-slate-100 dark:border-white/[0.06]">
                    <input value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} placeholder="Search contacts..."
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400/30 bg-white dark:bg-white/[0.06] dark:text-white" />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-50 dark:divide-white/[0.06]">
                    {filteredContacts.map((c) => (
                      <label key={c.id} className={`flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors ${!c.email ? 'opacity-40' : ''}`}>
                        <input type="checkbox" checked={pickedIds.has(c.id)} onChange={() => togglePick(c.id)} disabled={!c.email}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 shrink-0" />
                        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-[9px] font-bold shrink-0">
                          {(c.firstName?.[0] ?? c.email?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate">{c.email ?? 'no email'}</p>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                      </label>
                    ))}
                    {filteredContacts.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-400">No contacts found</div>
                    )}
                  </div>
                  {pickedIds.size > 0 && (
                    <div className="px-3 py-2 bg-slate-50 dark:bg-white/[0.06] border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{pickedIds.size} selected</span>
                      <button onClick={() => setPickedIds(new Set())} className="text-[10px] text-violet-500 hover:text-violet-700">Clear all</button>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span className="font-medium text-violet-600">{recipients.length}</span> recipient{recipients.length !== 1 ? 's' : ''} will receive this {campaignMode === 'sequence' ? 'sequence' : 'email'}
              </p>
            </>
          )}
        </div>

        {/* Single Email Content */}
        {campaignMode === 'single' && (
          <>
            <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl p-3">
              <label className="block text-xs font-medium text-violet-700 dark:text-violet-400 mb-1.5">AI Draft</label>
              <div className="flex gap-2">
                <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. win-back offer, new menu item, thank you..."
                  className="flex-1 px-3 py-1.5 border border-violet-200 dark:border-violet-500/20 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400/40 bg-white dark:bg-white/[0.06]" />
                <button onClick={() => handleAiGenerate()} disabled={generating !== null}
                  className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 flex items-center gap-1.5">
                  {generating === -1 ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>}
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line..." className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Body</label>
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={6} placeholder="<p>Hi {{firstName}},</p><p>Your email content here...</p>" className={inputClass} />
              <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">Use {'{{firstName}}'} and {'{{business}}'} as variables. HTML supported.</p>
            </div>
            <EmailStylePicker
              selectedStyle={selectedStyle}
              onStyleChange={setSelectedStyle}
              options={styleOptions}
              onOptionsChange={setStyleOptions}
              businessId={businessId}
              businessName={biz?.name}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </>
        )}

        {/* Sequence Content */}
        {campaignMode === 'sequence' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sequence Name</label>
              <input value={seqName} onChange={(e) => setSeqName(e.target.value)} placeholder="e.g. Win-back series, Post-visit follow-up..." className={inputClass} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Steps</label>
                <button onClick={addStep}
                  className="px-2 py-0.5 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100">+ Add Step</button>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 ml-auto">Step 1 sends immediately, follow-ups auto-send on schedule</span>
              </div>
              <div className="flex gap-1 mb-3 overflow-x-auto">
                {steps.map((_, idx) => (
                  <button key={idx} onClick={() => setActiveStep(idx)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-colors ${activeStep === idx ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1]'}`}>
                    Step {idx + 1}
                    <span className="ml-1 text-[10px] opacity-70">{delayLabel(steps[idx]?.delayHours ?? 0)}</span>
                  </button>
                ))}
              </div>

              {steps[activeStep] && (
                <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Delay</label>
                      <select value={steps[activeStep]!.delayHours} onChange={(e) => updateStep(activeStep, 'delayHours', Number(e.target.value))}
                        className="px-2 py-1 border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-700 dark:text-slate-200 dark:bg-white/[0.06] focus:outline-none">
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
                      <button onClick={() => handleAiGenerate(activeStep)} disabled={generating !== null}
                        className="px-2 py-1 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 flex items-center gap-1">
                        {generating === activeStep ? <div className="w-2.5 h-2.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> : null}
                        AI Write
                      </button>
                      <button onClick={() => handlePreview(activeStep)} disabled={!steps[activeStep]?.body}
                        className="px-2 py-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-40">Preview</button>
                      {steps.length > 1 && (
                        <button onClick={() => removeStep(activeStep)} className="px-2 py-1 text-[10px] font-medium text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">Remove</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-400 mb-0.5">Subject</label>
                    <input value={steps[activeStep]!.subject} onChange={(e) => updateStep(activeStep, 'subject', e.target.value)} placeholder="Email subject..." className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-400 mb-0.5">Body (HTML)</label>
                    <textarea value={steps[activeStep]!.body} onChange={(e) => updateStep(activeStep, 'body', e.target.value)} rows={5} placeholder="<p>Hi {{firstName}},</p>..." className={inputClass} />
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">Use {'{{firstName}}'} and {'{{business}}'} as variables</p>
                  </div>
                  <EmailStylePicker
                    selectedStyle={steps[activeStep]!.styleId}
                    onStyleChange={(id) => updateStep(activeStep, 'styleId', id)}
                    options={steps[activeStep]!.styleOptions}
                    onOptionsChange={(opts) => updateStep(activeStep, 'styleOptions', opts)}
                    businessId={businessId}
                    businessName={biz?.name}
                    attachments={steps[activeStep]!.attachments}
                    onAttachmentsChange={(atts) => updateStep(activeStep, 'attachments', atts)}
                  />
                </div>
              )}
            </div>

            {steps.length > 1 && (
              <div className="bg-slate-50 dark:bg-white/[0.06] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Sequence Timeline</p>
                <div className="space-y-1.5">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${idx === 0 ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-white/[0.1] text-slate-500 dark:text-slate-400'}`}>{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{step.subject || '(no subject)'}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 shrink-0">{delayLabel(step.delayHours)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Progress bar */}
        {progress && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Sending{campaignMode === 'sequence' ? ' step 1' : ''}...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="px-5 py-3 bg-slate-50 dark:bg-white/[0.04] border-t border-slate-200 dark:border-white/[0.08] flex gap-2 justify-between">
        <button onClick={() => campaignMode === 'single' ? handlePreview() : handlePreview(activeStep)}
          disabled={campaignMode === 'single' ? !emailBody.trim() : !steps[activeStep]?.body}
          className="px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] rounded-lg hover:bg-white dark:hover:bg-white/[0.06] disabled:opacity-40 transition-colors">Preview</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Cancel</button>
          <button onClick={handleSend} disabled={sending || recipients.length === 0 || (campaignMode === 'single' ? (!subject.trim() || !emailBody.trim()) : (!seqName.trim() || steps.some((s) => !s.subject.trim() || !s.body.trim())))}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2 transition-colors">
            {sending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {sending ? 'Sending...' : campaignMode === 'single' ? `Send to ${recipients.length}` : `Launch Sequence (${recipients.length})`}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function CampaignsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/campaigns?businessId=${business.id}`);
      const data = await res.json() as { success: boolean; campaigns: Campaign[] };
      if (data.success) setCampaigns(data.campaigns);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  async function handleDelete(id: string) {
    await fetch(`${API_URL}/campaigns/${id}`, { method: 'DELETE' });
    setCampaigns(campaigns.filter((c) => c.id !== id));
  }

  async function handleSend(id: string) {
    setSendingId(id);
    setSendError(null);
    const res = await fetch(`${API_URL}/campaigns/${id}/send`, { method: 'POST' });
    const data = await res.json() as { success: boolean; sentCount?: number; error?: string };
    if (data.success) {
      setCampaigns(campaigns.map((c) => c.id === id ? { ...c, status: 'SENT', sentCount: data.sentCount ?? 0 } : c));
    } else {
      setSendError(data.error ?? 'Failed to send');
    }
    setSendingId(null);
  }

  if (bizLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!business) return null;

  const sentCampaigns = campaigns.filter((c) => c.status === 'SENT');
  const totalSent = sentCampaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalOpens = sentCampaigns.reduce((s, c) => s + c.openCount, 0);
  const openRate = totalSent > 0 ? `${Math.round((totalOpens / totalSent) * 100)}%` : '0%';

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Email Campaigns</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create and send email campaigns and sequences to your customers</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">New Campaign</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Active Campaigns" value={campaigns.filter((c) => c.status !== 'DRAFT').length} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>} />
        <KpiCard label="Emails Sent" value={totalSent} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>} />
        <KpiCard label="Open Rate" value={openRate} color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Customers Reached" value={totalSent} color="amber" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
      </div>

      {sendError && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{sendError}</span>
          <button onClick={() => setSendError(null)} className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300 ml-4">&#x2715;</button>
        </div>
      )}

      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your Campaigns</h2>
          {campaigns.length > 0 && <span className="text-xs text-slate-400 dark:text-slate-400">{campaigns.length} total</span>}
        </div>

        {loading ? (
          <div className="px-5 py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
        ) : campaigns.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400 dark:text-slate-400">No campaigns yet. Create your first campaign to start reaching your customers.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.06]">
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Created</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Reach</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.06]">
              {campaigns.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/campaigns/${c.id}`)} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{c.name}</p>
                    {c.subject && <p className="text-xs text-slate-400 dark:text-slate-400 truncate max-w-xs">{c.subject}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGES[c.type]}`}>{c.type.toLowerCase()}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGES[c.status]}`}>{c.status.toLowerCase()}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {c.status === 'SENT' ? `${c.sentCount} sent` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      {c.status !== 'SENT' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSend(c.id); }}
                          disabled={sendingId === c.id}
                          className="text-xs font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                          {sendingId === c.id && <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />}
                          {sendingId === c.id ? 'Sending...' : 'Send now'}
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-xs text-slate-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateCampaignModal
          businessId={business.id}
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); fetchCampaigns(); }}
        />
      )}
    </div>
  );
}
