'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

export function CreateLeadButton({ prospectorUrl }: { prospectorUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState('manual');
  const [notes, setNotes] = useState('');

  useState(() => { setMounted(true); });

  async function handleCreate() {
    if (!name && !email) return;
    setSaving(true);
    try {
      const res = await fetch(`${prospectorUrl}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || company, email, phone, company, source, notes }),
      });
      if (res.ok) {
        setOpen(false);
        setName(''); setEmail(''); setPhone(''); setCompany(''); setNotes('');
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2.5 bg-ink-2 border border-rule rounded-lg text-sm text-white placeholder:text-paper-4 focus:outline-none focus:ring-1 focus:ring-signal transition-colors';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-signal bg-signal-soft border border-rule rounded-lg hover:bg-signal-soft transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Create Lead
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#171717] border border-rule rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
              <h2 className="text-base font-semibold text-white">Create Lead</h2>
              <button onClick={() => setOpen(false)} className="text-paper-4 hover:text-white text-lg">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-paper-3 mb-1.5 uppercase tracking-wide">Contact Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-paper-3 mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="john@restaurant.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-paper-3 mb-1.5 uppercase tracking-wide">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+1 555-123-4567" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-paper-3 mb-1.5 uppercase tracking-wide">Company</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Restaurant name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-paper-3 mb-1.5 uppercase tracking-wide">Source</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} className={`${inputCls} bg-[#171717] appearance-none`}>
                  <option value="manual">Manual</option>
                  <option value="referral">Referral</option>
                  <option value="inbound">Inbound</option>
                  <option value="cold_outreach">Cold Outreach Reply</option>
                  <option value="cal_booking">Cal.com Booking</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-paper-3 mb-1.5 uppercase tracking-wide">Notes <span className="text-paper-4 normal-case font-normal">(optional)</span></label>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-y`} placeholder="How did you find this lead?" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-rule">
              <button onClick={handleCreate} disabled={saving || (!name && !email)}
                className="px-5 py-2 bg-signal text-ink-0 text-white text-sm font-semibold rounded-lg hover:bg-paper hover:text-ink-0 transition-colors disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Lead'}
              </button>
              <button onClick={() => setOpen(false)} className="px-5 py-2 bg-ink-2 text-paper-3 text-sm font-medium rounded-lg hover:bg-ink-3 transition-colors border border-rule">
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
