'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ComposeReply({
  prospectId,
  prospectName,
  prospectEmail,
  prospectorUrl,
}: {
  prospectId: string;
  prospectName: string;
  prospectEmail: string | null;
  prospectorUrl: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${prospectorUrl}/ai/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId,
          prompt: aiPrompt,
          type: 'followup',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'AI generation failed');
        return;
      }
      const data = await res.json();
      setSubject(data.subject ?? '');
      setBody(data.bodyText ?? data.body ?? '');
    } catch {
      setError('Network error');
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${prospectorUrl}/prospects/${prospectId}/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, bodyHtml: body.split('\n\n').map((p) => `<p>${p}</p>`).join('') }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Send failed');
        return;
      }
      setSent(true);
      setSubject('');
      setBody('');
      setAiPrompt('');
      setTimeout(() => {
        setSent(false);
        setExpanded(false);
        router.refresh();
      }, 2000);
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  }

  if (!prospectEmail) return null;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Reply to {prospectName}</h3>
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Compose Reply
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* AI Assist */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Describe what to say (e.g., 'respond positively, suggest a call this week')..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
              className="flex-1 px-3 py-2 text-sm text-white bg-white/[0.04] border border-white/[0.08] rounded-lg placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40"
            />
            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiPrompt.trim()}
              className="px-3 py-2 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {aiGenerating ? 'Generating...' : 'AI Draft'}
            </button>
          </div>

          {/* Subject */}
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2.5 text-sm text-white bg-white/[0.04] border border-white/[0.08] rounded-lg placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40"
          />

          {/* Body */}
          <textarea
            placeholder="Write your reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full px-3 py-2.5 text-sm text-white bg-white/[0.04] border border-white/[0.08] rounded-lg placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 resize-y"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              To: {prospectEmail}
            </p>
            <div className="flex items-center gap-2">
              {error && <p className="text-xs text-red-400">{error}</p>}
              {sent && <p className="text-xs text-emerald-400">Sent!</p>}
              <button
                onClick={() => setExpanded(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !body.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
