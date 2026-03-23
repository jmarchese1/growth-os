'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import KpiCard from '../../../components/ui/kpi-card';
import { useBusiness } from '../../../components/auth/business-provider';
import { EmailStylePicker } from '@/components/ui/email-style-picker';
import { getStyleById, buildAttachmentsHtml } from '@/lib/email-styles';
import type { EmailStyleOptions, EmailAttachment } from '@/lib/email-styles';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  leadScore: number;
  tags: string[];
  createdAt: string;
}

interface ContactsResponse {
  items: Contact[];
  total: number;
  page: number;
  pageSize: number;
}

const SOURCE_LABELS: Record<string, string> = {
  VOICE: 'Phone Call', CHATBOT: 'Chat Widget', SURVEY: 'Survey', SOCIAL: 'Social Media',
  WEBSITE: 'Website Form', MANUAL: 'Manual', CALENDLY: 'Booking', OUTBOUND: 'Outbound', QR_CODE: 'QR Code',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'Lead', color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  PROSPECT: { label: 'Prospect', color: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400' },
  CUSTOMER: { label: 'Customer', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  CHURNED: { label: 'Churned', color: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400' },
};

const inputClass = 'w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300';

/* ─── Modal Backdrop ─────────────────────────────────────────────────────── */

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

/* ─── Add Contact Modal ──────────────────────────────────────────────────── */

function AddContactModal({ businessId, onDone, onClose }: { businessId: string; onDone: () => void; onClose: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!email.trim() && !phone.trim()) { setError('Enter at least an email or phone number'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/businesses/${businessId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to save contact');
        return;
      }
      onDone();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Add Contact</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-500 transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </button>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">First Name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Last Name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="VIP customer, weekly regular..." className={`${inputClass} resize-none`} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.04] border-t border-slate-200 dark:border-white/[0.08] flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2">
          {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : 'Add Contact'}
        </button>
      </div>
    </ModalBackdrop>
  );
}

/* ─── Campaign Email Modal ──────────────────────────────────────────────── */

interface EmailStep {
  stepNumber: number;
  delayHours: number;
  subject: string;
  body: string;
  styleId: string;
  styleOptions: EmailStyleOptions;
  attachments: EmailAttachment[];
}

function delayLabel(h: number) { if (h === 0) return 'Immediately'; if (h < 24) return `${h}h later`; const d = Math.round(h / 24); return `${d} day${d > 1 ? 's' : ''} later`; }

function CampaignModal({ businessId, contacts, selectedIds, allContacts, onDone, onClose }: {
  businessId: string;
  contacts: Contact[];
  selectedIds: Set<string>;
  allContacts: Contact[];
  onDone: () => void;
  onClose: () => void;
}) {
  const { business: biz } = useBusiness();
  type CampaignMode = 'single' | 'sequence';

  const [campaignMode, setCampaignMode] = useState<CampaignMode>('single');
  const [sendToAll, setSendToAll] = useState(selectedIds.size === 0);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set(selectedIds));
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

  // Email style (used for single email mode only)
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

  // Collect all unique tags
  const allTags = Array.from(new Set(allContacts.flatMap((c) => c.tags))).sort();

  const recipients = sendToAll
    ? allContacts.filter((c) => c.email)
    : allContacts.filter((c) => pickedIds.has(c.id) && c.email);

  const filteredContacts = recipientSearch
    ? allContacts.filter((c) => {
        const q = recipientSearch.toLowerCase();
        return (c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
      })
    : allContacts;

  function togglePick(id: string) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Step management
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
      const res = await fetch(`${API_BASE}/sequences/generate-email`, {
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
          const res = await fetch(`${API_BASE}/contacts/${contact.id}/send-email`, {
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
      // Sequence mode — send step 1 now, save sequence for follow-ups
      if (!seqName.trim()) { setError('Sequence name is required'); return; }
      const hasContent = steps.every((s) => s.subject.trim() && s.body.trim());
      if (!hasContent) { setError('All steps need a subject and body'); return; }

      const confirmed = confirm(`Send Step 1 now to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}, then auto-send ${steps.length - 1} follow-up${steps.length > 2 ? 's' : ''} on schedule?`);
      if (!confirmed) return;

      setSending(true);
      setError('');

      // Save the sequence first
      try {
        const seqRes = await fetch(`${API_BASE}/businesses/${businessId}/sequences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: seqName, type: 'EMAIL', trigger: 'CUSTOM', steps }),
        });
        const seqData = (await seqRes.json()) as { success: boolean; error?: string };
        if (!seqData.success) { setError(seqData.error ?? 'Failed to save sequence'); setSending(false); return; }
      } catch { setError('Failed to save sequence'); setSending(false); return; }

      // Send step 1 to all recipients now
      let sent = 0;
      let skipped = 0;
      setProgress({ current: 0, total: recipients.length });

      const step1 = steps[0]!;
      const step1Style = getStyleById(step1.styleId);
      const step1Styled = step1Style.wrap(step1.body + buildAttachmentsHtml(step1.attachments, step1.styleOptions), step1.styleOptions);
      for (const contact of recipients) {
        try {
          const res = await fetch(`${API_BASE}/contacts/${contact.id}/send-email`, {
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
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{steps.length - 1} follow-up{steps.length > 2 ? 's' : ''} scheduled. Manage in any contact&apos;s Email Sequences section.</p>
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
          <button onClick={() => setShowPreview(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-500">
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
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Email Campaign</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Send a one-off email or build a multi-step sequence</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-500">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </button>
      </div>
      <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
        {/* ─── Campaign Mode Toggle ────────────────────────────────── */}
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

        {/* ─── Recipients ──────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Recipients</label>

          {/* Toggle: All vs Select individually */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setSendToAll(true)}
              className={`flex-1 p-3 rounded-xl border text-left transition-colors ${sendToAll ? 'border-violet-300 bg-violet-50 dark:bg-violet-500/15 dark:border-violet-500/30' : 'border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
              <p className={`text-xs font-medium ${sendToAll ? 'text-violet-700 dark:text-violet-400' : 'text-slate-600 dark:text-slate-300'}`}>All with email</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{allContacts.filter((c) => c.email).length}</p>
            </button>
            <button onClick={() => setSendToAll(false)}
              className={`flex-1 p-3 rounded-xl border text-left transition-colors ${!sendToAll ? 'border-violet-300 bg-violet-50 dark:bg-violet-500/15 dark:border-violet-500/30' : 'border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
              <p className={`text-xs font-medium ${!sendToAll ? 'text-violet-700 dark:text-violet-400' : 'text-slate-600 dark:text-slate-300'}`}>Select individually</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{pickedIds.size > 0 ? allContacts.filter((c) => pickedIds.has(c.id) && c.email).length : '—'}</p>
            </button>
          </div>

          {/* Individual picker */}
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
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{c.email ?? 'no email'}</p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_LABELS[c.status]?.color ?? 'bg-slate-100 text-slate-500'}`}>{STATUS_LABELS[c.status]?.label ?? c.status}</span>
                  </label>
                ))}
                {filteredContacts.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">No contacts found</div>
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
        </div>

        {/* ─── Single Email Content ────────────────────────────────── */}
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
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Use {'{{firstName}}'} and {'{{business}}'} as variables. HTML supported.</p>
            </div>
            {/* Email Style — single mode (below body so dropdowns open downward) */}
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

        {/* ─── Sequence Content ────────────────────────────────────── */}
        {campaignMode === 'sequence' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sequence Name</label>
              <input value={seqName} onChange={(e) => setSeqName(e.target.value)} placeholder="e.g. Win-back series, Post-visit follow-up..." className={inputClass} />
            </div>

            {/* Step tabs */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Steps</label>
                <button onClick={addStep}
                  className="px-2 py-0.5 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100">+ Add Step</button>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">Step 1 sends immediately, follow-ups auto-send on schedule</span>
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
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">Subject</label>
                    <input value={steps[activeStep]!.subject} onChange={(e) => updateStep(activeStep, 'subject', e.target.value)} placeholder="Email subject..." className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">Body (HTML)</label>
                    <textarea value={steps[activeStep]!.body} onChange={(e) => updateStep(activeStep, 'body', e.target.value)} rows={5} placeholder="<p>Hi {{firstName}},</p>..." className={inputClass} />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Use {'{{firstName}}'} and {'{{business}}'} as variables</p>
                  </div>
                  {/* Per-step style & attachments */}
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

            {/* Sequence timeline preview */}
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
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{delayLabel(step.delayHours)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── Progress bar ───────────────────────────────────────── */}
        {progress && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Sending step 1...</span>
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

/* ─── Main Page ──────────────────────────────────────────────────────────── */

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'CHURNED', label: 'Churned' },
];

const SOURCE_FILTER_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'VOICE', label: 'Phone Call' },
  { value: 'CHATBOT', label: 'Chat Widget' },
  { value: 'SURVEY', label: 'Survey' },
  { value: 'SOCIAL', label: 'Social Media' },
  { value: 'WEBSITE', label: 'Website Form' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'CALENDLY', label: 'Booking' },
  { value: 'QR_CODE', label: 'QR Code' },
];

export default function CustomersPage() {
  const { business } = useBusiness();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sequences, setSequences] = useState<{ id: string; name: string; stepCount: number; active: boolean; triggerLabel: string; createdAt: string }[]>([]);
  const [seqLoading, setSeqLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 20;

  const fetchContacts = useCallback(async (searchVal: string, statusVal: string, sourceVal: string, pageVal: number) => {
    if (!business?.id) {
      setContacts([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageVal), pageSize: String(pageSize) });
      if (searchVal) params.set('search', searchVal);
      if (statusVal) params.set('status', statusVal);
      if (sourceVal) params.set('source', sourceVal);
      const res = await fetch(`${API_BASE}/businesses/${business.id}/contacts?${params}`);
      if (res.ok) {
        const data: ContactsResponse = await res.json();
        setContacts(data.items);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  const fetchSequences = useCallback(async () => {
    if (!business?.id) return;
    setSeqLoading(true);
    try {
      const res = await fetch(`${API_BASE}/businesses/${business.id}/sequences?type=EMAIL`);
      const data = (await res.json()) as { success: boolean; sequences?: typeof sequences };
      if (data.sequences) setSequences(data.sequences);
    } catch { /* ignore */ } finally { setSeqLoading(false); }
  }, [business?.id]);

  useEffect(() => {
    fetchContacts(search, statusFilter, sourceFilter, page);
    fetchSequences();
  }, [fetchContacts, fetchSequences, statusFilter, sourceFilter, page]);

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchContacts(val, statusFilter, sourceFilter, 1);
    }, 350);
  }

  function handleFilterChange(type: 'status' | 'source', val: string) {
    setPage(1);
    if (type === 'status') { setStatusFilter(val); }
    else { setSourceFilter(val); }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  }

  // Compute source breakdown
  const sourceCounts: Record<string, number> = {};
  for (const c of contacts) {
    sourceCounts[c.source] = (sourceCounts[c.source] ?? 0) + 1;
  }
  const maxSourceCount = Math.max(...Object.values(sourceCounts), 1);

  // Compute engagement stats from loaded contacts
  const newThisMonth = contacts.filter((c) => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const withEmail = contacts.filter((c) => c.email).length;
  const totalPages = Math.ceil(total / pageSize);

  const formatName = (c: Contact) => {
    const parts = [c.firstName, c.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown';
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const selectedWithEmail = contacts.filter((c) => selectedIds.has(c.id) && c.email).length;

  async function handleToggleSeq(seq: typeof sequences[0]) {
    await fetch(`${API_BASE}/sequences/${seq.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'EMAIL', active: !seq.active }),
    });
    await fetchSequences();
  }

  async function handleDeleteSeq(seq: typeof sequences[0]) {
    if (!confirm(`Delete "${seq.name}"?`)) return;
    await fetch(`${API_BASE}/sequences/${seq.id}?type=EMAIL`, { method: 'DELETE' });
    await fetchSequences();
  }

  return (
    <div className="p-8 animate-fade-up">
      {showAdd && business && (
        <AddContactModal
          businessId={business.id}
          onDone={() => { void fetchContacts(search, statusFilter, sourceFilter, page); }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showCampaign && business && (
        <CampaignModal
          businessId={business.id}
          contacts={contacts}
          selectedIds={selectedIds}
          allContacts={contacts}
          onDone={() => { setSelectedIds(new Set()); void fetchContacts(search, statusFilter, sourceFilter, page); void fetchSequences(); }}
          onClose={() => setShowCampaign(false)}
        />
      )}

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Customers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Everyone who has interacted with your business — walk-ins, callers, chatters, and more</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCampaign(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-violet-600 text-sm font-semibold rounded-xl border border-violet-200 hover:bg-violet-50 transition-colors shadow-sm">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
            Email Campaign
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-colors shadow-sm shadow-violet-600/20">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>
            Add Contact
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Customers" value={total} color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
        <KpiCard label="New This Month" value={newThisMonth} color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>} />
        <KpiCard label="With Email" value={withEmail} color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>} />
        <KpiCard label="From Calls" value={sourceCounts['VOICE'] ?? 0} color="amber"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">How They Found You</h3>
          <div className="space-y-3">
            {['VOICE', 'CHATBOT', 'WEBSITE', 'SURVEY', 'SOCIAL', 'MANUAL', 'QR_CODE'].map((source) => {
              const count = sourceCounts[source] ?? 0;
              const pct = total > 0 ? (count / maxSourceCount) * 100 : 0;
              return (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{SOURCE_LABELS[source] ?? source}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-violet-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">By Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Leads', status: 'LEAD' },
              { label: 'Prospects', status: 'PROSPECT' },
              { label: 'Customers', status: 'CUSTOMER' },
              { label: 'Churned', status: 'CHURNED' },
            ].map(({ label, status }) => {
              const count = contacts.filter((c) => c.status === status).length;
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Active Campaigns ─────────────────────────────────────────── */}
      {(sequences.length > 0 || seqLoading) && (
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Active Campaigns</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Email sequences running across your contacts</p>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">{sequences.filter((s) => s.active).length} active</span>
          </div>

          {seqLoading ? (
            <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {sequences.map((seq) => (
                <div key={seq.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.06] border border-slate-100 dark:border-white/[0.06] hover:border-slate-200 dark:hover:border-white/[0.1] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{seq.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{seq.stepCount} step{seq.stepCount !== 1 ? 's' : ''}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{seq.triggerLabel}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(seq.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => void handleToggleSeq(seq)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-colors ${seq.active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1]'}`}>
                      {seq.active ? 'Active' : 'Paused'}
                    </button>
                    <button onClick={() => void handleDeleteSeq(seq)}
                      className="px-2 py-1 text-[10px] font-medium text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Bulk action bar ──────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-violet-700">{selectedIds.size} selected</span>
            {selectedWithEmail > 0 && (
              <span className="text-xs text-violet-500">{selectedWithEmail} with email</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowCampaign(true); }}
              disabled={selectedWithEmail === 0}
              className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 flex items-center gap-1.5 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
              Email Selected
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs font-medium text-violet-500 hover:text-violet-700 transition-colors">Clear</button>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search name, email, or phone..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 bg-white dark:bg-white/[0.06]"
          >
            {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 bg-white dark:bg-white/[0.06]"
          >
            {SOURCE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{total} result{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={contacts.length > 0 && selectedIds.size === contacts.length} onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer" />
                </th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Email</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Phone</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Source</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                    No customers yet. They&apos;ll appear here when they call, chat, scan a QR code, or fill out a form.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className={`border-b border-slate-50 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors ${selectedIds.has(contact.id) ? 'bg-violet-50/30 dark:bg-violet-500/10' : ''}`}>
                    <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={() => toggleSelect(contact.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer" />
                    </td>
                    <td className="px-5 py-3 cursor-pointer" onClick={() => router.push(`/customers/${contact.id}`)}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 text-[10px] font-bold flex-shrink-0">
                          {(contact.firstName?.[0] ?? contact.email?.[0] ?? '?').toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatName(contact)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-pointer" onClick={() => router.push(`/customers/${contact.id}`)}>{contact.email ?? '--'}</td>
                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-pointer" onClick={() => router.push(`/customers/${contact.id}`)}>{contact.phone ?? '--'}</td>
                    <td className="px-5 py-3 cursor-pointer" onClick={() => router.push(`/customers/${contact.id}`)}>
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
                        {SOURCE_LABELS[contact.source] ?? contact.source}
                      </span>
                    </td>
                    <td className="px-5 py-3 cursor-pointer" onClick={() => router.push(`/customers/${contact.id}`)}>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_LABELS[contact.status]?.color ?? 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABELS[contact.status]?.label ?? contact.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-400 dark:text-slate-500 cursor-pointer" onClick={() => router.push(`/customers/${contact.id}`)}>{formatDate(contact.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                onClick={() => setPage((p) => { const next = Math.max(1, p - 1); return next; })}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
